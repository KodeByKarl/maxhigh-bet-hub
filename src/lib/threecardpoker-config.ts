/**
 * MaxHigh Three Card Poker — shared math + superadmin-editable payouts/limits.
 * Pure functions only: no React, no I/O.
 *
 * Ranking (highest → lowest; NOTE: Straight beats Flush):
 *   Straight Flush > Three of a Kind > Straight > Flush > Pair > High Card
 *
 * Ace is always high except A-2-3 (the wheel / low straight).
 * Dealer must qualify with Queen-high or better to contest Ante/Play.
 *
 * Payout fields are profit odds (e.g. 1.0 = 1:1). Settlement credits
 * stake return + profit via winCredit / pushCredit after stakes are debited.
 */

import { pushCredit, winCredit } from "@/lib/baccarat-config";

export { pushCredit, winCredit };

export const THREE_CARD_POKER_GAME_ID = "threecardpoker";
/** Alias for resolvers that import `GAME_ID`. */
export const GAME_ID = THREE_CARD_POKER_GAME_ID;
export const THREE_CARD_POKER_TITLE = "Three Card Poker";

export const TCP_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export type TcpRank = (typeof TCP_RANKS)[number];
export const TCP_SUITS = ["S", "H", "D", "C"] as const;
export type TcpSuit = (typeof TCP_SUITS)[number];

/** Poker face values — Ace high (14). Wheel A-2-3 handled in the evaluator. */
export const POKER_RANK_VALUE: Record<TcpRank, number> = {
  A: 14,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
};

export type HandCategory =
  | "straight-flush"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "pair"
  | "high-card";

export const HAND_CATEGORY_RANK: Record<HandCategory, number> = {
  "straight-flush": 5,
  "three-of-a-kind": 4,
  straight: 3,
  flush: 2,
  pair: 1,
  "high-card": 0,
};

export type QualifyRank = "Q" | "K" | "A" | "J" | "10";

/**
 * Reference RTP labels (single deck, Queen qualify, Pair Plus Flush 3:1 / Trips 30:1).
 * Approximate — not enforced at runtime.
 */
export const RTP_REFERENCE = {
  antePlay: 97.8,
  pairPlus: 97.4,
  overall: 97.6,
} as const;

export type PairPlusPayouts = {
  pair: number;
  flush: number;
  straight: number;
  threeOfAKind: number;
  straightFlush: number;
};

export type AnteBonusPayouts = {
  straight: number;
  threeOfAKind: number;
  straightFlush: number;
};

export type ThreeCardPokerConfig = {
  schemaVersion: 1;
  /** Profit odds on Ante win when dealer qualifies / player beats dealer (1.0 = 1:1). */
  antePayout: number;
  /** Profit odds on Play win (1.0 = 1:1). */
  playPayout: number;
  /**
   * Minimum dealer high-card rank to qualify (default Queen).
   * Pair-or-better always qualifies regardless of this threshold.
   */
  dealerQualifyRank: QualifyRank;
  /** Pair Plus profit odds by hand category. */
  pairPlus: PairPlusPayouts;
  /** When false, Ante Bonus is never paid (MVP default). */
  anteBonusEnabled: boolean;
  /** Ante Bonus profit odds (paid on Ante stake when hand qualifies). */
  anteBonus: AnteBonusPayouts;
  /** Single-deck table by default (standard Three Card Poker). */
  deckCount: number;
  reshuffleBelowFraction: number;
  /** Display / lobby target RTP % — not enforced live. */
  rtpTarget: number;
  minAnteBet: number;
  maxAnteBet: number;
  minPairPlusBet: number;
  maxPairPlusBet: number;
  /** Quick-bet chip amounts shown in the betting dock. */
  betSteps: number[];
};

export const DEFAULT_THREE_CARD_POKER_CONFIG: ThreeCardPokerConfig = {
  schemaVersion: 1,
  antePayout: 1.0,
  playPayout: 1.0,
  dealerQualifyRank: "Q",
  pairPlus: {
    pair: 1,
    flush: 3,
    straight: 6,
    threeOfAKind: 30,
    straightFlush: 40,
  },
  anteBonusEnabled: false,
  anteBonus: {
    straight: 1,
    threeOfAKind: 4,
    straightFlush: 5,
  },
  deckCount: 1,
  reshuffleBelowFraction: 0.25,
  rtpTarget: RTP_REFERENCE.overall,
  minAnteBet: 1,
  maxAnteBet: 500,
  minPairPlusBet: 1,
  maxPairPlusBet: 500,
  betSteps: [1, 2, 5, 10, 20, 50, 100, 200, 500],
};

/** @deprecated Prefer `cfg.betSteps` from engine config. */
export const BET_STEPS = DEFAULT_THREE_CARD_POKER_CONFIG.betSteps;

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBetSteps(raw: unknown, fallback: number[]): number[] {
  const src = Array.isArray(raw) ? raw : fallback;
  const out: number[] = [];
  for (const v of src) {
    const n = Math.round(num(v, 0) * 100) / 100;
    if (n > 0 && n <= 100_000 && !out.includes(n)) out.push(n);
  }
  out.sort((a, b) => a - b);
  return out.length > 0 ? out : [...fallback];
}

const QUALIFY_RANKS: QualifyRank[] = ["10", "J", "Q", "K", "A"];

function normalizeQualifyRank(raw: unknown, fallback: QualifyRank): QualifyRank {
  if (typeof raw === "string" && QUALIFY_RANKS.includes(raw as QualifyRank)) {
    return raw as QualifyRank;
  }
  return fallback;
}

export function pokerRankValue(rank: string): number {
  return POKER_RANK_VALUE[rank as TcpRank] ?? 0;
}

export function qualifyThresholdValue(rank: QualifyRank): number {
  return pokerRankValue(rank);
}

/**
 * Pair Plus profit odds for a classified hand category.
 * High card / non-paying hands return 0.
 */
export function pairPlusOdds(category: HandCategory, cfg: ThreeCardPokerConfig): number {
  switch (category) {
    case "pair":
      return cfg.pairPlus.pair;
    case "flush":
      return cfg.pairPlus.flush;
    case "straight":
      return cfg.pairPlus.straight;
    case "three-of-a-kind":
      return cfg.pairPlus.threeOfAKind;
    case "straight-flush":
      return cfg.pairPlus.straightFlush;
    default:
      return 0;
  }
}

/**
 * Ante Bonus profit odds for a classified hand (Straight+ only).
 * Returns 0 when disabled or hand is below Straight.
 */
export function anteBonusOdds(category: HandCategory, cfg: ThreeCardPokerConfig): number {
  if (!cfg.anteBonusEnabled) return 0;
  switch (category) {
    case "straight":
      return cfg.anteBonus.straight;
    case "three-of-a-kind":
      return cfg.anteBonus.threeOfAKind;
    case "straight-flush":
      return cfg.anteBonus.straightFlush;
    default:
      return 0;
  }
}

export function normalizeThreeCardPokerConfig(raw: unknown): ThreeCardPokerConfig {
  if (!raw || typeof raw !== "object") {
    return structuredClone(DEFAULT_THREE_CARD_POKER_CONFIG);
  }
  const o = raw as Partial<ThreeCardPokerConfig> & {
    minBet?: number;
    maxBet?: number;
    decksInShoe?: number;
    targetRtp?: number;
    pairPlusPayouts?: Partial<PairPlusPayouts>;
    anteBonusPayouts?: Partial<AnteBonusPayouts>;
  };
  const d = DEFAULT_THREE_CARD_POKER_CONFIG;

  const minAnteBet = clamp(num(o.minAnteBet ?? o.minBet, d.minAnteBet), 0.01, 10_000);
  const maxAnteBet = clamp(num(o.maxAnteBet ?? o.maxBet, d.maxAnteBet), minAnteBet, 100_000);
  const minPairPlusBet = clamp(num(o.minPairPlusBet, d.minPairPlusBet), 0.01, 10_000);
  const maxPairPlusBet = clamp(
    num(o.maxPairPlusBet, d.maxPairPlusBet),
    minPairPlusBet,
    100_000,
  );

  const pp = o.pairPlus ?? o.pairPlusPayouts ?? {};
  const ab = o.anteBonus ?? o.anteBonusPayouts ?? {};

  return {
    schemaVersion: 1,
    antePayout: clamp(num(o.antePayout, d.antePayout), 0.5, 2),
    playPayout: clamp(num(o.playPayout, d.playPayout), 0.5, 2),
    dealerQualifyRank: normalizeQualifyRank(o.dealerQualifyRank, d.dealerQualifyRank),
    pairPlus: {
      pair: clamp(num(pp.pair, d.pairPlus.pair), 0.5, 50),
      flush: clamp(num(pp.flush, d.pairPlus.flush), 1, 50),
      straight: clamp(num(pp.straight, d.pairPlus.straight), 1, 100),
      threeOfAKind: clamp(num(pp.threeOfAKind, d.pairPlus.threeOfAKind), 1, 200),
      straightFlush: clamp(num(pp.straightFlush, d.pairPlus.straightFlush), 1, 500),
    },
    anteBonusEnabled: o.anteBonusEnabled === true,
    anteBonus: {
      straight: clamp(num(ab.straight, d.anteBonus.straight), 0, 50),
      threeOfAKind: clamp(num(ab.threeOfAKind, d.anteBonus.threeOfAKind), 0, 100),
      straightFlush: clamp(num(ab.straightFlush, d.anteBonus.straightFlush), 0, 200),
    },
    deckCount: clamp(Math.round(num(o.deckCount ?? o.decksInShoe, d.deckCount)), 1, 8),
    reshuffleBelowFraction: clamp(
      num(o.reshuffleBelowFraction, d.reshuffleBelowFraction),
      0.05,
      0.75,
    ),
    rtpTarget: clamp(num(o.rtpTarget ?? o.targetRtp, d.rtpTarget), 80, 99.5),
    minAnteBet,
    maxAnteBet,
    minPairPlusBet,
    maxPairPlusBet,
    betSteps: normalizeBetSteps(o.betSteps, d.betSteps).filter((s) => s <= maxAnteBet),
  };
}
