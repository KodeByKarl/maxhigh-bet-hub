/** Tunable animation timings — eased column-domino drops (Zeus Strike). */
export const ANIM = {
  /** Delay before the next column starts falling (80–120ms cascade stop) */
  dropStaggerCol: 100,
  /** Small top→bottom stagger inside one column */
  dropStaggerRow: 28,
  /** How long one column takes to ease-out into stop (longer path from above the frame) */
  dropDuration: 520,
  /** Winning symbol scale-pulse + glow */
  glowDuration: 400,
  /** Fade + shrink out before cascade refill */
  popDuration: 200,
  popStagger: 20,
  /** Cascade refill land time (bounce-ease) */
  refillDuration: 380,
  betweenCascades: 120,
  bannerHold: 1800,
  /** Scatter gather → free-spin intro */
  scatterGather: 700,
  scatterFlash: 350,
  freespinIntroHold: 2200,
} as const;

/** Cubic-bezier easings (Framer Motion / CSS compatible). */
export const EASE = {
  /** Constant spin feel → soft stop: cubic-bezier(0.17, 0.67, 0.16, 0.99) */
  reelStop: [0.17, 0.67, 0.16, 0.99] as const,
  /** Bounce land for cascade drops: cubic-bezier(0.34, 1.56, 0.64, 1) */
  bounceLand: [0.34, 1.56, 0.64, 1] as const,
  /** Smooth fade / pop */
  softOut: [0.22, 1, 0.36, 1] as const,
  /** Glow pulse */
  glowPulse: "easeInOut" as const,
} as const;

/** Total time until the last column finishes landing (full speed; turbo applied by wait()). */
export function columnDominoMs(cols: number): number {
  const perCol = ANIM.dropStaggerCol;
  const land = ANIM.dropDuration;
  const rowTail = 4 * ANIM.dropStaggerRow;
  return Math.round(land + (cols - 1) * perCol + rowTail + 40);
}
