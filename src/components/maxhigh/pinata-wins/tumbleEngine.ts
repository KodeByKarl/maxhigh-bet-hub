import type { PwWinsConfig } from "@/lib/pinata-wins-config";
import { goldFrameChanceFor, pickCell } from "./reelGenerator";
import type { Rng } from "./rng";
import { makeCell, type PwCell, type PwGrid } from "./types";

/**
 * Cascade gravity with Gold Frame transform:
 * - Winning positions that are Gold Framed → persist as Wild (collect already handled by caller)
 * - Other winning positions → removed
 * - Survivors drop down; tops refill from weighted strips (+ gold-frame chance)
 */
export function applyGravity(
  grid: PwGrid,
  remove: Array<[number, number]>,
  transformToWild: Array<[number, number]>,
  rng: Rng,
  cfg: PwWinsConfig,
  isFreeSpins: boolean,
): PwGrid {
  const kill = new Set(remove.map(([r, row]) => `${r},${row}`));
  const toWild = new Set(transformToWild.map(([r, row]) => `${r},${row}`));
  const fillChance = goldFrameChanceFor(cfg, isFreeSpins, true);
  const next: PwGrid = [];

  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const survivors: PwCell[] = [];
    for (let row = cfg.rowsCount - 1; row >= 0; row--) {
      const key = `${reel},${row}`;
      const cell = grid[reel]?.[row];
      if (!cell) continue;
      if (toWild.has(key)) {
        survivors.push(makeCell("wild", false, 0));
        continue;
      }
      if (kill.has(key)) continue;
      survivors.push({ ...cell });
    }

    const col: PwCell[] = [];
    const need = cfg.rowsCount - survivors.length;
    for (let i = 0; i < need; i++) {
      col.push(pickCell(rng, reel, cfg, isFreeSpins, fillChance));
    }
    for (let i = survivors.length - 1; i >= 0; i--) {
      col.push(survivors[i]!);
    }
    next.push(col);
  }
  return next;
}
