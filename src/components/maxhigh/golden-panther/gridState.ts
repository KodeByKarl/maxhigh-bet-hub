import { clampBombMult } from "@/lib/golden-panther-config";
import type { BoardCell, CellSym } from "./types";
import { CELLS, COLS, ROWS } from "./types";
import { getGoldenPantherConfig, getRuntimeSymbols } from "./runtimeConfig";

let keySeq = 0;
export function nextKey() {
  keySeq += 1;
  return `sb-${keySeq}`;
}

function pools() {
  const symbols = getRuntimeSymbols();
  const weighted = symbols.filter((s) => s.weight > 0);
  const weightTotal = weighted.reduce((a, s) => a + s.weight, 0);
  const scatter = symbols.find((s) => s.scatter)!;
  const bomb = symbols.find((s) => s.bomb)!;
  const pay = symbols.filter((s) => !s.scatter && !s.bomb);
  return { weighted, weightTotal, scatter, bomb, pay };
}

export function pickSym(ante: boolean): CellSym {
  const cfg = getGoldenPantherConfig();
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

export function pickBombMult(): number {
  const table = getGoldenPantherConfig().bombTable;
  const total = table.reduce((a, b) => a + b.weight, 0);
  let r = Math.random() * total;
  for (const b of table) {
    if (r < b.weight) return clampBombMult(b.mult);
    r -= b.weight;
  }
  return clampBombMult(table[0]?.mult ?? 2);
}

export function makeCell(sym: CellSym, freeSpins: boolean, forceBomb = false, opts?: { allowScatter?: boolean }): BoardCell {
  const cfg = getGoldenPantherConfig();
  const { bomb, pay } = pools();
  let use = sym;
  if (opts?.allowScatter === false && use.scatter) {
    use = pay[Math.floor(Math.random() * pay.length)] ?? use;
  }
  const bombChance = (freeSpins ? cfg.bombChanceFreeSpinsPercent : cfg.bombChanceBasePercent) / 100;
  if (forceBomb || use.bomb || Math.random() < bombChance) {
    return {
      key: nextKey(),
      sym: bomb,
      mult: pickBombMult(),
    };
  }
  return { key: nextKey(), sym: use };
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

const ALL_INDICES = Array.from({ length: CELLS }, (_, i) => i);

/** True if board already has a paying cluster (≥ minCluster matching pays). */
function boardHasPayCluster(board: BoardCell[], minCluster: number): boolean {
  const counts = new Map<string, number>();
  for (const cell of board) {
    if (cell.sym.scatter || cell.sym.bomb) continue;
    counts.set(cell.sym.id, (counts.get(cell.sym.id) ?? 0) + 1);
  }
  for (const n of counts.values()) {
    if (n >= minCluster) return true;
  }
  return false;
}

function randomFill(ante: boolean, freeSpins: boolean): BoardCell[] {
  return Array.from({ length: CELLS }, () => makeCell(pickSym(ante), freeSpins));
}

/**
 * Build a random board.
 * Dead-spin path = no forced seed AND no opening pay cluster (retries until blank).
 * Seed path = plant a winning cluster for hit feel.
 */
export function buildBoard(ante: boolean, freeSpins: boolean, seedWin = true): BoardCell[] {
  const cfg = getGoldenPantherConfig();
  const { pay } = pools();
  const deadChance = cfg.deadSpinChancePercent / 100;
  const seedChance = 1 - deadChance;
  const minCluster = cfg.minCluster;

  // Forced-hit path (only when seedWin allowed)
  if (seedWin && Math.random() < seedChance) {
    const board = randomFill(ante, freeSpins);
    const min = Math.min(cfg.seedClusterMin, cfg.seedClusterMax);
    const max = Math.max(cfg.seedClusterMin, cfg.seedClusterMax);
    const lows = pay.filter((s) => ["grape", "plum", "melon", "apple", "blue"].includes(s.id));
    const pool = lows.length ? lows : pay;
    const target =
      Math.random() < cfg.seedMelonBiasPercent / 100
        ? (pay.find((s) => s.id === "melon") ?? pool[0])
        : pool[Math.floor(Math.random() * pool.length)];
    const count = min + Math.floor(Math.random() * (max - min + 1));
    const indices = shuffle(ALL_INDICES);
    for (let k = 0; k < Math.min(count, CELLS); k++) {
      board[indices[k]] = makeCell(target, freeSpins);
    }
    return board;
  }

  // Dead-spin path: opening board must not already pay (owners expect this).
  // Retries keep natural RNG while guaranteeing no opening cluster.
  if (seedWin) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const board = randomFill(ante, freeSpins);
      if (!boardHasPayCluster(board, minCluster)) return board;
    }
  }

  return randomFill(ante, freeSpins);
}

export function cloneBoard(board: BoardCell[]): BoardCell[] {
  return board.map((c) => ({ ...c, sym: c.sym }));
}

export { COLS, ROWS, CELLS };
