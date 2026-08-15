/** Playback timing (ms). Turbo mode scales these in the slot UI. */
export const ANIM = {
  /** Base spin duration before first reel lands */
  reelSpin: 700,
  /** Extra delay per reel (L→R stop stagger) */
  reelStagger: 140,
  /** Brief settle after last reel drops */
  reelSettle: 280,
  lineHighlight: 700,
  winTally: 600,
  dragonLaunch: 550,
  dragonBust: 800,
  monkeyIntro: 1200,
  wheelSpin: 1600,
  freeSpinGap: 400,
  gambleReveal: 700,
} as const;
