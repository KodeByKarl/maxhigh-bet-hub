/**
 * MaxHigh Royal Climb — Hi-Lo card ladder (game id kept as `lucky-drop`).
 * Pure functions only: no React, no I/O.
 *
 * One 52-card deck, Ace high. Each step the player calls HIGHER or LOWER than
 * the current card; equal rank loses. Step multiplier = (1 − houseEdge) / p,
 * where p is the exact probability from the cards still in the deck — so RTP is
 * (1 − houseEdge) whatever the player does. Skill = counting the deck, picking
 * the right moment to cash out, and spending the limited skips wisely.
 */

export const LUCKY_DROP_GAME_ID = "lucky-drop";
export const GAME_ID = LUCKY_DROP_GAME_ID;
export const LUCKY_DROP_TITLE = "Royal Climb";

export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export const SUITS = ["S", "H", "D", "C"] as const;
export type Suit = (typeof SUITS)[number];
export type Pick = "higher" | "lower";

export type PublicCard = { rank: number; suit: Suit };

export const RTP_REFERENCE = { overall: 96 } as const;

export type LuckyDropConfig = {
  schemaVersion: 2;
  /** House edge % applied to every step (RTP = 100 − edge). */
  houseEdge: number;
  /** Correct calls needed to auto-cash the ladder. */
  maxSteps: number;
  /** Free card swaps per run (no risk, card leaves the deck). */
  skips: number;
  /** Hard cap on the total multiplier of a run. */
  maxMult: number;
  rtpTarget: number;
  minBet: number;
  maxBet: number;
  betSteps: number[];
};

export const DEFAULT_LUCKY_DROP_CONFIG: LuckyDropConfig = {
  schemaVersion: 2,
  houseEdge: 4,
  maxSteps: 10,
  skips: 2,
  maxMult: 500,
  rtpTarget: RTP_REFERENCE.overall,
  minBet: 1,
  maxBet: 500,
  betSteps: [1, 2, 5, 10, 20, 50, 100, 200, 500],
};

/** @deprecated Prefer `cfg.betSteps` from engine config. */
export const BET_STEPS = DEFAULT_LUCKY_DROP_CONFIG.betSteps;

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

export function normalizeLuckyDropConfig(raw: unknown): LuckyDropConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_LUCKY_DROP_CONFIG);
  const o = raw as Partial<LuckyDropConfig>;
  const d = DEFAULT_LUCKY_DROP_CONFIG;

  const minBet = clamp(num(o.minBet, d.minBet), 0.01, 10_000);
  const maxBet = clamp(num(o.maxBet, d.maxBet), minBet, 100_000);
  const houseEdge = clamp(num(o.houseEdge, d.houseEdge), 0.5, 20);
  const steps = normalizeBetSteps(o.betSteps, d.betSteps).filter((s) => s <= maxBet);

  return {
    schemaVersion: 2,
    houseEdge,
    maxSteps: clamp(Math.round(num(o.maxSteps, d.maxSteps)), 2, 20),
    skips: clamp(Math.round(num(o.skips, d.skips)), 0, 5),
    maxMult: clamp(num(o.maxMult, d.maxMult), 5, 10_000),
    rtpTarget: +(100 - houseEdge).toFixed(2),
    minBet,
    maxBet,
    betSteps: steps.length > 0 ? steps : [minBet],
  };
}

/** Card id 0–51 → rank 2–14 + suit. */
export function cardFromId(id: number): PublicCard {
  return { rank: 2 + (id % 13), suit: SUITS[Math.floor(id / 13)] };
}

/** Count of remaining cards per rank (index = rank − 2). */
export function rankCountsFromDeck(deck: number[]): number[] {
  const counts = new Array<number>(13).fill(0);
  for (const id of deck) counts[id % 13] += 1;
  return counts;
}

export type PickOdds = { p: number; mult: number } | null;

/** Exact odds for calling `pick` against `rank`, given what is left in the deck. */
export function oddsFor(
  pick: Pick,
  rank: number,
  rankCounts: number[],
  houseEdge: number,
): PickOdds {
  let hit = 0;
  let total = 0;
  for (let i = 0; i < 13; i++) {
    const c = rankCounts[i] ?? 0;
    total += c;
    const r = i + 2;
    if (pick === "higher" ? r > rank : r < rank) hit += c;
  }
  if (hit <= 0 || total <= 0) return null;
  const p = hit / total;
  const mult = Math.max(1.01, +((1 - houseEdge / 100) / p).toFixed(4));
  return { p, mult };
}
