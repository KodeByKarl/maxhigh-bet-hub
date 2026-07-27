/** Shared types for Chinese New Year slot engine. */

export type SymKind =
  | "rat"
  | "snake"
  | "horse"
  | "goat"
  | "pig"
  | "dog"
  | "rooster"
  | "tiger"
  | "monkey"
  | "dragon";

export type CellSym = {
  id: string;
  kind: SymKind;
  weight: number;
  pay: [number, number, number];
  scatter?: boolean;
  bomb?: boolean;
};

export type BoardCell = {
  key: string;
  sym: CellSym;
  mult?: number;
};

export type ClusterWin = {
  id: string;
  kind: SymKind;
  count: number;
  pay: number;
  perSymbol: number;
  keys: string[];
};

export type TumbleStep = {
  board: BoardCell[];
  winningKeys: string[];
  clusters: ClusterWin[];
  tumbleWin: number;
  bombSum: number;
  afterPop: (BoardCell | null)[];
  afterFall: BoardCell[];
  spawnedKeys: string[];
  fallenKeys: string[];
  fallDistance: Record<string, number>;
};

export type SpinScript = {
  initialBoard: BoardCell[];
  steps: TumbleStep[];
  totalWin: number;
  rawWin: number;
  displayMult: number;
  scatters: number;
  scatterPay: number;
  freeSpinsAwarded: number;
  retriggerSpins: number;
  isFreeSpins: boolean;
  bombAccumulator: number;
};

export const COLS = 6;
export const ROWS = 7;
export const TOP_COLS = 4;
export const MAIN_CELLS = COLS * ROWS; // 42
export const CELLS = TOP_COLS + MAIN_CELLS; // 46 total cells
export const MIN_CLUSTER = 8;
