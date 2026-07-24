import type { CellSym, SymKind } from "./types";
import { getCandyPeakConfig, getRuntimeSymbols } from "./runtimeConfig";

/** Default symbol table (also used before config hydrate). Prefer getRuntimeSymbols() in engine. */
export const SYMBOLS: CellSym[] = getRuntimeSymbols().map((s) => ({
  ...s,
  pay: [...s.pay] as [number, number, number],
}));

export const ICON_SRC: Record<SymKind, string> = {
  grape: "/images/symbols/sweet/grape.png",
  plum: "/images/symbols/sweet/plum.png",
  melon: "/images/symbols/sweet/melon.png",
  apple: "/images/symbols/sweet/apple.png",
  blue: "/images/symbols/sweet/blue.png",
  green: "/images/symbols/sweet/green.png",
  purple: "/images/symbols/sweet/purple.png",
  heart: "/images/symbols/sweet/heart.png",
  lollipop: "/images/symbols/sweet/lollipop.png",
  bomb: "/images/symbols/sweet/bomb.png",
};

export function payForCount(sym: CellSym, count: number): number {
  const min = getCandyPeakConfig().minCluster;
  if (count >= min + 4) return sym.pay[2];
  if (count >= min + 2) return sym.pay[1];
  if (count >= min) return sym.pay[0];
  return 0;
}

/** Scatter cash when landing candy canes (tiers from config). */
export function scatterCashPay(count: number, bet: number): number {
  const tiers = [...getCandyPeakConfig().scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return +(bet * t.mult).toFixed(2);
  }
  return 0;
}

export function getBuyFeatureMult() {
  return getCandyPeakConfig().buyFeatureMult;
}
export function getSuperBuyFeatureMult() {
  return getCandyPeakConfig().superBuyFeatureMult;
}
export function getAnteMult() {
  return getCandyPeakConfig().anteBetMult;
}
export function getFreeSpinsBase() {
  return getCandyPeakConfig().freeSpinsBase;
}
export function getFreeSpinsRetrigger() {
  return getCandyPeakConfig().freeSpinsRetrigger;
}

/** @deprecated use getters — kept for existing imports */
export const BUY_FEATURE_MULT = 100;
export const SUPER_BUY_FEATURE_MULT = 500;
export const ANTE_MULT = 1.25;
export const FREE_SPINS_BASE = 10;
export const FREE_SPINS_RETRIGGER = 5;

export const BET_STEPS = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6.25, 8, 10];
