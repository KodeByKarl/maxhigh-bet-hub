/**
 * MaxHigh Drop Deluxe — instant number drop (1–10).
 * Pure functions only: no React, no I/O.
 *
 * Fair single-pick of 10 → 10× total return. Default payoutMult 9× ≈ 90% RTP
 * when betting one lane. Multi-pick: each lane settles independently at the
 * same payoutMult (EV scales with how many lanes are covered).
 *
 * `payoutMult` is TOTAL return multiplier (incl. stake).
 */

import { winCredit } from "@/lib/baccarat-config";

export { winCredit };

export const DROP_DELUXE_GAME_ID = "drop-deluxe";
export const GAME_ID = DROP_DELUXE_GAME_ID;
export const DROP_DELUXE_TITLE = "Drop Deluxe";

export const DROP_DELUXE_SPOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type DropDeluxeSpot = (typeof DROP_DELUXE_SPOTS)[number];

/**
 * Reference RTP (fair 1–10 die, default 9× single pick).
 * Approximate — not enforced at runtime.
 */
export const RTP_REFERENCE = {
  singlePick: 90.0,
  overall: 90.0,
} as const;

export type DropDeluxeConfig = {
  schemaVersion: 1;
  /** Total-return multiplier on a hitting lane (default 9× → ~90% RTP). */
  payoutMult: number;
  /** Max number of lanes a player may stake in one round. */
  maxPicks: number;
  rtpTarget: number;
  minBet: number;
  maxBet: number;
  maxSpotBet: number;
  betSteps: number[];
};

export const DEFAULT_DROP_DELUXE_CONFIG: DropDeluxeConfig = {
  schemaVersion: 1,
  payoutMult: 9,
  maxPicks: 3,
  rtpTarget: RTP_REFERENCE.overall,
  minBet: 1,
  maxBet: 500,
  maxSpotBet: 500,
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

  const minBet = clamp(num(o.minBet, d.minBet), 0.01, 10_000);
  const maxBet = clamp(num(o.maxBet, d.maxBet), minBet, 100_000);
  const maxSpotBet = clamp(num(o.maxSpotBet, d.maxSpotBet), minBet, 100_000);

  return {
    schemaVersion: 1,
    payoutMult: clamp(num(o.payoutMult, d.payoutMult), 1.01, 100),
    maxPicks: clamp(Math.round(num(o.maxPicks, d.maxPicks)), 1, 10),
    rtpTarget: clamp(num(o.rtpTarget, d.rtpTarget), 80, 99.5),
    minBet,
    maxBet,
    maxSpotBet,
    betSteps: normalizeBetSteps(o.betSteps, d.betSteps).filter((s) => s <= maxBet),
  };
}

export function profitOddsFromMult(payoutMult: number): number {
  return Math.max(0, payoutMult - 1);
}

export function creditForLaneWin(stake: number, payoutMult: number): number {
  return winCredit(stake, profitOddsFromMult(payoutMult));
}
