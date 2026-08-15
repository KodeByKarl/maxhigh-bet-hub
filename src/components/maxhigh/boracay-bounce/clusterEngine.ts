/**
 * Adjacent cluster detection (orthogonal flood-fill / BFS).
 * Educational reimplementation of cluster-pay rules — not a copy of proprietary code.
 */
import { getBoracayBounceConfig } from "./runtimeConfig";
import type { BoardCell, ClusterWin, SymKind } from "./types";
import { CELLS, COLS, ORTHO_DIRS, ROWS } from "./types";
import { payForCount } from "./paytable";

export type RawCluster = {
  id: string;
  kind: SymKind;
  indices: number[];
  keys: string[];
  count: number;
};

function indexOf(col: number, row: number) {
  return col + row * COLS;
}

/**
 * Flood-fill (iterative DFS) from `start` over matching pay symbols.
 * Only up / down / left / right. Marks visited in-place.
 */
export function floodFill(
  board: BoardCell[],
  start: number,
  symbolId: string,
  visited: Uint8Array,
): number[] {
  const indices: number[] = [];
  const stack = [start];
  visited[start] = 1;

  while (stack.length > 0) {
    const i = stack.pop()!;
    indices.push(i);
    const col = i % COLS;
    const row = Math.floor(i / COLS);

    for (const [dc, dr] of ORTHO_DIRS) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const ni = indexOf(nc, nr);
      if (visited[ni]) continue;
      const cell = board[ni];
      if (!cell || cell.sym.scatter || cell.sym.bomb) continue;
      if (cell.sym.id !== symbolId) continue;
      visited[ni] = 1;
      stack.push(ni);
    }
  }

  return indices;
}

/**
 * Scan every cell once (O(CELLS)). Each cell belongs to at most one cluster.
 * Multiple disjoint winning clusters are returned in one pass.
 */
export function findClusters(
  board: BoardCell[],
  minCluster = getBoracayBounceConfig().minCluster,
): RawCluster[] {
  const visited = new Uint8Array(CELLS);
  const clusters: RawCluster[] = [];

  for (let i = 0; i < CELLS; i++) {
    if (visited[i]) continue;
    const cell = board[i];
    if (!cell || cell.sym.scatter || cell.sym.bomb) {
      visited[i] = 1;
      continue;
    }

    const indices = floodFill(board, i, cell.sym.id, visited);
    if (indices.length < minCluster) continue;

    clusters.push({
      id: cell.sym.id,
      kind: cell.sym.kind,
      indices,
      keys: indices.map((idx) => board[idx].key),
      count: indices.length,
    });
  }

  return clusters;
}

/** True if the board already contains at least one adjacent winning cluster. */
export function boardHasAdjacentCluster(
  board: BoardCell[],
  minCluster = getBoracayBounceConfig().minCluster,
): boolean {
  return findClusters(board, minCluster).length > 0;
}

/** Price clusters and build UI-facing ClusterWin rows. */
export function calculateWin(
  board: BoardCell[],
  bet: number,
  minCluster = getBoracayBounceConfig().minCluster,
): {
  clusters: ClusterWin[];
  winningKeys: Set<string>;
  winningIndices: number[];
  payoutByKey: Map<string, number>;
  win: number;
  scatters: number;
} {
  const raw = findClusters(board, minCluster);
  const winningKeys = new Set<string>();
  const winningIndices: number[] = [];
  const payoutByKey = new Map<string, number>();
  const clusters: ClusterWin[] = [];
  let win = 0;
  let scatters = 0;

  for (const cell of board) {
    if (cell.sym.scatter) scatters++;
  }

  for (const c of raw) {
    const sym = board[c.indices[0]].sym;
    const mult = payForCount(sym, c.count);
    const pay = +(bet * mult).toFixed(2);
    const perSymbol = c.count > 0 ? +(pay / c.count).toFixed(2) : 0;
    win += pay;
    clusters.push({
      id: c.id,
      kind: c.kind,
      count: c.count,
      pay,
      perSymbol,
      keys: c.keys,
      indices: c.indices,
    });
    for (const idx of c.indices) {
      winningIndices.push(idx);
      winningKeys.add(board[idx].key);
      payoutByKey.set(board[idx].key, perSymbol);
    }
  }

  return {
    clusters,
    winningKeys,
    winningIndices,
    payoutByKey,
    win: +win.toFixed(2),
    scatters,
  };
}
