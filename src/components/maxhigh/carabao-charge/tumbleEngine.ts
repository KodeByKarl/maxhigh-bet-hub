import type { BuffaloSymbolConfig } from "@/lib/carabao-charge-config";
import { getCarabaoChargeConfig } from "./runtimeConfig";
import type { BoardCell } from "./types";

let keyCounter = 1;

export function nextCellKey(): string {
  return `carabao_${Date.now()}_${keyCounter++}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Weighted pick (ante boosts scatter; free spins suppress bonus chests). */
export function pickRandomSymbol(ante: boolean, isFreeSpins: boolean): BuffaloSymbolConfig {
  const config = getCarabaoChargeConfig();
  let total = 0;
  const weights: number[] = [];

  for (const sym of config.symbols) {
    let weight = isFreeSpins ? sym.weightFreeSpins : sym.weight;
    if (sym.scatter && ante) {
      weight = Math.round(weight * config.anteScatterWeightMult);
    }
    weights.push(weight);
    total += weight;
  }

  if (total <= 0) return config.symbols[0]!;
  let roll = Math.random() * total;
  for (let i = 0; i < config.symbols.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return config.symbols[i]!;
  }
  return config.symbols[config.symbols.length - 1]!;
}

export function makeCell(sym: BuffaloSymbolConfig, reelIndex: number, rowIndex: number): BoardCell {
  return {
    key: nextCellKey(),
    reelIndex,
    rowIndex,
    sym,
  };
}

export function generateInitialBoard(
  reelHeights: number[],
  ante: boolean,
  isFreeSpins: boolean,
): BoardCell[] {
  const board: BoardCell[] = [];
  for (let r = 0; r < reelHeights.length; r++) {
    const height = reelHeights[r]!;
    for (let row = 0; row < height; row++) {
      board.push(makeCell(pickRandomSymbol(ante, isFreeSpins), r, row));
    }
  }
  return board;
}

/**
 * Cascade: remove winning keys, drop remaining, refill tops.
 * Bonus / scatter never tumble unless they were in winningKeys (they shouldn't be).
 */
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
  const config = getCarabaoChargeConfig();
  const reelsCount = config.reelsCount;
  const nextBoard: BoardCell[] = [];
  const spawnedKeys: string[] = [];
  const fallenKeys: string[] = [];

  for (let r = 0; r < reelsCount; r++) {
    const targetHeight = reelHeights[r]!;
    const columnCells = board
      .filter((c) => c.reelIndex === r)
      .sort((a, b) => a.rowIndex - b.rowIndex);
    const keptCells: BoardCell[] = [];

    for (const cell of columnCells) {
      if (!removeKeys.has(cell.key)) keptCells.push(cell);
    }

    const missingCount = Math.max(0, targetHeight - keptCells.length);
    const newCells: BoardCell[] = [];
    for (let i = 0; i < missingCount; i++) {
      const cell = makeCell(pickRandomSymbol(ante, isFreeSpins), r, i);
      newCells.push(cell);
      spawnedKeys.push(cell.key);
    }

    const finalColumn = [...newCells, ...keptCells];
    finalColumn.forEach((cell, idx) => {
      const original = columnCells.find((c) => c.key === cell.key);
      const prevRow = original?.rowIndex ?? -1;
      cell.rowIndex = idx;
      if (!spawnedKeys.includes(cell.key) && prevRow !== idx) {
        fallenKeys.push(cell.key);
      }
      nextBoard.push(cell);
    });
  }

  return { nextBoard, spawnedKeys, fallenKeys };
}
