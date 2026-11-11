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

/**
 * Exact decimal parsing: the shortest decimal that round-trips the number (what the player sees and the config stores),
 * as an integer numerator over a power of ten. This avoids binary floating-point errors such as 1.005 * 100 = 100.49999999999999.
 */
function decimalParts(x: number): { n: bigint; k: number } {
  if (!Number.isFinite(x) || x < 0) throw new Error("Invalid amount");
  let t = String(x);
  if (/e/i.test(t)) t = x.toFixed(12).replace(/0+$/, "").replace(/\.$/, "");
  const [whole, frac = ""] = t.split(".");
  return { n: BigInt(whole + frac), k: frac.length };
}

/** Product of non-negative factors in exact decimal arithmetic, rounded half-up to whole centavos (returned as a 2-dp number). */
export function exactProduct2(...factors: number[]): number {
  let num = 1n;
  let k = 0;
  for (const f of factors) {
    const d = decimalParts(f);
    num *= d.n;
    k += d.k;
  }
  const den = 10n ** BigInt(k);
  const cents = (num * 200n + den) / (2n * den); // floor((2 * num * 100 + den) / (2 * den)) = round half up
  const whole = cents / 100n;
  const rem = cents % 100n;
  return Number(`${whole}.${rem.toString().padStart(2, "0")}`);
}

/** Total wallet deduction: identical formula on server and client so displayed and charged prices always match. */
export function buyBonusTotal(bet: number, pricePerUnitMult: number, quantity: number): number {
  return exactProduct2(bet, pricePerUnitMult, quantity);
}

/** Price of a single unit at `bet`, rounded to the centavo (numeric form). */
export function buyBonusUnitPrice(bet: number, pricePerUnitMult: number): number {
  return exactProduct2(bet, pricePerUnitMult);
}

/**
 * Unit price for display at its true precision (at least 2 decimals, at most 6, trailing zeros trimmed beyond 2). Showing the exact unit price
 * keeps "price x quantity = total" readable when bet x multiplier has sub-centavo digits (e.g. 6.25 x 42.5 = 265.625; 3 x 265.625 = 796.875 -> 796.88).
 */
export function buyBonusUnitPriceText(bet: number, pricePerUnitMult: number): string {
  const a = decimalParts(bet);
  const b = decimalParts(pricePerUnitMult);
  const num = a.n * b.n;
  const k = a.k + b.k;
  const digits = num.toString().padStart(k + 1, "0");
  const whole = k === 0 ? digits : digits.slice(0, digits.length - k);
  let frac = k === 0 ? "" : digits.slice(digits.length - k);
  if (frac.length > 6) {
    // beyond 6 decimals: round half-up at the 6th
    const scaled = (num * 2n * 10n ** 6n + 10n ** BigInt(k)) / (2n * 10n ** BigInt(k));
    const sd = scaled.toString().padStart(7, "0");
    return `${sd.slice(0, -6)}.${sd.slice(-6).replace(/0+$/, "").padEnd(2, "0")}`;
  }
  frac = frac.replace(/0+$/, "").padEnd(2, "0");
  return `${whole}.${frac}`;
}

/** @deprecated kept for older call sites: use resolveBuyBonusQuantity(gameId, …). */
export function resolveBuyBonusSpins(requested?: unknown): number {
  return resolveBuyBonusQuantity("wild-panther", requested);
}
