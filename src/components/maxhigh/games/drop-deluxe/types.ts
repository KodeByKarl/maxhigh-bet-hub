import type { DropDeluxeSpot } from "@/lib/drop-deluxe-config";

export type PublicDealScript = {
  winningNumber: DropDeluxeSpot;
  bets: Record<DropDeluxeSpot, number>;
  laneWins: Record<DropDeluxeSpot, number>;
  immediateCredit: number;
  totalWager: number;
};
