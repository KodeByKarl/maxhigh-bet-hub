/**
 * MaxHigh Crab Cannon — shared fish-hunter math + superadmin-editable tables.
 * Pure functions only: no React, no I/O.
 *
 * Model: each shot costs weapon.betCost. Hit chance is fish.baseHitChance × weapon.hitMod
 * (capped). After hitsRequired landings, fish dies and pays betCost × payoutMult.
 * Boss uses a shared damage pool; finisher vs contributors split via bossSplit.
 */

export const CRAB_CANNON_GAME_ID = "crab-cannon";
/** Alias for resolvers that import `GAME_ID`. */
export const GAME_ID = CRAB_CANNON_GAME_ID;
export const CRAB_CANNON_TITLE = "Crab Cannon";

/** Lobby / sim reference — not enforced live. */
export const RTP_REFERENCE = {
  target: 96.0,
  min: 95.5,
  max: 96.5,
} as const;

export type FishTierId =
  | "common"
  | "uncommon"
  | "rare"
  | "elite"
  | "boss"
  | "crate";

export type WeaponTierId =
  | "bamboo"
  | "spinning"
  | "trolling"
  | "harpoon"
  | "master";

export type PowerUpId = "net-bomb" | "freeze-lure" | "golden-hook";

export type CrateDropId =
  | "coin-burst"
  | "mult-2x"
  | "mult-3x"
  | "net-bomb"
  | "freeze-lure"
  | "golden-hook";

export type FishTierConfig = {
  id: FishTierId;
  label: string;
  /** Sprite / asset key under public/images/symbols/crab-cannon/ */
  sprite: string;
  payoutMin: number;
  payoutMax: number;
  hitsMin: number;
  hitsMax: number;
  /** Base probability a single shot lands a hit (before weapon mod). */
  baseHitChance: number;
  spawnWeight: number;
  /** Optional size hint for UI (px). */
  size: number;
};

export type WeaponTierConfig = {
  id: WeaponTierId;
  label: string;
  /** Cost per shot in ₱. */
  betCost: number;
  /** Multiplier on fish baseHitChance (clamped later). */
  hitMod: number;
};

export type BossConfig = {
  /** Chance each spawn tick tries to summon the boss (0–1). */
  spawnChance: number;
  /** Minimum seconds between boss appearances. */
  cooldownSec: number;
  /** Boss lifetime on screen (seconds) before it escapes. */
  durationSec: number;
  /** Fraction of kill credit to the player landing the finishing shot. */
  finisherShare: number;
  /** Remaining share split among non-finisher contributors by damage. */
  contributorShare: number;
};

export type CrateDropConfig = {
  id: CrateDropId;
  label: string;
  weight: number;
  /** For coin-burst: multiplier on betCost. For mult_*: applied to next kill. */
  value: number;
};

export type PowerUpConfig = {
  id: PowerUpId;
  label: string;
  /** Cost in ₱ to buy from dock (0 = drop-only). */
  cost: number;
  /** Net Bomb: radius damage chance per fish in blast. */
  netBombHitChance: number;
  /** Freeze Lure: stun duration seconds. */
  freezeDurationSec: number;
};

export type CrabCannonConfig = {
  schemaVersion: 1;
  fishTiers: FishTierConfig[];
  weapons: WeaponTierConfig[];
  boss: BossConfig;
  crateDrops: CrateDropConfig[];
  powerUps: PowerUpConfig[];
  /** Max concurrent fish on screen (excludes boss). */
  maxFishOnScreen: number;
  /** Average seconds between spawn attempts. */
  spawnIntervalSec: number;
  /** Cap on effective hit chance after weapon mod. */
  maxHitChance: number;
  /** Display / lobby target RTP %. */
  rtpTarget: number;
  minBet: number;
  maxBet: number;
};

export const DEFAULT_FISH_TIERS: FishTierConfig[] = [
  {
    id: "common",
    label: "Silver Shiner",
    sprite: "shiner",
    payoutMin: 1,
    payoutMax: 3,
    hitsMin: 1,
    hitsMax: 1,
    // E[mult]≈2 → 2 * 0.482 = 0.964
    baseHitChance: 0.482,
    spawnWeight: 42,
    size: 92,
  },
  {
    id: "uncommon",
    label: "Smallmouth Bass",
    sprite: "smallmouth",
    payoutMin: 3,
    payoutMax: 8,
    hitsMin: 2,
    hitsMax: 3,
    // E[mult]≈5.5, E[hits]≈2.5 → p ≈ 0.438
    baseHitChance: 0.438,
    spawnWeight: 26,
    size: 118,
  },
  {
    id: "rare",
    label: "Largemouth Bass",
    sprite: "largemouth",
    payoutMin: 8,
    payoutMax: 20,
    hitsMin: 4,
    hitsMax: 6,
    // E[mult]≈14, E[hits]≈5 → p ≈ 0.346
    baseHitChance: 0.346,
    spawnWeight: 16,
    size: 148,
  },
  {
    id: "elite",
    label: "Striped Trophy Bass",
    sprite: "striped-trophy",
    payoutMin: 20,
    payoutMax: 60,
    hitsMin: 8,
    hitsMax: 12,
    // E[mult]≈40, E[hits]≈10 → p = 0.242
    baseHitChance: 0.242,
    spawnWeight: 9,
    size: 186,
  },
  {
    id: "boss",
    label: "The Crab Cannon",
    sprite: "crab-cannon-boss",
    payoutMin: 100,
    payoutMax: 500,
    hitsMin: 40,
    hitsMax: 60,
    // Tuned for ~96% when solo (E[mult]≈300, E[hits]≈50 → p ≈ 0.16)
    baseHitChance: 0.16,
    spawnWeight: 0,
    size: 260,
  },
  {
    id: "crate",
    label: "Golden Lure Crate",
    sprite: "golden-lure-crate",
    payoutMin: 0,
    payoutMax: 0,
    hitsMin: 1,
    hitsMax: 1,
    baseHitChance: 0.55,
    spawnWeight: 4,
    size: 100,
  },
];

export const DEFAULT_WEAPONS: WeaponTierConfig[] = [
  { id: "bamboo", label: "Bamboo Rod", betCost: 1, hitMod: 0.9 },
  { id: "spinning", label: "Spinning Reel", betCost: 2, hitMod: 0.95 },
  { id: "trolling", label: "Trolling Rig", betCost: 5, hitMod: 1.0 },
  { id: "harpoon", label: "Harpoon Cannon", betCost: 10, hitMod: 1.05 },
  { id: "master", label: "Crab Cannon Master Rig", betCost: 25, hitMod: 1.1 },
];

export const DEFAULT_BOSS: BossConfig = {
  spawnChance: 0.012,
  cooldownSec: 90,
  durationSec: 45,
  finisherShare: 0.55,
  contributorShare: 0.45,
};

export const DEFAULT_CRATE_DROPS: CrateDropConfig[] = [
  { id: "coin-burst", label: "Coin Burst", weight: 48, value: 5 },
  { id: "mult-2x", label: "2× Next Kill", weight: 20, value: 2 },
  { id: "mult-3x", label: "3× Next Kill", weight: 10, value: 3 },
  { id: "net-bomb", label: "Net Bomb", weight: 10, value: 1 },
  { id: "freeze-lure", label: "Freeze Lure", weight: 8, value: 1 },
  { id: "golden-hook", label: "Golden Hook", weight: 4, value: 1 },
];

export const DEFAULT_POWER_UPS: PowerUpConfig[] = [
  {
    id: "net-bomb",
    label: "Net Bomb",
    cost: 15,
    netBombHitChance: 0.55,
    freezeDurationSec: 0,
  },
  {
    id: "freeze-lure",
    label: "Freeze Lure",
    cost: 10,
    netBombHitChance: 0,
    freezeDurationSec: 4,
  },
  {
    id: "golden-hook",
    label: "Golden Hook",
    cost: 20,
    netBombHitChance: 0,
    freezeDurationSec: 0,
  },
];

export const DEFAULT_CRAB_CANNON_CONFIG: CrabCannonConfig = {
  schemaVersion: 1,
  fishTiers: structuredClone(DEFAULT_FISH_TIERS),
  weapons: structuredClone(DEFAULT_WEAPONS),
  boss: { ...DEFAULT_BOSS },
  crateDrops: structuredClone(DEFAULT_CRATE_DROPS),
  powerUps: structuredClone(DEFAULT_POWER_UPS),
  maxFishOnScreen: 7,
  spawnIntervalSec: 1.4,
  maxHitChance: 0.92,
  rtpTarget: RTP_REFERENCE.target,
  minBet: 1,
  maxBet: 25,
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const FISH_IDS: FishTierId[] = [
  "common",
  "uncommon",
  "rare",
  "elite",
  "boss",
  "crate",
];
const WEAPON_IDS: WeaponTierId[] = [
  "bamboo",
  "spinning",
  "trolling",
  "harpoon",
  "master",
];
const CRATE_IDS: CrateDropId[] = [
  "coin-burst",
  "mult-2x",
  "mult-3x",
  "net-bomb",
  "freeze-lure",
  "golden-hook",
];
const POWER_IDS: PowerUpId[] = ["net-bomb", "freeze-lure", "golden-hook"];

function normalizeFishTier(raw: unknown): FishTierConfig[] {
  const defaults = DEFAULT_FISH_TIERS;
  const arr = Array.isArray(raw) ? raw : defaults;
  const byId = new Map<string, Record<string, unknown>>();
  for (const item of arr) {
    if (item && typeof item === "object" && "id" in item) {
      byId.set(String((item as { id: unknown }).id), item as Record<string, unknown>);
    }
  }
  return defaults.map((d) => {
    const o = byId.get(d.id) ?? {};
    const payoutMin = clamp(num(o.payoutMin, d.payoutMin), 0, 10_000);
    const payoutMax = clamp(num(o.payoutMax, d.payoutMax), payoutMin, 50_000);
    const hitsMin = clamp(Math.round(num(o.hitsMin, d.hitsMin)), 1, 200);
    const hitsMax = clamp(Math.round(num(o.hitsMax, d.hitsMax)), hitsMin, 500);
    return {
      id: d.id,
      label: typeof o.label === "string" && o.label.trim() ? o.label.trim() : d.label,
      sprite: typeof o.sprite === "string" && o.sprite.trim() ? o.sprite.trim() : d.sprite,
      payoutMin,
      payoutMax,
      hitsMin,
      hitsMax,
      baseHitChance: clamp(num(o.baseHitChance, d.baseHitChance), 0.01, 1),
      spawnWeight: clamp(num(o.spawnWeight, d.spawnWeight), 0, 10_000),
      size: clamp(Math.round(num(o.size, d.size)), 24, 240),
    };
  });
}

function normalizeWeapons(raw: unknown): WeaponTierConfig[] {
  const defaults = DEFAULT_WEAPONS;
  const arr = Array.isArray(raw) ? raw : defaults;
  const byId = new Map<string, Record<string, unknown>>();
  for (const item of arr) {
    if (item && typeof item === "object" && "id" in item) {
      byId.set(String((item as { id: unknown }).id), item as Record<string, unknown>);
    }
  }
  return defaults.map((d) => {
    const o = byId.get(d.id) ?? {};
    return {
      id: d.id,
      label: typeof o.label === "string" && o.label.trim() ? o.label.trim() : d.label,
      betCost: clamp(num(o.betCost, d.betCost), 0.01, 10_000),
      hitMod: clamp(num(o.hitMod, d.hitMod), 0.5, 2),
    };
  });
}

function normalizeBoss(raw: unknown): BossConfig {
  const d = DEFAULT_BOSS;
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const finisherShare = clamp(num(o.finisherShare, d.finisherShare), 0.1, 1);
  const contributorShare = clamp(
    num(o.contributorShare, d.contributorShare),
    0,
    1 - finisherShare + 0.001,
  );
  const total = finisherShare + contributorShare;
  return {
    spawnChance: clamp(num(o.spawnChance, d.spawnChance), 0, 0.25),
    cooldownSec: clamp(num(o.cooldownSec, d.cooldownSec), 10, 600),
    durationSec: clamp(num(o.durationSec, d.durationSec), 10, 180),
    finisherShare: total > 0 ? finisherShare / total : d.finisherShare,
    contributorShare: total > 0 ? contributorShare / total : d.contributorShare,
  };
}

function normalizeCrateDrops(raw: unknown): CrateDropConfig[] {
  const defaults = DEFAULT_CRATE_DROPS;
  const arr = Array.isArray(raw) ? raw : defaults;
  const byId = new Map<string, Record<string, unknown>>();
  for (const item of arr) {
    if (item && typeof item === "object" && "id" in item) {
      byId.set(String((item as { id: unknown }).id), item as Record<string, unknown>);
    }
  }
  return defaults.map((d) => {
    const o = byId.get(d.id) ?? {};
    return {
      id: d.id,
      label: typeof o.label === "string" && o.label.trim() ? o.label.trim() : d.label,
      weight: clamp(num(o.weight, d.weight), 0, 10_000),
      value: clamp(num(o.value, d.value), 0, 100),
    };
  });
}

function normalizePowerUps(raw: unknown): PowerUpConfig[] {
  const defaults = DEFAULT_POWER_UPS;
  const arr = Array.isArray(raw) ? raw : defaults;
  const byId = new Map<string, Record<string, unknown>>();
  for (const item of arr) {
    if (item && typeof item === "object" && "id" in item) {
      byId.set(String((item as { id: unknown }).id), item as Record<string, unknown>);
    }
  }
  return defaults.map((d) => {
    const o = byId.get(d.id) ?? {};
    return {
      id: d.id,
      label: typeof o.label === "string" && o.label.trim() ? o.label.trim() : d.label,
      cost: clamp(num(o.cost, d.cost), 0, 10_000),
      netBombHitChance: clamp(num(o.netBombHitChance, d.netBombHitChance), 0, 1),
      freezeDurationSec: clamp(num(o.freezeDurationSec, d.freezeDurationSec), 0, 30),
    };
  });
}

export function getFishTier(
  cfg: CrabCannonConfig,
  id: FishTierId,
): FishTierConfig {
  return cfg.fishTiers.find((f) => f.id === id) ?? DEFAULT_FISH_TIERS.find((f) => f.id === id)!;
}

export function getWeapon(
  cfg: CrabCannonConfig,
  id: WeaponTierId,
): WeaponTierConfig {
  return cfg.weapons.find((w) => w.id === id) ?? DEFAULT_WEAPONS.find((w) => w.id === id)!;
}

export function effectiveHitChance(
  fish: FishTierConfig,
  weapon: WeaponTierConfig,
  maxHitChance: number,
): number {
  return clamp(fish.baseHitChance * weapon.hitMod, 0.01, maxHitChance);
}

export function avgPayoutMult(fish: FishTierConfig): number {
  return (fish.payoutMin + fish.payoutMax) / 2;
}

export function avgHits(fish: FishTierConfig): number {
  return (fish.hitsMin + fish.hitsMax) / 2;
}

/** Theoretical RTP for a fish when always shooting it with a given weapon. */
export function theoreticalFishRtp(
  fish: FishTierConfig,
  weapon: WeaponTierConfig,
  maxHitChance: number,
): number {
  if (fish.id === "crate") return 0;
  const p = effectiveHitChance(fish, weapon, maxHitChance);
  const h = avgHits(fish);
  const m = avgPayoutMult(fish);
  if (h <= 0 || p <= 0) return 0;
  return (m * p) / h;
}

export function isFishTierId(v: unknown): v is FishTierId {
  return typeof v === "string" && (FISH_IDS as string[]).includes(v);
}

export function isWeaponTierId(v: unknown): v is WeaponTierId {
  return typeof v === "string" && (WEAPON_IDS as string[]).includes(v);
}

export function isCrateDropId(v: unknown): v is CrateDropId {
  return typeof v === "string" && (CRATE_IDS as string[]).includes(v);
}

export function isPowerUpId(v: unknown): v is PowerUpId {
  return typeof v === "string" && (POWER_IDS as string[]).includes(v);
}

export function normalizeCrabCannonConfig(raw: unknown): CrabCannonConfig {
  if (!raw || typeof raw !== "object") {
    return structuredClone(DEFAULT_CRAB_CANNON_CONFIG);
  }
  const o = raw as Partial<CrabCannonConfig> & { targetRtp?: number };
  const d = DEFAULT_CRAB_CANNON_CONFIG;
  const weapons = normalizeWeapons(o.weapons);
  const betCosts = weapons.map((w) => w.betCost);
  const minBet = clamp(num(o.minBet, Math.min(...betCosts)), 0.01, 10_000);
  const maxBet = clamp(num(o.maxBet, Math.max(...betCosts)), minBet, 100_000);

  return {
    schemaVersion: 1,
    fishTiers: normalizeFishTier(o.fishTiers),
    weapons,
    boss: normalizeBoss(o.boss),
    crateDrops: normalizeCrateDrops(o.crateDrops),
    powerUps: normalizePowerUps(o.powerUps),
    maxFishOnScreen: clamp(Math.round(num(o.maxFishOnScreen, d.maxFishOnScreen)), 3, 30),
    spawnIntervalSec: clamp(num(o.spawnIntervalSec, d.spawnIntervalSec), 0.3, 10),
    maxHitChance: clamp(num(o.maxHitChance, d.maxHitChance), 0.2, 1),
    rtpTarget: clamp(num(o.rtpTarget ?? o.targetRtp, d.rtpTarget), 80, 99.5),
    minBet,
    maxBet,
  };
}
