/** Enchanted Grove — 9×3 cluster tumble (panther rectangle board). */

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

/** 9×3 board — unique rectangle for Enchanted Grove. */
export const COLS = 9;
export const ROWS = 3;
export const TOP_COLS = 0;
export const MAIN_CELLS = COLS * ROWS; // 27
export const CELLS = MAIN_CELLS;
export const MIN_CLUSTER = 7;
