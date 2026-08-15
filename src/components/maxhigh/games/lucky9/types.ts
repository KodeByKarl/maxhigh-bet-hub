import type { PlayingCard } from "./deckEngine";
import type { Lucky9Outcome } from "./resolver";

/** Public deal script returned to the client after server settlement. */
export type PublicDealScript = {
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  playerTotal: number;
  dealerTotal: number;
  playerNatural: boolean;
  dealerNatural: boolean;
  natural: boolean;
  playerDrew: boolean;
  dealerDrew: boolean;
  outcome: Lucky9Outcome;
  playerWin: number;
  dealerWin: number;
  tieWin: number;
  immediateCredit: number;
  totalWager: number;
};
