import type { BuffaloSymbolConfig, BuffaloSymKind } from "@/lib/buffalo-reign-config";

export type BoardCell = {
  key: string;
  reelIndex: number;
  rowIndex: number;
  sym: BuffaloSymbolConfig;
};

export type WaysWin = {
  symbolId: string;
  kind: BuffaloSymKind;
  name: string;
  consecutiveReels: number;
  waysCount: number;
  basePayMultiplier: number;
  totalWinAmount: number;
  winningKeys: string[];
};

export type EvalResult = {
  waysWins: WaysWin[];
  winningKeys: string[];
  winAmount: number;
  scatterCount: number;
  scatterKeys: string[];
  totalWays: number;
};

export type CascadeStep = {
  stepIndex: number;
  board: BoardCell[];
  evalResult: EvalResult;
  multiplier: number;
  stepWin: number;
  spawnedKeys: string[];
  fallenKeys: string[];
};

export type ChestCoin = {
  reel: number;
  row: number;
  mult: number;
  jackpotId?: string;
  label: string;
};

export type TreasureChestStep = {
  stepIndex: number;
  respinsLeft: number;
  chests: ChestCoin[];
  newChests: ChestCoin[];
};

export type TreasureChestScript = {
  triggerChests: ChestCoin[];
  steps: TreasureChestStep[];
  totalMult: number;
  totalWin: number;
  filledGrid: boolean;
  legendAwarded: boolean;
};

export type SpinScript = {
  initialReelHeights: number[];
  initialBoard: BoardCell[];
  steps: CascadeStep[];
  totalWays: number;
  baseWin: number;
  totalWin: number;
  scattersCount: number;
  freeSpinsAwarded: number;
  bonusChestCount: number;
  treasureChest: TreasureChestScript | null;
  sessionMultiplier: number;
  hitCap?: boolean;
};

export type BuffaloSessionState = {
  sessionId: string | null;
  freeSpinsLeft: number;
  fsSessionWin: number;
  fsSpinsPlayed: number;
  inFree: boolean;
  bet: number;
  ante: boolean;
};
