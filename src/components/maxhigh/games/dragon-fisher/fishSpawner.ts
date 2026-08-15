/**
 * Fish spawn timing, pathing, and tier weighting.
 */
import type { DragonFisherConfig, FishTierId } from "@/lib/dragon-fisher-config";
import { getFishTier } from "@/lib/dragon-fisher-config";
import { PATH_KINDS, SWIM, type SwimPathKind } from "./animationConfig";
import type { DragonFisherRng } from "./rng";

export type SpawnedFish = {
  instanceId: string;
  tierId: FishTierId;
  hitsRequired: number;
  hitsTaken: number;
  payoutMult: number;
  /** 0–100 normalized arena coords (spawn side). */
  y: number;
  /** true = swimming left→right */
  fromLeft: boolean;
  path: SwimPathKind;
  speedMs: number;
  size: number;
  frozenUntil: number;
  createdAt: number;
};

export function rollHitsRequired(
  tierId: FishTierId,
  cfg: DragonFisherConfig,
  rng: DragonFisherRng,
): number {
  const tier = getFishTier(cfg, tierId);
  if (tier.hitsMax <= tier.hitsMin) return tier.hitsMin;
  return tier.hitsMin + rng.nextInt(tier.hitsMax - tier.hitsMin + 1);
}

export function rollPayoutMult(
  tierId: FishTierId,
  cfg: DragonFisherConfig,
  rng: DragonFisherRng,
): number {
  const tier = getFishTier(cfg, tierId);
  if (tier.id === "crate") return 0;
  const raw = rng.range(tier.payoutMin, tier.payoutMax);
  return Math.round(raw * 100) / 100;
}

/** Weighted pick among non-boss, positive-weight tiers. */
export function pickSpawnTier(cfg: DragonFisherConfig, rng: DragonFisherRng): FishTierId {
  const pool = cfg.fishTiers
    .filter((f) => f.id !== "boss" && f.spawnWeight > 0)
    .map((f) => ({ id: f.id, weight: f.spawnWeight }));
  if (pool.length === 0) return "common";
  return rng.pickWeighted(pool).id;
}

export function createSpawnedFish(opts: {
  cfg: DragonFisherConfig;
  rng: DragonFisherRng;
  tierId?: FishTierId;
  now?: number;
}): SpawnedFish {
  const { cfg, rng } = opts;
  const now = opts.now ?? Date.now();
  const tierId = opts.tierId ?? pickSpawnTier(cfg, rng);
  const tier = getFishTier(cfg, tierId);
  const path = PATH_KINDS[rng.nextInt(PATH_KINDS.length)]!;
  const baseMs = SWIM.durationMs[tierId] ?? 10000;
  const speedMs = Math.round(baseMs * (0.85 + rng.next() * 0.25));
  return {
    instanceId: `fish-${rng.seed.slice(0, 8)}-${rng.nextInt(1e9)}`,
    tierId,
    hitsRequired: rollHitsRequired(tierId, cfg, rng),
    hitsTaken: 0,
    payoutMult: rollPayoutMult(tierId, cfg, rng),
    y: 10 + rng.next() * 78,
    fromLeft: rng.chance(0.5),
    path,
    speedMs,
    size: tier.size,
    frozenUntil: 0,
    createdAt: now,
  };
}

export function createBossFish(opts: {
  cfg: DragonFisherConfig;
  rng: DragonFisherRng;
  now?: number;
}): SpawnedFish {
  return createSpawnedFish({
    ...opts,
    tierId: "boss",
  });
}

/** Should a boss attempt fire this tick? */
export function shouldAttemptBossSpawn(opts: {
  cfg: DragonFisherConfig;
  rng: DragonFisherRng;
  lastBossAt: number;
  now: number;
  bossAlive: boolean;
}): boolean {
  if (opts.bossAlive) return false;
  const { boss } = opts.cfg;
  if (opts.now - opts.lastBossAt < boss.cooldownSec * 1000) return false;
  return opts.rng.chance(boss.spawnChance);
}
