import type { GrSymKind } from "@/lib/arena-champ-config";

export const ANIM = {
  reelSpin: 720,
  reelStagger: 110,
  reelSettle: 380,
  /** Keep celebrate short so auto-chain feels responsive after wins */
  lineHighlight: 700,
  mixHighlight: 550,
  mixReveal: 800,
  jackpotCelebrate: 1800,
  winTally: 600,
  /** Soft fade after win ring / banner (not a hard cut) */
  winFade: 380,
};

export const BET_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];

export const SYM_LABEL: Record<GrSymKind, string> = {
  bar: "BAR",
  dice: "DICE",
  diamond: "◆",
  chip: "CHIP",
  lucky7: "7",
  wild: "WILD",
  scatter: "SCAT",
};

export const SYM_COLOR: Record<GrSymKind, string> = {
  bar: "from-slate-400 to-slate-700",
  dice: "from-emerald-400 to-emerald-800",
  diamond: "from-cyan-300 to-blue-700",
  chip: "from-rose-400 to-rose-800",
  lucky7: "from-amber-300 to-red-700",
  wild: "from-orange-400 to-red-600",
  scatter: "from-yellow-200 to-orange-600",
};

/** Real art path — renderer falls back to glyph if file missing. */
export const ICON_SRC: Record<GrSymKind, string> = {
  bar: "/images/symbols/arena-champ/bar.webp",
  dice: "/images/symbols/arena-champ/dice.webp",
  diamond: "/images/symbols/arena-champ/diamond.webp",
  chip: "/images/symbols/arena-champ/chip.webp",
  lucky7: "/images/symbols/arena-champ/lucky7.webp",
  wild: "/images/symbols/arena-champ/wild.webp",
  scatter: "/images/symbols/arena-champ/scatter.webp",
};

/** Ornate metal frame overlay (Frontier-style card border, fire palette). */
export const CARD_FRAME_SRC = "/images/symbols/arena-champ/card-frame.png";
