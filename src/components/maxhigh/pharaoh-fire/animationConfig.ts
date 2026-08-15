/**
 * Tunable animation timings (ms) — game feel lives here.
 * Mirrors Candy Peak so Mahjong Ways shares the same polished spin cadence.
 */
export const ANIM = {
  dropStaggerCol: 55,
  dropStaggerRow: 38,
  dropDuration: 520,
  landSquash: 140,
  glowDuration: 720,
  popDuration: 380,
  popStagger: 32,
  fallDuration: 480,
  fallStaggerCol: 45,
  fallStaggerRow: 28,
  refillDuration: 560,
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
