/**
 * Sari-Sari Spin — server-authoritative spin settlement (base game only).
 * No free spins, scatters, cascade, or bonus sessions.
 */

import { eq } from "drizzle-orm";
import {
  SARI_SARI_SPIN_GAME_ID,
  normalizeSariSariSpinConfig,
  spinStake,
  type SariSariSpinConfig,
} from "@/lib/sari-sari-spin-config";
import { getDb } from "../db/client";
import { gameControls, users } from "../db/schema";
import { newId, requireUser } from "../session";
import {
  assertNotInMaintenanceForBets,
  availableFrom,
  getMaxSingleBet,
  sumPendingWithdrawals,
  writeLedgerDelta,
} from "../wallet.server";
import { recordGameEngineAuditLog } from "./game-audit.server";
import { setSariSariSpinConfig } from "@/components/maxhigh/sari-sari-spin/runtimeConfig";
import { resolveSariSariSpin } from "@/components/maxhigh/sari-sari-spin/spinResolver";
import type { SpinScript } from "@/components/maxhigh/sari-sari-spin/types";

const GAME_NAME = "Sari-Sari Spin";

let cachedConfig: { cfg: SariSariSpinConfig; time: number } | null = null;

export function clearSariSariSpinEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<SariSariSpinConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, SARI_SARI_SPIN_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeSariSariSpinConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeSariSariSpinConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export type SariSariSpinResult = {
  balance: number;
  script: SpinScript;
};

export async function sariSariSpinPaidSpin(data: {
  bet: number;
  exMode?: boolean;
}): Promise<SariSariSpinResult> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet amount");

  const cfg = await loadEngineConfig();
  setSariSariSpinConfig(cfg);

  const baseBet = +data.bet.toFixed(2);
  const exMode = !!data.exMode;
  const cost = spinStake(baseBet, exMode, cfg);

  if (baseBet < cfg.minBet) throw new Error(`Min bet is ₱${cfg.minBet.toFixed(2)}`);
  if (baseBet > cfg.maxBet) throw new Error(`Max bet is ₱${cfg.maxBet.toFixed(2)}`);
  const maxBet = await getMaxSingleBet();
  if (cost > maxBet) throw new Error(`Max single bet limit is ₱${maxBet.toFixed(2)}`);

  await assertNotInMaintenanceForBets();

  const script = resolveSariSariSpin({
    totalBet: cost,
    baseBet,
    exMode,
  });
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

    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: GAME_NAME,
      note: `${SARI_SARI_SPIN_GAME_ID} · ${GAME_NAME} · wager ₱${cost.toFixed(2)}${exMode ? " · EX" : ""}`,
    });

    if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: `${SARI_SARI_SPIN_GAME_ID} · ${GAME_NAME} · win ₱${script.totalWin.toFixed(2)}`,
      });
    }

    return { balance: ledger.balance, username: row.username };
  });

  void recordGameEngineAuditLog({
    gameId: SARI_SARI_SPIN_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: cost,
    payoutAmount: script.totalWin,
    multiplier: cost > 0 ? +(script.totalWin / cost).toFixed(4) : 0,
    resultMeta: {
      seed: script.seed,
      baseBet: script.baseBet,
      totalBet: script.totalBet,
      exMode: script.exMode,
      grid: script.grid,
      paylineWins: script.paylineWins,
      paylineWin: script.paylineWin,
      multiplierReel: script.multiplierReel,
      multipliedWin: script.multipliedWin,
      rawTotalWin: script.rawTotalWin,
      totalWin: script.totalWin,
      hitCap: script.hitCap,
      rtpProfile: cfg.activeRtpProfile,
    },
  });

  return { balance: result.balance, script };
}

export async function getSariSariSpinEngineConfigPublic(): Promise<SariSariSpinConfig> {
  return loadEngineConfig();
}
