/** Playback timing (ms). Turbo mode scales these in the slot UI. */
export const ANIM = {
  /** Base spin duration before first reel lands */
  reelSpin: 700,
  /** Extra delay per reel (L→R stop stagger) */
  reelStagger: 140,
  /** Brief settle after last reel drops */
  reelSettle: 280,
  lineHighlight: 700,
  /** Winning symbols fade / pop out */
  tumbleRemove: 420,
  /** New symbols drop in after gravity */
  tumbleDrop: 480,
  holdStep: 550,
  holdIntro: 900,
  holdOutro: 1200,
  freeSpinBanner: 1000,
} as const;
