import type { RealmsConfig } from "@/lib/realms/schema";
import type { CellSym } from "./types";

export function payForCount(cfg: RealmsConfig, sym: CellSym, count: number): number {
  const min = cfg.minCluster;
  if (count >= min + 4) return sym.pay[2];
  if (count >= min + 2) return sym.pay[1];
  if (count >= min) return sym.pay[0];
  return 0;
}

/** Scatter cash for the highest tier reached. */
export function scatterCashPay(cfg: RealmsConfig, count: number, bet: number): number {
  const tiers = [...cfg.scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return +(bet * t.mult).toFixed(2);
  }
  return 0;
}

/** Buy Bonus always opens on this bet. */
export const BUY_FS_START_BET = 1;
export const BUY_FS_BET_MIN = 1;
export const BUY_FS_BET_MAX = 100_000;

/** One Buy Bonus unit = one free spin at `bet`. */
export function getBuyUnitPrice(cfg: RealmsConfig, bet: number) {
  return +(bet * cfg.buyFeatureMult).toFixed(2);
}

export const BET_STEPS = [
  0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6.25, 8, 10, 20, 50, 100,
];
