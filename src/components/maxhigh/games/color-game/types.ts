import type { ColorSpotId } from "@/lib/color-game-config";

/** Public deal script returned to the client after server settlement. */
export type PublicDealScript = {
  winningColor: ColorSpotId;
  bets: Record<ColorSpotId, number>;
  spotWins: Record<ColorSpotId, number>;
  immediateCredit: number;
  totalWager: number;
};
