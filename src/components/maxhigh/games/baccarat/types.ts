import type { PlayingCard } from "./deckEngine";
import type { BaccaratOutcome } from "./resolver";

/** Public deal script returned to the client after server settlement. */
export type PublicDealScript = {
  playerCards: PlayingCard[];
  bankerCards: PlayingCard[];
  playerTotal: number;
  bankerTotal: number;
  natural: boolean;
  playerDrew: boolean;
  bankerDrew: boolean;
  outcome: BaccaratOutcome;
  playerPair: boolean;
  bankerPair: boolean;
  playerWin: number;
  bankerWin: number;
  tieWin: number;
  playerPairWin: number;
  bankerPairWin: number;
  immediateCredit: number;
  totalWager: number;
};
