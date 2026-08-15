import type { LuckyDropSpot } from "@/lib/lucky-drop-config";

export type PublicDealScript = {
  winningNumber: LuckyDropSpot;
  bets: Record<LuckyDropSpot, number>;
  laneWins: Record<LuckyDropSpot, number>;
  immediateCredit: number;
  totalWager: number;
};
