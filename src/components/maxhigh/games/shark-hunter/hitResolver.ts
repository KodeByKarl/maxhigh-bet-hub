/**
 * Per-shot hit probability + cumulative damage resolution against seeded RNG.
 */
import {
  effectiveHitChance,
  getFishTier,
  getWeapon,
  isCrateDropId,
  type CrateDropId,
  type SharkHunterConfig,
  type FishTierId,
  type WeaponTierId,
} from "@/lib/shark-hunter-config";
import { createRng, type SharkHunterRng } from "./rng";
import { getSharkHunterConfig } from "./runtimeConfig";

export type ShotTargetSnapshot = {
  instanceId: string;
  tierId: FishTierId;
  hitsTaken: number;
  hitsRequired: number;
  payoutMult: number;
};

export type CrateDropResult = {
  id: CrateDropId;
  label: string;
  value: number;
  /** Immediate coin credit (betCost × value) when id === coin-burst. */
  coinCredit: number;
};

export type ShotResolveInput = {
  weaponId: WeaponTierId;
  target: ShotTargetSnapshot;
  /** Guaranteed kill multiplier from Golden Hook (consumed on kill). */
  goldenHookMult?: number;
  /** Force hit (e.g. Net Bomb secondary). */
  forceHit?: boolean;
  seed?: string;
  cfg?: SharkHunterConfig;
  rng?: SharkHunterRng;
};

export type ShotResolveResult = {
  seed: string;
  betCost: number;
  hit: boolean;
  hitChance: number;
  hitsTaken: number;
  hitsRequired: number;
  killed: boolean;
  /** Credit for this killer (0 if miss / not killed / boss deferred). */
  credit: number;
  payoutMult: number;
  appliedKillMult: number;
  crateDrop: CrateDropResult | null;
  /** True when kill is a boss — server should run shared pool settle. */
  isBossKill: boolean;
};

function rollCrateDrop(cfg: SharkHunterConfig, rng: SharkHunterRng, betCost: number): CrateDropResult {
  const drop = rng.pickWeighted(
    cfg.crateDrops.map((d) => ({ ...d, weight: d.weight })),
  );
  const coinCredit =
    drop.id === "coin-burst" ? +(betCost * drop.value).toFixed(2) : 0;
  return {
    id: drop.id,
    label: drop.label,
    value: drop.value,
    coinCredit,
  };
}

export function resolveShot(input: ShotResolveInput): ShotResolveResult {
  const cfg = input.cfg ?? getSharkHunterConfig();
  const seed = input.seed ?? `db-${Date.now()}`;
  const rng = input.rng ?? createRng(seed);
  const weapon = getWeapon(cfg, input.weaponId);
  const fish = getFishTier(cfg, input.target.tierId);
  const hitChance = effectiveHitChance(fish, weapon, cfg.maxHitChance);
  const hit = input.forceHit === true ? true : rng.chance(hitChance);

  let hitsTaken = input.target.hitsTaken;
  let killed = false;
  let credit = 0;
  let crateDrop: CrateDropResult | null = null;
  let appliedKillMult = 1;
  const payoutMult = input.target.payoutMult;
  const isBoss = input.target.tierId === "boss";

  if (hit) {
    hitsTaken += 1;
    killed = hitsTaken >= input.target.hitsRequired;
    if (killed) {
      if (input.target.tierId === "crate") {
        crateDrop = rollCrateDrop(cfg, rng, weapon.betCost);
        credit = crateDrop.coinCredit;
      } else if (!isBoss) {
        appliedKillMult =
          input.goldenHookMult && input.goldenHookMult > 1 ? input.goldenHookMult : 1;
        credit = +(weapon.betCost * payoutMult * appliedKillMult).toFixed(2);
      }
      // Boss kill credit deferred to bossEngine split on server.
    }
  }

  return {
    seed,
    betCost: weapon.betCost,
    hit,
    hitChance,
    hitsTaken,
    hitsRequired: input.target.hitsRequired,
    killed,
    credit,
    payoutMult,
    appliedKillMult,
    crateDrop,
    isBossKill: killed && isBoss,
  };
}

/** Net Bomb: try hit against each target with configured chance. */
export function resolveNetBomb(opts: {
  weaponId: WeaponTierId;
  targets: ShotTargetSnapshot[];
  goldenHookMult?: number;
  seed?: string;
  cfg?: SharkHunterConfig;
}): ShotResolveResult[] {
  const cfg = opts.cfg ?? getSharkHunterConfig();
  const seed = opts.seed ?? `nb-${Date.now()}`;
  const rng = createRng(seed);
  const power = cfg.powerUps.find((p) => p.id === "net-bomb");
  const chance = power?.netBombHitChance ?? 0.55;
  const results: ShotResolveResult[] = [];
  let hook = opts.goldenHookMult;
  for (const target of opts.targets) {
    const forceHit = rng.chance(chance);
    if (!forceHit) {
      results.push({
        seed,
        betCost: 0,
        hit: false,
        hitChance: chance,
        hitsTaken: target.hitsTaken,
        hitsRequired: target.hitsRequired,
        killed: false,
        credit: 0,
        payoutMult: target.payoutMult,
        appliedKillMult: 1,
        crateDrop: null,
        isBossKill: false,
      });
      continue;
    }
    const r = resolveShot({
      weaponId: opts.weaponId,
      target,
      goldenHookMult: hook,
      forceHit: true,
      seed: `${seed}-${target.instanceId}`,
      cfg,
      rng: createRng(`${seed}-${target.instanceId}`),
    });
    if (r.killed && hook && hook > 1 && target.tierId !== "crate") {
      hook = undefined;
    }
    results.push(r);
  }
  return results;
}

export function validateCrateDropId(id: unknown): CrateDropId | null {
  return isCrateDropId(id) ? id : null;
}
