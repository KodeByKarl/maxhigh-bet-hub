import { betPerLine } from "@/lib/boxing-king-config";
import {
  countWildScatter,
  evaluateGrandJackpot,
  evaluateInstantMix,
} from "./instantPrize";
import { evaluatePaylines } from "./paylineEngine";
import { generateGrid } from "./reelGenerator";
import { createRng, newSpinSeed } from "./rng";
import { getBoxingKingConfig } from "./runtimeConfig";
import type { SpinScript } from "./types";

/**
 * Server-authoritative full spin resolution (base game only).
 *
 * Section 7 order:
 * 1. Generate 5×3 grid from active RTP profile weights
 * 2. Evaluate 10 paylines (Wild substitutes)
 * 3. If all-Scatter → Grand Jackpot; skip Section 3 mix entirely (Option C early-return)
 * 4. Else evaluate instant Wild+Scatter mix (count ≥ 6)
 * 5. Sum payline + (jackpot XOR mix) + apply max-win cap
 */
export function resolveBoxingKingSpin(opts: {
  totalBet: number;
  seed?: string;
  /** Optional fixed grid for unit tests (skips RNG generation). */
  grid?: SpinScript["grid"];
}): SpinScript {
  const cfg = getBoxingKingConfig();
  const totalBet = opts.totalBet;
  const seed = opts.seed ?? newSpinSeed("fs");
  const rng = createRng(seed);

  const maxPayout =
    cfg.maxWinMult > 0 ? +(totalBet * cfg.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;

  const grid = opts.grid ?? generateGrid(rng, cfg);
  const { wins: paylineWins, total: paylineWinRaw } = evaluatePaylines(grid, totalBet, cfg);
  const wildScatter = countWildScatter(grid, cfg);

  // Option C: all-Scatter Grand Jackpot check BEFORE Section 3 mix lookup.
  // Early-return path — evaluateInstantMix never runs on an all-Scatter grid.
  const jackpot = evaluateGrandJackpot(grid, totalBet, cfg);
  let instantMix: SpinScript["instantMix"] = null;
  let grandJackpotWin = 0;
  let grandJackpot = false;

  if (jackpot.triggered) {
    grandJackpot = true;
    grandJackpotWin = jackpot.payout;
    instantMix = null;
  } else {
    instantMix = evaluateInstantMix(wildScatter.mix, totalBet, cfg);
  }

  const rawTotalWin = +(
    paylineWinRaw +
    (instantMix?.payout ?? 0) +
    grandJackpotWin
  ).toFixed(2);

  let totalWin = rawTotalWin;
  let hitCap = false;
  if (Number.isFinite(maxPayout) && totalWin > maxPayout) {
    totalWin = maxPayout;
    hitCap = true;
  }

  return {
    seed,
    totalBet,
    betPerLine: betPerLine(totalBet, cfg),
    grid,
    paylineWins,
    paylineWin: paylineWinRaw,
    wildScatter,
    instantMix,
    grandJackpot,
    grandJackpotWin,
    rawTotalWin,
    totalWin: +totalWin.toFixed(2),
    hitCap,
  };
}
