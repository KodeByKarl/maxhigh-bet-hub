/** Shared types for Chinese New Year fixed-payline engine. */

import type { CnySymKind } from "@/lib/chinese-new-year-config";

/** Grid[reel][row] */
export type CnyGrid = CnySymKind[][];

export type PaylineWin = {
  lineIndex: number;
  symbol: CnySymKind;
  /** Underlying paying symbol when Extra Scatter substituted. */
  paySymbol: CnySymKind;
  count: number;
  /** Positions [reel, row] */
  positions: Array<[number, number]>;
  payout: number;
};

export type DragonLaunch = {
  index: number;
  success: boolean;
  awardId: string | null;
  awardLabel: string | null;
  /** × total bet for this launch (0 on bust) */
  mult: number;
  coins: number;
};

export type DragonBonusResult = {
  triggered: boolean;
  launches: DragonLaunch[];
  totalCoins: number;
  busted: boolean;
};

export type MonkeyBonusResult = {
  triggered: boolean;
  /** Immediate 5× total bet (configurable). */
  triggerPayout: number;
  extraScatterSymbol: CnySymKind;
  freeSpinsAwarded: number;
};

export type FreeSpinScript = {
  spinIndex: number;
  seed: string;
  grid: CnyGrid;
  paylineWins: PaylineWin[];
  paylineWin: number;
  /** No dragon/monkey during FS — always null. */
  dragonBonus: null;
  monkeyBonus: null;
  spinWin: number;
};

export type SpinScript = {
  seed: string;
  totalBet: number;
  betPerLine: number;
  grid: CnyGrid;
  paylineWins: PaylineWin[];
  paylineWin: number;
  dragonBonus: DragonBonusResult | null;
  monkeyBonus: MonkeyBonusResult | null;
  freeSpins: FreeSpinScript[];
  freeSpinsTotalWin: number;
  /** Sum before max-win trim. */
  rawTotalWin: number;
  totalWin: number;
  hitCap: boolean;
  gambleAvailable: boolean;
  isFreeSpins: boolean;
  /** Active Extra Scatter paying kind during FS (null in base). */
  extraScatterSymbol: CnySymKind | null;
};

export type GambleChoice = "red" | "black";

export type GambleResult = {
  choice: GambleChoice;
  drawn: GambleChoice;
  won: boolean;
  /** Stake going into this gamble. */
  stake: number;
  /** Amount after this round (0 if lost). */
  amount: number;
  roundsUsed: number;
  maxRounds: number;
  hitCap: boolean;
  canGambleAgain: boolean;
};

export type CellKey = string;

export function cellKey(reel: number, row: number): CellKey {
  return `${reel}:${row}`;
}
