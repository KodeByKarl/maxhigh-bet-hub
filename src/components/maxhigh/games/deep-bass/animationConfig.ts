/**
 * Animation / asset path constants for Deep Bass arena.
 */

export const DEEP_BASS_ASSET = {
  symbolDir: "/images/symbols/deep-bass",
  soundDir: "/sounds/deep-bass",
  thumb: "/games/deep-bass.webp",
  /** Top-down seabed plate (boat / fish-table camera). */
  seabed: "/images/symbols/deep-bass/seabed.webp",
  cannon: "/images/symbols/deep-bass/cannon.png",
  bullet: "/images/symbols/deep-bass/bullet.png",
  muzzle: "/images/symbols/deep-bass/muzzle.png",
} as const;

/** Shared combat / FX timings (ms). Keep BoatCannon bullet duration in sync. */
export const TIMING = {
  /** Bullet flight + aim lead */
  shotTravelMs: 180,
  /** Minimum gap between shots (auto / tap) */
  fireGapMs: 130,
  /** Max overlapping server shot requests */
  maxInflightShots: 2,
  /** Muzzle / recoil visual */
  muzzleMs: 90,
  /** Kill / crate banner on screen */
  bannerMs: 900,
  /** Auto-aim visual refresh */
  autoAimMs: 80,
  /** Auto-fire tick */
  autoFireMs: 130,
  /** Boss status poll */
  bossPollMs: 6000,
  /** Fish leave grace after swim ends */
  despawnGraceMs: 250,
} as const;

export const SWIM = {
  /** Base swim duration across screen (ms) by tier — snappier arcade pace. */
  durationMs: {
    common: 5200,
    uncommon: 6000,
    rare: 7200,
    elite: 8500,
    super: 9800,
    boss: 16000,
    crate: 6500,
  } as Record<string, number>,
  deathMs: 320,
  bossEntranceMs: 600,
  bossExitMs: 450,
  splashMs: TIMING.shotTravelMs,
  hitFlashMs: 120,
} as const;

export type SwimPathKind = "wave" | "dive" | "arc" | "zigzag";

export const PATH_KINDS: SwimPathKind[] = ["wave", "dive", "arc", "zigzag"];

export function pathAmpFor(path: SwimPathKind): number {
  if (path === "dive") return 5;
  if (path === "arc") return -4;
  if (path === "zigzag") return 3.5;
  return 2.5;
}
