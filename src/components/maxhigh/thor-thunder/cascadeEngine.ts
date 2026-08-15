import { payForLength } from "./paytable";
import { makeCell, pickSym } from "./gridState";
import { getThorThunderConfig, getRuntimeSymbols } from "./runtimeConfig";
import type { BoardCell, WayWin } from "./types";
import { CELLS, COLS, MIN_WAY_LENGTH, ROWS } from "./types";

export type EvalResult = {
  ways: WayWin[];
  winningKeys: Set<string>;
  win: number;
  scatters: number;
};

function idx(col: number, row: number) {
  return col + row * COLS;
}

function matchesTarget(cell: BoardCell, targetId: string): boolean {
  if (cell.sym.scatter) return false;
  if (cell.sym.wild) return true;
  return cell.sym.id === targetId;
}

/**
 * Ways-to-win: left→right adjacent.
 * Multiply matching counts on consecutive reels from reel 0.
 */
export function evaluateBoard(board: BoardCell[], bet: number): EvalResult {
  let scatters = 0;
  for (const c of board) {
    if (c.sym.scatter) scatters++;
  }

  const paySymIds = new Set<string>();
  const reel0HasWild = Array.from({ length: ROWS }, (_, r) => board[idx(0, r)]).some(
    (c) => c.sym.wild,
  );

  for (let row = 0; row < ROWS; row++) {
    const cell = board[idx(0, row)];
    if (cell.sym.scatter || cell.sym.wild) continue;
    paySymIds.add(cell.sym.id);
  }

  if (reel0HasWild) {
    for (const c of board) {
      if (!c.sym.scatter && !c.sym.wild) paySymIds.add(c.sym.id);
    }
  }

  const winningKeys = new Set<string>();
  const ways: WayWin[] = [];
  let win = 0;

  for (const targetId of paySymIds) {
    const counts: number[] = [];
    const keysByReel: string[][] = [];

    for (let col = 0; col < COLS; col++) {
      const keys: string[] = [];
      for (let row = 0; row < ROWS; row++) {
        const cell = board[idx(col, row)];
        if (matchesTarget(cell, targetId)) keys.push(cell.key);
      }
      if (keys.length === 0) break;
      counts.push(keys.length);
      keysByReel.push(keys);
    }

    const length = counts.length;
    if (length < MIN_WAY_LENGTH) continue;

    const wayCount = counts.reduce((a, b) => a * b, 1);
    const sym = getRuntimeSymbols().find((s) => s.id === targetId);
    if (!sym || sym.scatter || sym.wild) continue;

    const mult = payForLength(sym, length);
    const pay = +(bet * mult * wayCount).toFixed(2);
    if (pay <= 0) continue;

    const keys = keysByReel.flat();
    win += pay;
    ways.push({
      id: `${targetId}-${length}`,
      kind: sym.kind,
      length,
      ways: wayCount,
      pay,
      keys,
    });
    for (const k of keys) winningKeys.add(k);
  }

  return { ways, winningKeys, win: +win.toFixed(2), scatters };
}

function spawnCell(freeSpins: boolean): BoardCell {
  const cfg = getThorThunderConfig();
  if (freeSpins && Math.random() * 100 < cfg.cascadeWildChancePercent) {
    return makeCell(getRuntimeSymbols().find((s) => s.wild)!);
  }
  return makeCell(pickSym(false));
}

/**
 * Gravity per column. Winning symbols fall out; gaps refill from the top.
 * fallDistance = how many row-heights a symbol travels (spawned enter from above the grid).
 */
export function applyGravity(
  board: BoardCell[],
  remove: Set<string>,
  freeSpins: boolean,
): {
  next: BoardCell[];
  spawnedKeys: string[];
  fallenKeys: string[];
  fallDistance: Record<string, number>;
  afterPop: (BoardCell | null)[];
} {
  const afterPop: (BoardCell | null)[] = board.map((c) =>
    remove.has(c.key) ? null : c,
  );

  const oldRowByKey = new Map<string, number>();
  for (let i = 0; i < board.length; i++) {
    const c = board[i];
    if (!remove.has(c.key)) oldRowByKey.set(c.key, Math.floor(i / COLS));
  }

  const next: BoardCell[] = Array(CELLS);
  const spawnedKeys: string[] = [];
  const fallenKeys: string[] = [];
  const fallDistance: Record<string, number> = {};
  const spawnedSet = new Set<string>();

  for (let col = 0; col < COLS; col++) {
    const kept: BoardCell[] = [];
    for (let row = ROWS - 1; row >= 0; row--) {
      const cell = board[idx(col, row)];
      if (!remove.has(cell.key)) kept.push(cell);
    }
    while (kept.length < ROWS) {
      const cell = spawnCell(freeSpins);
      spawnedKeys.push(cell.key);
      spawnedSet.add(cell.key);
      kept.push(cell);
    }

    // kept[0] = bottom
    for (let i = 0; i < ROWS; i++) {
      const cell = kept[i];
      const newRow = ROWS - 1 - i;
      next[idx(col, newRow)] = cell;

      if (spawnedSet.has(cell.key) && fallDistance[cell.key] == null) {
        // Enter from above the top of the grid (not from mid-column).
        fallDistance[cell.key] = newRow + ROWS + 2;
        continue;
      }
      if (!spawnedSet.has(cell.key)) {
        const oldRow = oldRowByKey.get(cell.key) ?? newRow;
        const dist = newRow - oldRow;
        if (dist > 0) {
          fallenKeys.push(cell.key);
          // Travel from above the frame so the drop isn't visible mid-cell.
          fallDistance[cell.key] = Math.max(dist, newRow + ROWS + 1.75);
        }
      }
    }
  }

  return { next, spawnedKeys, fallenKeys, fallDistance, afterPop };
}
