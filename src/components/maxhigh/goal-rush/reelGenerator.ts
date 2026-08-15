import {
  effectiveReelWeights,
  type GoalRushConfig,
  type GrSymKind,
} from "@/lib/goal-rush-config";
import type { GrRng } from "./rng";
import type { GrGrid } from "./types";

/**
 * Fill a 5×3 grid from weighted reel strips for the active RTP profile.
 */
export function generateGrid(rng: GrRng, cfg: GoalRushConfig): GrGrid {
  const weights = effectiveReelWeights(cfg);
  const grid: GrGrid = [];

  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const column: GrSymKind[] = [];
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
