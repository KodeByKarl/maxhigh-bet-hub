import type { CellSym, SymKind } from "./types";
import { getChineseNewYearConfig, getRuntimeSymbols } from "./runtimeConfig";

export const SYMBOLS: CellSym[] = getRuntimeSymbols().map((s) => ({
  ...s,
  pay: [...s.pay] as [number, number, number],
}));

export const ICON_SRC: Record<SymKind, string> = {
  rat: "/images/symbols/chinese/rat.png",
  snake: "/images/symbols/chinese/snake.png",
  horse: "/images/symbols/chinese/horse.png",
  goat: "/images/symbols/chinese/goat.png",
  pig: "/images/symbols/chinese/pig.png",
  dog: "/images/symbols/chinese/dog.png",
  rooster: "/images/symbols/chinese/rooster.png",
  dragon: "/images/symbols/chinese/dragon.png",
  monkey: "/images/symbols/chinese/monkey.png",
  tiger: "/images/symbols/chinese/tiger.png",
};

export function payForCount(sym: CellSym, count: number): number {
  const min = getChineseNewYearConfig().minCluster;
  if (count >= min + 4) return sym.pay[2];
  if (count >= min + 2) return sym.pay[1];
  if (count >= min) return sym.pay[0];
  return 0;
}

export function scatterCashPay(count: number, bet: number): number {
  const tiers = [...getChineseNewYearConfig().scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return +(bet * t.mult).toFixed(2);
  }
  return 0;
}

export function getBuyFeatureMult() {
  return getChineseNewYearConfig().buyFeatureMult;
}
export function getSuperBuyFeatureMult() {
  return getChineseNewYearConfig().superBuyFeatureMult;
}
export function getAnteMult() {
  return getChineseNewYearConfig().anteBetMult;
}
export function getFreeSpinsBase() {
  return getChineseNewYearConfig().freeSpinsBase;
}
export function getFreeSpinsRetrigger() {
  return getChineseNewYearConfig().freeSpinsRetrigger;
}

export const BET_STEPS = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6.25, 8, 10];
