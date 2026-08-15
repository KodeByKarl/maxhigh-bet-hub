/**
 * Boss spawn + shared damage pool + finisher / contributor payout split.
 */
import type { BossConfig, OctopusArmadaConfig } from "@/lib/octopus-armada-config";
import { getFishTier } from "@/lib/octopus-armada-config";
import type { OctopusArmadaRng } from "./rng";
import { createBossFish, type SpawnedFish } from "./fishSpawner";

export type BossContributor = {
  userId: string;
  username: string;
  damage: number;
};

export type BossPoolState = {
  instanceId: string;
  fish: SpawnedFish;
  contributors: Map<string, BossContributor>;
  startedAt: number;
  expiresAt: number;
  killed: boolean;
};

export type BossPayoutShare = {
  userId: string;
  username: string;
  damage: number;
  isFinisher: boolean;
  shareFraction: number;
  credit: number;
};

export function createBossPool(opts: {
  cfg: OctopusArmadaConfig;
  rng: OctopusArmadaRng;
  now?: number;
}): BossPoolState {
  const now = opts.now ?? Date.now();
  const fish = createBossFish({ cfg: opts.cfg, rng: opts.rng, now });
  return {
    instanceId: fish.instanceId,
    fish,
    contributors: new Map(),
    startedAt: now,
    expiresAt: now + opts.cfg.boss.durationSec * 1000,
    killed: false,
  };
}

export function applyBossHit(opts: {
  pool: BossPoolState;
  userId: string;
  username: string;
  now?: number;
}): { killed: boolean; hitsTaken: number; hitsRequired: number } {
  const { pool } = opts;
  const now = opts.now ?? Date.now();
  if (pool.killed || now > pool.expiresAt) {
    return {
      killed: false,
      hitsTaken: pool.fish.hitsTaken,
      hitsRequired: pool.fish.hitsRequired,
    };
  }
  pool.fish.hitsTaken += 1;
  const prev = pool.contributors.get(opts.userId);
  if (prev) {
    prev.damage += 1;
  } else {
    pool.contributors.set(opts.userId, {
      userId: opts.userId,
      username: opts.username,
      damage: 1,
    });
  }
  const killed = pool.fish.hitsTaken >= pool.fish.hitsRequired;
  if (killed) pool.killed = true;
  return {
    killed,
    hitsTaken: pool.fish.hitsTaken,
    hitsRequired: pool.fish.hitsRequired,
  };
}

/**
 * Split boss pot: finisher gets finisherShare of total pot;
 * remaining contributorShare is pro-rated by damage among non-finishers.
 * Solo player always receives 100% of the pot.
 */
export function splitBossPayout(opts: {
  boss: BossConfig;
  pool: BossPoolState;
  finisherUserId: string;
  /** Total credit = betCost * payoutMult (of the finisher's weapon / rolled mult). */
  totalPot: number;
}): BossPayoutShare[] {
  const { boss, pool, finisherUserId } = opts;
  const totalPot = Math.max(0, +opts.totalPot.toFixed(2));
  const contributors = [...pool.contributors.values()];
  if (contributors.length === 0) return [];

  if (contributors.length === 1) {
    const only = contributors[0]!;
    return [
      {
        userId: only.userId,
        username: only.username,
        damage: only.damage,
        isFinisher: true,
        shareFraction: 1,
        credit: totalPot,
      },
    ];
  }

  const finisher = contributors.find((c) => c.userId === finisherUserId);
  const others = contributors.filter((c) => c.userId !== finisherUserId);
  const finisherCredit = +(totalPot * boss.finisherShare).toFixed(2);
  const contribPot = +(totalPot * boss.contributorShare).toFixed(2);
  const otherDamage = others.reduce((s, c) => s + c.damage, 0);

  const shares: BossPayoutShare[] = [];
  if (finisher) {
    shares.push({
      userId: finisher.userId,
      username: finisher.username,
      damage: finisher.damage,
      isFinisher: true,
      shareFraction: boss.finisherShare,
      credit: finisherCredit,
    });
  }

  let allocated = 0;
  others.forEach((c, i) => {
    const isLast = i === others.length - 1;
    let credit = 0;
    if (otherDamage > 0) {
      credit = isLast
        ? +(contribPot - allocated).toFixed(2)
        : +((contribPot * c.damage) / otherDamage).toFixed(2);
    }
    allocated += credit;
    shares.push({
      userId: c.userId,
      username: c.username,
      damage: c.damage,
      isFinisher: false,
      shareFraction: otherDamage > 0 ? (c.damage / otherDamage) * boss.contributorShare : 0,
      credit,
    });
  });

  return shares;
}

export function bossPotFromKill(opts: {
  cfg: OctopusArmadaConfig;
  betCost: number;
  payoutMult: number;
  goldenHookMult?: number;
}): number {
  const mult = opts.payoutMult * (opts.goldenHookMult && opts.goldenHookMult > 1 ? opts.goldenHookMult : 1);
  return +(opts.betCost * mult).toFixed(2);
}

export function getBossTier(cfg: OctopusArmadaConfig) {
  return getFishTier(cfg, "boss");
}
