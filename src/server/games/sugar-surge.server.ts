/**
 * Sugar Surge — server-authoritative spin settle.
 * Client only receives scripts + balances; it cannot choose win amounts.
 */
import { and, eq } from "drizzle-orm";
import { SUGAR_SURGE_GAME_ID, normalizeSugarSurgeConfig } from "@/lib/sugar-surge-config";
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

const GAME_NAME = "Sugar Surge";

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
      .where(eq(gameControls.gameId, SUGAR_SURGE_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    if (!raw) return normalizeSugarSurgeConfig(null);
    return normalizeSugarSurgeConfig(JSON.parse(raw) as unknown);
  } catch {
    return normalizeSugarSurgeConfig(null);
  }
}

async function resolveOnServer(opts: {
  bet: number;
  ante: boolean;
  isFreeSpins: boolean;
  initialPositionMults?: number[];
}) {
  const cfg = await loadEngineConfig();
  return withEngineExclusive(async () => {
    const { setSugarSurgeConfig } = await import("@/components/maxhigh/sugar-surge/runtimeConfig");
    const { resolveSpin, finalizeFreeSpinTotal } = await import(
      "@/components/maxhigh/sugar-surge/spinResolver"
    );
    setSugarSurgeConfig(cfg);
    const script = resolveSpin({
      bet: opts.bet,
      ante: opts.ante && !opts.isFreeSpins,
      isFreeSpins: opts.isFreeSpins,
      initialPositionMults: opts.initialPositionMults,
    });
    return { script, finalizeFreeSpinTotal, cfg };
  });
}

type FeatureState = { positionMults?: number[] };

function parseFeatureState(raw: string | null | undefined): FeatureState {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as FeatureState;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function sumMults(mults: number[] | undefined): number {
  if (!mults?.length) return 0;
  return mults.reduce((a, m) => a + (m > 0 ? m : 0), 0);
}

export type SugarSurgeSessionState = {
  sessionId: string | null;
  freeSpinsLeft: number;
  fsSessionWin: number;
  fsBombAcc: number;
  fsSpinsPlayed: number;
  inFree: boolean;
  bet: number;
  ante: boolean;
};

export type SugarSurgeSpinResult = {
  balance: number;
  script: Awaited<ReturnType<typeof import("@/components/maxhigh/sugar-surge/spinResolver").resolveSpin>>;
  session: SugarSurgeSessionState;
  /** Set when a free-spin feature just finished and win was paid. */
  fsPayout?: {
    amount: number;
    baseEarn: number;
    multiplier: number;
    spinsPlayed: number;
  };
};

function sessionState(row: typeof playSessions.$inferSelect | null): SugarSurgeSessionState {
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
        eq(playSessions.gameId, SUGAR_SURGE_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    );
  for (const row of open) {
    if (keepId && row.id === keepId) continue;
    await db.update(playSessions).set({ status: "closed", freeSpinsLeft: 0 }).where(eq(playSessions.id, row.id));
  }
}

export async function getSugarSurgeOpenSession(): Promise<SugarSurgeSessionState> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, SUGAR_SURGE_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  return sessionState(rows[0] ?? null);
}

export async function sugarSurgePaidSpin(data: {
  bet: number;
  ante: boolean;
}): Promise<SugarSurgeSpinResult> {
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
        eq(playSessions.gameId, SUGAR_SURGE_GAME_ID),
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
      note: `${SUGAR_SURGE_GAME_ID} · ${GAME_NAME} · wager ₱${cost.toFixed(2)}`,
    });

    if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: `${SUGAR_SURGE_GAME_ID} · ${GAME_NAME} · win ₱${script.totalWin.toFixed(2)}`,
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
            eq(playSessions.gameId, SUGAR_SURGE_GAME_ID),
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
        gameId: SUGAR_SURGE_GAME_ID,
        status: "open",
        bet: money(data.bet),
        ante: data.ante ? "yes" : "no",
        freeSpinsLeft: script.freeSpinsAwarded,
        fsSessionWin: "0.00",
        fsBombAcc: money(sumMults(script.finalPositionMults)),
        fsSpinsPlayed: 0,
        featureState: JSON.stringify({
          positionMults: script.finalPositionMults,
        }),
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

export async function sugarSurgeFreeSpin(data: {
  sessionId: string;
}): Promise<SugarSurgeSpinResult> {
  const user = await requireUser();
  const db = getDb();

  const sessions = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, data.sessionId),
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, SUGAR_SURGE_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  const session = sessions[0];
  if (!session) throw new Error("Free spin session not found");
  if (Number(session.freeSpinsLeft) <= 0) throw new Error("No free spins remaining");

  const bet = Number(session.bet);
  const feature = parseFeatureState(session.featureState);
  const { script, finalizeFreeSpinTotal } = await resolveOnServer({
    bet,
    ante: session.ante === "yes",
    isFreeSpins: true,
    initialPositionMults: feature.positionMults,
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

    // Each FS spin totalWin already includes position multipliers for that cascade.
    let nextWin = +(Number(row.fsSessionWin) + script.totalWin).toFixed(2);
    const boardMultSum = sumMults(script.finalPositionMults);
    let nextBomb = boardMultSum;
    let nextPlayed = Number(row.fsSpinsPlayed) + 1;
    let nextLeft = left - 1;
    if (script.retriggerSpins > 0) nextLeft += script.retriggerSpins;
    nextLeft = Math.max(0, nextLeft);

    const featurePayload = JSON.stringify({
      positionMults: script.finalPositionMults,
    });

    let balance = Number(u.balance);
    let fsPayout: SugarSurgeSpinResult["fsPayout"];

    if (nextLeft === 0) {
      const final = finalizeFreeSpinTotal(nextWin, 0);
      if (final > 0) {
        const winRes = await writeLedgerDelta(tx, {
          userId: user.id,
          username: u.username,
          delta: final,
          type: "win",
          game: GAME_NAME,
          note: `${SUGAR_SURGE_GAME_ID} · ${GAME_NAME} · free spins win ₱${final.toFixed(2)}`,
        });
        balance = winRes.balance;
      }
      fsPayout = {
        amount: final,
        baseEarn: nextWin,
        multiplier: Math.max(1, boardMultSum),
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
          featureState: null,
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
        featureState: featurePayload,
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

export async function sugarSurgeBuyFeature(data: {
  bet: number;
  mode: "normal" | "super";
}): Promise<{ balance: number; session: SugarSurgeSessionState }> {
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
          eq(playSessions.gameId, SUGAR_SURGE_GAME_ID),
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
          ? `${SUGAR_SURGE_GAME_ID} · ${GAME_NAME} · buy super feature ₱${cost.toFixed(2)}`
          : `${SUGAR_SURGE_GAME_ID} · ${GAME_NAME} · buy feature ₱${cost.toFixed(2)}`,
    });

    const id = newId();
    const ante = data.mode === "super" ? ("yes" as const) : ("no" as const);
    await tx.insert(playSessions).values({
      id,
      userId: user.id,
      gameId: SUGAR_SURGE_GAME_ID,
      status: "open",
      bet: money(data.bet),
      ante,
      freeSpinsLeft: cfg.freeSpinsBase,
      fsSessionWin: "0.00",
      fsBombAcc: "0.00",
      fsSpinsPlayed: 0,
      featureState: JSON.stringify({ positionMults: [] }),
    });
    const created = await tx.select().from(playSessions).where(eq(playSessions.id, id)).limit(1);
    return { balance: betRes.balance, sessionRow: created[0]! };
  });

  return { balance: result.balance, session: sessionState(result.sessionRow) };
}
