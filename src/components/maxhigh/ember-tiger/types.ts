/** Ember Tiger — Pug Den–style diamond board (cluster tumble math). */

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
  /** Payout multiplier × bet: [min, min+2, min+4+] */
  pay: [number, number, number];
  scatter?: boolean;
  bomb?: boolean;
};

export type BoardCell = {
  key: string;
  sym: CellSym;
  /** Bomb multiplier when kind is bomb */
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
  /** Keys that win this step (cluster + bombs that apply) */
  winningKeys: string[];
  clusters: ClusterWin[];
  tumbleWin: number;
  bombSum: number;
  /** After pop: board with winners cleared (null holes) — optional for anim */
  afterPop: (BoardCell | null)[];
  /** After gravity + refill */
  afterFall: BoardCell[];
  spawnedKeys: string[];
  fallenKeys: string[];
  /** Rows traveled downward for fall animation (spawned + moved survivors). */
  fallDistance: Record<string, number>;
};

export type SpinScript = {
  initialBoard: BoardCell[];
  steps: TumbleStep[];
  totalWin: number;
  /** Cluster/scatter win before bomb multipliers (for UI breakdown) */
  rawWin: number;
  /** Multiplier to show on win popup (1 if none) */
  displayMult: number;
  scatters: number;
  scatterPay: number;
  freeSpinsAwarded: number;
  retriggerSpins: number;
  isFreeSpins: boolean;
  /** Bomb mults collected during FS (display); applied per-tumble in base */
  bombAccumulator: number;
};

/** 3-4-5-4-3 diamond — same footprint as Pug Den. */
export const REEL_HEIGHTS = [3, 4, 5, 4, 3] as const;
export const COLS = REEL_HEIGHTS.length; // 5
export const ROWS = Math.max(...REEL_HEIGHTS); // 5 (tallest reel)
export const TOP_COLS = 0;
export const MAIN_CELLS = REEL_HEIGHTS.reduce((a, h) => a + h, 0); // 19
export const CELLS = MAIN_CELLS;
export const MIN_CLUSTER = 6;

/** Flat index offset where column `col` begins (column-major). */
export function colStart(col: number): number {
  let s = 0;
  for (let c = 0; c < col; c++) s += REEL_HEIGHTS[c] ?? 0;
  return s;
}

/** Flat board index for diamond cell (col, row). Row 0 = top. */
export function cellIndex(col: number, row: number): number {
  return colStart(col) + row;
}

export function colHeight(col: number): number {
  return REEL_HEIGHTS[col] ?? 0;
}
