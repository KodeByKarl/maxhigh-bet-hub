import type { FgSymKind } from "@/lib/fortune-gems-config";

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

export const SYM_LABEL: Record<FgSymKind, string> = {
  ruby: "RUBY",
  emerald: "EMRD",
  sapphire: "SAPH",
  amethyst: "AMTH",
  topaz: "TOPZ",
  temple: "TMPL",
  wild: "WILD",
};

export const SYM_COLOR: Record<FgSymKind, string> = {
  ruby: "from-rose-700 to-red-950",
  emerald: "from-emerald-600 to-green-950",
  sapphire: "from-sky-600 to-blue-950",
  amethyst: "from-violet-600 to-purple-950",
  topaz: "from-amber-500 to-yellow-900",
  temple: "from-orange-700 to-stone-900",
  wild: "from-yellow-400 to-amber-800",
};

/** Glyph fallback until art is supplied under /images/symbols/fortune-gems/. */
export const ICON_SRC: Record<FgSymKind, string> = {
  ruby: "/images/symbols/fortune-gems/ruby.webp",
  emerald: "/images/symbols/fortune-gems/emerald.webp",
  sapphire: "/images/symbols/fortune-gems/sapphire.webp",
  amethyst: "/images/symbols/fortune-gems/amethyst.webp",
  topaz: "/images/symbols/fortune-gems/topaz.webp",
  temple: "/images/symbols/fortune-gems/temple.webp",
  wild: "/images/symbols/fortune-gems/wild.webp",
};

export const CARD_FRAME_SRC = "/images/symbols/fortune-gems/card-frame.png";

export const BG_SRC = "/images/fortune-gems-bg.webp";
