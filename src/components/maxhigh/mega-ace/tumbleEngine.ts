import type { MegaAceSymbolConfig, MegaAceSymKind } from "@/lib/mega-ace-config";
import { getMegaAceConfig } from "./runtimeConfig";
import type { BoardCell } from "./types";

let keyCounter = 1;
export function nextCellKey(): string {
  return `sua_${Date.now()}_${keyCounter++}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Weighted pick from symbol table (ante boosts scatter weight). */
export function pickRandomSymbol(ante: boolean, isFreeSpins: boolean): MegaAceSymbolConfig {
  const config = getMegaAceConfig();
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
  sym: MegaAceSymbolConfig,
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
  sym: MegaAceSymbolConfig,
  chance: number,
  isFreeSpins: boolean,
): boolean {
  if (sym.wild || sym.scatter) return false;
  const config = getMegaAceConfig();
  if (isFreeSpins && reelIndex === config.guaranteedGoldenReelIndex) return true;
  if (reelIndex < 1 || reelIndex > 3) return false;
  return Math.random() < chance;
}

/** Pick Little or Big Joker from configurable transform weights. */
export function pickJokerTransform(): MegaAceSymbolConfig {
  const config = getMegaAceConfig();
  const { little_joker: littleW, big_joker: bigW } = config.jokerTransformWeights;
  const total = Math.max(0, littleW) + Math.max(0, bigW);
  const kind: MegaAceSymKind =
    total <= 0 || Math.random() * total < Math.max(0, littleW) ? "little_joker" : "big_joker";
  return (
    config.symbols.find((s) => s.kind === kind) ||
    config.symbols.find((s) => s.wild) ||
    config.symbols[0]
  );
}

export function generateInitialBoard(
  reelHeights: number[],
  ante: boolean,
  isFreeSpins: boolean,
): BoardCell[] {
  const config = getMegaAceConfig();
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
 * Cascade: remove winning keys (golden cards → Little/Big Joker instead of vanish),
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
  jokerTransformKeys: string[];
} {
  const config = getMegaAceConfig();
  const reelsCount = config.reelsCount;

  const nextBoard: BoardCell[] = [];
  const spawnedKeys: string[] = [];
  const fallenKeys: string[] = [];
  const jokerTransformKeys: string[] = [];

  for (let r = 0; r < reelsCount; r++) {
    const targetHeight = reelHeights[r];
    const columnCells = board
      .filter((c) => c.reelIndex === r)
      .sort((a, b) => a.rowIndex - b.rowIndex);
    const keptCells: BoardCell[] = [];

    for (const cell of columnCells) {
      if (removeKeys.has(cell.key)) {
        if (cell.isGold && !cell.sym.wild && !cell.sym.scatter) {
          const jokerSym = pickJokerTransform();
          const jokerCell = makeCell(jokerSym, r, 0, false);
          keptCells.push(jokerCell);
          spawnedKeys.push(jokerCell.key);
          jokerTransformKeys.push(jokerCell.key);
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
    jokerTransformKeys,
  };
}
