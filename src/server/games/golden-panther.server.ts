/**
 * Panther Peak — server-authoritative spin settle.
 * Client only receives scripts + balances; it cannot choose win amounts.
 */
import { and, eq } from "drizzle-orm";
import { GOLDEN_PANTHER_GAME_ID, normalizeGoldenPantherConfig, remainingFreeSpinsAfterSpin } from "@/lib/golden-panther-config";
import { getDb } from "../db/client";
import { gameControls, playSessions, users } from "../db/schema";
import { money, newId, requireUser } from "../session";
import {
  applyCapToScriptTotalWin,
  enforcePoolCap,
} from "../settlement/enforcePoolCap";
import {
  assertNotInMaintenanceForBets,
  availableFrom,
  getMaxSingleBet,
  sumPendingWithdrawals,
  writeLedgerDelta,
} from "../wallet.server";

const GAME_NAME = "Panther Peak";

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
      .where(eq(gameControls.gameId, GOLDEN_PANTHER_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    if (!raw) return normalizeGoldenPantherConfig(null);
    return normalizeGoldenPantherConfig(JSON.parse(raw) as unknown);
  } catch {
    return normalizeGoldenPantherConfig(null);
  }
}

async function resolveOnServer(opts: {
  bet: number;
  ante: boolean;
  isFreeSpins: boolean;
  initialBombAccumulator?: number;
}) {
  const cfg = await loadEngineConfig();
  return withEngineExclusive(async () => {
    const { setGoldenPantherConfig } = await import("@/components/maxhigh/golden-panther/runtimeConfig");
    const { resolveSpin, finalizeFreeSpinTotal } = await import(
      "@/components/maxhigh/golden-panther/spinResolver"
    );
    setGoldenPantherConfig(cfg);
    const script = resolveSpin({
      bet: opts.bet,
      ante: opts.ante && !opts.isFreeSpins,
      isFreeSpins: opts.isFreeSpins,
      collectBombsInFreeSpins: true,
      initialBombAccumulator: opts.initialBombAccumulator,
    });
    return { script, finalizeFreeSpinTotal, cfg };
  });
}

export type GoldenPantherSessionState = {
  sessionId: string | null;
  freeSpinsLeft: number;
  fsSessionWin: number;
  fsBombAcc: number;
  fsSpinsPlayed: number;
  inFree: boolean;
  bet: number;
  ante: boolean;
};

export type GoldenPantherSpinResult = {
  balance: number;
  script: Awaited<ReturnType<typeof import("@/components/maxhigh/golden-panther/spinResolver").resolveSpin>>;
  session: GoldenPantherSessionState;
  /** Set when a free-spin feature just finished and win was paid. */
  fsPayout?: {
    amount: number;
    baseEarn: number;
    multiplier: number;
    spinsPlayed: number;
  };
};

function sessionState(row: typeof playSessions.$inferSelect | null): GoldenPantherSessionState {
  if (!row || row.status !== "open") {
    return {
      sessionId: null,
      freeSpinsLeft: 0,
      fsSessionWin: 0,
      fsBombAcc: 0,
      fsSpinsPlayed: 0,
      inFree: false,
      bet: 0,
      ante: false,
    };
  }
  return {
    sessionId: row.id,
    freeSpinsLeft: Number(row.freeSpinsLeft),
    fsSessionWin: Number(row.fsSessionWin),
    fsBombAcc: Number(row.fsBombAcc),
    fsSpinsPlayed: Number(row.fsSpinsPlayed),
    inFree: Number(row.freeSpinsLeft) > 0,
    bet: Number(row.bet),
    ante: row.ante === "yes",
  };
}

async function closeOtherOpenSessions(userId: string, keepId?: string) {
  const db = getDb();
  const open = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        eq(playSessions.gameId, GOLDEN_PANTHER_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    );
  for (const row of open) {
    if (keepId && row.id === keepId) continue;
    await db.update(playSessions).set({ status: "closed", freeSpinsLeft: 0 }).where(eq(playSessions.id, row.id));
  }
}

export async function getGoldenPantherOpenSession(): Promise<GoldenPantherSessionState> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, GOLDEN_PANTHER_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  return sessionState(rows[0] ?? null);
}

export async function goldenPantherPaidSpin(data: {
  bet: number;
  ante: boolean;
}): Promise<GoldenPantherSpinResult> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet");

  const cfg = await loadEngineConfig();
  const anteMult = data.ante ? cfg.anteBetMult : 1;
  const cost = +(data.bet * anteMult).toFixed(2);
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
        eq(playSessions.gameId, GOLDEN_PANTHER_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  if (existing[0] && Number(existing[0].freeSpinsLeft) > 0) {
    throw new Error("Finish free spins before placing a new bet");
  }

  const { script } = await resolveOnServer({
    bet: data.bet,
    ante: data.ante,
    isFreeSpins: false,
  });
  applyCapToScriptTotalWin(script, {
    gameId: GOLDEN_PANTHER_GAME_ID,
    gameName: GAME_NAME,
    bet: data.bet,
    maxWinMult: cfg.maxWinMult,
    context: "paid-spin",
  });

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
      note: `${GOLDEN_PANTHER_GAME_ID} · ${GAME_NAME} · wager ₱${cost.toFixed(2)}`,
    });

    if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: `${GOLDEN_PANTHER_GAME_ID} · ${GAME_NAME} · win ₱${script.totalWin.toFixed(2)}`,
      });
    }

    const balanceAfterBet = ledger.balance;

    let sessionRow: typeof playSessions.$inferSelect | null = null;
    if (script.freeSpinsAwarded > 0) {
      // Close any stale sessions then open FS feature
      const stale = await tx
        .select()
        .from(playSessions)
        .where(
          and(
            eq(playSessions.userId, user.id),
            eq(playSessions.gameId, GOLDEN_PANTHER_GAME_ID),
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
        gameId: GOLDEN_PANTHER_GAME_ID,
        status: "open",
        bet: money(data.bet),
        ante: data.ante ? "yes" : "no",
        freeSpinsLeft: script.freeSpinsAwarded,
        fsSessionWin: "0.00",
        fsBombAcc: "0.00",
        fsSpinsPlayed: 0,
      });
      const created = await tx.select().from(playSessions).where(eq(playSessions.id, id)).limit(1);
      sessionRow = created[0] ?? null;
    }

    return { balance: balanceAfterBet, sessionRow };
  });

  return {
    balance: result.balance,
    script,
    session: sessionState(result.sessionRow),
  };
}

export async function goldenPantherFreeSpin(data: {
  sessionId: string;
}): Promise<GoldenPantherSpinResult> {
  const user = await requireUser();
  const db = getDb();

  const sessions = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, data.sessionId),
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, GOLDEN_PANTHER_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  const session = sessions[0];
  if (!session) throw new Error("Free spin session not found");
  if (Number(session.freeSpinsLeft) <= 0) throw new Error("No free spins remaining");

  const bet = Number(session.bet);
  const { script, finalizeFreeSpinTotal, cfg } = await resolveOnServer({
    bet,
    ante: session.ante === "yes",
    isFreeSpins: true,
    initialBombAccumulator: Number(session.fsBombAcc) || 0,
  });
  applyCapToScriptTotalWin(script, {
    gameId: GOLDEN_PANTHER_GAME_ID,
    gameName: GAME_NAME,
    bet,
    maxWinMult: cfg.maxWinMult,
    context: "free-spin",
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
    const bombCeiling = cfg.maxFsBombMult > 0 ? cfg.maxFsBombMult : Number.POSITIVE_INFINITY;
    let nextBomb = Math.min(bombCeiling, Number(row.fsBombAcc) + script.bombAccumulator);
    let nextPlayed = Number(row.fsSpinsPlayed) + 1;
    let nextLeft = remainingFreeSpinsAfterSpin({
      leftBefore: left,
      retrigger: script.retriggerSpins,
      playedAfter: nextPlayed,
      maxSessionSpins: cfg.maxFsSessionSpins,
    });

    let balance = Number(u.balance);
    let fsPayout: GoldenPantherSpinResult["fsPayout"];

    if (nextLeft === 0) {
      const final = enforcePoolCap({
        gameId: GOLDEN_PANTHER_GAME_ID,
        gameName: GAME_NAME,
        bet,
        maxWinMult: cfg.maxWinMult,
        computedWin: finalizeFreeSpinTotal(nextWin, nextBomb),
        context: "free-spins-final",
      }).payout;
      if (final > 0) {
        const winRes = await writeLedgerDelta(tx, {
          userId: user.id,
          username: u.username,
          delta: final,
          type: "win",
          game: GAME_NAME,
          note: `${GOLDEN_PANTHER_GAME_ID} · ${GAME_NAME} · free spins win ₱${final.toFixed(2)}`,
        });
        balance = winRes.balance;
      }
      fsPayout = {
        amount: final,
        baseEarn: nextWin,
        multiplier: nextBomb,
        spinsPlayed: Math.max(nextPlayed, 1),
      };
      await tx
        .update(playSessions)
        .set({
          status: "closed",
          freeSpinsLeft: 0,
          fsSessionWin: money(nextWin),
          fsBombAcc: money(nextBomb),
          fsSpinsPlayed: nextPlayed,
        })
        .where(eq(playSessions.id, row.id));
      return {
        balance,
        sessionRow: null as typeof playSessions.$inferSelect | null,
        fsPayout,
        closed: true as const,
        nextWin,
        nextBomb,
        nextPlayed,
      };
    }

    await tx
      .update(playSessions)
      .set({
        freeSpinsLeft: nextLeft,
        fsSessionWin: money(nextWin),
        fsBombAcc: money(nextBomb),
        fsSpinsPlayed: nextPlayed,
      })
      .where(eq(playSessions.id, row.id));

    const updated = await tx.select().from(playSessions).where(eq(playSessions.id, row.id)).limit(1);
    return {
      balance,
      sessionRow: updated[0] ?? null,
      fsPayout: undefined,
      closed: false as const,
      nextWin,
      nextBomb,
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
          fsBombAcc: result.nextBomb,
          fsSpinsPlayed: result.nextPlayed,
          inFree: false,
          bet,
          ante: session.ante === "yes",
        }
      : sessionState(result.sessionRow),
    fsPayout: result.fsPayout,
  };
}

export async function goldenPantherBuyFeature(data: {
  bet: number;
  mode: "normal" | "super";
}): Promise<{ balance: number; session: GoldenPantherSessionState }> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet");

  const cfg = await loadEngineConfig();
  const mult = data.mode === "super" ? cfg.superBuyFeatureMult : cfg.buyFeatureMult;
  const cost = +(data.bet * mult).toFixed(2);
  const maxBet = await getMaxSingleBet();
  if (cost > maxBet * Math.max(mult, 1)) {
    // buy feature can exceed single spin max; still cap at risk max * buy mult
  }
  if (cost > Number((await getMaxSingleBet()) * 500)) {
    throw new Error("Buy feature amount too large");
  }

  await assertNotInMaintenanceForBets();
  await closeOtherOpenSessions(user.id);

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
          eq(playSessions.gameId, GOLDEN_PANTHER_GAME_ID),
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
      note:
        data.mode === "super"
          ? `${GOLDEN_PANTHER_GAME_ID} · ${GAME_NAME} · buy super feature ₱${cost.toFixed(2)}`
          : `${GOLDEN_PANTHER_GAME_ID} · ${GAME_NAME} · buy feature ₱${cost.toFixed(2)}`,
    });

    const id = newId();
    const ante = data.mode === "super" ? ("yes" as const) : ("no" as const);
    await tx.insert(playSessions).values({
      id,
      userId: user.id,
      gameId: GOLDEN_PANTHER_GAME_ID,
      status: "open",
      bet: money(data.bet),
      ante,
      freeSpinsLeft: cfg.freeSpinsBase,
      fsSessionWin: "0.00",
      fsBombAcc: "0.00",
      fsSpinsPlayed: 0,
    });
    const created = await tx.select().from(playSessions).where(eq(playSessions.id, id)).limit(1);
    return { balance: betRes.balance, sessionRow: created[0]! };
  });

  return { balance: result.balance, session: sessionState(result.sessionRow) };
}
