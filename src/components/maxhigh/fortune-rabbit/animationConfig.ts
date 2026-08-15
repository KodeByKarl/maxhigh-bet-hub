import type { FrSymKind } from "@/lib/fortune-rabbit-config";

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

export const SYM_LABEL: Record<FrSymKind, string> = {
  ruby: "OX",
  emerald: "LANT",
  sapphire: "DRUM",
  amethyst: "ENV",
  topaz: "PEACH",
  temple: "SHRN",
  wild: "WILD",
};

export const SYM_COLOR: Record<FrSymKind, string> = {
  ruby: "from-rose-700 to-red-950",
  emerald: "from-emerald-600 to-green-950",
  sapphire: "from-sky-600 to-blue-950",
  amethyst: "from-violet-600 to-purple-950",
  topaz: "from-amber-500 to-yellow-900",
  temple: "from-orange-700 to-stone-900",
  wild: "from-yellow-400 to-amber-800",
};

/** Glyph fallback until art is supplied under /images/symbols/fortune-rabbit/. */
export const ICON_SRC: Record<FrSymKind, string> = {
  ruby: "/images/symbols/fortune-rabbit/ruby.webp",
  emerald: "/images/symbols/fortune-rabbit/emerald.webp",
  sapphire: "/images/symbols/fortune-rabbit/sapphire.webp",
  amethyst: "/images/symbols/fortune-rabbit/amethyst.webp",
  topaz: "/images/symbols/fortune-rabbit/topaz.webp",
  temple: "/images/symbols/fortune-rabbit/temple.webp",
  wild: "/images/symbols/fortune-rabbit/wild.webp",
};

export const CARD_FRAME_SRC = "/images/symbols/fortune-rabbit/card-frame.png";

export const BG_SRC = "/images/fortune-rabbit-bg.webp";
