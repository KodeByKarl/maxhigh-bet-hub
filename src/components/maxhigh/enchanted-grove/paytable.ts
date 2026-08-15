import type { CellSym, SymKind } from "./types";
import { getEnchantedGroveConfig, getRuntimeSymbols } from "./runtimeConfig";

/** Default symbol table snapshot. Prefer getRuntimeSymbols() in the engine. */
export const SYMBOLS: CellSym[] = getRuntimeSymbols().map((s) => ({
  ...s,
  pay: [...s.pay] as [number, number, number, number],
}));

export const ICON_SRC: Record<SymKind, string> = {
  ten: "/images/symbols/enchanted-grove/ten.png",
  jack: "/images/symbols/enchanted-grove/jack.png",
  queen: "/images/symbols/enchanted-grove/queen.png",
  king: "/images/symbols/enchanted-grove/king.png",
  ace: "/images/symbols/enchanted-grove/ace.png",
  scarab: "/images/symbols/enchanted-grove/scarab.png",
  ankh: "/images/symbols/enchanted-grove/ankh.png",
  horus: "/images/symbols/enchanted-grove/horus.png",
  anubis: "/images/symbols/enchanted-grove/anubis.png",
  pharaoh: "/images/symbols/enchanted-grove/pharaoh.png",
  wild: "/images/symbols/enchanted-grove/wild.png",
  scatter: "/images/symbols/enchanted-grove/scatter.png",
};

export const SYM_COLORS: Record<
  SymKind,
  { primary: string; secondary: string; glow: string; label: string }
> = {
  ten: { primary: "#86efac", secondary: "#15803d", glow: "#4ade80", label: "10" },
  jack: { primary: "#93c5fd", secondary: "#1d4ed8", glow: "#60a5fa", label: "J" },
  queen: { primary: "#c4b5fd", secondary: "#6d28d9", glow: "#a78bfa", label: "Q" },
  king: { primary: "#fca5a5", secondary: "#b91c1c", glow: "#f87171", label: "K" },
  ace: { primary: "#5eead4", secondary: "#0f766e", glow: "#2dd4bf", label: "A" },
  scarab: { primary: "#5eead4", secondary: "#0f766e", glow: "#2dd4bf", label: "Scarab" },
  ankh: { primary: "#c4b5fd", secondary: "#6d28d9", glow: "#a78bfa", label: "Ankh" },
  horus: { primary: "#86efac", secondary: "#15803d", glow: "#4ade80", label: "Horus" },
  anubis: { primary: "#93c5fd", secondary: "#1e3a8a", glow: "#60a5fa", label: "Anubis" },
  pharaoh: { primary: "#f9a8d4", secondary: "#be185d", glow: "#f472b6", label: "Pharaoh" },
  wild: { primary: "#fde68a", secondary: "#b45309", glow: "#fbbf24", label: "WILD" },
  scatter: { primary: "#fef3c7", secondary: "#92400e", glow: "#f59e0b", label: "SCATTER" },
};

export function payForLength(sym: CellSym, length: number): number {
  if (length < 3 || length > 6) return 0;
  return sym.pay[length - 3] ?? 0;
}

/** Scatter cash when landing gates (tiers from config). */
export function scatterCashPay(count: number, bet: number): number {
  const tiers = [...getEnchantedGroveConfig().scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return +(bet * t.mult).toFixed(2);
  }
  return 0;
}

export function getBuyFeatureMult() {
  return getEnchantedGroveConfig().buyFeatureMult;
}

export function getFreeSpinsRetrigger() {
  return getEnchantedGroveConfig().freeSpinsRetrigger;
}

export function getFsMultStart() {
  return getEnchantedGroveConfig().fsMultStart;
}

export function getFsMultStep() {
  return getEnchantedGroveConfig().fsMultStep;
}

/** @deprecated use getters — kept for existing imports */
export const FREE_SPINS_AWARDS: Record<number, number> = {
  3: 10,
  4: 12,
  5: 15,
  6: 20,
};
export const FREE_SPINS_RETRIGGER = 5;
export const BUY_FEATURE_MULT = 80;
export const FS_MULT_START = 1;
export const FS_MULT_STEP = 1;

export const ASSET = {
  backdrop: "/images/symbols/enchanted-grove/backdrop.webp?v=3",
  mascot: "/images/symbols/enchanted-grove/mascot-cut.webp?v=4",
} as const;
