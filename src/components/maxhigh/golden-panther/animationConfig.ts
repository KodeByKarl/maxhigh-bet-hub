/**
 * Tunable animation timings (ms) — game feel lives here.
 *
 * Playback waits use these durations as an upper bound. Drop/fall visuals use
 * Framer Motion springs (not fixed tweens), so waits intentionally include
 * stagger headroom rather than matching spring settle exactly — converting to
 * rAF-driven springs would change feel without a clear FPS win on a 6×5 grid.
 */
export const ANIM = {
  /** Per-column stagger on the initial cascade */
  dropStaggerCol: 55,
  /** Extra delay down each column (top → bottom) */
  dropStaggerRow: 38,
  /** How long a symbol takes to land on first drop */
  dropDuration: 520,
  landSquash: 140,
  /** Winning symbols pulse / highlight — min 10s before payout counts up */
  glowDuration: 10_000,
  /** Match pop / shatter */
  popDuration: 380,
  popStagger: 32,
  /** Gravity settle after a tumble */
  fallDuration: 480,
  fallStaggerCol: 45,
  fallStaggerRow: 28,
  refillDuration: 560,
  /** Brief hole hold between pop and refill */
  holeHold: 140,
  betweenTumbles: 160,
  bannerHold: 1800,
} as const;

export type PlaybackPhase =
  | "idle"
  | "dropping"
  | "glow"
  | "popping"
  | "falling"
  | "settled";
