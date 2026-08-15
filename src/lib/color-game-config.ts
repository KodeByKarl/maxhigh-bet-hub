/**
 * MaxHigh Color Game (PH perya-style, simplified).
 * Pure functions only: no React, no I/O.
 *
 * Fair die over 6 colors → even-money total return would be 6× (profitOdds 5).
 * Default payoutMult 5.5× (total return incl. stake) ≈ 91.7% RTP on a single-color bet
 * when weights are equal. Documented house edge ≈ 8.3%.
 *
 * `payoutMult` is TOTAL return multiplier (5.5 → credit stake × 5.5 via winCredit(stake, mult-1)).
 */

import { winCredit } from "@/lib/baccarat-config";

export { winCredit };

export const COLOR_GAME_GAME_ID = "color-game";
export const GAME_ID = COLOR_GAME_GAME_ID;
export const COLOR_GAME_TITLE = "Color Game";

export const COLOR_SPOT_IDS = [
  "red",
  "yellow",
  "blue",
  "green",
  "white",
  "pink",
] as const;

export type ColorSpotId = (typeof COLOR_SPOT_IDS)[number];

export type ColorSpotDef = {
  id: ColorSpotId;
  label: string;
  /** CSS hex for UI pads / wheel. */
  hex: string;
  /** Relative roll weight (default 1 = fair die). */
  weight: number;
  /**
   * Total-return multiplier when this color wins (incl. stake).
   * Default 5.5 on 6 faces → ~91.7% RTP single-spot.
   */
  payoutMult: number;
};

/**
 * Reference RTP (equal weights, default 5.5× single-color).
 * Approximate — not enforced at runtime.
 */
export const RTP_REFERENCE = {
  singleColor: 91.67,
  overall: 91.67,
} as const;

export type ColorGameConfig = {
  schemaVersion: 1;
  spots: ColorSpotDef[];
  /** Display / lobby target RTP % — not enforced live. */
  rtpTarget: number;
  minBet: number;
  maxBet: number;
  /** Per-spot max (defaults to maxBet). */
  maxSpotBet: number;
  /** Quick-bet chip amounts shown in the betting dock. */
  betSteps: number[];
};

export const DEFAULT_COLOR_SPOTS: ColorSpotDef[] = [
  { id: "red", label: "Red", hex: "#ef4444", weight: 1, payoutMult: 5.5 },
  { id: "yellow", label: "Yellow", hex: "#eab308", weight: 1, payoutMult: 5.5 },
  { id: "blue", label: "Blue", hex: "#3b82f6", weight: 1, payoutMult: 5.5 },
  { id: "green", label: "Green", hex: "#22c55e", weight: 1, payoutMult: 5.5 },
  { id: "white", label: "White", hex: "#f8fafc", weight: 1, payoutMult: 5.5 },
  { id: "pink", label: "Pink", hex: "#ec4899", weight: 1, payoutMult: 5.5 },
];

export const DEFAULT_COLOR_GAME_CONFIG: ColorGameConfig = {
  schemaVersion: 1,
  spots: structuredClone(DEFAULT_COLOR_SPOTS),
  rtpTarget: RTP_REFERENCE.overall,
  minBet: 1,
  maxBet: 500,
  maxSpotBet: 500,
  betSteps: [1, 2, 5, 10, 20, 50, 100, 200, 500],
};

/** @deprecated Prefer `cfg.betSteps` from engine config. */
export const BET_STEPS = DEFAULT_COLOR_GAME_CONFIG.betSteps;

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

function normalizeSpot(raw: unknown, fallback: ColorSpotDef): ColorSpotDef {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Partial<ColorSpotDef>;
  const id = (COLOR_SPOT_IDS as readonly string[]).includes(String(o.id))
    ? (o.id as ColorSpotId)
    : fallback.id;
  return {
    id,
    label: typeof o.label === "string" && o.label.trim() ? o.label.trim() : fallback.label,
    hex: typeof o.hex === "string" && /^#[0-9a-fA-F]{3,8}$/.test(o.hex) ? o.hex : fallback.hex,
    weight: clamp(num(o.weight, fallback.weight), 0.01, 100),
    payoutMult: clamp(num(o.payoutMult, fallback.payoutMult), 1.01, 100),
  };
}

export function normalizeColorGameConfig(raw: unknown): ColorGameConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_COLOR_GAME_CONFIG);
  const o = raw as Partial<ColorGameConfig> & { minSpotBet?: number };
  const d = DEFAULT_COLOR_GAME_CONFIG;

  const minBet = clamp(num(o.minBet ?? o.minSpotBet, d.minBet), 0.01, 10_000);
  const maxBet = clamp(num(o.maxBet, d.maxBet), minBet, 100_000);
  const maxSpotBet = clamp(num(o.maxSpotBet, d.maxSpotBet), minBet, 100_000);

  const rawSpots = Array.isArray(o.spots) ? o.spots : d.spots;
  const byId = new Map<ColorSpotId, ColorSpotDef>();
  for (const fb of d.spots) byId.set(fb.id, { ...fb });
  for (const s of rawSpots) {
    const partial = s as Partial<ColorSpotDef>;
    const id = partial.id;
    if (!id || !(COLOR_SPOT_IDS as readonly string[]).includes(id)) continue;
    byId.set(id, normalizeSpot(s, byId.get(id)!));
  }
  const spots = COLOR_SPOT_IDS.map((id) => byId.get(id)!);

  return {
    schemaVersion: 1,
    spots,
    rtpTarget: clamp(num(o.rtpTarget, d.rtpTarget), 80, 99.5),
    minBet,
    maxBet,
    maxSpotBet,
    betSteps: normalizeBetSteps(o.betSteps, d.betSteps).filter((s) => s <= maxBet),
  };
}

/** Profit odds for winCredit: total-return mult − 1. */
export function profitOddsFromMult(payoutMult: number): number {
  return Math.max(0, payoutMult - 1);
}

export function creditForSpotWin(stake: number, payoutMult: number): number {
  return winCredit(stake, profitOddsFromMult(payoutMult));
}
