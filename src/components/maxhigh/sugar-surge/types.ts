/**
 * Sugar Surge — educational cluster-pay engine (Sugar Rush–style mechanics).
 * Original implementation: adjacent clusters, position multipliers, cascades.
 */

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
  /** Payout tiers × bet relative to minCluster: [min, min+2, min+4+] */
  pay: [number, number, number];
  scatter?: boolean;
  /** Legacy flag — bombs are disabled; position multipliers replace them. */
  bomb?: boolean;
};

export type BoardCell = {
  key: string;
  sym: CellSym;
  /** @deprecated bomb mult — unused in position-multiplier math */
  mult?: number;
};

export type ClusterWin = {
  id: string;
  kind: SymKind;
  count: number;
  pay: number;
  perSymbol: number;
  keys: string[];
  /** Grid indices (row-major) in this cluster */
  indices: number[];
};

export type TumbleStep = {
  board: BoardCell[];
  winningKeys: string[];
  winningIndices: number[];
  clusters: ClusterWin[];
  /** Cluster pays for this tumble (before end-of-cascade position mult) */
  tumbleWin: number;
  /** Kept for UI compat — position multiplier sum after this tumble */
  bombSum: number;
  /** Position multipliers after upgrading winning cells this tumble */
  positionMults: number[];
  afterPop: (BoardCell | null)[];
  afterFall: BoardCell[];
  spawnedKeys: string[];
  fallenKeys: string[];
  fallDistance: Record<string, number>;
};

export type SpinScript = {
  initialBoard: BoardCell[];
  /** Multipliers at spin start (zeros in base; may persist in free spins) */
  initialPositionMults: number[];
  /** Multipliers after the cascade ends */
  finalPositionMults: number[];
  steps: TumbleStep[];
  totalWin: number;
  /** Sum of cluster pays before position-multiplier apply */
  rawWin: number;
  /** Sum of position multipliers applied to the cascade (1 if none) */
  displayMult: number;
  scatters: number;
  scatterPay: number;
  freeSpinsAwarded: number;
  retriggerSpins: number;
  isFreeSpins: boolean;
  /** @deprecated alias of displayMult for session UI */
  bombAccumulator: number;
};

export const COLS = 7;
export const ROWS = 7;
export const CELLS = COLS * ROWS;
/** Sugar Rush–style minimum adjacent cluster size */
export const MIN_CLUSTER = 5;

/** Orthogonal only — no diagonals */
export const ORTHO_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
