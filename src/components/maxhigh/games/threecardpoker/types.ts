import type { HandCategory } from "@/lib/threecardpoker-config";
import type { PlayingCard } from "./deckEngine";
import type { HandRank } from "./handEvaluator";
import type { MainOutcome } from "./resolver";

/** Public deal script after Ante + Pair Plus phase (dealer cards masked). */
export type PublicDealScript = {
  phase: "decision";
  sessionId: string;
  playerCards: PlayingCard[];
  /** Always length 3 placeholders — faces hidden until Play/Fold settle. */
  dealerCardsMasked: true;
  playerHand: HandRank;
  pairPlusCategory: HandCategory | null;
  pairPlusWin: number;
  anteBonusPending: boolean;
  immediateCredit: number;
  totalWager: number;
  ante: number;
  pairPlus: number;
};

/** Public settle script after Play or Fold. */
export type PublicSettleScript = {
  phase: "settled";
  sessionId: string;
  decision: "play" | "fold";
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  playerHand: HandRank;
  dealerHand: HandRank;
  dealerQualified: boolean;
  outcome: MainOutcome;
  anteWin: number;
  playWin: number;
  pairPlusWin: number;
  anteBonusWin: number;
  immediateCredit: number;
  /** Play stake debited this phase (0 on fold). */
  playWager: number;
  ante: number;
  pairPlus: number;
};
