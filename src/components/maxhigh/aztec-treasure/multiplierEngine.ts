import type { BoardCell } from "./types";

/**
 * Base game: sum bomb mults on the board when a tumble wins; apply to that tumble's win.
 * Free spins: bombs can be collected into accumulator (optional mode) OR applied per tumble.
 * Spec §4 FS: collect then apply at end — we support both via `collectMode`.
 *
 * Rule: a bomb is ONLY valid when there is a winning cluster (tumbleWin > 0).
 * Dead-spin / no-match bombs are declined and do not bank.
 */
export function sumBombs(bombs: BoardCell[]): number {
  if (bombs.length === 0) return 0;
  return bombs.reduce((a, b) => a + (b.mult ?? 2), 0);
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
    // Collect bombs with this winning tumble; don't multiply tumble yet
    return {
      win: tumbleWin,
      bombSum,
      accumulator: opts.accumulator + bombSum,
      clearBombs: true,
    };
  }

  // Base (and FS non-collect): apply sum to this tumble
  return {
    win: +(tumbleWin * bombSum).toFixed(2),
    bombSum,
    accumulator: opts.accumulator,
    clearBombs: true,
  };
}

/** Apply collected bomb multiplier to free-spin session earnings. 0–1x = no boost. */
export function finalizeFreeSpinTotal(totalWin: number, accumulator: number): number {
  if (totalWin <= 0) return 0;
  const mult = Math.max(1, accumulator);
  return +(totalWin * mult).toFixed(2);
}

/** Live projected FS payout = earned × total multiplier. */
export function projectedFreeSpinWin(sessionWin: number, accumulator: number): number {
  return finalizeFreeSpinTotal(sessionWin, accumulator);
}
