import type { BoardCell, CellSym } from "./types";
import { CELLS, COLS, ORTHO_DIRS, ROWS } from "./types";
import { getSweetRushConfig, getRuntimeSymbols } from "./runtimeConfig";
import { boardHasAdjacentCluster } from "./clusterEngine";

let keySeq = 0;
export function nextKey() {
  keySeq += 1;
  return `ss-${keySeq}`;
}

function pools() {
  const symbols = getRuntimeSymbols();
  const weighted = symbols.filter((s) => s.weight > 0 && !s.bomb);
  const weightTotal = weighted.reduce((a, s) => a + s.weight, 0);
  const scatter = symbols.find((s) => s.scatter)!;
  const pay = symbols.filter((s) => !s.scatter && !s.bomb);
  return { weighted, weightTotal, scatter, pay };
}

export function pickSym(ante: boolean): CellSym {
  const cfg = getSweetRushConfig();
  const { weighted, weightTotal, scatter } = pools();
  let total = weightTotal;
  if (ante) total += scatter.weight * (cfg.anteScatterWeightMult - 1);
  let r = Math.random() * total;
  for (const s of weighted) {
    const w = ante && s.scatter ? s.weight * cfg.anteScatterWeightMult : s.weight;
    if (r < w) return s;
    r -= w;
  }
  return weighted[0];
}

/** Build a cell — bombs disabled (position multipliers replace them). */
export function makeCell(sym: CellSym, _freeSpins: boolean, _forceBomb = false): BoardCell {
  if (sym.bomb) {
    const { pay } = pools();
    return { key: nextKey(), sym: pay[0] };
  }
  return { key: nextKey(), sym };
}

export function fillerCell(i: number): BoardCell {
  const { pay } = pools();
  return { key: `init-${i}`, sym: pay[i % pay.length] };
}

export function initialBoard(): BoardCell[] {
  return Array.from({ length: CELLS }, (_, i) => fillerCell(i));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomFill(ante: boolean, freeSpins: boolean): BoardCell[] {
  return Array.from({ length: CELLS }, () => makeCell(pickSym(ante), freeSpins));
}

/** Plant a connected orthogonal blob of `count` matching symbols. */
function plantConnectedCluster(
  board: BoardCell[],
  sym: CellSym,
  count: number,
  freeSpins: boolean,
) {
  const start = Math.floor(Math.random() * CELLS);
  const placed: number[] = [start];
  const inCluster = new Set([start]);
  board[start] = makeCell(sym, freeSpins);

  while (placed.length < count) {
    const candidates: number[] = [];
    for (const idx of placed) {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      for (const [dc, dr] of ORTHO_DIRS) {
        const nc = col + dc;
        const nr = row + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const ni = nc + nr * COLS;
        if (!inCluster.has(ni)) candidates.push(ni);
      }
    }
    if (candidates.length === 0) break;
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    inCluster.add(next);
    placed.push(next);
    board[next] = makeCell(sym, freeSpins);
  }
}

/**
 * generateBoard — random 7×7 with optional forced adjacent hit / dead spin.
 */
export function generateBoard(ante: boolean, freeSpins: boolean, seedWin = true): BoardCell[] {
  return buildBoard(ante, freeSpins, seedWin);
}

export function buildBoard(ante: boolean, freeSpins: boolean, seedWin = true): BoardCell[] {
  const cfg = getSweetRushConfig();
  const { pay } = pools();
  const deadChance = cfg.deadSpinChancePercent / 100;
  const seedChance = 1 - deadChance;
  const minCluster = cfg.minCluster;

  if (seedWin && Math.random() < seedChance) {
    const board = randomFill(ante, freeSpins);
    const min = Math.min(cfg.seedClusterMin, cfg.seedClusterMax);
    const max = Math.max(cfg.seedClusterMin, cfg.seedClusterMax);
    const target =
      Math.random() < cfg.seedMelonBiasPercent / 100
        ? (pay.find((s) => s.id === "melon") ?? pay[0])
        : pay[Math.floor(Math.random() * pay.length)];
    const count = min + Math.floor(Math.random() * (max - min + 1));
    plantConnectedCluster(board, target, Math.min(count, CELLS), freeSpins);
    return board;
  }

  if (seedWin) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const board = randomFill(ante, freeSpins);
      if (!boardHasAdjacentCluster(board, minCluster)) return board;
    }
  }

  return randomFill(ante, freeSpins);
}

export function cloneBoard(board: BoardCell[]): BoardCell[] {
  return board.map((c) => ({ ...c, sym: c.sym }));
}

export { COLS, ROWS, CELLS };
