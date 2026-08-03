import type { FgSymKind, FrontierGoldConfig } from "@/lib/frontier-gold-config";
import { pickSymbol } from "./reelGenerator";
import type { Rng } from "./rng";
import type { FgGrid } from "./types";

/**
 * Cascade gravity: remove winning cells, drop survivors down, fill tops.
 * Bonus / scatter are removed only if they were in a winning payline cell
 * (they normally aren't — they stay and drop with the column).
 */
export function applyGravity(
  grid: FgGrid,
  remove: Array<[number, number]>,
  rng: Rng,
  cfg: FrontierGoldConfig,
  isFreeSpins: boolean,
): FgGrid {
  const kill = new Set(remove.map(([r, row]) => `${r},${row}`));
  const next: FgGrid = [];

  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const survivors: FgSymKind[] = [];
    for (let row = cfg.rowsCount - 1; row >= 0; row--) {
      if (kill.has(`${reel},${row}`)) continue;
      const sym = grid[reel]?.[row];
      if (sym) survivors.push(sym);
    }
    // survivors are bottom→top; rebuild column top→bottom
    const col: FgSymKind[] = [];
    const need = cfg.rowsCount - survivors.length;
    for (let i = 0; i < need; i++) {
      col.push(pickSymbol(rng, reel, cfg, isFreeSpins));
    }
    // survivors were collected bottom-first; reverse to top-first order for remaining
    for (let i = survivors.length - 1; i >= 0; i--) {
      col.push(survivors[i]!);
    }
    next.push(col);
  }
  return next;
}
