/**
 * Tunable animation timings (ms) — game feel lives here.
 *
 * Playback waits use these durations as an upper bound. Drop/fall visuals use
 * Framer Motion springs (not fixed tweens), so waits intentionally include
 * stagger headroom rather than matching spring settle exactly.
 */
export const ANIM = {
  /** Per-column stagger on the initial cascade */
  dropStaggerCol: 55,
  /** Extra delay down each column (top → bottom) */
  dropStaggerRow: 38,
  /** How long a symbol takes to land on first drop */
  dropDuration: 520,
  /** Winning symbols pulse / highlight before pop */
  glowDuration: 720,
  /** Match pop / shatter */
  popDuration: 380,
  popStagger: 32,
  fallStaggerCol: 45,
  fallStaggerRow: 28,
  refillDuration: 560,
  /** Brief hole hold between pop and refill */
  holeHold: 80,
  betweenTumbles: 100,
  bannerHold: 1400,
  /** Auto-dismiss full-screen win celebration */
  winPopupHold: 2_000,
  /** Buy feature: highlight scatters after they land */
  buyScatterGlow: 1_200,
  /** Gap between auto / free spins when idle */
  autoSpinGapNormal: 450,
  autoSpinGapTurbo: 220,
  autoSpinGapFast: 100,
} as const;

export type PlaybackPhase =
  | "idle"
  | "dropping"
  | "glow"
  | "popping"
  | "falling"
  | "settled";
