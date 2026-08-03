import type { PwWinsConfig } from "@/lib/pinata-wins-config";
import type { GoldFrameCollect, PaylineWin, PwGrid } from "./types";

/**
 * Gold Frame collect + transform detection.
 * Two distinct effects from the same trigger (winning framed cell):
 * 1. Collect: add carried mult to running total
 * 2. Transform: flag cell to become Wild (instead of clearing)
 */
export function resolveGoldFramesInWins(
  grid: PwGrid,
  wins: PaylineWin[],
  cfg: PwWinsConfig,
  alreadyCollected: number,
): {
  goldCollected: GoldFrameCollect[];
  transformToWild: Array<[number, number]>;
  remove: Array<[number, number]>;
  collectedDelta: number;
  collectedTotal: number;
} {
  const winCells = new Set<string>();
  for (const w of wins) {
    for (const [r, row] of w.positions) winCells.add(`${r},${row}`);
  }

  const goldCollected: GoldFrameCollect[] = [];
  const transformToWild: Array<[number, number]> = [];
  const remove: Array<[number, number]> = [];
  let collectedDelta = 0;
  let collectedTotal = alreadyCollected;
  const seenGold = new Set<string>();

  for (const key of winCells) {
    const [rs, rows] = key.split(",");
    const reel = Number(rs);
    const row = Number(rows);
    const cell = grid[reel]?.[row];
    if (!cell) continue;

    if (cell.framed && cell.frameMult > 0 && !seenGold.has(key)) {
      seenGold.add(key);
      let add = cell.frameMult;
      if (cfg.goldFrameCollectCapPerSpin != null) {
        const room = Math.max(0, cfg.goldFrameCollectCapPerSpin - collectedTotal);
        add = Math.min(add, room);
      }
      if (add > 0) {
        collectedDelta += add;
        collectedTotal += add;
        goldCollected.push({ reel, row, kind: cell.kind, mult: cell.frameMult });
      }
      transformToWild.push([reel, row]);
    } else {
      remove.push([reel, row]);
    }
  }

  return {
    goldCollected,
    transformToWild,
    remove,
    collectedDelta,
    collectedTotal,
  };
}

/** Effective multiplier from collected Gold Frame total (identity = 1 when none). */
export function effectiveGoldMult(collected: number): number {
  return collected > 0 ? collected : 1;
}
