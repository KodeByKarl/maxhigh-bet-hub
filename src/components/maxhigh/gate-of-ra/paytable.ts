import type { CellSym, SymKind } from "./types";
import { getGateOfRaConfig, getRuntimeSymbols } from "./runtimeConfig";

/** Default symbol table snapshot. Prefer getRuntimeSymbols() in the engine. */
export const SYMBOLS: CellSym[] = getRuntimeSymbols().map((s) => ({
  ...s,
  pay: [...s.pay] as [number, number, number, number],
}));

export const ICON_SRC: Record<SymKind, string> = {
  ten: "/images/symbols/gate-of-ra/ten.png",
  jack: "/images/symbols/gate-of-ra/jack.png",
  queen: "/images/symbols/gate-of-ra/queen.png",
  king: "/images/symbols/gate-of-ra/king.png",
  ace: "/images/symbols/gate-of-ra/ace.png",
  scarab: "/images/symbols/gate-of-ra/scarab.png",
  ankh: "/images/symbols/gate-of-ra/ankh.png",
  horus: "/images/symbols/gate-of-ra/horus.png",
  anubis: "/images/symbols/gate-of-ra/anubis.png",
  pharaoh: "/images/symbols/gate-of-ra/pharaoh.png",
  wild: "/images/symbols/gate-of-ra/wild.png",
  scatter: "/images/symbols/gate-of-ra/scatter.png",
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
  const tiers = [...getGateOfRaConfig().scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return +(bet * t.mult).toFixed(2);
  }
  return 0;
}

export function getBuyFeatureMult() {
  return getGateOfRaConfig().buyFeatureMult;
}

export function getFreeSpinsRetrigger() {
  return getGateOfRaConfig().freeSpinsRetrigger;
}

export function getFsMultStart() {
  return getGateOfRaConfig().fsMultStart;
}

export function getFsMultStep() {
  return getGateOfRaConfig().fsMultStep;
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
  backdrop: "/images/symbols/gate-of-ra/backdrop.webp?v=3",
  mascot: "/images/symbols/gate-of-ra/mascot-cut.webp?v=4",
} as const;
