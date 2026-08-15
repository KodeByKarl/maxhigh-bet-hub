/** Shared types for Pug Den 3-4-5-4-3 connecting-ways engine. */

import type { PlSymKind } from "@/lib/pug-life-config";
import type { PooledPayoutState } from "@/lib/slot-primitives/pooledPayout";

export type PlCell = {
  kind: PlSymKind;
  /** Revealed Treat multiplier (Treat Wild cells only). */
  treatMult?: number;
  /** Sticky lock (Treat Yo'Self / Toaster). */
  sticky?: boolean;
};

/** Grid[reel][row] — each reel column length = reelHeights[reel]. */
export type PlGrid = PlCell[][];

/** Connecting-ways win (kept name PaylineWin for spin-script compatibility). */
export type PaylineWin = {
  lineIndex: number;
  symbol: PlSymKind;
  /** Consecutive reels from the left that matched. */
  count: number;
  positions: Array<[number, number]>;
  /** Product of match counts per consecutive reel. */
  waysCount: number;
  /** Base payout before Treat multipliers. */
  basePayout: number;
  /** Treat Wild contributions on this win. */
  treatContributions: Array<{ position: [number, number]; multiplier: number }>;
  combinedTreatMult: number;
  /** Final payout after Treat multiplier combination. */
  payout: number;
  /** True when all-Treat 5+ consecutive reels used fiveTreatPayStakeMult. */
  fiveTreatWin?: boolean;
};

export type ToasterReveal = {
  type: "multiplier" | "cash";
  /** Multiplier value, or cash as × stake. */
  value: number;
  /** Cash contribution = value × totalBet when type=cash; 0 for multiplier. */
  cashAmount: number;
};

export type StickyToaster = {
  reel: number;
  row: number;
  /** Reveals keyed by spin index after lock (spin when toaster first lands has no reveal). */
  reveals: Record<number, ToasterReveal>;
};

export type TreatYoSelfSpinStep = {
  spinIndex: number;
  grid: PlGrid;
  paylineWins: PaylineWin[];
  spinWin: number;
  newStickyTreats: Array<[number, number]>;
  spinsRemainingAfter: number;
  livesRemainingAfter: number;
  lifeLost: boolean;
};

export type TreatYoSelfSession = {
  type: "treat_yoself";
  triggerPositions: Array<[number, number]>;
  initialSpins: number;
  initialLives: number;
  steps: TreatYoSelfSpinStep[];
  /** Sum of per-spin wins (or pot if pooled mode). */
  totalWin: number;
  payoutMode: "per_spin" | "pooled";
};

export type DawgsDenSpinStep = {
  spinIndex: number;
  grid: PlGrid;
  paylineWins: PaylineWin[];
  paylineWinAddedToPot: number;
  toasterReveals: Array<{
    reel: number;
    row: number;
    reveal: ToasterReveal;
    potContribution: number;
  }>;
  newToasters: Array<[number, number]>;
  potAfter: number;
  spinsRemainingAfter: number;
};

export type DawgsDenSession = {
  type: "dawgs_den";
  scatterPositions: Array<[number, number]>;
  scatterSpinAwards: number[];
  freeSpinsAwarded: number;
  steps: DawgsDenSpinStep[];
  pool: PooledPayoutState;
  /** Lump-sum settlement (pot at end). Intermediate steps never credit balance. */
  totalWin: number;
};

export type BonusBuyMeta = {
  option: "featurespins" | "treat_yoself" | "dawgs_den";
  costMult: number;
  cost: number;
  marketCode: string | null;
};

export type SpinScript = {
  seed: string;
  totalBet: number;
  betPerLine: number;
  entryPath: "base" | "featurespins" | "buy_treat_yoself" | "buy_dawgs_den";
  grid: PlGrid;
  paylineWins: PaylineWin[];
  paylineWin: number;
  treatCount: number;
  scatterCount: number;
  treatYoSelfTriggered: boolean;
  dawgsDenTriggered: boolean;
  /** Which bonus ran, if any (respects dual-trigger priority). */
  bonusSession: TreatYoSelfSession | DawgsDenSession | null;
  buyMeta: BonusBuyMeta | null;
  /** Featurespins remaining after this spin (if in a featurespins batch). */
  featurespinsRemaining?: number;
  rawTotalWin: number;
  totalWin: number;
  hitCap: boolean;
  /** Full audit trail for dispute resolution. */
  audit: {
    seed: string;
    symbols: PlSymKind[][];
    treatMults: Array<{ reel: number; row: number; mult: number; kind: PlSymKind }>;
    stickyTreats?: Array<{ reel: number; row: number; mult: number }>;
    stickyToasters?: StickyToaster[];
    potFinal?: number;
  };
};

export type CellKey = string;

export function cellKey(reel: number, row: number): CellKey {
  return `${reel}:${row}`;
}

export function emptyCell(kind: PlSymKind): PlCell {
  return { kind };
}

export function gridKinds(grid: PlGrid): PlSymKind[][] {
  return grid.map((col) => col.map((c) => c.kind));
}
