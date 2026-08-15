import type { QuezonQuestSymbolConfig } from "@/lib/quezon-quest-config";
import { getQuezonQuestConfig } from "./runtimeConfig";
import type { BoardCell } from "./types";

let keyCounter = 1;
export function nextCellKey(): string {
  return `sa_${Date.now()}_${keyCounter++}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Weighted pick from symbol table (ante boosts scatter weight). */
export function pickRandomSymbol(ante: boolean, isFreeSpins: boolean): QuezonQuestSymbolConfig {
  const config = getQuezonQuestConfig();
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

  if (total <= 0) return config.symbols[0];
  let roll = Math.random() * total;
  for (let i = 0; i < config.symbols.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return config.symbols[i];
  }
  return config.symbols[config.symbols.length - 1];
}

export function makeCell(
  sym: QuezonQuestSymbolConfig,
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

/**
 * Gold: chance on reels 2–4 (indices 1–3).
 * Free Spins: guaranteedGoldenReelIndex always gold on eligible symbols.
 */
function rollGold(
  reelIndex: number,
  sym: QuezonQuestSymbolConfig,
  chance: number,
  isFreeSpins: boolean,
): boolean {
  if (sym.wild || sym.scatter) return false;
  const config = getQuezonQuestConfig();
  if (isFreeSpins && reelIndex === config.guaranteedGoldenReelIndex) return true;
  if (reelIndex < 1 || reelIndex > 3) return false;
  return Math.random() < chance;
}

export function generateInitialBoard(
  reelHeights: number[],
  ante: boolean,
  isFreeSpins: boolean,
): BoardCell[] {
  const config = getQuezonQuestConfig();
  const board: BoardCell[] = [];
  for (let r = 0; r < reelHeights.length; r++) {
    const height = reelHeights[r];
    for (let row = 0; row < height; row++) {
      const sym = pickRandomSymbol(ante, isFreeSpins);
      const isGold = rollGold(r, sym, config.goldChanceInitial, isFreeSpins);
      board.push(makeCell(sym, r, row, isGold));
    }
  }
  return board;
}

/**
 * Cascade: remove winning keys (gold-plated → wild instead of vanish),
 * drop remaining down, fill tops from weighted table.
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
  const config = getQuezonQuestConfig();
  const wildSym = config.symbols.find((s) => s.wild) || config.symbols[0];
  const reelsCount = config.reelsCount;

  const nextBoard: BoardCell[] = [];
  const spawnedKeys: string[] = [];
  const fallenKeys: string[] = [];

  for (let r = 0; r < reelsCount; r++) {
    const targetHeight = reelHeights[r];
    const columnCells = board
      .filter((c) => c.reelIndex === r)
      .sort((a, b) => a.rowIndex - b.rowIndex);
    const keptCells: BoardCell[] = [];

    for (const cell of columnCells) {
      if (removeKeys.has(cell.key)) {
        if (cell.isGold && !cell.sym.wild && !cell.sym.scatter) {
          const wildCell = makeCell(wildSym, r, 0, false);
          keptCells.push(wildCell);
          spawnedKeys.push(wildCell.key);
        }
      } else {
        keptCells.push(cell);
      }
    }

    const missingCount = Math.max(0, targetHeight - keptCells.length);
    const newCells: BoardCell[] = [];

    for (let i = 0; i < missingCount; i++) {
      const sym = pickRandomSymbol(ante, isFreeSpins);
      const isGold = rollGold(r, sym, config.goldChanceCascade, isFreeSpins);
      const cell = makeCell(sym, r, i, isGold);
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

  return {
    nextBoard,
    spawnedKeys,
    fallenKeys,
  };
}
