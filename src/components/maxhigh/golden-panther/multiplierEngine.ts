import { clampBombMult } from "@/lib/golden-panther-config";
import type { BoardCell } from "./types";
import { getGoldenPantherConfig } from "./runtimeConfig";

/**
 * Base game: use a single applied bomb multiplier from the winning board.
 * Free spins: keep the strongest winning bomb seen in the feature.
 *
 * Rule: a bomb is ONLY valid when there is a winning cluster (tumbleWin > 0).
 * Dead-spin / no-match bombs are declined and do not bank.
 */
export function strongestBomb(bombs: BoardCell[]): number {
  if (bombs.length === 0) return 0;
  return bombs.reduce((top, b) => Math.max(top, clampBombMult(b.mult ?? 2)), 0);
}

function fsBombCeiling(): number {
  const cap = getGoldenPantherConfig().maxFsBombMult;
  if (cap == null || !Number.isFinite(cap) || cap <= 0) return Number.POSITIVE_INFINITY;
  return cap;
}

function baseBombCeiling(): number {
  const cap = getGoldenPantherConfig().maxBaseBombSum;
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
  const bombSum = strongestBomb(bombs);
  // No matching win → multiplier is invalid this step (do not bank / apply)
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
    const next = Math.max(opts.accumulator, bombSum);
    return {
      win: tumbleWin,
      bombSum,
      accumulator: Number.isFinite(ceiling) ? Math.min(ceiling, next) : next,
      clearBombs: true,
    };
  }

  // Base (and FS non-collect): apply one clean 2x/3x/4x/5x multiplier
  const baseCeil = baseBombCeiling();
  const applied = Number.isFinite(baseCeil) ? Math.min(baseCeil, bombSum) : bombSum;
  return {
    win: +(tumbleWin * applied).toFixed(2),
    bombSum: applied,
    accumulator: opts.accumulator,
    clearBombs: true,
  };
}

/** Apply collected bomb multiplier to free-spin session earnings. 0–1x = no boost. */
export function finalizeFreeSpinTotal(totalWin: number, accumulator: number): number {
  if (totalWin <= 0) return 0;
  const ceiling = fsBombCeiling();
  const uncapped = Math.max(1, accumulator);
  const mult = Number.isFinite(ceiling) ? Math.min(ceiling, uncapped) : uncapped;
  return +(totalWin * mult).toFixed(2);
}

/** Live projected FS payout = earned × total multiplier. */
export function projectedFreeSpinWin(sessionWin: number, accumulator: number): number {
  return finalizeFreeSpinTotal(sessionWin, accumulator);
}
