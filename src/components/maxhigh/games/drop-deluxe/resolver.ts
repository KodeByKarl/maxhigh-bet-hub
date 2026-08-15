/**
 * Drop Deluxe resolver — fair roll 1–10; credit hitting lanes.
 */
import {
  creditForLaneWin,
  DROP_DELUXE_SPOTS,
  type DropDeluxeConfig,
  type DropDeluxeSpot,
} from "@/lib/drop-deluxe-config";
import { createRng, newDealSeed } from "./rng";
import { getDropDeluxeConfig } from "./runtimeConfig";

export type DropDeluxeBets = Partial<Record<DropDeluxeSpot, number>>;

export type DealResolveResult = {
  seed: string;
  winningNumber: DropDeluxeSpot;
  bets: Record<DropDeluxeSpot, number>;
  laneWins: Record<DropDeluxeSpot, number>;
  immediateCredit: number;
  totalWager: number;
};

export function resolveDropDeluxeDeal(opts: {
  bets: DropDeluxeBets;
  cfg?: DropDeluxeConfig;
  seed?: string;
}): DealResolveResult {
  const cfg = opts.cfg ?? getDropDeluxeConfig();
  const bets = {} as Record<DropDeluxeSpot, number>;
  let totalWager = 0;
  let pickCount = 0;
  for (const n of DROP_DELUXE_SPOTS) {
    const v = +Number(opts.bets[n] ?? 0).toFixed(2);
    bets[n] = v > 0 ? v : 0;
    if (bets[n] > 0) pickCount += 1;
    totalWager += bets[n];
  }
  totalWager = +totalWager.toFixed(2);
  if (totalWager <= 0) throw new Error("Place at least one lane bet");
  if (pickCount > cfg.maxPicks) {
    throw new Error(`Max ${cfg.maxPicks} lanes per drop`);
  }

  const seed = opts.seed ?? newDealSeed("ld-deal");
  const rng = createRng(seed);
  const winningNumber = (1 + Math.floor(rng() * 10)) as DropDeluxeSpot;

  const laneWins = {} as Record<DropDeluxeSpot, number>;
  let immediateCredit = 0;
  for (const n of DROP_DELUXE_SPOTS) {
    const stake = bets[n] ?? 0;
    const win =
      n === winningNumber && stake > 0 ? creditForLaneWin(stake, cfg.payoutMult) : 0;
    laneWins[n] = win;
    immediateCredit += win;
  }
  immediateCredit = +immediateCredit.toFixed(2);

  return { seed, winningNumber, bets, laneWins, immediateCredit, totalWager };
}
