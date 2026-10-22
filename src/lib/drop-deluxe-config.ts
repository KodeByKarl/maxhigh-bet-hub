/**
 * MaxHigh Deluxe Draw — 5-card draw video poker, Jacks or Better (game id kept as `drop-deluxe`).
 * Pure functions only: no React, no I/O.
 *
 * Deal 5, hold any, draw once. Paytable values are TOTAL return multipliers
 * (incl. stake). The default 7/5 Jacks-or-Better table returns ≈96.4% with
 * optimal holds — mistakes cost the player, so skill matters.
 */

export const DROP_DELUXE_GAME_ID = "drop-deluxe";
export const GAME_ID = DROP_DELUXE_GAME_ID;
export const DROP_DELUXE_TITLE = "Deluxe Draw";

export const HAND_KEYS = [
  "royal",
  "straightFlush",
  "four",
  "fullHouse",
  "flush",
  "straight",
  "three",
  "twoPair",
  "jacks",
] as const;
export type HandKey = (typeof HAND_KEYS)[number];
export type HandResult = HandKey | "none";

export const HAND_LABEL: Record<HandKey, string> = {
  royal: "Royal Flush",
  straightFlush: "Straight Flush",
  four: "Four of a Kind",
  fullHouse: "Full House",
  flush: "Flush",
  straight: "Straight",
  three: "Three of a Kind",
  twoPair: "Two Pair",
  jacks: "Jacks or Better",
};

export const SUITS = ["S", "H", "D", "C"] as const;
export type Suit = (typeof SUITS)[number];
export type PublicCard = { rank: number; suit: Suit };

/** Reference RTP of the default paytable with optimal play (7/5 JoB ≈ 96.39%). */
export const RTP_REFERENCE = { overall: 96.4 } as const;

export type DropDeluxeConfig = {
  schemaVersion: 2;
  /** Total-return multiplier per hand (stake included). */
  paytable: Record<HandKey, number>;
  rtpTarget: number;
  minBet: number;
  maxBet: number;
  betSteps: number[];
};

export const DEFAULT_PAYTABLE: Record<HandKey, number> = {
  royal: 800,
  straightFlush: 50,
  four: 25,
  fullHouse: 7,
  flush: 5,
  straight: 4,
  three: 3,
  twoPair: 2,
  jacks: 1,
};

export const DEFAULT_DROP_DELUXE_CONFIG: DropDeluxeConfig = {
  schemaVersion: 2,
  paytable: { ...DEFAULT_PAYTABLE },
  rtpTarget: RTP_REFERENCE.overall,
  minBet: 1,
  maxBet: 500,
  betSteps: [1, 2, 5, 10, 20, 50, 100, 200, 500],
};

/** @deprecated Prefer `cfg.betSteps` from engine config. */
export const BET_STEPS = DEFAULT_DROP_DELUXE_CONFIG.betSteps;

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

export function normalizeDropDeluxeConfig(raw: unknown): DropDeluxeConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_DROP_DELUXE_CONFIG);
  const o = raw as Partial<DropDeluxeConfig>;
  const d = DEFAULT_DROP_DELUXE_CONFIG;
  const rawPay = (o.paytable && typeof o.paytable === "object" ? o.paytable : {}) as Partial<
    Record<HandKey, unknown>
  >;

  const paytable = {} as Record<HandKey, number>;
  for (const k of HAND_KEYS) {
    paytable[k] = clamp(num(rawPay[k], d.paytable[k]), 0, 10_000);
  }

  const minBet = clamp(num(o.minBet, d.minBet), 0.01, 10_000);
  const maxBet = clamp(num(o.maxBet, d.maxBet), minBet, 100_000);
  const steps = normalizeBetSteps(o.betSteps, d.betSteps).filter((s) => s <= maxBet);

  return {
    schemaVersion: 2,
    paytable,
    rtpTarget: clamp(num(o.rtpTarget, d.rtpTarget), 50, 99.9),
    minBet,
    maxBet,
    betSteps: steps.length > 0 ? steps : [minBet],
  };
}

/** Card id 0–51 → rank 2–14 (Ace high) + suit. */
export function cardFromId(id: number): PublicCard {
  return { rank: 2 + (id % 13), suit: SUITS[Math.floor(id / 13)] };
}

/** Classify a 5-card hand (ids 0–51). */
export function evaluateHand(ids: number[]): HandResult {
  const cards = ids.map(cardFromId);
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.values()].sort((a, b) => b - a);

  const wheel = ranks.join(",") === "2,3,4,5,14";
  const straight = wheel || (groups[0] === 1 && ranks[4] - ranks[0] === 4);
  const high = wheel ? 5 : ranks[4];

  if (straight && flush) return high === 14 ? "royal" : "straightFlush";
  if (groups[0] === 4) return "four";
  if (groups[0] === 3 && groups[1] === 2) return "fullHouse";
  if (flush) return "flush";
  if (straight) return "straight";
  if (groups[0] === 3) return "three";
  if (groups[0] === 2 && groups[1] === 2) return "twoPair";
  if (groups[0] === 2) {
    for (const [r, c] of counts) if (c === 2 && r >= 11) return "jacks";
  }
  return "none";
}
