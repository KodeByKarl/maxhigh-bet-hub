import {
  effectiveReelWeights,
  type FortuneGemsConfig,
  type FgSymKind,
} from "@/lib/fortune-gems-config";
import type { FgRng } from "./rng";
import type { FgGrid } from "./types";

/**
 * Fill a 3×3 grid from weighted reel strips for the active RTP profile.
 */
export function generateGrid(rng: FgRng, cfg: FortuneGemsConfig): FgGrid {
  const weights = effectiveReelWeights(cfg);
  const grid: FgGrid = [];

  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const column: FgSymKind[] = [];
    const pool = cfg.symbols
      .map((s) => ({
        kind: s.kind,
        weight: weights[s.kind]?.[reel] ?? s.reelWeights[reel] ?? 0,
      }))
      .filter((s) => s.weight > 0);

    if (pool.length === 0) {
      for (let row = 0; row < cfg.rowsCount; row++) column.push("temple");
    } else {
      for (let row = 0; row < cfg.rowsCount; row++) {
        column.push(rng.pickWeighted(pool).kind);
      }
    }
    grid.push(column);
  }
  return grid;
}
