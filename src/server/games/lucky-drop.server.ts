/**
 * Lucky Drop — server-authoritative one-shot deal + settlement.
 */
import { eq } from "drizzle-orm";
import {
  LUCKY_DROP_GAME_ID,
  LUCKY_DROP_SPOTS,
  normalizeLuckyDropConfig,
  type LuckyDropConfig,
  type LuckyDropSpot,
} from "@/lib/lucky-drop-config";
import { resolveLuckyDropDeal } from "@/components/maxhigh/games/lucky-drop/resolver";
import { setLuckyDropConfig } from "@/components/maxhigh/games/lucky-drop/runtimeConfig";
import type { PublicDealScript } from "@/components/maxhigh/games/lucky-drop/types";
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

const GAME_NAME = "Lucky Drop";

let cachedConfig: { cfg: LuckyDropConfig; time: number } | null = null;

export function clearLuckyDropEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<LuckyDropConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LUCKY_DROP_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeLuckyDropConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeLuckyDropConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export async function getLuckyDropEngineConfigPublic(): Promise<LuckyDropConfig> {
  return loadEngineConfig();
}

export type LuckyDropDealResult = {
  balance: number;
  script: PublicDealScript;
};

export async function luckyDropPaidDeal(input: {
  bets: Partial<Record<LuckyDropSpot, number>>;
}): Promise<LuckyDropDealResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();

  const db = getDb();
  const controlRows = await db
    .select({ enabled: gameControls.enabled })
    .from(gameControls)
    .where(eq(gameControls.gameId, LUCKY_DROP_GAME_ID))
    .limit(1);
  if (controlRows[0]?.enabled === "no") {
    throw new Error("Lucky Drop is currently disabled");
  }

  const cfg = await loadEngineConfig();
  setLuckyDropConfig(cfg);

  const bets: Partial<Record<LuckyDropSpot, number>> = {};
  let pickCount = 0;
  for (const n of LUCKY_DROP_SPOTS) {
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

  const resolved = resolveLuckyDropDeal({ bets, cfg });

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
      note: `${LUCKY_DROP_GAME_ID} · ${GAME_NAME} · ₱${totalWager.toFixed(2)}`,
    });

    if (resolved.immediateCredit > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: resolved.immediateCredit,
        type: "win",
        game: GAME_NAME,
        note: `${LUCKY_DROP_GAME_ID} · ${GAME_NAME} · #${resolved.winningNumber} ₱${resolved.immediateCredit.toFixed(2)}`,
      });
    }

    return { balance: ledger.balance };
  });

  await recordGameEngineAuditLog({
    gameId: LUCKY_DROP_GAME_ID,
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
