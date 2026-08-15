import type { CellSym, SymKind } from "./types";
import { getIslandFeverConfig, getRuntimeSymbols } from "./runtimeConfig";

/** Default symbol table (also used before config hydrate). Prefer getRuntimeSymbols() in engine. */
export const SYMBOLS: CellSym[] = getRuntimeSymbols().map((s) => ({
  ...s,
  pay: [...s.pay] as [number, number, number],
}));

export const ICON_SRC: Record<SymKind, string> = {
  grape: "/images/symbols/island-fever/grape.webp",
  plum: "/images/symbols/island-fever/plum.png",
  melon: "/images/symbols/island-fever/melon.png",
  apple: "/images/symbols/island-fever/apple.webp",
  blue: "/images/symbols/island-fever/blue.png",
  green: "/images/symbols/island-fever/green.png",
  purple: "/images/symbols/island-fever/purple.png",
  heart: "/images/symbols/island-fever/heart.png",
  lollipop: "/images/symbols/island-fever/lollipop.png",
  bomb: "/images/symbols/island-fever/bomb.webp",
};

export function payForCount(sym: CellSym, count: number): number {
  const min = getIslandFeverConfig().minCluster;
  if (count >= min + 4) return sym.pay[2];
  if (count >= min + 2) return sym.pay[1];
  if (count >= min) return sym.pay[0];
  return 0;
}

/** Scatter cash when landing candy canes (tiers from config). */
export function scatterCashPay(count: number, bet: number): number {
  const tiers = [...getIslandFeverConfig().scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return +(bet * t.mult).toFixed(2);
  }
  return 0;
}

export function getBuyFeatureMult() {
  return getIslandFeverConfig().buyFeatureMult;
}
export function getSuperBuyFeatureMult() {
  return getIslandFeverConfig().superBuyFeatureMult;
}
export function getAnteMult() {
  return getIslandFeverConfig().anteBetMult;
}
export function getFreeSpinsBase() {
  return getIslandFeverConfig().freeSpinsBase;
}
export function getFreeSpinsRetrigger() {
  return getIslandFeverConfig().freeSpinsRetrigger;
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
