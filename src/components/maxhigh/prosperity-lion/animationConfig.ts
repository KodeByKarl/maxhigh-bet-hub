import type { FtSymKind } from "@/lib/prosperity-lion-config";

/** Timing constants (ms). Turbo clamps via playback planner. */
export const ANIM = {
  reelSpin: 900,
  reelStagger: 120,
  reelSettle: 280,
  multSpin: 700,
  lineHighlight: 900,
  multReveal: 700,
  winTally: 900,
  winFade: 280,
};

export const BET_STEPS = [
  0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100,
];

export const SYM_LABEL: Record<FtSymKind, string> = {
  ruby: "OX",
  emerald: "LANT",
  sapphire: "DRUM",
  amethyst: "ENV",
  topaz: "PEACH",
  temple: "SHRN",
  wild: "WILD",
};

export const SYM_COLOR: Record<FtSymKind, string> = {
  ruby: "from-rose-700 to-red-950",
  emerald: "from-emerald-600 to-green-950",
  sapphire: "from-sky-600 to-blue-950",
  amethyst: "from-violet-600 to-purple-950",
  topaz: "from-amber-500 to-yellow-900",
  temple: "from-orange-700 to-stone-900",
  wild: "from-yellow-400 to-amber-800",
};

/** Glyph fallback until art is supplied under /images/symbols/prosperity-lion/. */
export const ICON_SRC: Record<FtSymKind, string> = {
  ruby: "/images/symbols/prosperity-lion/ruby.webp",
  emerald: "/images/symbols/prosperity-lion/emerald.webp",
  sapphire: "/images/symbols/prosperity-lion/sapphire.webp",
  amethyst: "/images/symbols/prosperity-lion/amethyst.webp",
  topaz: "/images/symbols/prosperity-lion/topaz.webp",
  temple: "/images/symbols/prosperity-lion/temple.webp",
  wild: "/images/symbols/prosperity-lion/wild.webp",
};

export const CARD_FRAME_SRC = "/images/symbols/prosperity-lion/card-frame.png";

export const BG_SRC = "/images/prosperity-lion-bg.webp";
