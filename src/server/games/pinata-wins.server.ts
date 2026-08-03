/**
 * Piñata Wins — server-authoritative settlement.
 * Persistent Free Spins multiplier stored in playSessions.fsBombAcc.
 */

import { and, eq } from "drizzle-orm";
import {
  PINATA_WINS_GAME_ID,
  normalizePinataWinsConfig,
  type PwWinsConfig,
} from "@/lib/pinata-wins-config";
import { getDb } from "../db/client";
import { gameControls, playSessions, users } from "../db/schema";
import { newId, requireUser } from "../session";
import {
  assertNotInMaintenanceForBets,
  availableFrom,
  getMaxSingleBet,
  sumPendingWithdrawals,
  writeLedgerDelta,
} from "../wallet.server";
import { recordGameEngineAuditLog } from "./game-audit.server";
import { setPinataWinsConfig } from "@/components/maxhigh/pinata-wins/runtimeConfig";
import { resolvePinataSpin } from "@/components/maxhigh/pinata-wins/spinResolver";

const GAME_NAME = "Piñata Wins";

let cachedConfig: { cfg: PwWinsConfig; time: number } | null = null;

export function clearPinataWinsEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<PwWinsConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, PINATA_WINS_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizePinataWinsConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizePinataWinsConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

async function resolveOnServer(opts: {
  bet: number;
  isFreeSpins: boolean;
  persistentMult?: number;
  retriggersAlready?: number;
  alreadyTowardCap?: number;
}) {
  const cfg = await loadEngineConfig();
  setPinataWinsConfig(cfg);
  const script = resolvePinataSpin({
    totalBet: opts.bet,
    isFreeSpins: opts.isFreeSpins,
    persistentMult: opts.persistentMult,
    retriggersAlready: opts.retriggersAlready,
    alreadyTowardCap: opts.alreadyTowardCap,
  });
  return { script, cfg };
}

export type PinataWinsSessionState = {
  sessionId: string | null;
  freeSpinsLeft: number;
  fsSessionWin: number;
  fsSpinsPlayed: number;
  /** Persistent Gold Frame mult accumulator for the FS session */
  persistentMult: number;
  inFree: boolean;
  bet: number;
};

export type PinataWinsSpinResult = {
  balance: number;
  script: ReturnType<typeof resolvePinataSpin>;
  session: PinataWinsSessionState;
  fsPayout?: { amount: number; spinsPlayed: number };
};

function money(n: number) {
  return n.toFixed(2);
}

function sessionState(row: typeof playSessions.$inferSelect | null): PinataWinsSessionState {
  if (!row || row.status !== "open") {
    return {
      sessionId: null,
      freeSpinsLeft: 0,
      fsSessionWin: 0,
      fsSpinsPlayed: 0,
      persistentMult: 0,
      inFree: false,
      bet: 0,
    };
  }
  return {
    sessionId: row.id,
    freeSpinsLeft: Number(row.freeSpinsLeft),
    fsSessionWin: Number(row.fsSessionWin),
    fsSpinsPlayed: Number(row.fsSpinsPlayed),
    persistentMult: Number(row.fsBombAcc),
    inFree: Number(row.freeSpinsLeft) > 0,
    bet: Number(row.bet),
  };
}

export async function getPinataWinsOpenSession(): Promise<PinataWinsSessionState> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, PINATA_WINS_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  return sessionState(rows[0] ?? null);
}

export async function getPinataWinsEngineConfigPublic(): Promise<PwWinsConfig> {
  return loadEngineConfig();
}

export async function pinataWinsPaidSpin(data: { bet: number }): Promise<PinataWinsSpinResult> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet amount");

  const cfg = await loadEngineConfig();
  const cost = +data.bet.toFixed(2);
  if (cost < cfg.minBet) throw new Error(`Min bet is ₱${cfg.minBet.toFixed(2)}`);
  if (cost > cfg.maxBet) throw new Error(`Max bet is ₱${cfg.maxBet.toFixed(2)}`);
  const maxBet = await getMaxSingleBet();
  if (cost > maxBet) throw new Error(`Max single bet limit is ₱${maxBet.toFixed(2)}`);

  await assertNotInMaintenanceForBets();

  const db = getDb();
  const existingSession = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, PINATA_WINS_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  if (existingSession[0] && Number(existingSession[0].freeSpinsLeft) > 0) {
    throw new Error("Active free spins in progress. Complete free spins before a new bet.");
  }

  const { script } = await resolveOnServer({ bet: data.bet, isFreeSpins: false });
  const roundId = newId();

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User account not found");

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
      note: `${PINATA_WINS_GAME_ID} · ${GAME_NAME} · wager ₱${cost.toFixed(2)}`,
    });

    if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: `${PINATA_WINS_GAME_ID} · ${GAME_NAME} · win ₱${script.totalWin.toFixed(2)}`,
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
            eq(playSessions.gameId, PINATA_WINS_GAME_ID),
            eq(playSessions.status, "open"),
          ),
        );
      for (const s of stale) {
        await tx
          .update(playSessions)
          .set({ status: "closed", freeSpinsLeft: 0 })
          .where(eq(playSessions.id, s.id));
      }

      const sid = newId();
      await tx.insert(playSessions).values({
        id: sid,
        userId: user.id,
        gameId: PINATA_WINS_GAME_ID,
        status: "open",
        freeSpinsLeft: script.freeSpinsAwarded,
        fsSessionWin: "0",
        fsBombAcc: "0",
        fsSpinsPlayed: 0,
        bet: String(data.bet),
        ante: "no",
        featureState: null,
      });
      const updated = await tx.select().from(playSessions).where(eq(playSessions.id, sid)).limit(1);
      sessionRow = updated[0] ?? null;
    }

    return { balance: ledger.balance, sessionRow, username: row.username };
  });

  void recordGameEngineAuditLog({
    gameId: PINATA_WINS_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: cost,
    payoutAmount: script.totalWin,
    multiplier: cost > 0 ? script.totalWin / cost : 0,
    resultMeta: {
      seed: script.seed,
      freeSpinsAwarded: script.freeSpinsAwarded,
      goldFrameCollected: script.goldFrameCollected,
      goldFrameAppliedMult: script.goldFrameAppliedMult,
      scatterCount: script.scatterCount,
      cascadeSteps: script.steps.length,
      hitCap: !!script.hitCap,
    },
  });

  return {
    balance: result.balance,
    script,
    session: sessionState(result.sessionRow),
  };
}

export async function pinataWinsFreeSpin(data: {
  sessionId: string;
}): Promise<PinataWinsSpinResult> {
  const user = await requireUser();
  await assertNotInMaintenanceForBets();

  const db = getDb();
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, data.sessionId),
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, PINATA_WINS_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  const currentSession = sessionRows[0];
  if (!currentSession || Number(currentSession.freeSpinsLeft) <= 0) {
    throw new Error("No active free spins remaining");
  }

  const bet = Number(currentSession.bet);
  const persistentMult = Number(currentSession.fsBombAcc) || 0;
  const { script } = await resolveOnServer({
    bet,
    isFreeSpins: true,
    persistentMult,
    retriggersAlready: Number(currentSession.fsSpinsPlayed),
    alreadyTowardCap: Number(currentSession.fsSessionWin) || 0,
  });
  const roundId = newId();

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User account not found");

    const left = Number(currentSession.freeSpinsLeft) - 1 + script.freeSpinsAwarded;
    const played = Number(currentSession.fsSpinsPlayed) + 1;
    const accumulatedWin = +(Number(currentSession.fsSessionWin) + script.totalWin).toFixed(2);
    const nextMult = script.persistentMultAfter;
    const isFinished = left <= 0;

    let fsPayout: PinataWinsSpinResult["fsPayout"];

    await tx
      .update(playSessions)
      .set({
        freeSpinsLeft: Math.max(0, left),
        fsSpinsPlayed: played,
        fsSessionWin: money(accumulatedWin),
        fsBombAcc: money(nextMult),
        status: isFinished ? "closed" : "open",
      })
      .where(eq(playSessions.id, currentSession.id));

    let currentBalance = Number(row.balance);

    if (isFinished && accumulatedWin > 0) {
      const ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: accumulatedWin,
        type: "win",
        game: GAME_NAME,
        note: `${PINATA_WINS_GAME_ID} · ${GAME_NAME} · Free spins final payout ₱${accumulatedWin.toFixed(2)}`,
      });
      currentBalance = ledger.balance;
      fsPayout = { amount: accumulatedWin, spinsPlayed: played };
    }

    const updatedSession = await tx
      .select()
      .from(playSessions)
      .where(eq(playSessions.id, currentSession.id))
      .limit(1);

    return {
      balance: currentBalance,
      sessionRow: updatedSession[0] ?? null,
      fsPayout,
      username: row.username,
      left,
      played,
      accumulatedWin,
      nextMult,
    };
  });

  void recordGameEngineAuditLog({
    gameId: PINATA_WINS_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: 0,
    payoutAmount: script.totalWin,
    multiplier: bet > 0 ? script.totalWin / bet : 0,
    resultMeta: {
      seed: script.seed,
      isFreeSpin: true,
      freeSpinsLeft: result.left,
      persistentMultBefore: script.persistentMultBefore,
      persistentMultAfter: script.persistentMultAfter,
      goldFrameCollected: script.goldFrameCollected,
      hitCap: !!script.hitCap,
    },
  });

  return {
    balance: result.balance,
    script,
    session: sessionState(result.sessionRow),
    fsPayout: result.fsPayout,
  };
}

export async function pinataWinsBuyFeature(data: { bet: number }): Promise<PinataWinsSpinResult> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet amount");

  const cfg = await loadEngineConfig();
  const cost = +(data.bet * cfg.buyFeatureMult).toFixed(2);
  if (data.bet < cfg.minBet) throw new Error(`Min bet is ₱${cfg.minBet.toFixed(2)}`);
  if (data.bet > cfg.maxBet) throw new Error(`Max bet is ₱${cfg.maxBet.toFixed(2)}`);
  const maxBet = await getMaxSingleBet();
  if (cost > maxBet) throw new Error(`Buy Feature cost exceeds max single bet ₱${maxBet.toFixed(2)}`);

  await assertNotInMaintenanceForBets();

  const db = getDb();
  const existingSession = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, PINATA_WINS_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  if (existingSession[0] && Number(existingSession[0].freeSpinsLeft) > 0) {
    throw new Error("Active free spins in progress. Complete free spins before a new bet.");
  }

  // Feature buy: skip base game; enter FS directly with base award count.
  const dummyScript = {
    seed: `pw-buy-${Date.now().toString(36)}`,
    steps: [],
    grid: [] as ReturnType<typeof resolvePinataSpin>["grid"],
    paylineWins: [],
    paylineWinRaw: 0,
    goldFrameCollected: 0,
    goldFrameAppliedMult: 1,
    paylineWin: 0,
    scatterCount: cfg.freeSpinsTriggerCount,
    freeSpinsAwarded: cfg.freeSpinsBaseCount,
    totalWin: 0,
    persistentMultBefore: 0,
    persistentMultAfter: 0,
  } satisfies ReturnType<typeof resolvePinataSpin>;

  const roundId = newId();

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User account not found");

    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(Number(row.balance), pending);
    if (cost > available) throw new Error(`Insufficient balance to buy feature (₱${cost.toFixed(2)})`);

    const ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: GAME_NAME,
      note: `${PINATA_WINS_GAME_ID} · ${GAME_NAME} · Feature Buy ₱${cost.toFixed(2)}`,
    });

    const sid = newId();
    await tx.insert(playSessions).values({
      id: sid,
      userId: user.id,
      gameId: PINATA_WINS_GAME_ID,
      status: "open",
      freeSpinsLeft: cfg.freeSpinsBaseCount,
      fsSessionWin: "0",
      fsBombAcc: "0",
      fsSpinsPlayed: 0,
      bet: String(data.bet),
      ante: "no",
      featureState: JSON.stringify({ featureBuy: true }),
    });

    const updated = await tx.select().from(playSessions).where(eq(playSessions.id, sid)).limit(1);
    return { balance: ledger.balance, sessionRow: updated[0] ?? null, username: row.username };
  });

  void recordGameEngineAuditLog({
    gameId: PINATA_WINS_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: cost,
    payoutAmount: 0,
    multiplier: 0,
    resultMeta: { isBuyFeature: true, freeSpinsAwarded: cfg.freeSpinsBaseCount },
  });

  return {
    balance: result.balance,
    script: dummyScript,
    session: sessionState(result.sessionRow),
  };
}
