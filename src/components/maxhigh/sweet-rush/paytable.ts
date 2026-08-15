import type { CellSym, SymKind } from "./types";
import { getSweetRushConfig, getRuntimeSymbols } from "./runtimeConfig";

/** Default symbol table (also used before config hydrate). Prefer getRuntimeSymbols() in engine. */
export const SYMBOLS: CellSym[] = getRuntimeSymbols().map((s) => ({
  ...s,
  pay: [...s.pay] as [number, number, number],
}));

export const ICON_SRC: Record<SymKind, string> = {
  grape: "/images/symbols/sweet-rush/grape.png?v=4",
  plum: "/images/symbols/sweet-rush/plum.png?v=4",
  melon: "/images/symbols/sweet-rush/melon.png?v=4",
  apple: "/images/symbols/sweet-rush/apple.png?v=4",
  blue: "/images/symbols/sweet-rush/blue.png?v=4",
  green: "/images/symbols/sweet-rush/green.png?v=4",
  purple: "/images/symbols/sweet-rush/purple.png?v=4",
  heart: "/images/symbols/sweet-rush/heart.png?v=4",
  lollipop: "/images/symbols/sweet-rush/lollipop.png?v=4",
  bomb: "/images/symbols/sweet-rush/bomb.png?v=4",
};

export function payForCount(sym: CellSym, count: number): number {
  const min = getSweetRushConfig().minCluster;
  if (count >= min + 4) return sym.pay[2];
  if (count >= min + 2) return sym.pay[1];
  if (count >= min) return sym.pay[0];
  return 0;
}

/** Scatter cash when landing rockets (tiers from config; often 0 for FS-only). */
export function scatterCashPay(count: number, bet: number): number {
  const tiers = [...getSweetRushConfig().scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return +(bet * t.mult).toFixed(2);
  }
  return 0;
}

export function getBuyFeatureMult() {
  return getSweetRushConfig().buyFeatureMult;
}
export function getSuperBuyFeatureMult() {
  return getSweetRushConfig().superBuyFeatureMult;
}
export function getAnteMult() {
  return getSweetRushConfig().anteBetMult;
}
export function getFreeSpinsBase() {
  return getSweetRushConfig().freeSpinsBase;
}
export function getFreeSpinsRetrigger() {
  return getSweetRushConfig().freeSpinsRetrigger;
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
