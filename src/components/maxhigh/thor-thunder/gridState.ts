import { getThorThunderConfig, getRuntimeSymbols } from "./runtimeConfig";
import type { BoardCell, CellSym } from "./types";
import { CELLS } from "./types";

let keySeq = 0;
export function nextKey() {
  keySeq += 1;
  return `ge-${keySeq}`;
}

export function pickSym(boostScatter = false): CellSym {
  const symbols = getRuntimeSymbols();
  const pool = symbols.filter((s) => s.weight > 0);
  let total = pool.reduce((a, s) => a + s.weight, 0);
  if (boostScatter) {
    const sc = symbols.find((s) => s.scatter);
    if (sc) total += sc.weight;
  }
  let r = Math.random() * total;
  for (const s of pool) {
    const w = boostScatter && s.scatter ? s.weight * 2 : s.weight;
    if (r < w) return s;
    r -= w;
  }
  return pool[0];
}

export function makeCell(sym?: CellSym): BoardCell {
  return { key: nextKey(), sym: sym ?? pickSym() };
}

export function fillerCell(i: number): BoardCell {
  const pool = getRuntimeSymbols().filter((s) => !s.scatter && !s.wild);
  return { key: `init-${i}`, sym: pool[i % pool.length] };
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

/** Build random board; optionally force-seed a ways hit from config. */
export function buildBoard(opts?: {
  freeSpins?: boolean;
  boostScatter?: boolean;
  seedWin?: boolean;
}): BoardCell[] {
  const freeSpins = opts?.freeSpins ?? false;
  const boostScatter = opts?.boostScatter ?? false;
  const seedWin = opts?.seedWin ?? true;
  const cfg = getThorThunderConfig();
  const symbols = getRuntimeSymbols();
  const wild = symbols.find((s) => s.wild)!;

  const board = Array.from({ length: CELLS }, () => {
    if (freeSpins && Math.random() * 100 < cfg.freeSpinsWildChancePercent) {
      return makeCell(wild);
    }
    return makeCell(pickSym(boostScatter));
  });

  const forceSeed = seedWin && Math.random() * 100 >= cfg.deadSpinChancePercent;
  if (forceSeed) {
    const paySyms = symbols.filter((s) => !s.scatter && !s.wild);
    const target = paySyms[Math.floor(Math.random() * paySyms.length)];
    const row = Math.floor(Math.random() * 5);
    const span = cfg.seedWinLengthMax - cfg.seedWinLengthMin + 1;
    const len = cfg.seedWinLengthMin + Math.floor(Math.random() * Math.max(1, span));
    for (let col = 0; col < len && col < 6; col++) {
      const idx = col + row * 6;
      board[idx] = makeCell(
        Math.random() * 100 < cfg.seedWildChancePercent ? wild : target,
      );
    }
  }

  return board;
}

export function cloneBoard(board: BoardCell[]): BoardCell[] {
  return board.map((c) => ({ ...c, sym: c.sym }));
}

export { CELLS, shuffle };
