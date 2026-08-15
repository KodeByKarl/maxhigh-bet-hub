/**
 * MaxHigh Lucky Nine Plus (Variant A — baccarat-family, closer-to-9).
 * Pure functions only: no React, no I/O.
 *
 * Differentiators vs Baccarat:
 * - Natural threshold is exactly 9 (not 8/9)
 * - Symmetric third-card rule (both sides draw on ≤ drawThreshold) — no Banker tableau
 * - Dealer pays 1:1 with no commission
 * - Natural 9 (2-card) beats any 3-card total of 9
 *
 * Card face values + mod-10 hand totals are identical to Baccarat — imported, not duplicated.
 */

import {
  getCardValue,
  getHandTotal,
  pushCredit,
  winCredit,
  type Card,
} from "@/lib/baccarat-config";

export { getCardValue, getHandTotal, pushCredit, winCredit };
export type { Card };

export const LUCKY_NINE_PLUS_GAME_ID = "lucky-nine-plus";
/** Alias for resolvers that import `GAME_ID`. */
export const GAME_ID = LUCKY_NINE_PLUS_GAME_ID;
export const LUCKY_NINE_PLUS_TITLE = "Lucky Nine Plus";

/**
 * Reference RTP labels (8-deck shoe, drawThreshold 5, independent draws, tie 8:1).
 * Approximate — not enforced at runtime.
 */
export const RTP_REFERENCE = {
  dealer: 98.5,
  player: 98.5,
  tie: 85.6,
} as const;

export type LuckyNinePlusConfig = {
  schemaVersion: 1;
  /** Profit odds on Player win (1.0 = 1:1). */
  playerPayout: number;
  /** Profit odds on Dealer win — no commission (1.0 = 1:1). */
  dealerPayout: number;
  /** Profit odds on Tie (5–8 typical; default 8 = 8:1). */
  tiePayout: number;
  /**
   * Draw a third card when two-card total is ≤ this value.
   * Symmetric for Player and Dealer when dealerDrawMode is "independent".
   */
  drawThreshold: number;
  /**
   * independent — each side draws on ≤ drawThreshold (Lucky Nine Plus default).
   * after-player — Dealer only considers draw after Player's third-card
   *   decision resolves; still uses the same threshold (not Baccarat tableau).
   */
  dealerDrawMode: "independent" | "after-player";
  /** Two-card total that counts as Natural (default 9). */
  naturalTotal: number;
  /** Number of 52-card decks in the shoe. */
  deckCount: number;
  /** Reshuffle when remaining cards fall at or below this fraction of shoe. */
  reshuffleBelowFraction: number;
  /** Display / lobby target RTP % — not enforced live. */
  rtpTarget: number;
  minPlayerBet: number;
  maxPlayerBet: number;
  minDealerBet: number;
  maxDealerBet: number;
  minTieBet: number;
  maxTieBet: number;
  /** Quick-bet chip amounts shown in the betting dock. */
  betSteps: number[];
};

export const DEFAULT_LUCKY_NINE_PLUS_CONFIG: LuckyNinePlusConfig = {
  schemaVersion: 1,
  playerPayout: 1.0,
  dealerPayout: 1.0,
  tiePayout: 8,
  drawThreshold: 5,
  dealerDrawMode: "independent",
  naturalTotal: 9,
  deckCount: 8,
  reshuffleBelowFraction: 0.25,
  rtpTarget: RTP_REFERENCE.dealer,
  minPlayerBet: 1,
  maxPlayerBet: 500,
  minDealerBet: 1,
  maxDealerBet: 500,
  minTieBet: 1,
  maxTieBet: 500,
  betSteps: [1, 2, 5, 10, 20, 50, 100, 200, 500],
};

/** @deprecated Prefer `cfg.betSteps` from engine config. */
export const BET_STEPS = DEFAULT_LUCKY_NINE_PLUS_CONFIG.betSteps;

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

/**
 * Symmetric third-card rule: draw when total ≤ drawThreshold (default 5 → stand on 6+).
 * Used for both Player and Dealer in independent mode.
 */
export function shouldDraw(total: number, threshold = DEFAULT_LUCKY_NINE_PLUS_CONFIG.drawThreshold): boolean {
  const t = Math.max(0, Math.min(8, Math.round(threshold)));
  return total >= 0 && total <= t;
}

/** Two-card natural when total equals configured naturalTotal (default 9). */
export function isNatural(twoCardTotal: number, naturalTotal = DEFAULT_LUCKY_NINE_PLUS_CONFIG.naturalTotal): boolean {
  return twoCardTotal === naturalTotal;
}

export function normalizeLuckyNinePlusConfig(raw: unknown): LuckyNinePlusConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_LUCKY_NINE_PLUS_CONFIG);
  const o = raw as Partial<LuckyNinePlusConfig> & {
    bankerPayout?: number;
    minBankerBet?: number;
    maxBankerBet?: number;
    minBet?: number;
    maxBet?: number;
    decksInShoe?: number;
    targetRtp?: number;
  };
  const d = DEFAULT_LUCKY_NINE_PLUS_CONFIG;

  const minPlayerBet = clamp(num(o.minPlayerBet ?? o.minBet, d.minPlayerBet), 0.01, 10_000);
  const maxPlayerBet = clamp(
    num(o.maxPlayerBet ?? o.maxBet, d.maxPlayerBet),
    minPlayerBet,
    100_000,
  );
  const minDealerBet = clamp(
    num(o.minDealerBet ?? o.minBankerBet ?? o.minBet, d.minDealerBet),
    0.01,
    10_000,
  );
  const maxDealerBet = clamp(
    num(o.maxDealerBet ?? o.maxBankerBet ?? o.maxBet, d.maxDealerBet),
    minDealerBet,
    100_000,
  );
  const minTieBet = clamp(num(o.minTieBet, d.minTieBet), 0.01, 10_000);
  const maxTieBet = clamp(num(o.maxTieBet, d.maxTieBet), minTieBet, 100_000);

  const dealerDrawMode: LuckyNinePlusConfig["dealerDrawMode"] =
    o.dealerDrawMode === "after-player" ? "after-player" : "independent";

  const maxMain = Math.max(maxPlayerBet, maxDealerBet);

  return {
    schemaVersion: 1,
    playerPayout: clamp(num(o.playerPayout, d.playerPayout), 0.5, 2),
    dealerPayout: clamp(num(o.dealerPayout ?? o.bankerPayout, d.dealerPayout), 0.5, 2),
    tiePayout: clamp(num(o.tiePayout, d.tiePayout), 1, 100),
    drawThreshold: clamp(Math.round(num(o.drawThreshold, d.drawThreshold)), 0, 8),
    dealerDrawMode,
    naturalTotal: clamp(Math.round(num(o.naturalTotal, d.naturalTotal)), 7, 9),
    deckCount: clamp(Math.round(num(o.deckCount ?? o.decksInShoe, d.deckCount)), 1, 8),
    reshuffleBelowFraction: clamp(
      num(o.reshuffleBelowFraction, d.reshuffleBelowFraction),
      0.05,
      0.75,
    ),
    rtpTarget: clamp(num(o.rtpTarget ?? o.targetRtp, d.rtpTarget), 80, 99.5),
    minPlayerBet,
    maxPlayerBet,
    minDealerBet,
    maxDealerBet,
    minTieBet,
    maxTieBet,
    betSteps: normalizeBetSteps(o.betSteps, d.betSteps).filter((s) => s <= maxMain),
  };
}
