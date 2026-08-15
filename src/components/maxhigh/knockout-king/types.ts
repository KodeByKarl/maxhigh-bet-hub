/** Shared types for Knockout King base-game-only payline engine. */

import type { BkSymKind } from "@/lib/knockout-king-config";

/** Grid[reel][row] */
export type BkGrid = BkSymKind[][];

export type PaylineWin = {
  lineIndex: number;
  symbol: BkSymKind;
  count: number;
  /** Positions [reel, row] */
  positions: Array<[number, number]>;
  payout: number;
};

export type InstantMixResult = {
  /** Wild + Scatter count in view (6–15). */
  count: number;
  /** × total stake */
  mult: number;
  payout: number;
};

export type WildScatterCount = {
  wild: number;
  scatter: number;
  mix: number;
  positions: Array<[number, number]>;
};

export type SpinScript = {
  seed: string;
  totalBet: number;
  betPerLine: number;
  grid: BkGrid;
  paylineWins: PaylineWin[];
  paylineWin: number;
  wildScatter: WildScatterCount;
  /** Null when count < 6 OR when Grand Jackpot triggered (Option C skip). */
  instantMix: InstantMixResult | null;
  grandJackpot: boolean;
  grandJackpotWin: number;
  /** Sum before max-win trim. */
  rawTotalWin: number;
  totalWin: number;
  hitCap: boolean;
};

export type CellKey = string;

export function cellKey(reel: number, row: number): CellKey {
  return `${reel}:${row}`;
}
