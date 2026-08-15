import type { PlayingCard, ShoeState } from "./deckEngine";
import type { WarStepResult } from "./warEngine";

/** Legacy interactive war session — unused for auto-war settle; kept for old open rows. */
export type AceHighFeatureState = {
  kind: "ace_war";
  baseBet: number;
  warMatched: number;
  warDepth: number;
  playerCard: PlayingCard;
  dealerCard: PlayingCard;
  playerCards?: PlayingCard[];
  dealerCards?: PlayingCard[];
  shoe: ReturnType<typeof import("./deckEngine").serializeShoe>;
  seedBase: string;
};

export type AceHighSessionView = {
  sessionId: string | null;
  open: boolean;
  baseBet: number;
  warMatched: number;
  warDepth: number;
  maxWarDepth: number;
  playerCard: PlayingCard | null;
  dealerCard: PlayingCard | null;
};

export type PublicDealScript = {
  playerCards: [PlayingCard, PlayingCard];
  dealerCards: [PlayingCard, PlayingCard];
  /** @deprecated prefer playerCards[0] — kept for brief compat */
  playerCard: PlayingCard;
  dealerCard: PlayingCard;
  initialOutcome: "player" | "dealer" | "tie";
  outcome: "player" | "dealer" | "tie" | "split";
  tieWin: number;
  aceBonusWin: number;
  aceBonusHit: "ace_vs_ace" | "either_ace" | null;
  baseWin: number;
  pendingWar: false;
  warSteps: WarStepResult[];
  warMatched: number;
  warDepth?: number;
  burned?: PlayingCard[];
  splitPot: boolean;
  folded?: boolean;
};

export type ShoePersist = ShoeState;
