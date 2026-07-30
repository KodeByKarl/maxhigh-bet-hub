/**
 * Mahjong Ways — server-authoritative spin settlement and round lifecycle.
 * Integrates with platform wallet ledger (writeLedgerDelta) and session persistence (playSessions).
 */

import { and, eq } from "drizzle-orm";
import {
  MAHJONG_WAYS_GAME_ID,
  normalizeMahjongWaysConfig,
  type MahjongWaysConfig,
} from "@/lib/mahjong-ways-config";
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

import { setMahjongWaysConfig } from "@/components/maxhigh/mahjong-ways/runtimeConfig";
import { resolveMahjongSpin } from "@/components/maxhigh/mahjong-ways/spinResolver";

const GAME_NAME = "Mahjong Ways";

let cachedConfig: { cfg: MahjongWaysConfig; time: number } | null = null;
async function loadEngineConfig(): Promise<MahjongWaysConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30000) {
    return cachedConfig.cfg;
  }
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MAHJONG_WAYS_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = raw ? normalizeMahjongWaysConfig(JSON.parse(raw) as unknown) : normalizeMahjongWaysConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeMahjongWaysConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

async function resolveOnServer(opts: {
  bet: number;
  ante: boolean;
  isFreeSpins: boolean;
}) {
  const cfg = await loadEngineConfig();
  setMahjongWaysConfig(cfg);
  const script = resolveMahjongSpin({
    bet: opts.bet,
    ante: opts.ante && !opts.isFreeSpins,
    isFreeSpins: opts.isFreeSpins,
  });
  return { script, cfg };
}

export type MahjongWaysSessionState = {
  sessionId: string | null;
  freeSpinsLeft: number;
  fsSessionWin: number;
  fsSpinsPlayed: number;
  inFree: boolean;
  bet: number;
  ante: boolean;
};

export type MahjongWaysSpinResult = {
  balance: number;
  script: Awaited<
    ReturnType<typeof import("@/components/maxhigh/mahjong-ways/spinResolver").resolveMahjongSpin>
  >;
  session: MahjongWaysSessionState;
  fsPayout?: {
    amount: number;
    spinsPlayed: number;
  };
};

function sessionState(row: typeof playSessions.$inferSelect | null): MahjongWaysSessionState {
  if (!row || row.status !== "open") {
    return {
      sessionId: null,
      freeSpinsLeft: 0,
      fsSessionWin: 0,
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
    fsSpinsPlayed: Number(row.fsSpinsPlayed),
    inFree: Number(row.freeSpinsLeft) > 0,
    bet: Number(row.bet),
    ante: row.ante === "yes",
  };
}

export async function getMahjongWaysOpenSession(): Promise<MahjongWaysSessionState> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, MAHJONG_WAYS_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  return sessionState(rows[0] ?? null);
}

export async function mahjongWaysPaidSpin(data: {
  bet: number;
  ante: boolean;
}): Promise<MahjongWaysSpinResult> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet amount");

  const cfg = await loadEngineConfig();
  const anteMult = data.ante ? cfg.anteBetMult : 1;
  const cost = +(data.bet * anteMult).toFixed(2);
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
        eq(playSessions.gameId, MAHJONG_WAYS_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  if (existingSession[0] && Number(existingSession[0].freeSpinsLeft) > 0) {
    throw new Error("Active free spins feature in progress. Please complete free spins before placing a new bet.");
  }

  const { script } = await resolveOnServer({
    bet: data.bet,
    ante: data.ante,
    isFreeSpins: false,
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

    // 1. Deduct Wager (placeWager)
    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: GAME_NAME,
      note: `${MAHJONG_WAYS_GAME_ID} · ${GAME_NAME} · wager ₱${cost.toFixed(2)}`,
    });

    // 2. Credit Spin Win (settlePayout)
    if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: `${MAHJONG_WAYS_GAME_ID} · ${GAME_NAME} · win ₱${script.totalWin.toFixed(2)}`,
      });
    }

    // 3. Persist Free Spins session if triggered
    let sessionRow: typeof playSessions.$inferSelect | null = null;
    if (script.freeSpinsAwarded > 0) {
      // Close old open sessions
      const stale = await tx
        .select()
        .from(playSessions)
        .where(
          and(
            eq(playSessions.userId, user.id),
            eq(playSessions.gameId, MAHJONG_WAYS_GAME_ID),
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
        gameId: MAHJONG_WAYS_GAME_ID,
        status: "open",
        freeSpinsLeft: script.freeSpinsAwarded,
        fsSessionWin: "0",
        fsBombAcc: "0",
        fsSpinsPlayed: 0,
        bet: String(data.bet),
        ante: data.ante ? "yes" : "no",
      });

      const updated = await tx
        .select()
        .from(playSessions)
        .where(eq(playSessions.id, sid))
        .limit(1);
      sessionRow = updated[0] ?? null;
    }

    // 4. Record Audit Log
    await recordGameEngineAuditLog({
      gameId: MAHJONG_WAYS_GAME_ID,
      roundId,
      userId: user.id,
      username: row.username,
      betAmount: cost,
      payoutAmount: script.totalWin,
      multiplier: cost > 0 ? script.totalWin / cost : 0,
      resultMeta: {
        reelsHeights: script.initialReelHeights,
        totalWays: script.totalWays,
        cascadeStepsCount: script.steps.length,
        freeSpinsAwarded: script.freeSpinsAwarded,
      },
    });

    return {
      balance: ledger.balance,
      sessionRow,
    };
  });

  return {
    balance: result.balance,
    script,
    session: sessionState(result.sessionRow),
  };
}

export async function mahjongWaysFreeSpin(data: {
  sessionId: string;
}): Promise<MahjongWaysSpinResult> {
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
        eq(playSessions.gameId, MAHJONG_WAYS_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  const currentSession = sessionRows[0];
  if (!currentSession || Number(currentSession.freeSpinsLeft) <= 0) {
    throw new Error("No active free spins remaining for this session");
  }

  const bet = Number(currentSession.bet);
  const ante = currentSession.ante === "yes";

  const { script } = await resolveOnServer({
    bet,
    ante,
    isFreeSpins: true,
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

    let fsPayout: MahjongWaysSpinResult["fsPayout"];

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
      const ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: accumulatedWin,
        type: "win",
        game: GAME_NAME,
        note: `${MAHJONG_WAYS_GAME_ID} · ${GAME_NAME} · Free spins feature final payout ₱${accumulatedWin.toFixed(2)}`,
      });
      currentBalance = ledger.balance;
      fsPayout = {
        amount: accumulatedWin,
        spinsPlayed: played,
      };
    }

    const updatedSession = await tx
      .select()
      .from(playSessions)
      .where(eq(playSessions.id, currentSession.id))
      .limit(1);

    await recordGameEngineAuditLog({
      gameId: MAHJONG_WAYS_GAME_ID,
      roundId,
      userId: user.id,
      username: row.username,
      betAmount: 0,
      payoutAmount: script.totalWin,
      multiplier: bet > 0 ? script.totalWin / bet : 0,
      resultMeta: {
        isFreeSpin: true,
        freeSpinsLeft: left,
        fsSpinsPlayed: played,
        fsAccumulatedWin: accumulatedWin,
      },
    });

    return {
      balance: currentBalance,
      sessionRow: updatedSession[0] ?? null,
      fsPayout,
    };
  });

  return {
    balance: result.balance,
    script,
    session: sessionState(result.sessionRow),
    fsPayout: result.fsPayout,
  };
}

export async function mahjongWaysBuyFeature(data: {
  bet: number;
}): Promise<MahjongWaysSpinResult> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet amount");

  const cfg = await loadEngineConfig();
  const cost = +(data.bet * cfg.buyFeatureMult).toFixed(2);
  const maxBet = await getMaxSingleBet();
  if (cost > maxBet) throw new Error(`Buy Feature cost ₱${cost.toFixed(2)} exceeds max single bet limit ₱${maxBet.toFixed(2)}`);

  await assertNotInMaintenanceForBets();

  const db = getDb();
  // Force seed 3 scatters into first spin
  const { script } = await resolveOnServer({
    bet: data.bet,
    ante: false,
    isFreeSpins: false,
  });

  // Ensure minimum 10 free spins awarded on buy feature
  if (script.freeSpinsAwarded < cfg.freeSpinsBaseCount) {
    script.freeSpinsAwarded = cfg.freeSpinsBaseCount;
    script.scattersCount = Math.max(script.scattersCount, 3);
  }

  const roundId = newId();

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User account not found");

    const balance = Number(row.balance);
    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(balance, pending);
    if (cost > available) {
      throw new Error(`Insufficient available balance to buy feature (₱${cost.toFixed(2)} required)`);
    }

    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: GAME_NAME,
      note: `${MAHJONG_WAYS_GAME_ID} · ${GAME_NAME} · Feature Buy ₱${cost.toFixed(2)}`,
    });

    if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: `${MAHJONG_WAYS_GAME_ID} · ${GAME_NAME} · Feature Buy initial spin win ₱${script.totalWin.toFixed(2)}`,
      });
    }

    const sid = newId();
    await tx.insert(playSessions).values({
      id: sid,
      userId: user.id,
      gameId: MAHJONG_WAYS_GAME_ID,
      status: "open",
      freeSpinsLeft: script.freeSpinsAwarded,
      fsSessionWin: "0",
      fsBombAcc: "0",
      fsSpinsPlayed: 0,
      bet: String(data.bet),
      ante: "no",
    });

    const updated = await tx.select().from(playSessions).where(eq(playSessions.id, sid)).limit(1);

    await recordGameEngineAuditLog({
      gameId: MAHJONG_WAYS_GAME_ID,
      roundId,
      userId: user.id,
      username: row.username,
      betAmount: cost,
      payoutAmount: script.totalWin,
      multiplier: script.totalWin / cost,
      resultMeta: {
        isBuyFeature: true,
        freeSpinsAwarded: script.freeSpinsAwarded,
      },
    });

    return {
      balance: ledger.balance,
      sessionRow: updated[0] ?? null,
    };
  });

  return {
    balance: result.balance,
    script,
    session: sessionState(result.sessionRow),
  };
}
