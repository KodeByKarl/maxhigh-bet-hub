/**
 * Reel Riot — server-authoritative spin settlement + game-scoped progressive pool.
 * Integrates with the existing `jackpot` table using pool id `reel-riot`.
 */

import { eq } from "drizzle-orm";
import {
  REEL_RIOT_GAME_ID,
  REEL_RIOT_JACKPOT_ID,
  normalizeReelRiotConfig,
  type ReelRiotConfig,
} from "@/lib/reel-riot-config";
import { getDb } from "../db/client";
import { gameControls, jackpot, users } from "../db/schema";
import { newId, requireUser } from "../session";
import {
  assertNotInMaintenanceForBets,
  availableFrom,
  getMaxSingleBet,
  sumPendingWithdrawals,
  writeLedgerDelta,
} from "../wallet.server";
import { recordGameEngineAuditLog } from "./game-audit.server";
import { setReelRiotConfig } from "@/components/maxhigh/reel-riot/runtimeConfig";
import { resolveReelRiotSpin } from "@/components/maxhigh/reel-riot/spinResolver";
import type { RrReels, SpinScript } from "@/components/maxhigh/reel-riot/types";

const GAME_NAME = "Fruit Riot";

let cachedConfig: { cfg: ReelRiotConfig; time: number } | null = null;

export function clearReelRiotEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<ReelRiotConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, REEL_RIOT_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeReelRiotConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeReelRiotConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

function money(n: number) {
  return n.toFixed(2);
}

/** Ensure game-scoped progressive pool row exists; return current amount + enabled. */
async function ensureGameJackpotPool(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  cfg: ReelRiotConfig,
): Promise<{ amount: number; enabled: boolean }> {
  const poolId = cfg.jackpot.poolId || REEL_RIOT_JACKPOT_ID;
  const rows = await tx.select().from(jackpot).where(eq(jackpot.id, poolId)).limit(1);
  if (!rows[0]) {
    await tx.insert(jackpot).values({
      id: poolId,
      amount: money(cfg.jackpot.floorAmount),
      enabled: "yes",
      displayAmount: money(cfg.jackpot.floorAmount),
    });
    return { amount: cfg.jackpot.floorAmount, enabled: true };
  }
  return {
    amount: Number(rows[0].amount),
    enabled: (rows[0].enabled ?? "yes") === "yes",
  };
}

export type ReelRiotSpinResult = {
  balance: number;
  script: SpinScript;
  jackpotPool: number;
};

export async function reelRiotPaidSpin(data: {
  bet: number;
  held?: boolean[];
  previousReels?: RrReels | null;
}): Promise<ReelRiotSpinResult> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet amount");

  const cfg = await loadEngineConfig();
  setReelRiotConfig(cfg);

  const cost = +data.bet.toFixed(2);
  if (cost < cfg.minBet) throw new Error(`Min bet is ${cfg.minBet}`);
  if (cost > cfg.maxBet) throw new Error(`Max bet is ${cfg.maxBet}`);
  const maxBet = await getMaxSingleBet();
  if (cost > maxBet) throw new Error(`Max single bet limit is ₱${maxBet.toFixed(2)}`);

  await assertNotInMaintenanceForBets();

  const roundId = newId();
  const db = getDb();

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

    // Progressive pool snapshot + contribution
    const pool = await ensureGameJackpotPool(tx, cfg);
    const contrib = +(cost * cfg.jackpot.contributionRate).toFixed(2);
    const poolBefore = +(pool.amount + contrib).toFixed(2);
    await tx
      .update(jackpot)
      .set({ amount: money(poolBefore) })
      .where(eq(jackpot.id, cfg.jackpot.poolId));

    const script = resolveReelRiotSpin({
      totalBet: cost,
      held: data.held,
      previousReels: data.previousReels ?? null,
      jackpotPoolAmount: poolBefore,
      jackpotEnabled: pool.enabled,
      cfg,
    });

    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: GAME_NAME,
      note: `${REEL_RIOT_GAME_ID} · ${GAME_NAME} · wager ₱${cost.toFixed(2)}`,
    });

    // Award payline + bonus as win; jackpot as separate jackpot ledger type
    const nonJpWin = +(
      script.payline.payout + (script.bonus?.payout ?? 0)
    ).toFixed(2);

    if (nonJpWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: nonJpWin,
        type: "win",
        game: GAME_NAME,
        note: `${REEL_RIOT_GAME_ID} · ${GAME_NAME} · win ₱${nonJpWin.toFixed(2)}`,
      });
    }

    let poolAfter = poolBefore;
    if (script.jackpot.triggered && script.jackpot.amount > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.jackpot.amount,
        type: "jackpot",
        game: GAME_NAME,
        note: `${REEL_RIOT_GAME_ID} · progressive jackpot ₱${script.jackpot.amount.toFixed(2)}`,
      });
      poolAfter = cfg.jackpot.floorAmount;
      await tx
        .update(jackpot)
        .set({ amount: money(poolAfter) })
        .where(eq(jackpot.id, cfg.jackpot.poolId));
    }

    return {
      balance: ledger.balance,
      username: row.username,
      script,
      jackpotPool: poolAfter,
    };
  });

  void recordGameEngineAuditLog({
    gameId: REEL_RIOT_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: cost,
    payoutAmount: result.script.totalWin,
    multiplier: cost > 0 ? +(result.script.totalWin / cost).toFixed(4) : 0,
    resultMeta: {
      ...result.script.audit,
      visibleGrid: result.script.visibleGrid,
      jackpotContribution: result.script.jackpotContribution,
      jackpotPoolAfter: result.jackpotPool,
    },
  });

  return {
    balance: result.balance,
    script: result.script,
    jackpotPool: result.jackpotPool,
  };
}

export async function getReelRiotEngineConfigPublic(): Promise<ReelRiotConfig> {
  return loadEngineConfig();
}

export async function getReelRiotJackpotPool(): Promise<{ amount: number; enabled: boolean }> {
  const cfg = await loadEngineConfig();
  const db = getDb();
  const poolId = cfg.jackpot.poolId;
  try {
    const rows = await db.select().from(jackpot).where(eq(jackpot.id, poolId)).limit(1);
    if (!rows[0]) {
      return { amount: cfg.jackpot.floorAmount, enabled: true };
    }
    return {
      amount: Number(rows[0].amount),
      enabled: (rows[0].enabled ?? "yes") === "yes",
    };
  } catch {
    return { amount: cfg.jackpot.floorAmount, enabled: true };
  }
}
