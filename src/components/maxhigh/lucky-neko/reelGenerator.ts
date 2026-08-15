import {
  effectiveReelWeights,
  type LuckyNekoConfig,
  type FoSymKind,
} from "@/lib/lucky-neko-config";
import type { FoRng } from "./rng";
import type { FoGrid } from "./types";

/**
 * Fill a 3×3 grid from weighted reel strips for the active RTP profile.
 */
export function generateGrid(rng: FoRng, cfg: LuckyNekoConfig): FoGrid {
  const weights = effectiveReelWeights(cfg);
  const grid: FoGrid = [];

  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const column: FoSymKind[] = [];
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
