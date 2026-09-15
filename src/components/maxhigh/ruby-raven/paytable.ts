import type { CellSym, SymKind } from "./types";
import { getRubyRavenConfig, getRuntimeSymbols } from "./runtimeConfig";
import { rubyRavenTheme } from "./theme";

/** Default symbol table (also used before config hydrate). Prefer getRuntimeSymbols() in engine. */
export const SYMBOLS: CellSym[] = getRuntimeSymbols().map((s) => ({
  ...s,
  pay: [...s.pay] as [number, number, number],
}));

export const ICON_SRC: Record<SymKind, string> = { ...rubyRavenTheme.assets.icons };

export function payForCount(sym: CellSym, count: number): number {
  const min = getRubyRavenConfig().minCluster;
  if (count >= min + 4) return sym.pay[2];
  if (count >= min + 2) return sym.pay[1];
  if (count >= min) return sym.pay[0];
  return 0;
}

/** Scatter cash when landing panther canes (tiers from config). */
export function scatterCashPay(count: number, bet: number): number {
  const tiers = [...getRubyRavenConfig().scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return +(bet * t.mult).toFixed(2);
  }
  return 0;
}

export function getBuyFeatureMult() {
  return getRubyRavenConfig().buyFeatureMult;
}
export function getSuperBuyFeatureMult() {
  return getRubyRavenConfig().superBuyFeatureMult;
}

/** Buy Bonus always opens on this bet (reference: ₱1 → Price ₱42.5). */
export const BUY_FS_START_BET = 1;
export const BUY_FS_BET_MIN = 1;
export const BUY_FS_BET_MAX = 100_000;

export function getBuyUnitPrice(bet: number, mode: "normal" | "super" = "normal") {
  const mult = mode === "super" ? getSuperBuyFeatureMult() : getBuyFeatureMult();
  return +(bet * mult).toFixed(2);
}
export function getAnteMult() {
  return getRubyRavenConfig().anteBetMult;
}
export function getFreeSpinsBase() {
  return getRubyRavenConfig().freeSpinsBase;
}
export function getFreeSpinsRetrigger() {
  return getRubyRavenConfig().freeSpinsRetrigger;
}

/** @deprecated use getters — kept for existing imports */
export const BUY_FEATURE_MULT = 42.5;
export const SUPER_BUY_FEATURE_MULT = 212.5;
export const ANTE_MULT = 1.25;
export const FREE_SPINS_BASE = 10;
export const FREE_SPINS_RETRIGGER = 5;

export const BET_STEPS = [
  0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6.25, 8, 10, 20, 50, 100,
];
