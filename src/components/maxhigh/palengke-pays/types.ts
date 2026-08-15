import type { FgSymKind } from "@/lib/palengke-pays-config";

/** grid[reel][row] — each reel column length = reelHeights[reel]. */
export type FgGrid = FgSymKind[][];

export type PaylineWin = {
  lineIndex: number;
  symbol: FgSymKind;
  /** Consecutive reels matched (left→right). */
  count: number;
  positions: Array<[number, number]>;
  /** Product of matching cells per consecutive reel. */
  waysCount?: number;
  payout: number;
};

export type CascadeStep = {
  stepIndex: number;
  grid: FgGrid;
  paylineWins: PaylineWin[];
  paylineWin: number;
  /** Cells removed after this win (empty on terminal step) */
  removed: Array<[number, number]>;
};

export type HoldCoin = {
  reel: number;
  row: number;
  mult: number;
  jackpotId?: "mini" | "minor" | "major" | "grand";
  label: string;
};

export type HoldWinStep = {
  stepIndex: number;
  respinsLeft: number;
  coins: HoldCoin[];
  newCoins: HoldCoin[];
};

export type HoldWinScript = {
  triggerCoins: HoldCoin[];
  steps: HoldWinStep[];
  totalMult: number;
  totalWin: number;
  filledGrid: boolean;
  grandAwarded: boolean;
};

export type SpinScript = {
  seed: string;
  /** Cascade sequence (payline tumble). Always ≥1 step. */
  steps: CascadeStep[];
  /** Final board after cascades (compat / Hold & Win source) */
  grid: FgGrid;
  /** First-step wins (compat) */
  paylineWins: PaylineWin[];
  /** Sum of all cascade line wins */
  paylineWin: number;
  scatterCount: number;
  scatterPay: number;
  freeSpinsAwarded: number;
  bonusCoinCount: number;
  holdWin: HoldWinScript | null;
  totalWin: number;
  hitCap?: boolean;
};

export function cellKey(reel: number, row: number): string {
  return `${reel}:${row}`;
}
