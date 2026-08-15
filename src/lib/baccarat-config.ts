/**
 * MaxHigh Baccarat (Punto Banco) — shared math + superadmin-editable payout/limits.
 * Pure functions only: no React, no I/O. Resolver / UI / settlement live elsewhere.
 *
 * Payout fields are profit odds (e.g. playerPayout 1.0 = 1:1). Settlement must
 * credit stake return + profit when winning; do not double-apply.
 *
 * RTP note: baccarat house edge is fixed by the deal rules, not tunable like a slot.
 * `rtpTarget` / `RTP_REFERENCE` are compliance labels only — not enforced at runtime.
 */

export const BACCARAT_GAME_ID = "baccarat";
/** Alias for resolvers that import `GAME_ID`. */
export const GAME_ID = BACCARAT_GAME_ID;
export const BACCARAT_TITLE = "Baccarat";

export const BACCARAT_RANKS = [
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

export type BaccaratRank = (typeof BACCARAT_RANKS)[number];
export const BACCARAT_SUITS = ["S", "H", "D", "C"] as const;
export type BaccaratSuit = (typeof BACCARAT_SUITS)[number];

/** Minimal card shape used by hand math and pair side bets. */
export type Card = {
  rank: BaccaratRank;
  suit?: BaccaratSuit | string;
  id?: string;
};

/**
 * Punto Banco face values: A=1, 2–9 = pip, 10/J/Q/K = 0.
 * Hand total is the last digit of the sum (mod 10).
 */
export const CARD_VALUE: Record<BaccaratRank, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 0,
  J: 0,
  Q: 0,
  K: 0,
};

/**
 * Standard theoretical RTP % by bet type (8-deck shoe, classic tableau).
 * Reference only — not used to force outcomes.
 */
export const RTP_REFERENCE = {
  banker: 98.94,
  player: 98.76,
  tie: 85.64,
} as const;

export type BaccaratConfig = {
  schemaVersion: 1;
  /** Profit odds on Player win (1.0 = 1:1). */
  playerPayout: number;
  /** Profit odds on Banker win after commission (0.95 = 1:1 − 5%). */
  bankerPayout: number;
  /** Commission fraction taken from Banker wins (0.05 = 5%). */
  bankerCommission: number;
  /** Profit odds on Tie (8 = 8:1). */
  tiePayout: number;
  /** Profit odds on Player Pair (11 = 11:1). */
  playerPairPayout: number;
  /** Profit odds on Banker Pair (11 = 11:1). */
  bankerPairPayout: number;
  /** Number of 52-card decks in the shoe (standard casino = 8). */
  deckCount: number;
  /** Reshuffle when remaining cards fall at or below this fraction of shoe. */
  reshuffleBelowFraction: number;
  /**
   * Display / lobby target RTP % (Banker main bet ≈ 98.94%).
   * Not enforced live — baccarat RTP is fixed by the tableau math.
   */
  rtpTarget: number;
  minPlayerBet: number;
  maxPlayerBet: number;
  minBankerBet: number;
  maxBankerBet: number;
  minTieBet: number;
  maxTieBet: number;
  minPlayerPairBet: number;
  maxPlayerPairBet: number;
  minBankerPairBet: number;
  maxBankerPairBet: number;
  /** Quick-bet chip amounts shown in the betting dock. */
  betSteps: number[];
};

export const DEFAULT_BACCARAT_CONFIG: BaccaratConfig = {
  schemaVersion: 1,
  playerPayout: 1.0,
  bankerPayout: 0.95,
  bankerCommission: 0.05,
  tiePayout: 8,
  playerPairPayout: 11,
  bankerPairPayout: 11,
  deckCount: 8,
  reshuffleBelowFraction: 0.25,
  rtpTarget: RTP_REFERENCE.banker,
  minPlayerBet: 1,
  maxPlayerBet: 500,
  minBankerBet: 1,
  maxBankerBet: 500,
  minTieBet: 1,
  maxTieBet: 500,
  minPlayerPairBet: 1,
  maxPlayerPairBet: 500,
  minBankerPairBet: 1,
  maxBankerPairBet: 500,
  betSteps: [1, 2, 5, 10, 20, 50, 100, 200, 500],
};

/** @deprecated Prefer `cfg.betSteps` from engine config. */
export const BET_STEPS = DEFAULT_BACCARAT_CONFIG.betSteps;

/**
 * After stake was debited: credit = stake × (1 + profitOdds).
 * e.g. playerPayout 1.0 → even money (return stake + 1× profit).
 */
export function winCredit(stake: number, profitOdds: number): number {
  if (!Number.isFinite(stake) || stake <= 0) return 0;
  return +(stake * (1 + profitOdds)).toFixed(2);
}

/** Push / return stake only (Player & Banker main bets on Tie). */
export function pushCredit(stake: number): number {
  if (!Number.isFinite(stake) || stake <= 0) return 0;
  return +stake.toFixed(2);
}

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

export function getCardValue(card: Card | BaccaratRank | string): number {
  const rank = typeof card === "string" ? card : card.rank;
  return CARD_VALUE[rank as BaccaratRank] ?? 0;
}

/** Sum of baccarat face values, last digit only (mod 10). */
export function getHandTotal(cards: readonly Card[]): number {
  let sum = 0;
  for (const c of cards) sum += getCardValue(c);
  return sum % 10;
}

/**
 * Player third-card rule (after naturals are ruled out).
 * Draw on totals 0–5; stand on 6–7. Naturals 8–9 short-circuit before this.
 */
export function shouldPlayerDraw(playerTotal: number): boolean {
  return playerTotal >= 0 && playerTotal <= 5;
}

/**
 * Banker third-card tableau (Punto Banco).
 *
 * Call only when neither side has a natural (8 or 9 on the first two cards).
 *
 * When the player stands (no third card):
 *   - Banker draws on 0–5, stands on 6–9.
 *
 * When the player draws, the banker's decision depends on the player's third-card value:
 *   | Banker total | Draws if player's third card is… |
 *   |--------------|-----------------------------------|
 *   | 0, 1, 2      | always                            |
 *   | 3            | anything except 8                 |
 *   | 4            | 2, 3, 4, 5, 6, 7                  |
 *   | 5            | 4, 5, 6, 7                        |
 *   | 6            | 6, 7                              |
 *   | 7            | never                             |
 *
 * @param bankerTotal — banker's two-card total (0–7; 8–9 already settled as natural)
 * @param playerDrew — whether the player took a third card
 * @param playerThirdCard — baccarat face value of that card (0–9), or null if player stood
 */
export function shouldBankerDraw(
  bankerTotal: number,
  playerDrew: boolean,
  playerThirdCard: number | null,
): boolean {
  if (!playerDrew) {
    return bankerTotal >= 0 && bankerTotal <= 5;
  }

  const third = playerThirdCard ?? 0;

  switch (bankerTotal) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return third !== 8;
    case 4:
      return third >= 2 && third <= 7;
    case 5:
      return third >= 4 && third <= 7;
    case 6:
      return third === 6 || third === 7;
    case 7:
      return false;
    default:
      return false;
  }
}

/** Player Pair / Banker Pair: first two cards share the same rank. */
export function isPair(card1: Card, card2: Card): boolean {
  return card1.rank === card2.rank;
}

export function normalizeBaccaratConfig(raw: unknown): BaccaratConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_BACCARAT_CONFIG);
  const o = raw as Partial<BaccaratConfig> & {
    decksInShoe?: number;
    targetRtp?: number;
    minBet?: number;
    maxBet?: number;
  };
  const d = DEFAULT_BACCARAT_CONFIG;

  const minPlayerBet = clamp(num(o.minPlayerBet ?? o.minBet, d.minPlayerBet), 0.01, 10_000);
  const maxPlayerBet = clamp(
    num(o.maxPlayerBet ?? o.maxBet, d.maxPlayerBet),
    minPlayerBet,
    100_000,
  );
  const minBankerBet = clamp(num(o.minBankerBet ?? o.minBet, d.minBankerBet), 0.01, 10_000);
  const maxBankerBet = clamp(
    num(o.maxBankerBet ?? o.maxBet, d.maxBankerBet),
    minBankerBet,
    100_000,
  );
  const minTieBet = clamp(num(o.minTieBet, d.minTieBet), 0.01, 10_000);
  const maxTieBet = clamp(num(o.maxTieBet, d.maxTieBet), minTieBet, 100_000);
  const minPlayerPairBet = clamp(num(o.minPlayerPairBet, d.minPlayerPairBet), 0.01, 10_000);
  const maxPlayerPairBet = clamp(
    num(o.maxPlayerPairBet, d.maxPlayerPairBet),
    minPlayerPairBet,
    100_000,
  );
  const minBankerPairBet = clamp(num(o.minBankerPairBet, d.minBankerPairBet), 0.01, 10_000);
  const maxBankerPairBet = clamp(
    num(o.maxBankerPairBet, d.maxBankerPairBet),
    minBankerPairBet,
    100_000,
  );

  const bankerCommission = clamp(num(o.bankerCommission, d.bankerCommission), 0, 0.5);
  const bankerPayoutRaw = o.bankerPayout;
  const bankerPayout =
    bankerPayoutRaw !== undefined
      ? clamp(num(bankerPayoutRaw, d.bankerPayout), 0.5, 2)
      : clamp(1 - bankerCommission, 0.5, 2);

  const maxMain = Math.max(maxPlayerBet, maxBankerBet);

  return {
    schemaVersion: 1,
    playerPayout: clamp(num(o.playerPayout, d.playerPayout), 0.5, 2),
    bankerPayout,
    bankerCommission,
    tiePayout: clamp(num(o.tiePayout, d.tiePayout), 1, 100),
    playerPairPayout: clamp(num(o.playerPairPayout, d.playerPairPayout), 1, 100),
    bankerPairPayout: clamp(num(o.bankerPairPayout, d.bankerPairPayout), 1, 100),
    deckCount: clamp(Math.round(num(o.deckCount ?? o.decksInShoe, d.deckCount)), 1, 8),
    reshuffleBelowFraction: clamp(
      num(o.reshuffleBelowFraction, d.reshuffleBelowFraction),
      0.05,
      0.75,
    ),
    rtpTarget: clamp(num(o.rtpTarget ?? o.targetRtp, d.rtpTarget), 80, 99.5),
    minPlayerBet,
    maxPlayerBet,
    minBankerBet,
    maxBankerBet,
    minTieBet,
    maxTieBet,
    minPlayerPairBet,
    maxPlayerPairBet,
    minBankerPairBet,
    maxBankerPairBet,
    betSteps: normalizeBetSteps(o.betSteps, d.betSteps).filter((s) => s <= maxMain),
  };
}
