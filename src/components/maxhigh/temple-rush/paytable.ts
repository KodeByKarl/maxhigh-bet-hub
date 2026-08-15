import type { CellSym, SymKind } from "./types";
import { getTempleRushConfig, getRuntimeSymbols } from "./runtimeConfig";

/** Default symbol table (also used before config hydrate). Prefer getRuntimeSymbols() in engine. */
export const SYMBOLS: CellSym[] = getRuntimeSymbols().map((s) => ({
  ...s,
  pay: [...s.pay] as [number, number, number],
}));

export const ICON_SRC: Record<SymKind, string> = {
  grape: "/images/symbols/gp/10.png?v=1",
  plum: "/images/symbols/gp/J.png?v=1",
  melon: "/images/symbols/gp/Q.png?v=1",
  apple: "/images/symbols/gp/K.webp?v=1",
  blue: "/images/symbols/gp/A.png?v=1",
  green: "/images/symbols/gp/owl.png?v=1",
  purple: "/images/symbols/gp/wolf.png?v=1",
  heart: "/images/symbols/gp/ram.png?v=1",
  lollipop: "/images/symbols/gp/scatter.webp?v=1",
  bomb: "/images/symbols/gp/wild.webp?v=1",
};

export function payForCount(sym: CellSym, count: number): number {
  const min = getTempleRushConfig().minCluster;
  if (count >= min + 4) return sym.pay[2];
  if (count >= min + 2) return sym.pay[1];
  if (count >= min) return sym.pay[0];
  return 0;
}

/** Scatter cash when landing panther canes (tiers from config). */
export function scatterCashPay(count: number, bet: number): number {
  const tiers = [...getTempleRushConfig().scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return +(bet * t.mult).toFixed(2);
  }
  return 0;
}

export function getBuyFeatureMult() {
  return getTempleRushConfig().buyFeatureMult;
}
export function getSuperBuyFeatureMult() {
  return getTempleRushConfig().superBuyFeatureMult;
}
export function getAnteMult() {
  return getTempleRushConfig().anteBetMult;
}
export function getFreeSpinsBase() {
  return getTempleRushConfig().freeSpinsBase;
}
export function getFreeSpinsRetrigger() {
  return getTempleRushConfig().freeSpinsRetrigger;
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
