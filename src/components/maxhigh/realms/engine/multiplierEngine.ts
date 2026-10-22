import { clampBombMult, type RealmsConfig } from "@/lib/realms/schema";
import type { BoardCell } from "./types";

/**
 * Base game: one applied bomb multiplier from the winning board.
 * Free spins: keep the strongest winning bomb seen in the feature.
 * A bomb only counts when the same tumble has a winning cluster.
 */
export function strongestBomb(bombs: BoardCell[]): number {
  if (bombs.length === 0) return 0;
  return bombs.reduce((top, b) => Math.max(top, clampBombMult(b.mult ?? 2)), 0);
}

function ceiling(cap: number): number {
  return Number.isFinite(cap) && cap > 0 ? cap : Number.POSITIVE_INFINITY;
}

export function applyBombToTumble(
  cfg: RealmsConfig,
  tumbleWin: number,
  bombs: BoardCell[],
  opts: { freeSpins: boolean; collectMode: boolean; accumulator: number },
): { win: number; bombSum: number; accumulator: number; clearBombs: boolean } {
  const bombSum = strongestBomb(bombs);
  if (tumbleWin <= 0 || bombSum <= 0) {
    return { win: tumbleWin, bombSum: 0, accumulator: opts.accumulator, clearBombs: false };
  }

  if (opts.freeSpins && opts.collectMode) {
    const next = Math.max(opts.accumulator, bombSum);
    return {
      win: tumbleWin,
      bombSum,
      accumulator: Math.min(ceiling(cfg.maxFsBombMult), next),
      clearBombs: true,
    };
  }

  const applied = Math.min(ceiling(cfg.maxBaseBombSum), bombSum);
  return {
    win: +(tumbleWin * applied).toFixed(2),
    bombSum: applied,
    accumulator: opts.accumulator,
    clearBombs: true,
  };
}

/** Apply the collected bomb multiplier to free-spin earnings (≤1× = no boost). */
export function finalizeFreeSpinTotal(
  cfg: RealmsConfig,
  totalWin: number,
  accumulator: number,
): number {
  if (totalWin <= 0) return 0;
  const mult = Math.min(ceiling(cfg.maxFsBombMult), Math.max(1, accumulator));
  return +(totalWin * mult).toFixed(2);
}
