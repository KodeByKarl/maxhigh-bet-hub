import type { PickOdds, PublicCard } from "@/lib/lucky-drop-config";

/** Everything the client may know about a run — never the deck order. */
export type RunView = {
  bet: number;
  card: PublicCard;
  steps: number;
  maxSteps: number;
  mult: number;
  /** Cash-out value right now (bet × mult). */
  payout: number;
  skipsLeft: number;
  /** Cards still in the deck per rank (index = rank − 2). */
  rankCounts: number[];
  remaining: number;
  higher: PickOdds;
  lower: PickOdds;
  /** Cards already played this run, oldest first (excludes `card`). */
  trail: PublicCard[];
};

export type ClimbOutcome = "continue" | "bust" | "cashed";

export type ClimbResult = {
  balance: number;
  outcome: ClimbOutcome;
  /** Present while the run continues. */
  run: RunView | null;
  /** The card that was just drawn (bust / win reveal). */
  drawn: PublicCard | null;
  payout: number;
  mult: number;
  /** True when the ladder ended itself (top rung or multiplier cap). */
  auto?: boolean;
};

export type SessionResult = { run: RunView | null };
