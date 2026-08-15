/**
 * Mystic Runes — server-authoritative spin settle.
 */
import { and, eq } from "drizzle-orm";
import {
  MYSTIC_RUNES_GAME_ID,
  freeSpinsAwardForCount,
  normalizeMysticRunesConfig,
} from "@/lib/mystic-runes-config";
import { getDb } from "../db/client";
import { gameControls, playSessions, users } from "../db/schema";
import { money, newId, requireUser } from "../session";
import {
  assertNotInMaintenanceForBets,
  availableFrom,
  getMaxSingleBet,
  sumPendingWithdrawals,
  writeLedgerDelta,
} from "../wallet.server";

export { MYSTIC_RUNES_GAME_ID };
const GAME_NAME = "Mystic Runes";

/** Serialize engine config mutation — module-level runtimeConfig is process-global. */
let engineChain: Promise<unknown> = Promise.resolve();
function withEngineExclusive<T>(fn: () => T | Promise<T>): Promise<T> {
  const run = engineChain.then(fn, fn);
  engineChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function loadEngineConfig() {
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MYSTIC_RUNES_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    if (!raw) return normalizeMysticRunesConfig(null);
    return normalizeMysticRunesConfig(JSON.parse(raw) as unknown);
  } catch {
    return normalizeMysticRunesConfig(null);
  }
}

async function resolveOnServer(opts: {
  bet: number;
  isFreeSpins: boolean;
  startMultiplier?: number;
}) {
  const cfg = await loadEngineConfig();
  return withEngineExclusive(async () => {
    const { setMysticRunesConfig } = await import(
      "@/components/maxhigh/mystic-runes/runtimeConfig"
    );
    const { resolveSpin, finalizeFreeSpinTotal } = await import(
      "@/components/maxhigh/mystic-runes/spinResolver"
    );
    setMysticRunesConfig(cfg);
    const script = resolveSpin({
      bet: opts.bet,
      isFreeSpins: opts.isFreeSpins,
      startMultiplier: opts.startMultiplier,
    });
    return { script, finalizeFreeSpinTotal, cfg };
  });
}

export type MysticRunesSessionState = {
  sessionId: string | null;
  freeSpinsLeft: number;
  fsSessionWin: number;
  fsMult: number;
  fsSpinsPlayed: number;
  inFree: boolean;
  bet: number;
};

export type MysticRunesSpinResult = {
  balance: number;
  script: Awaited<ReturnType<typeof import("@/components/maxhigh/mystic-runes/spinResolver").resolveSpin>>;
  session: MysticRunesSessionState;
  fsPayout?: {
    amount: number;
    baseEarn: number;
    multiplier: number;
    spinsPlayed: number;
  };
};

function sessionState(row: typeof playSessions.$inferSelect | null): MysticRunesSessionState {
  if (!row || row.status !== "open") {
    return {
      sessionId: null,
      freeSpinsLeft: 0,
      fsSessionWin: 0,
      fsMult: 1,
      fsSpinsPlayed: 0,
      inFree: false,
      bet: 0,
    };
  }
  return {
    sessionId: row.id,
    freeSpinsLeft: Number(row.freeSpinsLeft),
    fsSessionWin: Number(row.fsSessionWin),
    fsMult: Math.max(1, Number(row.fsBombAcc) || 1),
    fsSpinsPlayed: Number(row.fsSpinsPlayed),
    inFree: Number(row.freeSpinsLeft) > 0,
    bet: Number(row.bet),
  };
}

export async function getMysticRunesOpenSession(): Promise<MysticRunesSessionState> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, MYSTIC_RUNES_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  return sessionState(rows[0] ?? null);
}

export async function mysticRunesPaidSpin(data: { bet: number }): Promise<MysticRunesSpinResult> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet");

  const cost = +data.bet.toFixed(2);
  const maxBet = await getMaxSingleBet();
  if (cost > maxBet) throw new Error(`Max bet is ₱${maxBet.toFixed(2)}`);
  await assertNotInMaintenanceForBets();

  const db = getDb();
  const existing = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, MYSTIC_RUNES_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  if (existing[0] && Number(existing[0].freeSpinsLeft) > 0) {
    throw new Error("Finish free spins before placing a new bet");
  }

  const { script } = await resolveOnServer({ bet: data.bet, isFreeSpins: false });

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User not found");

    const balance = Number(row.balance);
    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(balance, pending);
    if (cost > available) {
      throw new Error(
        pending > 0
          ? `Insufficient available balance (₱${pending.toFixed(2)} held for pending withdrawal)`
          : "Insufficient balance",
      );
    }

    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: GAME_NAME,
      note: `${MYSTIC_RUNES_GAME_ID} · ${GAME_NAME} · wager ₱${cost.toFixed(2)}`,
    });

    if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: `${MYSTIC_RUNES_GAME_ID} · ${GAME_NAME} · win ₱${script.totalWin.toFixed(2)}`,
      });
    }

    let sessionRow: typeof playSessions.$inferSelect | null = null;
    if (script.freeSpinsAwarded > 0) {
      const stale = await tx
        .select()
        .from(playSessions)
        .where(
          and(
            eq(playSessions.userId, user.id),
            eq(playSessions.gameId, MYSTIC_RUNES_GAME_ID),
            eq(playSessions.status, "open"),
          ),
        );
      for (const s of stale) {
        await tx.update(playSessions).set({ status: "closed", freeSpinsLeft: 0 }).where(eq(playSessions.id, s.id));
      }

      const id = newId();
      await tx.insert(playSessions).values({
        id,
        userId: user.id,
        gameId: MYSTIC_RUNES_GAME_ID,
        status: "open",
        bet: money(data.bet),
        ante: "no",
        freeSpinsLeft: script.freeSpinsAwarded,
        fsSessionWin: "0.00",
        fsBombAcc: "1.00",
        fsSpinsPlayed: 0,
        featureState: null,
      });
      const created = await tx.select().from(playSessions).where(eq(playSessions.id, id)).limit(1);
      sessionRow = created[0] ?? null;
    }

    return { balance: ledger.balance, sessionRow };
  });

  return {
    balance: result.balance,
    script,
    session: sessionState(result.sessionRow),
  };
}

export async function mysticRunesFreeSpin(data: {
  sessionId: string;
}): Promise<MysticRunesSpinResult> {
  const user = await requireUser();
  const db = getDb();

  const sessions = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, data.sessionId),
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, MYSTIC_RUNES_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  const session = sessions[0];
  if (!session) throw new Error("Free spin session not found");
  if (Number(session.freeSpinsLeft) <= 0) throw new Error("No free spins remaining");

  const bet = Number(session.bet);
  const startMult = Math.max(1, Number(session.fsBombAcc) || 1);

  const { script, finalizeFreeSpinTotal } = await resolveOnServer({
    bet,
    isFreeSpins: true,
    startMultiplier: startMult,
  });

  const result = await db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(playSessions)
      .where(and(eq(playSessions.id, data.sessionId), eq(playSessions.status, "open")))
      .for("update")
      .limit(1);
    const row = locked[0];
    if (!row) throw new Error("Free spin session not found");
    const left = Number(row.freeSpinsLeft);
    if (left <= 0) throw new Error("No free spins remaining");

    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const u = userRows[0];
    if (!u) throw new Error("User not found");

    let nextWin = +(Number(row.fsSessionWin) + script.totalWin).toFixed(2);
    let nextMult = Math.max(1, script.endMultiplier);
    let nextPlayed = Number(row.fsSpinsPlayed) + 1;
    let nextLeft = left - 1;
    if (script.retriggerSpins > 0) nextLeft += script.retriggerSpins;
    nextLeft = Math.max(0, nextLeft);

    let balance = Number(u.balance);
    let fsPayout: MysticRunesSpinResult["fsPayout"];

    if (nextLeft === 0) {
      const final = finalizeFreeSpinTotal(nextWin, nextMult);
      if (final > 0) {
        const winRes = await writeLedgerDelta(tx, {
          userId: user.id,
          username: u.username,
          delta: final,
          type: "win",
          game: GAME_NAME,
          note: `${MYSTIC_RUNES_GAME_ID} · ${GAME_NAME} · free spins win ₱${final.toFixed(2)}`,
        });
        balance = winRes.balance;
      }
      fsPayout = {
        amount: final,
        baseEarn: nextWin,
        multiplier: nextMult,
        spinsPlayed: Math.max(nextPlayed, 1),
      };
      await tx
        .update(playSessions)
        .set({
          status: "closed",
          freeSpinsLeft: 0,
          fsSessionWin: money(nextWin),
          fsBombAcc: money(nextMult),
          fsSpinsPlayed: nextPlayed,
          featureState: null,
        })
        .where(eq(playSessions.id, row.id));
      return {
        balance,
        sessionRow: null as typeof playSessions.$inferSelect | null,
        fsPayout,
        closed: true as const,
        nextWin,
        nextMult,
        nextPlayed,
      };
    }

    await tx
      .update(playSessions)
      .set({
        freeSpinsLeft: nextLeft,
        fsSessionWin: money(nextWin),
        fsBombAcc: money(nextMult),
        fsSpinsPlayed: nextPlayed,
        featureState: null,
      })
      .where(eq(playSessions.id, row.id));

    const updated = await tx.select().from(playSessions).where(eq(playSessions.id, row.id)).limit(1);
    return {
      balance,
      sessionRow: updated[0] ?? null,
      fsPayout: undefined,
      closed: false as const,
      nextWin,
      nextMult,
      nextPlayed,
    };
  });

  return {
    balance: result.balance,
    script,
    session: result.closed
      ? {
          sessionId: null,
          freeSpinsLeft: 0,
          fsSessionWin: result.nextWin,
          fsMult: result.nextMult,
          fsSpinsPlayed: result.nextPlayed,
          inFree: false,
          bet,
        }
      : sessionState(result.sessionRow),
    fsPayout: result.fsPayout,
  };
}

export async function mysticRunesBuyFeature(data: {
  bet: number;
}): Promise<{ balance: number; session: MysticRunesSessionState; awarded: number }> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet");

  const cfg = await loadEngineConfig();
  const cost = +(data.bet * cfg.buyFeatureMult).toFixed(2);
  const awarded =
    freeSpinsAwardForCount(cfg, cfg.freeSpinsTriggerCount) ||
    cfg.freeSpinsAwards[0]?.spins ||
    10;
  await assertNotInMaintenanceForBets();

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User not found");

    const balance = Number(row.balance);
    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(balance, pending);
    if (cost > available) {
      throw new Error(
        pending > 0
          ? `Insufficient available balance (₱${pending.toFixed(2)} held for pending withdrawal)`
          : "Insufficient balance",
      );
    }

    const stale = await tx
      .select()
      .from(playSessions)
      .where(
        and(
          eq(playSessions.userId, user.id),
          eq(playSessions.gameId, MYSTIC_RUNES_GAME_ID),
          eq(playSessions.status, "open"),
        ),
      );
    for (const s of stale) {
      await tx.update(playSessions).set({ status: "closed", freeSpinsLeft: 0 }).where(eq(playSessions.id, s.id));
    }

    const betRes = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: GAME_NAME,
      note: `${MYSTIC_RUNES_GAME_ID} · ${GAME_NAME} · buy feature ₱${cost.toFixed(2)}`,
    });

    const id = newId();
    await tx.insert(playSessions).values({
      id,
      userId: user.id,
      gameId: MYSTIC_RUNES_GAME_ID,
      status: "open",
      bet: money(data.bet),
      ante: "no",
      freeSpinsLeft: awarded,
      fsSessionWin: "0.00",
      fsBombAcc: "1.00",
      fsSpinsPlayed: 0,
      featureState: null,
    });
    const created = await tx.select().from(playSessions).where(eq(playSessions.id, id)).limit(1);
    return { balance: betRes.balance, sessionRow: created[0]! };
  });

  return { balance: result.balance, session: sessionState(result.sessionRow), awarded };
}
