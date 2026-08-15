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
  cherry: "/images/symbols/neon-fruits/cherry.png",
  apple: "/images/symbols/neon-fruits/apple.png",
  banana: "/images/symbols/neon-fruits/banana.png",
  grape: "/images/symbols/neon-fruits/grape.png",
  pear: "/images/symbols/neon-fruits/pear.png",
  plum: "/images/symbols/neon-fruits/plum.png",
  watermelon: "/images/symbols/neon-fruits/watermelon.png",
  double_wild: "/images/symbols/neon-fruits/double_wild.png",
};

export const CARD_FRAME_SRC = "/images/symbols/neon-fruits/card-frame.png";

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
