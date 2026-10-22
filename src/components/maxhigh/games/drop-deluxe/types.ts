import type { HandResult, PublicCard } from "@/lib/drop-deluxe-config";

/** Dealt hand awaiting the player's holds. */
export type OpenHand = { bet: number; hand: PublicCard[] };

export type DealResult = { balance: number; open: OpenHand };

export type DrawResult = {
  balance: number;
  hand: PublicCard[];
  /** Which positions were replaced by the draw. */
  replaced: boolean[];
  result: HandResult;
  mult: number;
  bet: number;
  payout: number;
};

export type OpenHandResult = { open: OpenHand | null };
