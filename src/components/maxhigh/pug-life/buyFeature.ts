/**
 * Bonus-buy / FeatureSpins entry paths.
 *
 * All costs and RTP figures are config-pending (Source A vs Source B conflict).
 * Direct-buy costMult defaults to 0 → purchases blocked until design sign-off.
 * UK / listed markets: all buy paths disabled via jurisdiction gate.
 */

import {
  getBuyOption,
  isBonusBuyAllowed,
  type PlBuyOptionConfig,
  type PugLifeConfig,
} from "@/lib/pug-life-config";

export type BuyValidation =
  | { ok: true; option: PlBuyOptionConfig; cost: number }
  | { ok: false; reason: string };

/**
 * Validate whether a buy path can be purchased for this market + config.
 */
export function validateBonusBuy(opts: {
  buyId: PlBuyOptionConfig["id"];
  totalBet: number;
  marketCode?: string | null;
  cfg: PugLifeConfig;
}): BuyValidation {
  const { buyId, totalBet, marketCode, cfg } = opts;

  if (!isBonusBuyAllowed(marketCode, cfg)) {
    return {
      ok: false,
      reason: `Bonus buy disabled for market '${(marketCode ?? "").toUpperCase()}' (regulatory restriction)`,
    };
  }

  const option = getBuyOption(buyId, cfg);
  if (!option || !option.enabled) {
    return { ok: false, reason: `Buy option '${buyId}' is disabled` };
  }

  // costMult=0 is the intentional placeholder blocking purchases until sign-off
  if (option.costMult <= 0) {
    return {
      ok: false,
      reason: `Buy option '${buyId}' costMult is config-pending (placeholder 0) — design/compliance sign-off required before enabling`,
    };
  }

  if (option.configStatus === "config-pending" && buyId !== "featurespins") {
    // featurespins cost is consistent (3×); still flagged for RTP but cost is usable.
    // Direct buys remain blocked by costMult=0 above; this is belt-and-suspenders.
  }

  const cost = +(totalBet * option.costMult).toFixed(2);
  if (cost <= 0) {
    return { ok: false, reason: "Invalid buy cost" };
  }

  return { ok: true, option, cost };
}

export function featurespinsCost(totalBet: number, cfg: PugLifeConfig): number | null {
  const v = validateBonusBuy({
    buyId: "featurespins",
    totalBet,
    cfg,
  });
  return v.ok ? v.cost : null;
}
