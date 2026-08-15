import type { ManilaNightsSymbolConfig, ManilaNightsSymKind } from "@/lib/manila-nights-config";

export type BoardCell = {
  key: string;
  reelIndex: number;
  rowIndex: number;
  sym: ManilaNightsSymbolConfig;
  isGold?: boolean;
};

export type WaysWin = {
  symbolId: string;
  kind: ManilaNightsSymKind;
  name: string;
  consecutiveReels: number;
  waysCount: number;
  basePayMultiplier: number;
  totalWinAmount: number;
  winningKeys: string[];
};

export type EvalResult = {
  waysWins: WaysWin[];
  /** Serializable array — Sets do not survive server-fn JSON. */
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

export type SpinScript = {
  initialReelHeights: number[];
  initialBoard: BoardCell[];
  steps: CascadeStep[];
  totalWays: number;
  baseWin: number;
  totalWin: number;
  /** Peak scatter count across the whole cascade sequence */
  scattersCount: number;
  freeSpinsAwarded: number;
  /** True when maxWinMult capped further payout */
  hitCap?: boolean;
};

export type ManilaNightsSessionState = {
  sessionId: string | null;
  freeSpinsLeft: number;
  fsSessionWin: number;
  fsSpinsPlayed: number;
  inFree: boolean;
  bet: number;
  ante: boolean;
};
