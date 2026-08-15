/** Crazy Sevens UI labels / timing (non-authoritative). */

export const ANIM = {
  /** Total spin window before first reel may land */
  spinLeadMs: 420,
  /** Stagger between non-held reel stops */
  reelStaggerMs: 160,
  /** Soft settle bounce after a reel lands */
  landSettleMs: 220,
  /** Payline / win highlight hold */
  winHoldMs: 900,
  /** Crossfade between banners */
  bannerFadeMs: 180,
  /** Jackpot celebration */
  jackpotMs: 1400,
  /** Per bonus-line reveal */
  bonusLineMs: 720,
  /** Bonus overlay enter/exit */
  bonusOverlayMs: 320,
  /** Final tally beat before idle */
  outroMs: 480,
};

export const ICON_SRC: Record<string, string> = {
  cherry: "/images/symbols/lucky-bars/cherry.png",
  apple: "/images/symbols/lucky-bars/apple.png",
  banana: "/images/symbols/lucky-bars/banana.png",
  grape: "/images/symbols/lucky-bars/grape.png",
  pear: "/images/symbols/lucky-bars/pear.png",
  plum: "/images/symbols/lucky-bars/plum.png",
  watermelon: "/images/symbols/lucky-bars/watermelon.png",
  double_wild: "/images/symbols/lucky-bars/double_wild.png",
};

export const CARD_FRAME_SRC = "/images/symbols/lucky-bars/card-frame.png";

export const SYM_LABEL: Record<string, string> = {
  cherry: "🍒",
  apple: "🍎",
  banana: "🍌",
  grape: "🍇",
  pear: "🍐",
  plum: "🟣",
  watermelon: "🍉",
  double_wild: "⭐",
};

export const SYM_NAME: Record<string, string> = {
  cherry: "CHERRY",
  apple: "APPLE",
  banana: "BANANA",
  grape: "GRAPE",
  pear: "PEAR",
  plum: "PLUM",
  watermelon: "MELON",
  double_wild: "WILD×2",
};

export const BLUR_SYMBOLS = [
  "cherry",
  "apple",
  "banana",
  "grape",
  "pear",
  "plum",
  "watermelon",
  "double_wild",
] as const;
