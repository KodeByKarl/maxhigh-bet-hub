/**
 * Baccarat (Punto Banco) — server-authoritative deal + settlement.
 * Client never decides payouts. Stake debited first; credits use profit-odds helpers.
 */

import { eq } from "drizzle-orm";
import {
  BACCARAT_GAME_ID,
  normalizeBaccaratConfig,
  type BaccaratConfig,
} from "@/lib/baccarat-config";
import { resolveBaccaratDeal } from "@/components/maxhigh/games/baccarat/resolver";
import { setBaccaratConfig } from "@/components/maxhigh/games/baccarat/runtimeConfig";
import type { PublicDealScript } from "@/components/maxhigh/games/baccarat/types";
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

const GAME_NAME = "Baccarat";

let cachedConfig: { cfg: BaccaratConfig; time: number } | null = null;

export function clearBaccaratEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<BaccaratConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, BACCARAT_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeBaccaratConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeBaccaratConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export async function getBaccaratEngineConfigPublic(): Promise<BaccaratConfig> {
  return loadEngineConfig();
}

export type BaccaratDealResult = {
  balance: number;
  script: PublicDealScript;
};

function toPublicScript(
  script: ReturnType<typeof resolveBaccaratDeal>,
): PublicDealScript {
  return {
    playerCards: script.playerCards,
    bankerCards: script.bankerCards,
    playerTotal: script.playerTotal,
    bankerTotal: script.bankerTotal,
    natural: script.natural,
    playerDrew: script.playerDrew,
    bankerDrew: script.bankerDrew,
    outcome: script.outcome,
    playerPair: script.playerPair,
    bankerPair: script.bankerPair,
    playerWin: script.playerWin,
    bankerWin: script.bankerWin,
    tieWin: script.tieWin,
    playerPairWin: script.playerPairWin,
    bankerPairWin: script.bankerPairWin,
    immediateCredit: script.immediateCredit,
    totalWager: script.totalWager,
  };
}

function assertBetRange(
  amount: number,
  min: number,
  max: number,
  label: string,
  optional: boolean,
) {
  if (amount < 0 || !Number.isFinite(amount)) {
    throw new Error(`Invalid ${label} bet`);
  }
  if (amount === 0) {
    if (optional) return;
    throw new Error(`${label} bet required`);
  }
  if (amount < min || amount > max) {
    throw new Error(`${label} bet must be between ₱${min} and ₱${max}`);
  }
}

export async function baccaratPaidDeal(input: {
  playerBet?: number;
  bankerBet?: number;
  tieBet?: number;
  playerPairBet?: number;
  bankerPairBet?: number;
}): Promise<BaccaratDealResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();

  const db = getDb();
  const controlRows = await db
    .select({ enabled: gameControls.enabled })
    .from(gameControls)
    .where(eq(gameControls.gameId, BACCARAT_GAME_ID))
    .limit(1);
  if (controlRows[0]?.enabled === "no") {
    throw new Error("Baccarat is currently disabled");
  }

  const cfg = await loadEngineConfig();
  setBaccaratConfig(cfg);

  const playerBet = +Number(input.playerBet ?? 0).toFixed(2);
  const bankerBet = +Number(input.bankerBet ?? 0).toFixed(2);
  const tieBet = +Number(input.tieBet ?? 0).toFixed(2);
  const playerPairBet = +Number(input.playerPairBet ?? 0).toFixed(2);
  const bankerPairBet = +Number(input.bankerPairBet ?? 0).toFixed(2);

  assertBetRange(playerBet, cfg.minPlayerBet, cfg.maxPlayerBet, "Player", true);
  assertBetRange(bankerBet, cfg.minBankerBet, cfg.maxBankerBet, "Banker", true);
  assertBetRange(tieBet, cfg.minTieBet, cfg.maxTieBet, "Tie", true);
  assertBetRange(
    playerPairBet,
    cfg.minPlayerPairBet,
    cfg.maxPlayerPairBet,
    "Player Pair",
    true,
  );
  assertBetRange(
    bankerPairBet,
    cfg.minBankerPairBet,
    cfg.maxBankerPairBet,
    "Banker Pair",
    true,
  );

  const totalWager = +(
    playerBet +
    bankerBet +
    tieBet +
    playerPairBet +
    bankerPairBet
  ).toFixed(2);
  if (totalWager <= 0) throw new Error("Place at least one bet");

  const maxSingle = await getMaxSingleBet();
  if (totalWager > maxSingle) {
    throw new Error(`Max single wager is ₱${maxSingle.toFixed(2)}`);
  }

  const resolved = resolveBaccaratDeal({
    playerBet,
    bankerBet,
    tieBet,
    playerPairBet,
    bankerPairBet,
    cfg,
  });

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
      note: `${BACCARAT_GAME_ID} · ${GAME_NAME} · P₱${playerBet.toFixed(2)} B₱${bankerBet.toFixed(2)} T₱${tieBet.toFixed(2)} PP₱${playerPairBet.toFixed(2)} BP₱${bankerPairBet.toFixed(2)}`,
    });

    const credit = resolved.immediateCredit;
    if (credit > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: credit,
        type: "win",
        game: GAME_NAME,
        note: `${BACCARAT_GAME_ID} · ${GAME_NAME} · ${resolved.outcome} settle ₱${credit.toFixed(2)}`,
      });
    }

    return { balance: ledger.balance };
  });

  await recordGameEngineAuditLog({
    gameId: BACCARAT_GAME_ID,
    roundId: newId(),
    userId: user.id,
    username: user.username,
    betAmount: totalWager,
    payoutAmount: resolved.immediateCredit,
    multiplier: totalWager > 0 ? +(resolved.immediateCredit / totalWager).toFixed(4) : 0,
    resultMeta: {
      outcome: resolved.outcome,
      natural: resolved.natural,
      playerTotal: resolved.playerTotal,
      bankerTotal: resolved.bankerTotal,
      playerPair: resolved.playerPair,
      bankerPair: resolved.bankerPair,
      playerBet,
      bankerBet,
      tieBet,
      playerPairBet,
      bankerPairBet,
    },
  });

  return {
    balance: result.balance,
    script: toPublicScript(resolved),
  };
}
