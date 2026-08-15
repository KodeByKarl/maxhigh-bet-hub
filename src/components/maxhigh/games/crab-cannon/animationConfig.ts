/**
 * Animation / asset path constants for Crab Cannon arena.
 */

export const CRAB_CANNON_ASSET = {
  symbolDir: "/images/symbols/crab-cannon",
  soundDir: "/sounds/crab-cannon",
  thumb: "/games/crab-cannon.webp",
  seabed: "/images/symbols/crab-cannon/seabed.webp",
} as const;

export const SWIM = {
  /** Base swim duration across screen (ms) by tier. */
  durationMs: {
    common: 7000,
    uncommon: 8500,
    rare: 10000,
    elite: 12000,
    boss: 22000,
    crate: 9000,
  } as Record<string, number>,
  deathMs: 520,
  bossEntranceMs: 900,
  bossExitMs: 700,
  splashMs: 280,
  hitFlashMs: 160,
} as const;

export type SwimPathKind = "wave" | "dive" | "arc" | "zigzag";

export const PATH_KINDS: SwimPathKind[] = ["wave", "dive", "arc", "zigzag"];
