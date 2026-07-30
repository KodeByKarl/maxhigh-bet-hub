import type { MahjongSymbolConfig } from "@/lib/mahjong-ways-config";
import { getMahjongWaysConfig } from "./runtimeConfig";
import type { BoardCell } from "./types";

let keyCounter = 1;
export function nextCellKey(): string {
  return `mw_${Date.now()}_${keyCounter++}_${Math.random().toString(36).slice(2, 7)}`;
}

export function pickRandomSymbol(ante: boolean, isFreeSpins: boolean): MahjongSymbolConfig {
  const config = getMahjongWaysConfig();
  const pool: MahjongSymbolConfig[] = [];

  for (const sym of config.symbols) {
    let weight = isFreeSpins ? sym.weightFreeSpins : sym.weight;
    if (sym.scatter && ante) {
      weight = Math.round(weight * config.anteScatterWeightMult);
    }
    for (let i = 0; i < weight; i++) {
      pool.push(sym);
    }
  }

  if (pool.length === 0) return config.symbols[0];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

export function makeCell(
  sym: MahjongSymbolConfig,
  reelIndex: number,
  rowIndex: number,
  isGold = false,
): BoardCell {
  return {
    key: nextCellKey(),
    reelIndex,
    rowIndex,
    sym,
    isGold,
  };
}

export function generateInitialBoard(
  reelHeights: number[],
  ante: boolean,
  isFreeSpins: boolean,
): BoardCell[] {
  const board: BoardCell[] = [];
  for (let r = 0; r < reelHeights.length; r++) {
    const height = reelHeights[r];
    for (let row = 0; row < height; row++) {
      const sym = pickRandomSymbol(ante, isFreeSpins);
      // Reels 2, 3, 4 have 15% chance of spawning as Gold Plated Tiles (which turn into Wilds on cascade)
      const isGold = (r >= 1 && r <= 3) && !sym.wild && !sym.scatter && Math.random() < 0.08;
      board.push(makeCell(sym, r, row, isGold));
    }
  }
  return board;
}

export function applyGravity(
  board: BoardCell[],
  removeKeys: Set<string>,
  reelHeights: number[],
  ante: boolean,
  isFreeSpins: boolean,
): {
  nextBoard: BoardCell[];
  spawnedKeys: string[];
  fallenKeys: string[];
} {
  const config = getMahjongWaysConfig();
  const wildSym = config.symbols.find((s) => s.wild) || config.symbols[0];
  const reelsCount = config.reelsCount;

  const nextBoard: BoardCell[] = [];
  const spawnedKeys: string[] = [];
  const fallenKeys: string[] = [];

  for (let r = 0; r < reelsCount; r++) {
    const targetHeight = reelHeights[r];
    const columnCells = board.filter((c) => c.reelIndex === r);
    const keptCells: BoardCell[] = [];

    for (const cell of columnCells) {
      if (removeKeys.has(cell.key)) {
        // Gold tiles that participate in a win transform into WILD instead of vanishing!
        if (cell.isGold && !cell.sym.wild && !cell.sym.scatter) {
          const wildCell = makeCell(wildSym, r, 0, false);
          keptCells.push(wildCell);
          spawnedKeys.push(wildCell.key);
        }
      } else {
        keptCells.push(cell);
      }
    }

    // Determine how many new symbols must drop in from top
    const missingCount = targetHeight - keptCells.length;
    const newCells: BoardCell[] = [];

    for (let i = 0; i < missingCount; i++) {
      const sym = pickRandomSymbol(ante, isFreeSpins);
      const isGold = (r >= 1 && r <= 3) && !sym.wild && !sym.scatter && Math.random() < 0.15;
      const cell = makeCell(sym, r, i, isGold);
      newCells.push(cell);
      spawnedKeys.push(cell.key);
    }

    // Combine new drop-ins at top + surviving/transformed cells below
    const finalColumn = [...newCells, ...keptCells];
    finalColumn.forEach((cell, idx) => {
      cell.rowIndex = idx;
      if (!spawnedKeys.includes(cell.key)) {
        fallenKeys.push(cell.key);
      }
      nextBoard.push(cell);
    });
  }

  return {
    nextBoard,
    spawnedKeys,
    fallenKeys,
  };
}
