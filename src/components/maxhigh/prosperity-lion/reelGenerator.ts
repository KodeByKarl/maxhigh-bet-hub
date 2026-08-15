import {
  effectiveReelWeights,
  type ProsperityLionConfig,
  type FtSymKind,
} from "@/lib/prosperity-lion-config";
import type { FtRng } from "./rng";
import type { FtGrid } from "./types";

/**
 * Fill a 3×3 grid from weighted reel strips for the active RTP profile.
 */
export function generateGrid(rng: FtRng, cfg: ProsperityLionConfig): FtGrid {
  const weights = effectiveReelWeights(cfg);
  const grid: FtGrid = [];

  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const column: FtSymKind[] = [];
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
