import type { PwSymKind } from "@/lib/pinata-wins-config";

/** Grid cell with optional Gold Frame multiplier. */
export type PwCell = {
  kind: PwSymKind;
  framed: boolean;
  /** Carried mult when framed (2–100); else 0 */
  frameMult: number;
};

/** grid[reel][row] */
export type PwGrid = PwCell[][];

export type PaylineWin = {
  lineIndex: number;
  symbol: PwSymKind;
  count: number;
  positions: Array<[number, number]>;
  payout: number;
};

export type GoldFrameCollect = {
  reel: number;
  row: number;
  kind: PwSymKind;
  mult: number;
};

export type CascadeStep = {
  stepIndex: number;
  grid: PwGrid;
  paylineWins: PaylineWin[];
  /** Raw payline win this step (before Gold Frame mult) */
  paylineWin: number;
  /** Cells removed (non-framed winners) */
  removed: Array<[number, number]>;
  /** Gold Frames that won this step: collected + flagged to become Wild */
  goldCollected: GoldFrameCollect[];
  /** Positions that transform to Wild instead of clearing */
  transformToWild: Array<[number, number]>;
};

export type SpinScript = {
  seed: string;
  steps: CascadeStep[];
  /** Final board after cascades */
  grid: PwGrid;
  paylineWins: PaylineWin[];
  /** Sum of raw cascade line wins (pre Gold Frame mult) */
  paylineWinRaw: number;
  /**
   * Gold Frame mults collected this spin (sum of frame values).
   * Applied as spin-aggregate multiplier when > 0.
   */
  goldFrameCollected: number;
  /** Effective multiplier applied to paylineWinRaw (≥1) */
  goldFrameAppliedMult: number;
  /** Payline win after Gold Frame aggregate mult (pre max-cap slice for this spin) */
  paylineWin: number;
  /** Unique Scatters counted across the whole cascade sequence (peak grid count) */
  scatterCount: number;
  freeSpinsAwarded: number;
  totalWin: number;
  hitCap?: boolean;
  /** Session persistent mult entering this spin (FS only; base = 0) */
  persistentMultBefore: number;
  /** Session persistent mult after this spin's collections (FS only) */
  persistentMultAfter: number;
};

export type FreeSpinsSessionScript = {
  seed: string;
  spins: SpinScript[];
  freeSpinsAwarded: number;
  retriggerTotal: number;
  persistentMultFinal: number;
  totalWin: number;
  hitCap?: boolean;
};

export function cellKey(reel: number, row: number): string {
  return `${reel}:${row}`;
}

export function cloneGrid(grid: PwGrid): PwGrid {
  return grid.map((col) => col.map((c) => ({ ...c })));
}

export function makeCell(kind: PwSymKind, framed = false, frameMult = 0): PwCell {
  return { kind, framed: framed && frameMult > 0, frameMult: framed ? frameMult : 0 };
}
