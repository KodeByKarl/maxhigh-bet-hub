/**
 * Buy Bonus contract shared by the server (authoritative) and the UI (display only).
 *
 * Trigger, quantity and pricing are separate concerns, declared per game in BUY_BONUS_SPECS:
 *  - quantity: what the player may choose (a locked amount, or a range) and what the unit is;
 *  - pricing:  a price per unit as a multiple of the bet (flat or a calibrated curve; lives in each game's own pricing module);
 *  - total:    always round2(bet × pricePerUnitMult × quantity), computed identically on the server and in the UI.
 * The bonus itself always plays at the base bet; nothing here changes a coefficient, an RTP or a payout.
 */

/** Wild Panther (the original reference implementation) and any locked game award exactly this many free spins. */
export const BUY_BONUS_FREE_SPINS = 10;

export type BuyBonusQuantitySpec =
  { mode: "locked"; value: number } | { mode: "range"; min: number; max: number; initial: number };

/** What one unit of quantity is. Only "free-spin" is established by a reference; per-box is deliberately absent until specified. */
export type BuyBonusUnit = "free-spin";

export type BuyBonusSpec = {
  unit: BuyBonusUnit;
  quantity: BuyBonusQuantitySpec;
};

/**
 * Default for every Buy Bonus slot with a quantity selector: 1..25 free-spin units (25 is every template slot's default maxFsSessionSpins;
 * the server still refuses anything above the live per-game cap), opening at 1 (client reference: qty 1).
 */
export const BUY_BONUS_DEFAULT_SPEC: BuyBonusSpec = {
  unit: "free-spin",
  quantity: { mode: "range", min: 1, max: 25, initial: 1 },
};

/** Games whose purchase is fixed by their own flow, not a player-chosen quantity. */
export const BUY_BONUS_SPECS: Record<string, BuyBonusSpec> = {
  "wild-panther": {
    unit: "free-spin",
    quantity: { mode: "locked", value: BUY_BONUS_FREE_SPINS },
  },
};

export const BUY_BONUS_DEFAULT_QUANTITY = 1;

export function getBuyBonusSpec(gameId: string, maxOverride?: number): BuyBonusSpec {
  const spec = BUY_BONUS_SPECS[gameId] ?? BUY_BONUS_DEFAULT_SPEC;
  if (spec.quantity.mode === "range" && maxOverride && maxOverride > 0) {
    const max = Math.max(spec.quantity.min, Math.min(spec.quantity.max, maxOverride));
    return { ...spec, quantity: { ...spec.quantity, max } };
  }
  return spec;
}

/** Clamp a quantity into the game's allowed set (UI helper; the server never clamps, it refuses). */
export function clampBuyBonusQuantity(spec: BuyBonusQuantitySpec, q: number): number {
  if (spec.mode === "locked") return spec.value;
  const n = Math.round(Number.isFinite(q) ? q : spec.initial);
  return Math.min(spec.max, Math.max(spec.min, n));
}

/**
 * Server-side validation. The quantity must be a whole number the game's spec allows; anything else is refused so a client can never be
 * charged for something other than what it displayed. `maxOverride` lets a game narrow the range (e.g. a per-title cap).
 */
export function resolveBuyBonusQuantity(
  gameId: string,
  requested: unknown,
  maxOverride?: number,
): number {
  const { quantity } = getBuyBonusSpec(gameId, maxOverride);
  if (quantity.mode === "locked") {
    if (requested !== undefined && requested !== null && Number(requested) !== quantity.value) {
      throw new Error(`Buy Bonus awards exactly ${quantity.value} free spins`);
    }
    return quantity.value;
  }
  if (requested === undefined || requested === null || requested === "") {
    throw new Error("Buy Bonus quantity is required");
  }
  const n = Number(requested);
  const max = quantity.max;
  if (!Number.isInteger(n) || n < quantity.min || n > max) {
    throw new Error(`Buy Bonus quantity must be a whole number from ${quantity.min} to ${max}`);
  }
  return n;
}

/** Total wallet deduction: identical formula on server and client so displayed and charged prices always match. */
export function buyBonusTotal(bet: number, pricePerUnitMult: number, quantity: number): number {
  return +(bet * pricePerUnitMult * quantity).toFixed(2);
}

/** Price of a single unit at `bet` (display). */
export function buyBonusUnitPrice(bet: number, pricePerUnitMult: number): number {
  return +(bet * pricePerUnitMult).toFixed(2);
}

/** @deprecated kept for older call sites: use resolveBuyBonusQuantity(gameId, …). */
export function resolveBuyBonusSpins(requested?: unknown): number {
  return resolveBuyBonusQuantity("wild-panther", requested);
}
