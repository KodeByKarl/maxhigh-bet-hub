import type { LechonLuckConfig, CnySymKind } from "@/lib/lechon-luck-config";
import type { CnyRng } from "./rng";
import type { CnyGrid } from "./types";

/**
 * Fill a 5×N grid from per-reel weighted strips.
 * Dragon / Monkey reel restrictions are encoded in reelWeights (0 off-reel).
 */
export function generateGrid(
  rng: CnyRng,
  cfg: LechonLuckConfig,
  opts: { isFreeSpins: boolean },
): CnyGrid {
  const grid: CnyGrid = [];
  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const column: CnySymKind[] = [];
    const pool = cfg.symbols
      .map((s) => ({
        kind: s.kind,
        weight: opts.isFreeSpins
          ? (s.reelWeightsFreeSpins[reel] ?? 0)
          : (s.reelWeights[reel] ?? 0),
      }))
      .filter((s) => s.weight > 0);

    if (pool.length === 0) {
      // Safety: never leave an empty reel
      for (let row = 0; row < cfg.rowsCount; row++) column.push("sym_10");
    } else {
      for (let row = 0; row < cfg.rowsCount; row++) {
        column.push(rng.pickWeighted(pool).kind);
      }
    }
    grid.push(column);
  }
  return grid;
}

export function reelHasSymbol(grid: CnyGrid, reel: number, kind: CnySymKind): boolean {
  const col = grid[reel];
  if (!col) return false;
  return col.some((s) => s === kind);
}

/** Dragon on reels 3,4,5 (1-based) → indices 2,3,4. */
export function detectDragonTrigger(grid: CnyGrid): boolean {
  return (
    reelHasSymbol(grid, 2, "dragon") &&
    reelHasSymbol(grid, 3, "dragon") &&
    reelHasSymbol(grid, 4, "dragon")
  );
}

/** Monkey on reels 1,3,5 (1-based) → indices 0,2,4. */
export function detectMonkeyTrigger(grid: CnyGrid): boolean {
  return (
    reelHasSymbol(grid, 0, "monkey") &&
    reelHasSymbol(grid, 2, "monkey") &&
    reelHasSymbol(grid, 4, "monkey")
  );
}
