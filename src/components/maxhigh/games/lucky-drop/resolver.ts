/**
 * Lucky Drop resolver — fair roll 1–10; credit hitting lanes.
 */
import {
  creditForLaneWin,
  LUCKY_DROP_SPOTS,
  type LuckyDropConfig,
  type LuckyDropSpot,
} from "@/lib/lucky-drop-config";
import { createRng, newDealSeed } from "./rng";
import { getLuckyDropConfig } from "./runtimeConfig";

export type LuckyDropBets = Partial<Record<LuckyDropSpot, number>>;

export type DealResolveResult = {
  seed: string;
  winningNumber: LuckyDropSpot;
  bets: Record<LuckyDropSpot, number>;
  laneWins: Record<LuckyDropSpot, number>;
  immediateCredit: number;
  totalWager: number;
};

export function resolveLuckyDropDeal(opts: {
  bets: LuckyDropBets;
  cfg?: LuckyDropConfig;
  seed?: string;
}): DealResolveResult {
  const cfg = opts.cfg ?? getLuckyDropConfig();
  const bets = {} as Record<LuckyDropSpot, number>;
  let totalWager = 0;
  let pickCount = 0;
  for (const n of LUCKY_DROP_SPOTS) {
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
  const winningNumber = (1 + Math.floor(rng() * 10)) as LuckyDropSpot;

  const laneWins = {} as Record<LuckyDropSpot, number>;
  let immediateCredit = 0;
  for (const n of LUCKY_DROP_SPOTS) {
    const stake = bets[n] ?? 0;
    const win =
      n === winningNumber && stake > 0 ? creditForLaneWin(stake, cfg.payoutMult) : 0;
    laneWins[n] = win;
    immediateCredit += win;
  }
  immediateCredit = +immediateCredit.toFixed(2);

  return { seed, winningNumber, bets, laneWins, immediateCredit, totalWager };
}
