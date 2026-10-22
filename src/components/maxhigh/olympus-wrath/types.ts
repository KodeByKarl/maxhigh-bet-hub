/** Olympus Wrath — 4×8 cluster tumble (panther rectangle board). */

export type SymKind =
  | "grape"
  | "plum"
  | "melon"
  | "apple"
  | "blue"
  | "green"
  | "purple"
  | "heart"
  | "lollipop"
  | "bomb";

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

/** 4×8 board — unique rectangle for Olympus Wrath. */
export const COLS = 4;
export const ROWS = 8;
export const TOP_COLS = 0;
export const MAIN_CELLS = COLS * ROWS; // 32
export const CELLS = MAIN_CELLS;
export const MIN_CLUSTER = 8;
