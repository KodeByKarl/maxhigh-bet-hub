import type { McSymKind } from "@/lib/money-coming-config";

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

export const SYM_LABEL: Record<McSymKind, string> = {
  bar: "GOLD",
  dice: "DICE",
  diamond: "◆",
  chip: "CHIP",
  lucky7: "7",
  wild: "WILD",
  scatter: "$$$",
};

export const SYM_COLOR: Record<McSymKind, string> = {
  bar: "from-amber-300 to-yellow-800",
  dice: "from-emerald-400 to-emerald-800",
  diamond: "from-cyan-300 to-blue-700",
  chip: "from-rose-400 to-rose-800",
  lucky7: "from-amber-300 to-red-700",
  wild: "from-yellow-300 to-amber-700",
  scatter: "from-lime-200 to-emerald-700",
};

/** Real art path — renderer falls back to glyph if file missing. */
export const ICON_SRC: Record<McSymKind, string> = {
  bar: "/images/symbols/money-coming/bar.webp",
  dice: "/images/symbols/money-coming/dice.webp",
  diamond: "/images/symbols/money-coming/diamond.webp",
  chip: "/images/symbols/money-coming/chip.webp",
  lucky7: "/images/symbols/money-coming/lucky7.webp",
  wild: "/images/symbols/money-coming/wild.webp",
  scatter: "/images/symbols/money-coming/scatter.webp",
};

/** Ornate metal frame overlay (Frontier-style card border, fire palette). */
export const CARD_FRAME_SRC = "/images/symbols/money-coming/card-frame.png";
