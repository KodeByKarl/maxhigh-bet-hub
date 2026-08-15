import type { FgSymKind, DiamondDigConfig } from "@/lib/diamond-dig-config";
import { pickSymbol } from "./reelGenerator";
import type { Rng } from "./rng";
import type { FgGrid } from "./types";

/**
 * Cascade gravity on variable-height diamond columns:
 * remove winning cells → drop survivors down → fill tops to reelHeights[reel].
 */
export function applyGravity(
  grid: FgGrid,
  remove: Array<[number, number]>,
  rng: Rng,
  cfg: DiamondDigConfig,
  isFreeSpins: boolean,
): FgGrid {
  const kill = new Set(remove.map(([r, row]) => `${r},${row}`));
  const next: FgGrid = [];

  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const height = cfg.reelHeights?.[reel] ?? cfg.rowsCount;
    const survivors: FgSymKind[] = [];
    const colLen = grid[reel]?.length ?? height;
    for (let row = colLen - 1; row >= 0; row--) {
      if (kill.has(`${reel},${row}`)) continue;
      const sym = grid[reel]?.[row];
      if (sym) survivors.push(sym);
    }
    // survivors are bottom→top; rebuild column top→bottom to target height
    const col: FgSymKind[] = [];
    const need = Math.max(0, height - survivors.length);
    for (let i = 0; i < need; i++) {
      col.push(pickSymbol(rng, reel, cfg, isFreeSpins));
    }
    for (let i = survivors.length - 1; i >= 0; i--) {
      col.push(survivors[i]!);
    }
    // Trim if somehow over height (shouldn't happen)
    while (col.length > height) col.shift();
    next.push(col);
  }
  return next;
}
