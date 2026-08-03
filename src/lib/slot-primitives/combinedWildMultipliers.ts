/**
 * Reusable primitive: sticky / revealed wild multipliers that combine by sum
 * when multiple wilds contribute to a single win.
 *
 * Used by Pug Life Treat Wilds; available for future titles with the same rule.
 */

export type WildMultiplierContribution = {
  /** Cell position [reel, row] */
  position: [number, number];
  /** Revealed multiplier value (≥ 1). Values < 1 are ignored. */
  multiplier: number;
};

/**
 * Sum revealed multipliers from wilds that participate in a win.
 * Returns 1 when no contributing wilds (identity — no change to base payout).
 */
export function combineWildMultipliers(
  contributions: WildMultiplierContribution[],
): number {
  let sum = 0;
  for (const c of contributions) {
    if (Number.isFinite(c.multiplier) && c.multiplier >= 1) {
      sum += c.multiplier;
    }
  }
  return sum > 0 ? sum : 1;
}

/**
 * Apply combined wild multiplier to a base payline payout.
 */
export function applyCombinedWildMultiplier(
  basePayout: number,
  contributions: WildMultiplierContribution[],
): { combinedMult: number; payout: number } {
  const combinedMult = combineWildMultipliers(contributions);
  return {
    combinedMult,
    payout: +(basePayout * combinedMult).toFixed(2),
  };
}
