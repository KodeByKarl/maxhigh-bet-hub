import { betPerLine } from "@/lib/fortune-mouse-config";
import { applyMultiplier, generateMultiplierReel } from "./multiplierReel";
import { evaluatePaylines } from "./paylineEngine";
import { generateGrid } from "./reelGenerator";
import { createRng, newSpinSeed } from "./rng";
import { getFortuneMouseConfig } from "./runtimeConfig";
import type { MultiplierReelResult, SpinScript } from "./types";

/**
 * Server-authoritative full spin resolution (base game only).
 *
 * Section 6 order:
 * 1. Stake already validated/uplifted by caller (EX → +50%)
 * 2. Generate 3×3 main grid from weighted reel strips
 * 3. Generate multiplier reel from base or EX strip profile
 * 4. Evaluate 5 paylines
 * 5. Apply center multiplier to payline total (no-op if no win)
 * 6. Apply max-win cap (provisional 375×)
 */
export function resolveFortuneMouseSpin(opts: {
  /** Actual stake deducted (already includes EX uplift if active). */
  totalBet: number;
  /** Player-selected base bet before EX uplift. */
  baseBet?: number;
  exMode?: boolean;
  seed?: string;
  /** Optional fixed grid for unit tests (skips RNG grid generation). */
  grid?: SpinScript["grid"];
  /** Optional fixed multiplier reel for unit tests. */
  multiplierReel?: MultiplierReelResult;
}): SpinScript {
  const cfg = getFortuneMouseConfig();
  const exMode = !!opts.exMode;
  const totalBet = opts.totalBet;
  const baseBet = opts.baseBet ?? totalBet;
  const seed = opts.seed ?? newSpinSeed("fg");
  const rng = createRng(seed);

  const maxPayout =
    cfg.maxWinMult > 0 ? +(totalBet * cfg.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;

  const grid = opts.grid ?? generateGrid(rng, cfg);
  const multiplierReel =
    opts.multiplierReel ?? generateMultiplierReel(rng, cfg, exMode);

  const { wins: paylineWins, total: paylineWinRaw } = evaluatePaylines(grid, totalBet, cfg);
  const multipliedWin = applyMultiplier(paylineWinRaw, multiplierReel.center);
  const rawTotalWin = multipliedWin;

  let totalWin = rawTotalWin;
  let hitCap = false;
  if (Number.isFinite(maxPayout) && totalWin > maxPayout) {
    totalWin = maxPayout;
    hitCap = true;
  }

  return {
    seed,
    baseBet: +baseBet.toFixed(2),
    totalBet: +totalBet.toFixed(2),
    betPerLine: betPerLine(totalBet, cfg),
    exMode,
    grid,
    paylineWins,
    paylineWin: paylineWinRaw,
    multiplierReel,
    multipliedWin,
    rawTotalWin,
    totalWin: +totalWin.toFixed(2),
    hitCap,
  };
}
