/** Shared types for Sweet Bonanza engine + render. */

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
  /** Payout tiers × bet: [8–9, 10–11, 12+] */
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

export const COLS = 6;
export const ROWS = 5;
export const CELLS = COLS * ROWS;
export const MIN_CLUSTER = 8;
