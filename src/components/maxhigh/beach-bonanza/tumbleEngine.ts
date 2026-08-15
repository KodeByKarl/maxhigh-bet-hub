/**
 * Cascade helpers: remove winners, gravity, spawn, evaluate.
 */
import { calculateWin } from "./clusterEngine";
import { makeCell, pickSym } from "./gridState";
import type { BoardCell } from "./types";
import { CELLS, COLS, ROWS } from "./types";

export type EvalResult = ReturnType<typeof calculateWin>;

/** Evaluate board for adjacent clusters + scatter count. */
export function evaluateBoard(board: BoardCell[], bet: number): EvalResult {
  return calculateWin(board, bet);
}

export function removeWinningSymbols(
  board: BoardCell[],
  removeKeys: Set<string>,
): (BoardCell | null)[] {
  return board.map((c) => (removeKeys.has(c.key) ? null : c));
}

/**
 * Gravity per column: survivors fall down; new symbols spawn at top.
 * Position multipliers are NOT moved here — they stay on indices.
 */
export function applyGravity(
  board: BoardCell[],
  remove: Set<string>,
  ante: boolean,
  freeSpins: boolean,
): {
  next: BoardCell[];
  spawnedKeys: string[];
  fallenKeys: string[];
  fallDistance: Record<string, number>;
  afterPop: (BoardCell | null)[];
} {
  const afterPop = removeWinningSymbols(board, remove);
  const next: BoardCell[] = Array(CELLS);
  const spawnedKeys: string[] = [];
  const fallenKeys: string[] = [];
  const fallDistance: Record<string, number> = {};
  const oldRowByKey = new Map<string, number>();
  const spawnedSet = new Set<string>();

  for (let i = 0; i < board.length; i++) {
    const c = board[i];
    if (!remove.has(c.key)) oldRowByKey.set(c.key, Math.floor(i / COLS));
  }

  for (let col = 0; col < COLS; col++) {
    const kept: BoardCell[] = [];
    for (let row = ROWS - 1; row >= 0; row--) {
      const cell = board[col + row * COLS];
      if (!remove.has(cell.key)) kept.push(cell);
    }
    while (kept.length < ROWS) {
      const cell = spawnSymbols(ante, freeSpins);
      spawnedKeys.push(cell.key);
      spawnedSet.add(cell.key);
      kept.push(cell);
    }
    for (let i = 0; i < ROWS; i++) {
      const cell = kept[i];
      const newRow = ROWS - 1 - i;
      next[col + newRow * COLS] = cell;

      if (spawnedSet.has(cell.key) && fallDistance[cell.key] == null) {
        fallDistance[cell.key] = newRow + 1;
      } else if (!spawnedSet.has(cell.key)) {
        const oldRow = oldRowByKey.get(cell.key) ?? newRow;
        const dist = newRow - oldRow;
        if (dist > 0) {
          fallenKeys.push(cell.key);
          fallDistance[cell.key] = dist;
        }
      }
    }
  }

  return { next, spawnedKeys, fallenKeys, fallDistance, afterPop };
}

/** Spawn one random cell (alias for educational API). */
export function spawnSymbols(ante: boolean, freeSpins: boolean): BoardCell {
  return makeCell(pickSym(ante), freeSpins);
}

export { findClusters, floodFill, calculateWin, boardHasAdjacentCluster } from "./clusterEngine";
