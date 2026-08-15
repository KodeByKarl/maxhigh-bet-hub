/**
 * Color Game deal resolver — pure math, no wallet I/O.
 * Weighted roll over configurable color spots; credit winning bets only.
 */
import {
  creditForSpotWin,
  type ColorGameConfig,
  type ColorSpotId,
} from "@/lib/color-game-config";
import { createRng, newDealSeed } from "./rng";
import { getColorGameConfig } from "./runtimeConfig";

export type ColorBets = Partial<Record<ColorSpotId, number>>;

export type DealResolveResult = {
  seed: string;
  winningColor: ColorSpotId;
  bets: Record<ColorSpotId, number>;
  spotWins: Record<ColorSpotId, number>;
  immediateCredit: number;
  totalWager: number;
};

function pickWeighted(
  spots: ColorGameConfig["spots"],
  rng: () => number,
): ColorSpotId {
  const total = spots.reduce((s, sp) => s + sp.weight, 0);
  let roll = rng() * total;
  for (const sp of spots) {
    roll -= sp.weight;
    if (roll <= 0) return sp.id;
  }
  return spots[spots.length - 1]!.id;
}

export function resolveColorGameDeal(opts: {
  bets: ColorBets;
  cfg?: ColorGameConfig;
  seed?: string;
}): DealResolveResult {
  const cfg = opts.cfg ?? getColorGameConfig();
  const bets = {} as Record<ColorSpotId, number>;
  let totalWager = 0;
  for (const sp of cfg.spots) {
    const v = +Number(opts.bets[sp.id] ?? 0).toFixed(2);
    bets[sp.id] = v > 0 ? v : 0;
    totalWager += bets[sp.id];
  }
  totalWager = +totalWager.toFixed(2);
  if (totalWager <= 0) throw new Error("Place at least one color bet");

  const seed = opts.seed ?? newDealSeed("cg-deal");
  const rng = createRng(seed);
  const winningColor = pickWeighted(cfg.spots, rng);

  const spotWins = {} as Record<ColorSpotId, number>;
  let immediateCredit = 0;
  for (const sp of cfg.spots) {
    const stake = bets[sp.id] ?? 0;
    const win =
      sp.id === winningColor && stake > 0 ? creditForSpotWin(stake, sp.payoutMult) : 0;
    spotWins[sp.id] = win;
    immediateCredit += win;
  }
  immediateCredit = +immediateCredit.toFixed(2);

  return { seed, winningColor, bets, spotWins, immediateCredit, totalWager };
}
