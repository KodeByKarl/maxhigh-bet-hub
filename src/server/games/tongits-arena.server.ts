/**
 * Tongits Arena — server-authoritative two-phase settlement.
 *
 * Phase 1 deal: debit Ante (+ optional Pair Plus), store both hands in play_sessions,
 *   credit Pair Plus immediately, return masked dealer cards.
 * Phase 2 play/fold: atomic open→closed claim, Play debit (play only), settle Ante/Play
 *   (+ Ante Bonus when enabled). Fold forfeits Ante; Pair Plus already resolved.
 */

import { and, eq } from "drizzle-orm";
import {
  TONGITS_ARENA_GAME_ID,
  normalizeTongitsArenaConfig,
  type TongitsArenaConfig,
} from "@/lib/tongits-arena-config";
import {
  resolveDeal,
  resolveFold,
  resolvePlay,
} from "@/components/maxhigh/games/tongits-arena/resolver";
import { setTongitsArenaConfig } from "@/components/maxhigh/games/tongits-arena/runtimeConfig";
import type { PlayingCard } from "@/components/maxhigh/games/tongits-arena/deckEngine";
import type { HandRank } from "@/components/maxhigh/games/tongits-arena/handEvaluator";
import type {
  PublicDealScript,
  PublicSettleScript,
} from "@/components/maxhigh/games/tongits-arena/types";
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

const GAME_NAME = "Tongits Arena";

let cachedConfig: { cfg: TongitsArenaConfig; time: number } | null = null;

export function clearTongitsArenaEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<TongitsArenaConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, TONGITS_ARENA_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeTongitsArenaConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeTongitsArenaConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export async function getTongitsArenaEngineConfigPublic(): Promise<TongitsArenaConfig> {
  return loadEngineConfig();
}

type TongitsArenaFeatureState = {
  kind: "tongits-arena";
  phase: "decision";
  seed: string;
  ante: number;
  pairPlus: number;
  pairPlusWin: number;
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  playerHand: HandRank;
  dealerHand: HandRank;
  anteBonusEligible: boolean;
};

function parseFeatureState(raw: string | null): TongitsArenaFeatureState | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as TongitsArenaFeatureState;
    if (o?.kind !== "tongits-arena" || o.phase !== "decision") return null;
    if (!Array.isArray(o.playerCards) || o.playerCards.length !== 3) return null;
    if (!Array.isArray(o.dealerCards) || o.dealerCards.length !== 3) return null;
    return o;
  } catch {
    return null;
  }
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

async function assertGameEnabled() {
  const db = getDb();
  const controlRows = await db
    .select({ enabled: gameControls.enabled })
    .from(gameControls)
    .where(eq(gameControls.gameId, TONGITS_ARENA_GAME_ID))
    .limit(1);
  if (controlRows[0]?.enabled === "no") {
    throw new Error("Tongits Arena is currently disabled");
  }
}

export type TongitsArenaOpenSessionView = {
  sessionId: string;
  ante: number;
  pairPlus: number;
  pairPlusWin: number;
  playerCards: PlayingCard[];
  playerHand: HandRank;
  anteBonusEligible: boolean;
};

export async function getTongitsArenaOpenSession(): Promise<TongitsArenaOpenSessionView | null> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, TONGITS_ARENA_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const feat = parseFeatureState(row.featureState);
  if (!feat) return null;
  return {
    sessionId: row.id,
    ante: feat.ante,
    pairPlus: feat.pairPlus,
    pairPlusWin: feat.pairPlusWin,
    playerCards: feat.playerCards,
    playerHand: feat.playerHand,
    anteBonusEligible: feat.anteBonusEligible,
  };
}

export type TongitsArenaDealResult = {
  balance: number;
  sessionId: string;
  script: PublicDealScript;
};

export async function tongitsArenaPaidDeal(input: {
  ante: number;
  pairPlus?: number;
}): Promise<TongitsArenaDealResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();
  await assertGameEnabled();

  const cfg = await loadEngineConfig();
  setTongitsArenaConfig(cfg);

  const ante = +Number(input.ante ?? 0).toFixed(2);
  const pairPlus = +Number(input.pairPlus ?? 0).toFixed(2);

  assertBetRange(ante, cfg.minAnteBet, cfg.maxAnteBet, "Ante", false);
  assertBetRange(pairPlus, cfg.minPairPlusBet, cfg.maxPairPlusBet, "Pair Plus", true);

  const totalWager = +(ante + pairPlus).toFixed(2);
  // Cap includes potential Play match so player can afford the decision step.
  const maxExposure = +(ante + pairPlus + ante).toFixed(2);
  const maxSingle = await getMaxSingleBet();
  if (maxExposure > maxSingle) {
    throw new Error(`Max single wager is ₱${maxSingle.toFixed(2)}`);
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, TONGITS_ARENA_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  if (existing[0] && parseFeatureState(existing[0].featureState)) {
    throw new Error("Finish your current hand (Play or Fold) before placing a new Ante.");
  }

  const resolved = resolveDeal({ ante, pairPlus, cfg });
  const sessionId = newId();
  const roundId = newId();

  const feat: TongitsArenaFeatureState = {
    kind: "tongits-arena",
    phase: "decision",
    seed: resolved.seed,
    ante,
    pairPlus,
    pairPlusWin: resolved.pairPlusWin,
    playerCards: resolved.playerCards,
    dealerCards: resolved.dealerCards,
    playerHand: resolved.playerHand,
    dealerHand: resolved.dealerHand,
    anteBonusEligible: resolved.anteBonusEligible,
  };

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
      note: `${TONGITS_ARENA_GAME_ID} · ${GAME_NAME} · ante ₱${ante.toFixed(2)} pp ₱${pairPlus.toFixed(2)}`,
    });

    if (resolved.pairPlusWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: resolved.pairPlusWin,
        type: "win",
        game: GAME_NAME,
        note: `${TONGITS_ARENA_GAME_ID} · ${GAME_NAME} · pair plus ₱${resolved.pairPlusWin.toFixed(2)}`,
      });
    }

    // Close any stale open sessions for this game
    const stale = await tx
      .select()
      .from(playSessions)
      .where(
        and(
          eq(playSessions.userId, user.id),
          eq(playSessions.gameId, TONGITS_ARENA_GAME_ID),
          eq(playSessions.status, "open"),
        ),
      );
    for (const s of stale) {
      await tx
        .update(playSessions)
        .set({ status: "closed", featureState: null })
        .where(eq(playSessions.id, s.id));
    }

    await tx.insert(playSessions).values({
      id: sessionId,
      userId: user.id,
      gameId: TONGITS_ARENA_GAME_ID,
      status: "open",
      freeSpinsLeft: 0,
      fsSessionWin: String(resolved.pairPlusWin),
      fsBombAcc: "0",
      fsSpinsPlayed: 0,
      bet: String(ante),
      ante: "yes",
      featureState: JSON.stringify(feat),
    });

    return { balance: ledger.balance, username: row.username };
  });

  void recordGameEngineAuditLog({
    gameId: TONGITS_ARENA_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: totalWager,
    payoutAmount: resolved.pairPlusWin,
    multiplier: totalWager > 0 ? +(resolved.pairPlusWin / totalWager).toFixed(4) : 0,
    resultMeta: {
      phase: "deal",
      sessionId,
      seed: resolved.seed,
      ante,
      pairPlus,
      pairPlusWin: resolved.pairPlusWin,
      playerCategory: resolved.playerHand.category,
      anteBonusEligible: resolved.anteBonusEligible,
    },
  });

  const script: PublicDealScript = {
    phase: "decision",
    sessionId,
    playerCards: resolved.playerCards,
    dealerCardsMasked: true,
    playerHand: resolved.playerHand,
    pairPlusCategory: resolved.pairPlusCategory,
    pairPlusWin: resolved.pairPlusWin,
    anteBonusPending: resolved.anteBonusEligible,
    immediateCredit: resolved.immediateCredit,
    totalWager,
    ante,
    pairPlus,
  };

  return { balance: result.balance, sessionId, script };
}

export type TongitsArenaSettleResult = {
  balance: number;
  script: PublicSettleScript;
};

export async function tongitsArenaPlay(input: {
  sessionId: string;
}): Promise<TongitsArenaSettleResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();
  await assertGameEnabled();

  const cfg = await loadEngineConfig();
  setTongitsArenaConfig(cfg);

  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, input.sessionId),
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, TONGITS_ARENA_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  const current = rows[0];
  const feat = current ? parseFeatureState(current.featureState) : null;
  if (!current || !feat) throw new Error("No open Tongits Arena hand to play");

  const playWager = feat.ante;
  const maxSingle = await getMaxSingleBet();
  if (playWager > maxSingle) {
    throw new Error(`Max single wager is ₱${maxSingle.toFixed(2)}`);
  }

  const settled = resolvePlay({
    ante: feat.ante,
    pairPlus: feat.pairPlus,
    pairPlusWinAlreadyPaid: feat.pairPlusWin,
    playerCards: feat.playerCards,
    dealerCards: feat.dealerCards,
    cfg,
  });

  const roundId = newId();

  const result = await db.transaction(async (tx) => {
    const live = await tx
      .select()
      .from(playSessions)
      .where(
        and(
          eq(playSessions.id, current.id),
          eq(playSessions.userId, user.id),
          eq(playSessions.status, "open"),
        ),
      )
      .limit(1);
    if (!live[0] || !parseFeatureState(live[0].featureState)) {
      throw new Error("Hand already settled");
    }

    const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = urows[0];
    if (!row) throw new Error("User not found");

    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(Number(row.balance), pending);
    if (available < playWager) {
      throw new Error("Insufficient balance to match the Ante (Play bet)");
    }

    // CAS claim — concurrent Play/Fold cannot double-debit.
    const claimed = await tx
      .update(playSessions)
      .set({
        status: "closed",
        featureState: null,
        fsSessionWin: String(settled.immediateCredit + feat.pairPlusWin),
      })
      .where(
        and(eq(playSessions.id, current.id), eq(playSessions.status, "open")),
      );
    if ((claimed[0]?.affectedRows ?? 0) === 0) {
      throw new Error("Hand already settled");
    }

    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -playWager,
      type: "bet",
      game: GAME_NAME,
      note: `${TONGITS_ARENA_GAME_ID} · ${GAME_NAME} · play ₱${playWager.toFixed(2)}`,
    });

    if (settled.immediateCredit > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: settled.immediateCredit,
        type: "win",
        game: GAME_NAME,
        note: `${TONGITS_ARENA_GAME_ID} · ${GAME_NAME} · ${settled.outcome} settle ₱${settled.immediateCredit.toFixed(2)}`,
      });
    }

    return { balance: ledger.balance, username: row.username };
  });

  void recordGameEngineAuditLog({
    gameId: TONGITS_ARENA_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: playWager,
    payoutAmount: settled.immediateCredit,
    multiplier: playWager > 0 ? +(settled.immediateCredit / playWager).toFixed(4) : 0,
    resultMeta: {
      phase: "play",
      sessionId: current.id,
      outcome: settled.outcome,
      dealerQualified: settled.dealerQualified,
      playerCategory: settled.playerHand.category,
      dealerCategory: settled.dealerHand.category,
      anteWin: settled.anteWin,
      playWin: settled.playWin,
      anteBonusWin: settled.anteBonusWin,
      pairPlusWin: feat.pairPlusWin,
    },
  });

  const script: PublicSettleScript = {
    phase: "settled",
    sessionId: current.id,
    decision: "play",
    playerCards: settled.playerCards,
    dealerCards: settled.dealerCards,
    playerHand: settled.playerHand,
    dealerHand: settled.dealerHand,
    dealerQualified: settled.dealerQualified,
    outcome: settled.outcome,
    anteWin: settled.anteWin,
    playWin: settled.playWin,
    pairPlusWin: settled.pairPlusWin,
    anteBonusWin: settled.anteBonusWin,
    immediateCredit: settled.immediateCredit,
    playWager: settled.playWager,
    ante: settled.ante,
    pairPlus: settled.pairPlus,
  };

  return { balance: result.balance, script };
}

export async function tongitsArenaFold(input: {
  sessionId: string;
}): Promise<TongitsArenaSettleResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();
  await assertGameEnabled();

  const cfg = await loadEngineConfig();
  setTongitsArenaConfig(cfg);

  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, input.sessionId),
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, TONGITS_ARENA_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  const current = rows[0];
  const feat = current ? parseFeatureState(current.featureState) : null;
  if (!current || !feat) throw new Error("No open Tongits Arena hand to fold");

  const settled = resolveFold({
    ante: feat.ante,
    pairPlus: feat.pairPlus,
    pairPlusWinAlreadyPaid: feat.pairPlusWin,
    playerCards: feat.playerCards,
    dealerCards: feat.dealerCards,
    cfg,
  });

  const roundId = newId();

  const result = await db.transaction(async (tx) => {
    const live = await tx
      .select()
      .from(playSessions)
      .where(
        and(
          eq(playSessions.id, current.id),
          eq(playSessions.userId, user.id),
          eq(playSessions.status, "open"),
        ),
      )
      .limit(1);
    if (!live[0] || !parseFeatureState(live[0].featureState)) {
      throw new Error("Hand already settled");
    }

    const claimed = await tx
      .update(playSessions)
      .set({
        status: "closed",
        featureState: null,
        fsSessionWin: String(feat.pairPlusWin),
      })
      .where(
        and(eq(playSessions.id, current.id), eq(playSessions.status, "open")),
      );
    if ((claimed[0]?.affectedRows ?? 0) === 0) {
      throw new Error("Hand already settled");
    }

    const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = urows[0];
    if (!row) throw new Error("User not found");

    return { balance: Number(row.balance), username: row.username };
  });

  void recordGameEngineAuditLog({
    gameId: TONGITS_ARENA_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: 0,
    payoutAmount: 0,
    multiplier: 0,
    resultMeta: {
      phase: "fold",
      sessionId: current.id,
      ante: feat.ante,
      pairPlusWin: feat.pairPlusWin,
      playerCategory: settled.playerHand.category,
      dealerCategory: settled.dealerHand.category,
    },
  });

  const script: PublicSettleScript = {
    phase: "settled",
    sessionId: current.id,
    decision: "fold",
    playerCards: settled.playerCards,
    dealerCards: settled.dealerCards,
    playerHand: settled.playerHand,
    dealerHand: settled.dealerHand,
    dealerQualified: settled.dealerQualified,
    outcome: "fold",
    anteWin: 0,
    playWin: 0,
    pairPlusWin: settled.pairPlusWin,
    anteBonusWin: 0,
    immediateCredit: 0,
    playWager: 0,
    ante: settled.ante,
    pairPlus: settled.pairPlus,
  };

  return { balance: result.balance, script };
}
