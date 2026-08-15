/** Shared types for Crazy Sevens 3-reel classic engine. */

import type { RrSymKind } from "@/lib/neon-fruits-config";

/** One active payline symbol per reel (engine view). */
export type RrReels = RrSymKind[];

/** Full visible strip per reel when visibleRowsPerReel=3: strip[reel][row]. */
export type RrVisibleGrid = RrSymKind[][];

export type PaylineResult = {
  kind: "none" | "fruit" | "two_wild" | "three_wild";
  symbol: RrSymKind | null;
  wildCount: number;
  /** Stake-multiplier before × bet (0 if none). */
  payMult: number;
  payout: number;
};

export type BonusLadderStep = {
  lineIndex: number;
  positionIndex: number;
  outcome: "number" | "stop";
  /** Multiplier value if number; 0 if stop. */
  value: number;
  advanced: boolean;
};

export type BonusLadderSession = {
  triggered: boolean;
  steps: BonusLadderStep[];
  /** Sum (additive) or product (multiplicative) of number values. */
  combinedMult: number;
  payout: number;
  stoppedOnLine: number | null;
  clearedAll: boolean;
};

export type JackpotResult = {
  triggered: boolean;
  /** Amount awarded from pool (0 if not triggered). Snapshot at award time. */
  amount: number;
  /** Pool after reset (floor), for UI. */
  poolAfterReset: number;
  reasonBlocked?: string;
};

export type SpinScript = {
  seed: string;
  totalBet: number;
  held: boolean[];
  previousReels: RrReels | null;
  reels: RrReels;
  /** Decorative neighbors when visibleRowsPerReel=3. */
  visibleGrid: RrVisibleGrid;
  payline: PaylineResult;
  jackpot: JackpotResult;
  bonus: BonusLadderSession | null;
  /** Contribution added to progressive pool this spin (for audit). */
  jackpotContribution: number;
  rawTotalWin: number;
  totalWin: number;
  audit: {
    seed: string;
    held: boolean[];
    reels: RrReels;
    wildCount: number;
    paylineKind: PaylineResult["kind"];
    paylinePayout: number;
    jackpotTriggered: boolean;
    jackpotAmount: number;
    bonusPayout: number;
    bonusSteps: BonusLadderStep[];
  };
};
