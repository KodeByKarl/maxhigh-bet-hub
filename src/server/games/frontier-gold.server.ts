/**
 * Frontier Gold — server-authoritative spin settlement (Hold & Win + Free Spins).
 */

import { and, eq } from "drizzle-orm";
import {
  FRONTIER_GOLD_GAME_ID,
  normalizeFrontierGoldConfig,
  type FrontierGoldConfig,
} from "@/lib/frontier-gold-config";
import { getDb } from "../db/client";
import { gameControls, playSessions, users } from "../db/schema";
import { newId, requireUser } from "../session";
import { applyCapToScriptTotalWin, enforcePoolCap } from "../settlement/enforcePoolCap";
import {
  assertNotInMaintenanceForBets,
  availableFrom,
  getMaxSingleBet,
  sumPendingWithdrawals,
  writeLedgerDelta,
} from "../wallet.server";
import { recordGameEngineAuditLog } from "./game-audit.server";
import { setFrontierGoldConfig } from "@/components/maxhigh/frontier-gold/runtimeConfig";
import { resolveFrontierSpin } from "@/components/maxhigh/frontier-gold/spinResolver";

const GAME_NAME = "Frontier Gold";

let cachedConfig: { cfg: FrontierGoldConfig; time: number } | null = null;

export function clearFrontierGoldEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<FrontierGoldConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, FRONTIER_GOLD_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeFrontierGoldConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeFrontierGoldConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

async function resolveOnServer(opts: { bet: number; isFreeSpins: boolean }) {
  const cfg = await loadEngineConfig();
  setFrontierGoldConfig(cfg);
  const script = resolveFrontierSpin({
    totalBet: opts.bet,
    isFreeSpins: opts.isFreeSpins,
  });
  return { script, cfg };
}

export type FrontierGoldSessionState = {
  sessionId: string | null;
  freeSpinsLeft: number;
  fsSessionWin: number;
  fsSpinsPlayed: number;
  inFree: boolean;
  bet: number;
};

export type FrontierGoldSpinResult = {
  balance: number;
  script: ReturnType<typeof resolveFrontierSpin>;
  session: FrontierGoldSessionState;
  fsPayout?: { amount: number; spinsPlayed: number };
};

function sessionState(row: typeof playSessions.$inferSelect | null): FrontierGoldSessionState {
  if (!row || row.status !== "open") {
    return {
      sessionId: null,
      freeSpinsLeft: 0,
      fsSessionWin: 0,
      fsSpinsPlayed: 0,
      inFree: false,
      bet: 0,
    };
  }
  return {
    sessionId: row.id,
    freeSpinsLeft: Number(row.freeSpinsLeft),
    fsSessionWin: Number(row.fsSessionWin),
    fsSpinsPlayed: Number(row.fsSpinsPlayed),
    inFree: Number(row.freeSpinsLeft) > 0,
    bet: Number(row.bet),
  };
}

export async function getFrontierGoldOpenSession(): Promise<FrontierGoldSessionState> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, FRONTIER_GOLD_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  return sessionState(rows[0] ?? null);
}

export async function frontierGoldPaidSpin(data: {
  bet: number;
}): Promise<FrontierGoldSpinResult> {
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
        eq(playSessions.gameId, FRONTIER_GOLD_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  if (existingSession[0] && Number(existingSession[0].freeSpinsLeft) > 0) {
    throw new Error("Active free spins in progress. Complete free spins before a new bet.");
  }

  const { script } = await resolveOnServer({ bet: data.bet, isFreeSpins: false });
  applyCapToScriptTotalWin(script, {
    gameId: FRONTIER_GOLD_GAME_ID,
    gameName: GAME_NAME,
    bet: data.bet,
    maxWinMult: cfg.maxWinMult,
    context: "paid-spin",
  });
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
      note: `${FRONTIER_GOLD_GAME_ID} · ${GAME_NAME} · wager ₱${cost.toFixed(2)}`,
    });

    if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: `${FRONTIER_GOLD_GAME_ID} · ${GAME_NAME} · win ₱${script.totalWin.toFixed(2)}`,
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
            eq(playSessions.gameId, FRONTIER_GOLD_GAME_ID),
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
        gameId: FRONTIER_GOLD_GAME_ID,
        status: "open",
        freeSpinsLeft: script.freeSpinsAwarded,
        fsSessionWin: "0",
        fsBombAcc: "0",
        fsSpinsPlayed: 0,
        bet: String(data.bet),
        ante: "no",
      });
      const updated = await tx.select().from(playSessions).where(eq(playSessions.id, sid)).limit(1);
      sessionRow = updated[0] ?? null;
    }

    return { balance: ledger.balance, sessionRow, username: row.username };
  });

  void recordGameEngineAuditLog({
    gameId: FRONTIER_GOLD_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: cost,
    payoutAmount: script.totalWin,
    multiplier: cost > 0 ? script.totalWin / cost : 0,
    resultMeta: {
      freeSpinsAwarded: script.freeSpinsAwarded,
      holdWin: !!script.holdWin,
      bonusCoins: script.bonusCoinCount,
    },
  });

  return {
    balance: result.balance,
    script,
    session: sessionState(result.sessionRow),
  };
}

export async function frontierGoldFreeSpin(data: {
  sessionId: string;
}): Promise<FrontierGoldSpinResult> {
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
        eq(playSessions.gameId, FRONTIER_GOLD_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  const currentSession = sessionRows[0];
  if (!currentSession || Number(currentSession.freeSpinsLeft) <= 0) {
    throw new Error("No active free spins remaining");
  }

  const bet = Number(currentSession.bet);
  const { script, cfg } = await resolveOnServer({ bet, isFreeSpins: true });
  applyCapToScriptTotalWin(script, {
    gameId: FRONTIER_GOLD_GAME_ID,
    gameName: GAME_NAME,
    bet,
    maxWinMult: cfg.maxWinMult,
    context: "free-spin",
  });
  const roundId = newId();

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User account not found");

    const left = Number(currentSession.freeSpinsLeft) - 1 + script.freeSpinsAwarded;
    const played = Number(currentSession.fsSpinsPlayed) + 1;
    const accumulatedWin = +(Number(currentSession.fsSessionWin) + script.totalWin).toFixed(2);
    const isFinished = left <= 0;

    let fsPayout: FrontierGoldSpinResult["fsPayout"];

    await tx
      .update(playSessions)
      .set({
        freeSpinsLeft: Math.max(0, left),
        fsSpinsPlayed: played,
        fsSessionWin: String(accumulatedWin),
        status: isFinished ? "closed" : "open",
      })
      .where(eq(playSessions.id, currentSession.id));

    let currentBalance = Number(row.balance);

    if (isFinished && accumulatedWin > 0) {
      const payout = enforcePoolCap({
        gameId: FRONTIER_GOLD_GAME_ID,
        gameName: GAME_NAME,
        bet,
        maxWinMult: cfg.maxWinMult,
        computedWin: accumulatedWin,
        context: "free-spins-final",
      }).payout;
      const ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: payout,
        type: "win",
        game: GAME_NAME,
        note: `${FRONTIER_GOLD_GAME_ID} · ${GAME_NAME} · Free spins final payout ₱${payout.toFixed(2)}`,
      });
      currentBalance = ledger.balance;
      fsPayout = { amount: payout, spinsPlayed: played };
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
    };
  });

  void recordGameEngineAuditLog({
    gameId: FRONTIER_GOLD_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: 0,
    payoutAmount: script.totalWin,
    multiplier: bet > 0 ? script.totalWin / bet : 0,
    resultMeta: { isFreeSpin: true, freeSpinsLeft: result.left },
  });

  return {
    balance: result.balance,
    script,
    session: sessionState(result.sessionRow),
    fsPayout: result.fsPayout,
  };
}

export async function frontierGoldBuyFeature(data: {
  bet: number;
}): Promise<FrontierGoldSpinResult> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet amount");

  const cfg = await loadEngineConfig();
  const cost = +(data.bet * cfg.buyFeatureMult).toFixed(2);
  const maxBet = await getMaxSingleBet();
  if (cost > maxBet) throw new Error(`Buy Feature cost exceeds max single bet ₱${maxBet.toFixed(2)}`);

  await assertNotInMaintenanceForBets();

  const { script } = await resolveOnServer({ bet: data.bet, isFreeSpins: false });
  applyCapToScriptTotalWin(script, {
    gameId: FRONTIER_GOLD_GAME_ID,
    gameName: GAME_NAME,
    bet: data.bet,
    maxWinMult: cfg.maxWinMult,
    context: "buy-feature",
  });
  if (script.freeSpinsAwarded < cfg.freeSpinsBaseCount) {
    script.freeSpinsAwarded = cfg.freeSpinsBaseCount;
    script.scatterCount = Math.max(script.scatterCount, cfg.freeSpinsTriggerCount);
  }

  const roundId = newId();
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User account not found");

    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(Number(row.balance), pending);
    if (cost > available) throw new Error(`Insufficient balance to buy feature (₱${cost.toFixed(2)})`);

    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: GAME_NAME,
      note: `${FRONTIER_GOLD_GAME_ID} · ${GAME_NAME} · Feature Buy ₱${cost.toFixed(2)}`,
    });

    if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: `${FRONTIER_GOLD_GAME_ID} · Feature Buy spin win ₱${script.totalWin.toFixed(2)}`,
      });
    }

    const sid = newId();
    await tx.insert(playSessions).values({
      id: sid,
      userId: user.id,
      gameId: FRONTIER_GOLD_GAME_ID,
      status: "open",
      freeSpinsLeft: script.freeSpinsAwarded,
      fsSessionWin: "0",
      fsBombAcc: "0",
      fsSpinsPlayed: 0,
      bet: String(data.bet),
      ante: "no",
    });

    const updated = await tx.select().from(playSessions).where(eq(playSessions.id, sid)).limit(1);
    return { balance: ledger.balance, sessionRow: updated[0] ?? null, username: row.username };
  });

  void recordGameEngineAuditLog({
    gameId: FRONTIER_GOLD_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: cost,
    payoutAmount: script.totalWin,
    multiplier: cost > 0 ? script.totalWin / cost : 0,
    resultMeta: { isBuyFeature: true, freeSpinsAwarded: script.freeSpinsAwarded },
  });

  return {
    balance: result.balance,
    script,
    session: sessionState(result.sessionRow),
  };
}
