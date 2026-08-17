import { payForCount } from "./paytable";
import { makeCell, pickSym } from "./gridState";
import { getGoldenPantherConfig } from "./runtimeConfig";
import type { BoardCell, ClusterWin } from "./types";
import { CELLS, COLS, MAIN_CELLS, ROWS, TOP_COLS } from "./types";

export type EvalResult = {
  clusters: ClusterWin[];
  winningKeys: Set<string>;
  payoutByKey: Map<string, number>;
  win: number;
  scatters: number;
  bombs: BoardCell[];
};

/** Count identical symbols anywhere (not adjacency). ≥ minCluster = win. */
export function evaluateBoard(board: BoardCell[], bet: number): EvalResult {
  const minCluster = getGoldenPantherConfig().minCluster;
  const counts = new Map<string, BoardCell[]>();
  let scatters = 0;
  const bombs: BoardCell[] = [];

  for (const cell of board) {
    if (!cell) continue;
    if (cell.sym.scatter) {
      scatters++;
      continue;
    }
    if (cell.sym.bomb) {
      bombs.push(cell);
      continue;
    }
    const list = counts.get(cell.sym.id) ?? [];
    list.push(cell);
    counts.set(cell.sym.id, list);
  }

  const winningKeys = new Set<string>();
  const payoutByKey = new Map<string, number>();
  const clusters: ClusterWin[] = [];
  let win = 0;

  for (const [, cells] of counts) {
    if (cells.length < minCluster) continue;
    const sym = cells[0].sym;
    const mult = payForCount(sym, cells.length);
    const pay = +(bet * mult).toFixed(2);
    const perSymbol = +(pay / cells.length).toFixed(2);
    win += pay;
    clusters.push({
      id: sym.id,
      kind: sym.kind,
      count: cells.length,
      pay,
      perSymbol,
      keys: cells.map((c) => c.key),
    });
    for (const c of cells) {
      winningKeys.add(c.key);
      payoutByKey.set(c.key, perSymbol);
    }
  }

  return { clusters, winningKeys, payoutByKey, win, scatters, bombs };
}

/**
 * Gravity per column: survivors fall down, new symbols spawn at top.
 * Returns next board + spawn/fall metadata for animation.
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
  /** Rows each key travels downward (spawned include travel from above the grid). */
  fallDistance: Record<string, number>;
  afterPop: (BoardCell | null)[];
} {
  const afterPop: (BoardCell | null)[] = board.map((c) => (c && remove.has(c.key) ? null : c));
  const next: BoardCell[] = Array(CELLS);
  const spawnedKeys: string[] = [];
  const fallenKeys: string[] = [];
  const fallDistance: Record<string, number> = {};
  const spawnedSet = new Set<string>();

  // 1. Process 1st Layer (Top 4 Cells: indices 0..3)
  // Symbols slide from right to left (index 3 to index 0).
  const keptTop: BoardCell[] = [];
  const oldColByKey = new Map<string, number>();
  for (let i = 0; i < TOP_COLS; i++) {
    const c = board[i];
    if (c && !remove.has(c.key)) {
      keptTop.push(c);
      oldColByKey.set(c.key, i);
    }
  }

  // Fill empty spots on the right with new symbols
  while (keptTop.length < TOP_COLS) {
    const newCell = makeCell(pickSym(ante), freeSpins, false, { allowScatter: false });
    keptTop.push(newCell);
    spawnedKeys.push(newCell.key);
    spawnedSet.add(newCell.key);
  }

  for (let i = 0; i < TOP_COLS; i++) {
    const cell = keptTop[i];
    next[i] = cell;

    if (spawnedSet.has(cell.key)) {
      fallDistance[cell.key] = TOP_COLS - i;
    } else {
      const oldCol = oldColByKey.get(cell.key) ?? i;
      const dist = oldCol - i;
      if (dist > 0) {
        fallenKeys.push(cell.key);
        fallDistance[cell.key] = dist;
      }
    }
  }

  // 2. Process 2nd Layer (Main 6x7 Grid: indices 4..45)
  const offset = TOP_COLS;
  const oldRowByKey = new Map<string, number>();
  for (let i = 0; i < MAIN_CELLS; i++) {
    const c = board[offset + i];
    if (c && !remove.has(c.key)) oldRowByKey.set(c.key, Math.floor(i / COLS));
  }

  for (let col = 0; col < COLS; col++) {
    const kept: BoardCell[] = [];
    for (let row = ROWS - 1; row >= 0; row--) {
      const cell = board[offset + col + row * COLS];
      if (cell && !remove.has(cell.key)) kept.push(cell);
    }
    while (kept.length < ROWS) {
      const cell = makeCell(pickSym(ante), freeSpins, false, { allowScatter: false });
      spawnedKeys.push(cell.key);
      spawnedSet.add(cell.key);
      kept.push(cell);
    }
    // kept[0] = bottom
    for (let i = 0; i < ROWS; i++) {
      const cell = kept[i];
      const newRow = ROWS - 1 - i;
      next[offset + col + newRow * COLS] = cell;

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
