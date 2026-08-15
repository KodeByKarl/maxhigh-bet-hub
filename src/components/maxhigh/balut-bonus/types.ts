/** Shared types for Balut Bonus 3×3 + multiplier-reel engine. */

import type { FoSymKind } from "@/lib/balut-bonus-config";

/** Grid[reel][row] */
export type FoGrid = FoSymKind[][];

export type PaylineWin = {
  lineIndex: number;
  symbol: FoSymKind;
  count: number;
  /** Positions [reel, row] */
  positions: Array<[number, number]>;
  /** Base payline payout before multiplier reel. */
  payout: number;
};

/** Independent 4th reel — center face is the active spin multiplier. */
export type MultiplierReelResult = {
  /** Display strip [top, center, bottom] for frontend animation. */
  faces: [number, number, number];
  /** Active multiplier (= faces[1]). */
  center: number;
};

export type SpinScript = {
  seed: string;
  /** Player-selected base bet (before EX uplift). */
  baseBet: number;
  /** Actual stake deducted (baseBet × exBetMult when EX on). */
  totalBet: number;
  betPerLine: number;
  exMode: boolean;
  grid: FoGrid;
  paylineWins: PaylineWin[];
  /** Sum of payline wins before multiplier. */
  paylineWin: number;
  multiplierReel: MultiplierReelResult;
  /** paylineWin × multiplierReel.center (before max-win cap). */
  multipliedWin: number;
  /** Sum before max-win trim (= multipliedWin; kept for audit clarity). */
  rawTotalWin: number;
  totalWin: number;
  hitCap: boolean;
};

export type CellKey = string;

export function cellKey(reel: number, row: number): CellKey {
  return `${reel}:${row}`;
}
