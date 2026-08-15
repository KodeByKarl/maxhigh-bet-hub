import type { PlayingCard } from "./deckEngine";
import type { LuckyNinePlusOutcome } from "./resolver";

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
  outcome: LuckyNinePlusOutcome;
  playerWin: number;
  dealerWin: number;
  tieWin: number;
  immediateCredit: number;
  totalWager: number;
};
