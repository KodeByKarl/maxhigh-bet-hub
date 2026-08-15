/**
 * Fortune Ox — dedicated multiplier reel (independent of the 3×3 payline grid).
 *
 * Mechanic:
 * - Separate 4th reel with faces 1× / 2× / 3× / 5× / 10× / 15×
 * - Center face is the active multiplier for that spin
 * - Applied only to payline wins (×0 base = 0; still generated every spin for audit/display)
 * - Base vs EX mode use fully separate weighted configs (not runtime modifiers)
 */

import {
  activeMultiplierStrip,
  type FortuneOxConfig,
} from "@/lib/fortune-ox-config";
import type { FoRng } from "./rng";
import type { MultiplierReelResult } from "./types";

function stripPool(
  cfg: FortuneOxConfig,
  exMode: boolean,
): Array<{ value: number; weight: number }> {
  const strip = activeMultiplierStrip(cfg, exMode);
  return cfg.multiplierValues.map((value) => ({
    value,
    weight: Math.max(0, strip.weights[String(value)] ?? 0),
  }));
}

/**
 * Generate the multiplier reel result from the active (base or EX) strip profile.
 * Always returns a center value; top/bottom neighbors are for frontend display only.
 */
export function generateMultiplierReel(
  rng: FoRng,
  cfg: FortuneOxConfig,
  exMode: boolean,
): MultiplierReelResult {
  const pool = stripPool(cfg, exMode).filter((p) => p.weight > 0);
  const fallback = cfg.multiplierValues[0] ?? 1;

  const pick = (): number => {
    if (pool.length === 0) return fallback;
    return rng.pickWeighted(pool).value;
  };

  // Display neighbors from the same strip (independent draws).
  const top = pick();
  const center = pick();
  const bottom = pick();

  return {
    faces: [top, center, bottom],
    center,
  };
}

/**
 * Apply multiplier reel center to base payline win.
 * No-win spins remain 0 regardless of multiplier (confirmed payout rule).
 */
export function applyMultiplier(paylineWin: number, multiplier: number): number {
  if (paylineWin <= 0 || multiplier <= 0) return 0;
  return +(paylineWin * multiplier).toFixed(2);
}
