/**
 * Lightweight Sweet Rush timings — tween drops (no per-cell springs).
 * Aligned with Godly Gates column-domino feel for a 7×7 grid.
 */
export const ANIM = {
  /** Delay before the next column starts falling */
  dropStaggerCol: 72,
  /** Small top→bottom stagger inside one column */
  dropStaggerRow: 22,
  /** How long one column takes to ease into stop (path from above the frame) */
  dropDuration: 480,
  /** Winning symbol single pulse */
  glowDuration: 320,
  /** Fade + shrink out before cascade refill */
  popDuration: 160,
  popStagger: 14,
  /** Cascade refill land time */
  refillDuration: 340,
  fallStaggerCol: 55,
  fallStaggerRow: 18,
  /** Brief hole hold between pop and refill */
  holeHold: 80,
  betweenTumbles: 90,
  bannerHold: 1400,
} as const;

export const EASE = {
  /** Soft reel stop */
  reelStop: [0.17, 0.67, 0.16, 0.99] as const,
  /** Bounce land for cascade drops */
  bounceLand: [0.34, 1.45, 0.64, 1] as const,
  softOut: [0.22, 1, 0.36, 1] as const,
} as const;

/** Time until the last column finishes landing (full speed; turbo applied by wait()). */
export function columnDominoMs(cols: number, rows: number): number {
  return Math.round(
    ANIM.dropDuration + (cols - 1) * ANIM.dropStaggerCol + rows * ANIM.dropStaggerRow + 40,
  );
}

export function cascadeFallMs(cols: number): number {
  return Math.round(
    ANIM.refillDuration + (cols - 1) * ANIM.fallStaggerCol + ANIM.fallStaggerRow * 2 + 30,
  );
}

export type PlaybackPhase =
  | "idle"
  | "dropping"
  | "glow"
  | "popping"
  | "falling"
  | "settled";
