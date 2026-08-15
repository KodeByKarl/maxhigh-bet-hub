import {
  effectiveReelWeights,
  type BoxingKingConfig,
  type BkSymKind,
} from "@/lib/boxing-king-config";
import type { BkRng } from "./rng";
import type { BkGrid } from "./types";

/**
 * Fill a 5×3 grid from weighted reel strips for the active RTP profile.
 */
export function generateGrid(rng: BkRng, cfg: BoxingKingConfig): BkGrid {
  const weights = effectiveReelWeights(cfg);
  const grid: BkGrid = [];

  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const column: BkSymKind[] = [];
    const pool = cfg.symbols
      .map((s) => ({
        kind: s.kind,
        weight: weights[s.kind]?.[reel] ?? s.reelWeights[reel] ?? 0,
      }))
      .filter((s) => s.weight > 0);

    if (pool.length === 0) {
      for (let row = 0; row < cfg.rowsCount; row++) column.push("bar");
    } else {
      for (let row = 0; row < cfg.rowsCount; row++) {
        column.push(rng.pickWeighted(pool).kind);
      }
    }
    grid.push(column);
  }
  return grid;
}
