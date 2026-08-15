import type { CellSym, SymKind } from "./types";
import { getBoracayBounceConfig, getRuntimeSymbols } from "./runtimeConfig";

/** Default symbol table (also used before config hydrate). Prefer getRuntimeSymbols() in engine. */
export const SYMBOLS: CellSym[] = getRuntimeSymbols().map((s) => ({
  ...s,
  pay: [...s.pay] as [number, number, number],
}));

export const ICON_SRC: Record<SymKind, string> = {
  grape: "/images/symbols/boracay-bounce/grape.png?v=4",
  plum: "/images/symbols/boracay-bounce/plum.png?v=4",
  melon: "/images/symbols/boracay-bounce/melon.png?v=4",
  apple: "/images/symbols/boracay-bounce/apple.png?v=4",
  blue: "/images/symbols/boracay-bounce/blue.png?v=4",
  green: "/images/symbols/boracay-bounce/green.png?v=4",
  purple: "/images/symbols/boracay-bounce/purple.png?v=4",
  heart: "/images/symbols/boracay-bounce/heart.png?v=4",
  lollipop: "/images/symbols/boracay-bounce/lollipop.png?v=4",
  bomb: "/images/symbols/boracay-bounce/bomb.png?v=4",
};

export function payForCount(sym: CellSym, count: number): number {
  const min = getBoracayBounceConfig().minCluster;
  if (count >= min + 4) return sym.pay[2];
  if (count >= min + 2) return sym.pay[1];
  if (count >= min) return sym.pay[0];
  return 0;
}

/** Scatter cash when landing rockets (tiers from config; often 0 for FS-only). */
export function scatterCashPay(count: number, bet: number): number {
  const tiers = [...getBoracayBounceConfig().scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return +(bet * t.mult).toFixed(2);
  }
  return 0;
}

export function getBuyFeatureMult() {
  return getBoracayBounceConfig().buyFeatureMult;
}
export function getSuperBuyFeatureMult() {
  return getBoracayBounceConfig().superBuyFeatureMult;
}
export function getAnteMult() {
  return getBoracayBounceConfig().anteBetMult;
}
export function getFreeSpinsBase() {
  return getBoracayBounceConfig().freeSpinsBase;
}
export function getFreeSpinsRetrigger() {
  return getBoracayBounceConfig().freeSpinsRetrigger;
}

/** @deprecated use getters — kept for existing imports */
export const BUY_FEATURE_MULT = 100;
export const SUPER_BUY_FEATURE_MULT = 500;
export const ANTE_MULT = 1.25;
export const FREE_SPINS_BASE = 10;
export const FREE_SPINS_RETRIGGER = 5;

export const BET_STEPS = [
  0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6.25, 8, 10, 20, 50, 100,
];
