/**
 * Color Game Pro — server-authoritative one-shot deal + settlement.
 */
import { eq } from "drizzle-orm";
import {
  COLOR_GAME_PRO_GAME_ID,
  normalizeColorGameProConfig,
  type ColorGameProConfig,
  type ColorSpotId,
} from "@/lib/color-game-pro-config";
import { resolveColorGameProDeal } from "@/components/maxhigh/games/color-game-pro/resolver";
import { setColorGameProConfig } from "@/components/maxhigh/games/color-game-pro/runtimeConfig";
import type { PublicDealScript } from "@/components/maxhigh/games/color-game-pro/types";
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

const GAME_NAME = "Color Game Pro";

let cachedConfig: { cfg: ColorGameProConfig; time: number } | null = null;

export function clearColorGameProEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<ColorGameProConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, COLOR_GAME_PRO_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeColorGameProConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeColorGameProConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export async function getColorGameProEngineConfigPublic(): Promise<ColorGameProConfig> {
  return loadEngineConfig();
}

export type ColorGameProDealResult = {
  balance: number;
  script: PublicDealScript;
};

export async function colorGameProPaidDeal(input: {
  bets: Partial<Record<ColorSpotId, number>>;
}): Promise<ColorGameProDealResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();

  const db = getDb();
  const controlRows = await db
    .select({ enabled: gameControls.enabled })
    .from(gameControls)
    .where(eq(gameControls.gameId, COLOR_GAME_PRO_GAME_ID))
    .limit(1);
  if (controlRows[0]?.enabled === "no") {
    throw new Error("Color Game Pro is currently disabled");
  }

  const cfg = await loadEngineConfig();
  setColorGameProConfig(cfg);

  const bets: Partial<Record<ColorSpotId, number>> = {};
  for (const sp of cfg.spots) {
    const v = +Number(input.bets?.[sp.id] ?? 0).toFixed(2);
    if (v < 0 || !Number.isFinite(v)) throw new Error(`Invalid ${sp.label} bet`);
    if (v === 0) continue;
    if (v < cfg.minBet || v > cfg.maxSpotBet) {
      throw new Error(`${sp.label} bet must be between ₱${cfg.minBet} and ₱${cfg.maxSpotBet}`);
    }
    bets[sp.id] = v;
  }

  const totalWager = +Object.values(bets).reduce((s, n) => s + (n ?? 0), 0).toFixed(2);
  if (totalWager <= 0) throw new Error("Place at least one color bet");
  if (totalWager < cfg.minBet) throw new Error(`Min total wager is ₱${cfg.minBet}`);
  if (totalWager > cfg.maxBet) {
    throw new Error(`Max total wager is ₱${cfg.maxBet}`);
  }

  const maxSingle = await getMaxSingleBet();
  if (totalWager > maxSingle) {
    throw new Error(`Max single wager is ₱${maxSingle.toFixed(2)}`);
  }

  const resolved = resolveColorGameProDeal({ bets, cfg });

  const result = await db.transaction(async (tx) => {
    const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = urows[0];
    if (!row) throw new Error("User not found");

    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(Number(row.balance), pending);
    if (available < totalWager) throw new Error("Insufficient balance");

    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -totalWager,
      type: "bet",
      game: GAME_NAME,
      note: `${COLOR_GAME_PRO_GAME_ID} · ${GAME_NAME} · ₱${totalWager.toFixed(2)}`,
    });

    if (resolved.immediateCredit > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: resolved.immediateCredit,
        type: "win",
        game: GAME_NAME,
        note: `${COLOR_GAME_PRO_GAME_ID} · ${GAME_NAME} · ${resolved.winningColor} ₱${resolved.immediateCredit.toFixed(2)}`,
      });
    }

    return { balance: ledger.balance };
  });

  await recordGameEngineAuditLog({
    gameId: COLOR_GAME_PRO_GAME_ID,
    roundId: newId(),
    userId: user.id,
    username: user.username,
    betAmount: totalWager,
    payoutAmount: resolved.immediateCredit,
    multiplier: totalWager > 0 ? +(resolved.immediateCredit / totalWager).toFixed(4) : 0,
    resultMeta: {
      winningColor: resolved.winningColor,
      bets: resolved.bets,
      spotWins: resolved.spotWins,
    },
  });

  return {
    balance: result.balance,
    script: {
      winningColor: resolved.winningColor,
      bets: resolved.bets,
      spotWins: resolved.spotWins,
      immediateCredit: resolved.immediateCredit,
      totalWager: resolved.totalWager,
    },
  };
}
