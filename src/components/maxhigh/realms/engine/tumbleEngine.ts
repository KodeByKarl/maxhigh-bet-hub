import { makeCell, pickSym } from "./gridState";
import { payForCount } from "./paytable";
import type { BoardCell, ClusterWin, RealmsEngineCtx } from "./types";

export type EvalResult = {
  clusters: ClusterWin[];
  winningKeys: Set<string>;
  payoutByKey: Map<string, number>;
  win: number;
  scatters: number;
  bombs: BoardCell[];
};

/** Cluster pays: count identical symbols anywhere on the board. */
export function evaluateBoard(ctx: RealmsEngineCtx, board: BoardCell[], bet: number): EvalResult {
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
    if (cells.length < ctx.cfg.minCluster) continue;
    const sym = cells[0].sym;
    const pay = +(bet * payForCount(ctx.cfg, sym, cells.length)).toFixed(2);
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

/** Gravity per column: survivors fall, new symbols spawn from the top. */
export function applyGravity(
  ctx: RealmsEngineCtx,
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
  const { cols, rows, cells } = ctx;
  const afterPop: (BoardCell | null)[] = board.map((c) => (c && remove.has(c.key) ? null : c));
  const next: BoardCell[] = Array(cells);
  const spawnedKeys: string[] = [];
  const fallenKeys: string[] = [];
  const fallDistance: Record<string, number> = {};
  const spawnedSet = new Set<string>();

  const oldRowByKey = new Map<string, number>();
  for (let i = 0; i < cells; i++) {
    const c = board[i];
    if (c && !remove.has(c.key)) oldRowByKey.set(c.key, Math.floor(i / cols));
  }

  for (let col = 0; col < cols; col++) {
    const kept: BoardCell[] = [];
    for (let row = rows - 1; row >= 0; row--) {
      const cell = board[col + row * cols];
      if (cell && !remove.has(cell.key)) kept.push(cell);
    }
    while (kept.length < rows) {
      const cell = makeCell(ctx, pickSym(ctx, ante), freeSpins, false, { allowScatter: false });
      spawnedKeys.push(cell.key);
      spawnedSet.add(cell.key);
      kept.push(cell);
    }
    for (let i = 0; i < rows; i++) {
      const cell = kept[i];
      const newRow = rows - 1 - i;
      next[col + newRow * cols] = cell;

      if (spawnedSet.has(cell.key) && fallDistance[cell.key] == null) {
        fallDistance[cell.key] = newRow + 1;
      } else if (!spawnedSet.has(cell.key)) {
        const dist = newRow - (oldRowByKey.get(cell.key) ?? newRow);
        if (dist > 0) {
          fallenKeys.push(cell.key);
          fallDistance[cell.key] = dist;
        }
      }
    }
  }

  return { next, spawnedKeys, fallenKeys, fallDistance, afterPop };
}
