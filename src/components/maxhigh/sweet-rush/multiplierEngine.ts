/**
 * Position-based cascade multipliers (Sweet Rush–style).
 * Multipliers attach to grid slots, not symbols; they do not move with gravity.
 */
import { getSweetRushConfig } from "./runtimeConfig";
import { CELLS } from "./types";

export const DEFAULT_MULT_TIERS = [2, 4, 8, 16, 32, 64, 128] as const;

/** Visual shade for a position multiplier cell (fill + glow + label accent). */
export type MultShade = {
  fill: string;
  glow: string;
  labelFrom: string;
  labelTo: string;
  border: string;
};

/**
 * Sweet Rush–style cell tint: soft pink → hot magenta → purple → gold at max.
 * Entire cell is shaded; label stays readable on top.
 */
export function shadeForMultiplier(mult: number): MultShade | null {
  if (mult <= 0) return null;
  if (mult <= 2) {
    return {
      fill: "rgba(255, 120, 180, 0.38)",
      glow: "rgba(255, 105, 180, 0.45)",
      labelFrom: "#ff9ec8",
      labelTo: "#ec4899",
      border: "rgba(255,255,255,0.85)",
    };
  }
  if (mult <= 4) {
    return {
      fill: "rgba(244, 63, 150, 0.48)",
      glow: "rgba(236, 72, 153, 0.55)",
      labelFrom: "#f472b6",
      labelTo: "#db2777",
      border: "rgba(255,255,255,0.9)",
    };
  }
  if (mult <= 8) {
    return {
      fill: "rgba(219, 39, 119, 0.55)",
      glow: "rgba(219, 39, 119, 0.65)",
      labelFrom: "#f9a8d4",
      labelTo: "#be185d",
      border: "rgba(255,240,250,0.95)",
    };
  }
  if (mult <= 16) {
    return {
      fill: "rgba(168, 85, 247, 0.52)",
      glow: "rgba(168, 85, 247, 0.6)",
      labelFrom: "#e9d5ff",
      labelTo: "#9333ea",
      border: "rgba(255,255,255,0.92)",
    };
  }
  if (mult <= 32) {
    return {
      fill: "rgba(124, 58, 237, 0.58)",
      glow: "rgba(139, 92, 246, 0.7)",
      labelFrom: "#ddd6fe",
      labelTo: "#7c3aed",
      border: "rgba(255,255,255,0.95)",
    };
  }
  if (mult <= 64) {
    return {
      fill: "rgba(79, 70, 229, 0.62)",
      glow: "rgba(99, 102, 241, 0.75)",
      labelFrom: "#c7d2fe",
      labelTo: "#4f46e5",
      border: "rgba(255,255,255,0.95)",
    };
  }
  // 128+
  return {
    fill: "rgba(245, 158, 11, 0.58)",
    glow: "rgba(251, 191, 36, 0.8)",
    labelFrom: "#fef08a",
    labelTo: "#f59e0b",
    border: "rgba(255,255,255,0.98)",
  };
}

export function getMultiplierTiers(): number[] {
  const cfg = getSweetRushConfig();
  const tiers = cfg.positionMultTiers;
  return tiers.length > 0 ? tiers : [...DEFAULT_MULT_TIERS];
}

export function createEmptyMults(size = CELLS): number[] {
  return Array.from({ length: size }, () => 0);
}

export function cloneMults(mults: number[]): number[] {
  return mults.slice(0, CELLS).concat(Array(Math.max(0, CELLS - mults.length)).fill(0)).slice(0, CELLS);
}

export function sumMultipliers(mults: number[]): number {
  let s = 0;
  for (const m of mults) {
    if (m > 0) s += m;
  }
  return s;
}

/** Next tier: empty → first tier; otherwise double / next configured step (cap at last). */
export function nextMultiplierTier(current: number, tiers: number[]): number {
  if (tiers.length === 0) return Math.min(Math.max(current, 1) * 2, 128);
  if (current <= 0) return tiers[0];
  const exact = tiers.indexOf(current);
  if (exact >= 0) return tiers[Math.min(exact + 1, tiers.length - 1)];
  const above = tiers.find((t) => t > current);
  return above ?? tiers[tiers.length - 1];
}

/**
 * Every winning position upgrades one step (x2 → x4 → … → max).
 * Returns a new array; does not mutate input.
 */
export function updateMultipliers(mults: number[], winningIndices: number[]): number[] {
  const tiers = getMultiplierTiers();
  const next = cloneMults(mults);
  for (const i of winningIndices) {
    if (i < 0 || i >= next.length) continue;
    next[i] = nextMultiplierTier(next[i] ?? 0, tiers);
  }
  return next;
}

export function resetBoardMultipliers(): number[] {
  return createEmptyMults();
}

/**
 * Apply position multipliers to cascade raw win (Sweet Rush end-of-cascade rule).
 * No multipliers present → pay raw win unchanged.
 */
export function applyPositionMultToWin(rawWin: number, mults: number[]): {
  win: number;
  multSum: number;
} {
  if (rawWin <= 0) return { win: 0, multSum: 0 };
  const multSum = sumMultipliers(mults);
  if (multSum <= 0) return { win: +rawWin.toFixed(2), multSum: 0 };
  return { win: +(rawWin * multSum).toFixed(2), multSum };
}

/** Free-spin session total — wins already include per-spin position mults. */
export function finalizeFreeSpinTotal(totalWin: number, _unusedMult = 0): number {
  return +totalWin.toFixed(2);
}

export function projectedFreeSpinWin(sessionWin: number, _unusedMult = 0): number {
  return +sessionWin.toFixed(2);
}
