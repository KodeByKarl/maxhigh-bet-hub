import type { BoardCell } from "./types";
import { getCandyPeakConfig } from "./runtimeConfig";

/**
 * Base game: sum bomb mults on the board when a tumble wins; apply to that tumble's win.
 * Free spins: bombs are collected additively, then applied once at feature end.
 *
 * Rule: a bomb is ONLY valid when there is a winning cluster (tumbleWin > 0).
 * Dead-spin / no-match bombs are declined and do not bank.
 */
export function sumBombs(bombs: BoardCell[]): number {
  if (bombs.length === 0) return 0;
  return bombs.reduce((a, b) => a + (b.mult ?? 2), 0);
}

function fsBombCeiling(): number {
  const cap = getCandyPeakConfig().maxFsBombMult;
  if (cap == null || !Number.isFinite(cap) || cap <= 0) return Number.POSITIVE_INFINITY;
  return cap;
}

function baseBombCeiling(): number {
  const cap = getCandyPeakConfig().maxBaseBombSum;
  if (cap == null || !Number.isFinite(cap) || cap <= 0) return Number.POSITIVE_INFINITY;
  return cap;
}

export function applyBombToTumble(
  tumbleWin: number,
  bombs: BoardCell[],
  opts: { freeSpins: boolean; collectMode: boolean; accumulator: number },
): {
  win: number;
  bombSum: number;
  accumulator: number;
  /** Bombs that should pop this step */
  clearBombs: boolean;
} {
  const bombSum = sumBombs(bombs);
  if (tumbleWin <= 0 || bombSum <= 0) {
    return {
      win: tumbleWin,
      bombSum: 0,
      accumulator: opts.accumulator,
      clearBombs: false,
    };
  }

  if (opts.freeSpins && opts.collectMode) {
    const ceiling = fsBombCeiling();
    const next = opts.accumulator + bombSum;
    return {
      win: tumbleWin,
      bombSum,
      accumulator: Number.isFinite(ceiling) ? Math.min(ceiling, next) : next,
      clearBombs: true,
    };
  }

  const baseCeil = baseBombCeiling();
  const applied = Number.isFinite(baseCeil) ? Math.min(baseCeil, bombSum) : bombSum;
  return {
    win: +(tumbleWin * applied).toFixed(2),
    bombSum: applied,
    accumulator: opts.accumulator,
    clearBombs: true,
  };
}

export function finalizeFreeSpinTotal(totalWin: number, accumulator: number): number {
  if (totalWin <= 0) return 0;
  const ceiling = fsBombCeiling();
  const uncapped = Math.max(1, accumulator);
  const mult = Number.isFinite(ceiling) ? Math.min(ceiling, uncapped) : uncapped;
  return +(totalWin * mult).toFixed(2);
}

export function projectedFreeSpinWin(sessionWin: number, accumulator: number): number {
  return finalizeFreeSpinTotal(sessionWin, accumulator);
}
