/** Shared types for Thor Thunder — 6×5 ways + cascade. Egyptian theme. */

export type SymKind =
  | "ten"
  | "jack"
  | "queen"
  | "king"
  | "ace"
  | "scarab"
  | "ankh"
  | "horus"
  | "anubis"
  | "pharaoh"
  | "wild"
  | "scatter";

export type CellSym = {
  id: string;
  kind: SymKind;
  weight: number;
  /** Way pays × bet for [3, 4, 5, 6] of a kind */
  pay: [number, number, number, number];
  wild?: boolean;
  scatter?: boolean;
};

export type BoardCell = {
  key: string;
  sym: CellSym;
};

export type WayWin = {
  id: string;
  kind: SymKind;
  length: number;
  ways: number;
  pay: number;
  keys: string[];
};

export type CascadeStep = {
  board: BoardCell[];
  winningKeys: string[];
  ways: WayWin[];
  cascadeWin: number;
  multiplier: number;
  afterPop: (BoardCell | null)[];
  afterFall: BoardCell[];
  spawnedKeys: string[];
  fallenKeys: string[];
  /** Rows each key travels downward (spawned / fallen enter from above the grid). */
  fallDistance: Record<string, number>;
};

export type SpinScript = {
  initialBoard: BoardCell[];
  steps: CascadeStep[];
  totalWin: number;
  rawWin: number;
  displayMult: number;
  scatters: number;
  scatterPay: number;
  freeSpinsAwarded: number;
  retriggerSpins: number;
  isFreeSpins: boolean;
  /** Progressive mult at end of this spin (FS) */
  endMultiplier: number;
};

export const COLS = 6;
export const ROWS = 5;
export const CELLS = COLS * ROWS;
export const MIN_WAY_LENGTH = 3;
