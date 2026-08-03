import type { PwSymKind } from "@/lib/pinata-wins-config";

export const ANIM = {
  /** Initial reel blur-scroll before first land */
  reelSpin: 900,
  reelStagger: 100,
  /** Staggered spring land after spin */
  reelSettle: 720,
  lineHighlight: 750,
  goldCollect: 750,
  goldTransform: 550,
  /** Cascade refill drop-in */
  cascadeDrop: 620,
  winTally: 950,
  winFade: 320,
};

export const BET_STEPS = [0.2, 0.4, 0.6, 1, 2, 5, 10, 20, 50, 100];

export const SYM_LABEL: Record<PwSymKind, string> = {
  chili: "🌶️",
  taco: "🌮",
  maracas: "🪇",
  sombrero: "🎩",
  cactus: "🌵",
  guitar: "🎸",
  golden_skull: "💀",
  wild: "💃",
  scatter: "⭐",
};

export const SYM_COLOR: Record<PwSymKind, string> = {
  chili: "from-red-500 to-orange-700",
  taco: "from-amber-400 to-yellow-700",
  maracas: "from-fuchsia-400 to-purple-700",
  sombrero: "from-yellow-300 to-amber-700",
  cactus: "from-lime-400 to-green-800",
  guitar: "from-orange-300 to-rose-700",
  golden_skull: "from-yellow-200 to-amber-600",
  wild: "from-pink-400 to-rose-700",
  scatter: "from-cyan-300 to-blue-600",
};

/** 3D symbol art — falls back to emoji glyph if file missing. */
export const ICON_SRC: Record<PwSymKind, string> = {
  chili: "/images/symbols/pinata-wins/chili.png",
  taco: "/images/symbols/pinata-wins/taco.png",
  maracas: "/images/symbols/pinata-wins/maracas.png",
  sombrero: "/images/symbols/pinata-wins/sombrero.png",
  cactus: "/images/symbols/pinata-wins/cactus.png",
  guitar: "/images/symbols/pinata-wins/guitar.png",
  golden_skull: "/images/symbols/pinata-wins/golden_skull.png",
  wild: "/images/symbols/pinata-wins/wild.png",
  scatter: "/images/symbols/pinata-wins/scatter.png",
};

export const CARD_FRAME_SRC = "/images/symbols/pinata-wins/card-frame.png";
