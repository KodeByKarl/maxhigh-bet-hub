/**
 * Lucky 9 — server-authoritative deal + settlement.
 * Client never decides payouts. Stake debited first; credits use profit-odds helpers.
 * Dealer pays even money — no commission.
 */

import { eq } from "drizzle-orm";
import {
  LUCKY9_GAME_ID,
  normalizeLucky9Config,
  type Lucky9Config,
} from "@/lib/lucky9-config";
import { resolveLucky9Deal } from "@/components/maxhigh/games/lucky9/resolver";
import { setLucky9Config } from "@/components/maxhigh/games/lucky9/runtimeConfig";
import type { PublicDealScript } from "@/components/maxhigh/games/lucky9/types";
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

const GAME_NAME = "Lucky 9";

let cachedConfig: { cfg: Lucky9Config; time: number } | null = null;

export function clearLucky9EngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<Lucky9Config> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LUCKY9_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeLucky9Config(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeLucky9Config(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export async function getLucky9EngineConfigPublic(): Promise<Lucky9Config> {
  return loadEngineConfig();
}

export type Lucky9DealResult = {
  balance: number;
  script: PublicDealScript;
};

function toPublicScript(script: ReturnType<typeof resolveLucky9Deal>): PublicDealScript {
  return {
    playerCards: script.playerCards,
    dealerCards: script.dealerCards,
    playerTotal: script.playerTotal,
    dealerTotal: script.dealerTotal,
    playerNatural: script.playerNatural,
    dealerNatural: script.dealerNatural,
    natural: script.natural,
    playerDrew: script.playerDrew,
    dealerDrew: script.dealerDrew,
    outcome: script.outcome,
    playerWin: script.playerWin,
    dealerWin: script.dealerWin,
    tieWin: script.tieWin,
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

export async function lucky9PaidDeal(input: {
  playerBet?: number;
  dealerBet?: number;
  tieBet?: number;
}): Promise<Lucky9DealResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();

  const db = getDb();
  const controlRows = await db
    .select({ enabled: gameControls.enabled })
    .from(gameControls)
    .where(eq(gameControls.gameId, LUCKY9_GAME_ID))
    .limit(1);
  if (controlRows[0]?.enabled === "no") {
    throw new Error("Lucky 9 is currently disabled");
  }

  const cfg = await loadEngineConfig();
  setLucky9Config(cfg);

  const playerBet = +Number(input.playerBet ?? 0).toFixed(2);
  const dealerBet = +Number(input.dealerBet ?? 0).toFixed(2);
  const tieBet = +Number(input.tieBet ?? 0).toFixed(2);

  assertBetRange(playerBet, cfg.minPlayerBet, cfg.maxPlayerBet, "Player", true);
  assertBetRange(dealerBet, cfg.minDealerBet, cfg.maxDealerBet, "Dealer", true);
  assertBetRange(tieBet, cfg.minTieBet, cfg.maxTieBet, "Tie", true);

  const totalWager = +(playerBet + dealerBet + tieBet).toFixed(2);
  if (totalWager <= 0) throw new Error("Place at least one bet");

  const maxSingle = await getMaxSingleBet();
  if (totalWager > maxSingle) {
    throw new Error(`Max single wager is ₱${maxSingle.toFixed(2)}`);
  }

  const resolved = resolveLucky9Deal({
    playerBet,
    dealerBet,
    tieBet,
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
      note: `${LUCKY9_GAME_ID} · ${GAME_NAME} · P₱${playerBet.toFixed(2)} D₱${dealerBet.toFixed(2)} T₱${tieBet.toFixed(2)}`,
    });

    const credit = resolved.immediateCredit;
    if (credit > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: credit,
        type: "win",
        game: GAME_NAME,
        note: `${LUCKY9_GAME_ID} · ${GAME_NAME} · ${resolved.outcome} settle ₱${credit.toFixed(2)}`,
      });
    }

    return { balance: ledger.balance };
  });

  await recordGameEngineAuditLog({
    gameId: LUCKY9_GAME_ID,
    roundId: newId(),
    userId: user.id,
    username: user.username,
    betAmount: totalWager,
    payoutAmount: resolved.immediateCredit,
    multiplier: totalWager > 0 ? +(resolved.immediateCredit / totalWager).toFixed(4) : 0,
    resultMeta: {
      outcome: resolved.outcome,
      natural: resolved.natural,
      playerNatural: resolved.playerNatural,
      dealerNatural: resolved.dealerNatural,
      playerTotal: resolved.playerTotal,
      dealerTotal: resolved.dealerTotal,
      playerBet,
      dealerBet,
      tieBet,
    },
  });

  return {
    balance: result.balance,
    script: toPublicScript(resolved),
  };
}
