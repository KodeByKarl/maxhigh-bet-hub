/**
 * Drop Deluxe — server-authoritative one-shot deal + settlement.
 */
import { eq } from "drizzle-orm";
import {
  DROP_DELUXE_GAME_ID,
  DROP_DELUXE_SPOTS,
  normalizeDropDeluxeConfig,
  type DropDeluxeConfig,
  type DropDeluxeSpot,
} from "@/lib/drop-deluxe-config";
import { resolveDropDeluxeDeal } from "@/components/maxhigh/games/drop-deluxe/resolver";
import { setDropDeluxeConfig } from "@/components/maxhigh/games/drop-deluxe/runtimeConfig";
import type { PublicDealScript } from "@/components/maxhigh/games/drop-deluxe/types";
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

const GAME_NAME = "Drop Deluxe";

let cachedConfig: { cfg: DropDeluxeConfig; time: number } | null = null;

export function clearDropDeluxeEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<DropDeluxeConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, DROP_DELUXE_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeDropDeluxeConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeDropDeluxeConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export async function getDropDeluxeEngineConfigPublic(): Promise<DropDeluxeConfig> {
  return loadEngineConfig();
}

export type DropDeluxeDealResult = {
  balance: number;
  script: PublicDealScript;
};

export async function dropDeluxePaidDeal(input: {
  bets: Partial<Record<DropDeluxeSpot, number>>;
}): Promise<DropDeluxeDealResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();

  const db = getDb();
  const controlRows = await db
    .select({ enabled: gameControls.enabled })
    .from(gameControls)
    .where(eq(gameControls.gameId, DROP_DELUXE_GAME_ID))
    .limit(1);
  if (controlRows[0]?.enabled === "no") {
    throw new Error("Drop Deluxe is currently disabled");
  }

  const cfg = await loadEngineConfig();
  setDropDeluxeConfig(cfg);

  const bets: Partial<Record<DropDeluxeSpot, number>> = {};
  let pickCount = 0;
  for (const n of DROP_DELUXE_SPOTS) {
    const v = +Number(input.bets?.[n] ?? 0).toFixed(2);
    if (v < 0 || !Number.isFinite(v)) throw new Error(`Invalid lane ${n} bet`);
    if (v === 0) continue;
    if (v < cfg.minBet || v > cfg.maxSpotBet) {
      throw new Error(`Lane ${n} bet must be between ₱${cfg.minBet} and ₱${cfg.maxSpotBet}`);
    }
    bets[n] = v;
    pickCount += 1;
  }

  if (pickCount === 0) throw new Error("Place at least one lane bet");
  if (pickCount > cfg.maxPicks) throw new Error(`Max ${cfg.maxPicks} lanes per drop`);

  const totalWager = +Object.values(bets).reduce((s, n) => s + (n ?? 0), 0).toFixed(2);
  if (totalWager < cfg.minBet) throw new Error(`Min total wager is ₱${cfg.minBet}`);
  if (totalWager > cfg.maxBet) throw new Error(`Max total wager is ₱${cfg.maxBet}`);

  const maxSingle = await getMaxSingleBet();
  if (totalWager > maxSingle) {
    throw new Error(`Max single wager is ₱${maxSingle.toFixed(2)}`);
  }

  const resolved = resolveDropDeluxeDeal({ bets, cfg });

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
      note: `${DROP_DELUXE_GAME_ID} · ${GAME_NAME} · ₱${totalWager.toFixed(2)}`,
    });

    if (resolved.immediateCredit > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: resolved.immediateCredit,
        type: "win",
        game: GAME_NAME,
        note: `${DROP_DELUXE_GAME_ID} · ${GAME_NAME} · #${resolved.winningNumber} ₱${resolved.immediateCredit.toFixed(2)}`,
      });
    }

    return { balance: ledger.balance };
  });

  await recordGameEngineAuditLog({
    gameId: DROP_DELUXE_GAME_ID,
    roundId: newId(),
    userId: user.id,
    username: user.username,
    betAmount: totalWager,
    payoutAmount: resolved.immediateCredit,
    multiplier: totalWager > 0 ? +(resolved.immediateCredit / totalWager).toFixed(4) : 0,
    resultMeta: {
      winningNumber: resolved.winningNumber,
      bets: resolved.bets,
      laneWins: resolved.laneWins,
    },
  });

  return {
    balance: result.balance,
    script: {
      winningNumber: resolved.winningNumber,
      bets: resolved.bets,
      laneWins: resolved.laneWins,
      immediateCredit: resolved.immediateCredit,
      totalWager: resolved.totalWager,
    },
  };
}
