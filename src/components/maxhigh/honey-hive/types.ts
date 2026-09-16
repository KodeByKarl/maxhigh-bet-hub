/** Honey Hive — honeycomb nest pillars (cluster tumble). Distinct from diamond / ice pillars / 5×5. */

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

/** Beehive nest — taller mid than Frost (4-5-6-5-4) / Ember (3-4-5-4-3). */
export const REEL_HEIGHTS = [5, 6, 7, 6, 5] as const;
export const COLS = REEL_HEIGHTS.length; // 5
export const ROWS = Math.max(...REEL_HEIGHTS); // 7
export const TOP_COLS = 0;
export const MAIN_CELLS = REEL_HEIGHTS.reduce((a, h) => a + h, 0); // 29
export const CELLS = MAIN_CELLS;
export const MIN_CLUSTER = 8;

export function colStart(col: number): number {
  let s = 0;
  for (let c = 0; c < col; c++) s += REEL_HEIGHTS[c] ?? 0;
  return s;
}

export function cellIndex(col: number, row: number): number {
  return colStart(col) + row;
}

export function colHeight(col: number): number {
  return REEL_HEIGHTS[col] ?? 0;
}
