import {
  effectiveReelWeights,
  type FortuneRabbitConfig,
  type FrSymKind,
} from "@/lib/fortune-rabbit-config";
import type { FrRng } from "./rng";
import type { FrGrid } from "./types";

/**
 * Fill a 3×3 grid from weighted reel strips for the active RTP profile.
 */
export function generateGrid(rng: FrRng, cfg: FortuneRabbitConfig): FrGrid {
  const weights = effectiveReelWeights(cfg);
  const grid: FrGrid = [];

  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const column: FrSymKind[] = [];
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
