/**
 * Dragon Fisher — server-authoritative shot settlement + boss shared pool.
 * Client never moves money; every shot debits then optionally credits via ledger.
 */

import { and, eq } from "drizzle-orm";
import {
  DRAGON_FISHER_GAME_ID,
  getFishTier,
  getWeapon,
  isPowerUpId,
  isWeaponTierId,
  normalizeDragonFisherConfig,
  type DragonFisherConfig,
  type PowerUpId,
  type WeaponTierId,
} from "@/lib/dragon-fisher-config";
import {
  applyBossHit,
  bossPotFromKill,
  createBossPool,
  splitBossPayout,
  type BossPoolState,
} from "@/components/maxhigh/games/dragon-fisher/bossEngine";
import { resolveNetBomb, resolveShot } from "@/components/maxhigh/games/dragon-fisher/hitResolver";
import { createSpawnedFish } from "@/components/maxhigh/games/dragon-fisher/fishSpawner";
import { createRng, newShotSeed } from "@/components/maxhigh/games/dragon-fisher/rng";
import { setDragonFisherConfig } from "@/components/maxhigh/games/dragon-fisher/runtimeConfig";
import type { ShotTargetSnapshot } from "@/components/maxhigh/games/dragon-fisher/hitResolver";
import { getDb } from "../db/client";
import { gameControls, playSessions, users } from "../db/schema";
import { newId, requireUser } from "../session";
import {
  assertNotInMaintenanceForBets,
  availableFrom,
  getMaxSingleBet,
  sumPendingWithdrawals,
  writeLedgerDelta,
} from "../wallet.server";
import { recordGameEngineAuditLog } from "./game-audit.server";

const GAME_NAME = "Dragon Fisher";

let cachedConfig: { cfg: DragonFisherConfig; time: number } | null = null;

/** Shared boss pool across concurrent players in this process. */
let globalBoss: BossPoolState | null = null;
let lastBossEndedAt = 0;

/** Per-user live fish registry — server owns spawn (tier/instance/path/HP/payout). */
type ServerFish = ShotTargetSnapshot & {
  expiresAt: number;
  y: number;
  fromLeft: boolean;
  path: string;
  speedMs: number;
  size: number;
  createdAt: number;
  frozenUntil: number;
};
const fishRegistry = new Map<string, ServerFish>(); // key: `${userId}:${instanceId}`
const DESPAWN_GRACE_MS = 2_000;
const HIT_KEEPALIVE_MS = 45_000;
const MAX_FISH_PER_USER = 24;
export type PublicLiveFish = {
  instanceId: string;
  tierId: ShotTargetSnapshot["tierId"];
  hitsTaken: number;
  hitsRequired: number;
  payoutMult: number;
  y: number;
  fromLeft: boolean;
  path: string;
  speedMs: number;
  size: number;
  createdAt: number;
  frozenUntil: number;
};

export function clearDragonFisherEngineCache() {
  cachedConfig = null;
}

function fishKey(userId: string, instanceId: string) {
  return `${userId}:${instanceId}`;
}

function pruneFish(userId: string) {
  const now = Date.now();
  const prefix = `${userId}:`;
  let count = 0;
  for (const [k, v] of fishRegistry) {
    if (!k.startsWith(prefix)) continue;
    if (now > v.expiresAt) fishRegistry.delete(k);
    else count += 1;
  }
  if (count <= MAX_FISH_PER_USER) return;
  // Drop oldest
  const mine = [...fishRegistry.entries()]
    .filter(([k]) => k.startsWith(prefix))
    .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  while (mine.length > MAX_FISH_PER_USER) {
    const [k] = mine.shift()!;
    fishRegistry.delete(k);
  }
}

function toPublicFish(f: ServerFish): PublicLiveFish {
  return {
    instanceId: f.instanceId,
    tierId: f.tierId,
    hitsTaken: f.hitsTaken,
    hitsRequired: f.hitsRequired,
    payoutMult: f.payoutMult,
    y: f.y,
    fromLeft: f.fromLeft,
    path: f.path,
    speedMs: f.speedMs,
    size: f.size,
    createdAt: f.createdAt,
    frozenUntil: f.frozenUntil,
  };
}

function listLiveFish(userId: string): PublicLiveFish[] {
  pruneFish(userId);
  const now = Date.now();
  const prefix = `${userId}:`;
  const out: PublicLiveFish[] = [];
  for (const [k, v] of fishRegistry) {
    if (!k.startsWith(prefix)) continue;
    if (now > v.expiresAt) continue;
    out.push(toPublicFish(v));
  }
  return out;
}

function spawnOneFish(cfg: DragonFisherConfig, userId: string): ServerFish {
  const now = Date.now();
  const rng = createRng(newShotSeed("spawn"));
  const spawned = createSpawnedFish({ cfg, rng, now });
  const created: ServerFish = {
    instanceId: spawned.instanceId,
    tierId: spawned.tierId,
    hitsTaken: 0,
    hitsRequired: spawned.hitsRequired,
    payoutMult: spawned.payoutMult,
    expiresAt: spawned.createdAt + spawned.speedMs + DESPAWN_GRACE_MS,
    y: spawned.y,
    fromLeft: spawned.fromLeft,
    path: spawned.path,
    speedMs: spawned.speedMs,
    size: spawned.size,
    createdAt: spawned.createdAt,
    frozenUntil: 0,
  };
  fishRegistry.set(fishKey(userId, created.instanceId), created);
  return created;
}

/**
 * Lookup server-owned live fish only. Never trusts client tier / HP / payout.
 * Unknown or expired instanceId → reject (no debit / no payout).
 */
function lookupLiveFish(userId: string, instanceId: string): ShotTargetSnapshot {
  if (!instanceId || instanceId.length > 64) {
    throw new Error("Invalid fish instance");
  }
  pruneFish(userId);
  const existing = fishRegistry.get(fishKey(userId, instanceId));
  const now = Date.now();
  if (!existing || now > existing.expiresAt) {
    console.warn(`[${GAME_NAME}] Suspicious catch rejected`, {
      userId,
      instanceId,
      reason: !existing ? "unknown_instance" : "expired",
    });
    throw new Error("Unknown or expired fish");
  }
  return {
    instanceId: existing.instanceId,
    tierId: existing.tierId,
    hitsTaken: existing.hitsTaken,
    hitsRequired: existing.hitsRequired,
    payoutMult: existing.payoutMult,
  };
}

/** Sync / top-up server-owned spawns for the player's open session. */
export async function dragonFisherSyncSpawns() {
  await assertGameEnabled();
  const user = await requireUser();
  const cfg = await loadEngineConfig();
  setDragonFisherConfig(cfg);
  pruneFish(user.id);
  let live = listLiveFish(user.id);
  if (live.length < cfg.maxFishOnScreen) {
    spawnOneFish(cfg, user.id);
    live = listLiveFish(user.id);
  }
  return { fish: live, maxFishOnScreen: cfg.maxFishOnScreen };
}

function updateFishAfterShot(
  userId: string,
  target: ShotTargetSnapshot,
  hitsTaken: number,
  killed: boolean,
) {
  const key = fishKey(userId, target.instanceId);
  if (killed || target.tierId === "boss") {
    fishRegistry.delete(key);
    return;
  }
  const existing = fishRegistry.get(key);
  if (!existing) return;
  existing.hitsTaken = hitsTaken;
  existing.expiresAt = Date.now() + HIT_KEEPALIVE_MS;
}

async function loadEngineConfig(): Promise<DragonFisherConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, DRAGON_FISHER_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeDragonFisherConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeDragonFisherConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export async function getDragonFisherEngineConfigPublic(): Promise<DragonFisherConfig> {
  return loadEngineConfig();
}

type SessionFeature = {
  weaponId: WeaponTierId;
  goldenHookMult: number;
  powerUps: Partial<Record<PowerUpId, number>>;
};

function defaultFeature(weaponId: WeaponTierId = "bamboo"): SessionFeature {
  return { weaponId, goldenHookMult: 1, powerUps: {} };
}

function parseFeature(raw: string | null | undefined): SessionFeature {
  if (!raw) return defaultFeature();
  try {
    const o = JSON.parse(raw) as Partial<SessionFeature>;
    const weaponId = isWeaponTierId(o.weaponId) ? o.weaponId : "bamboo";
    const goldenHookMult =
      typeof o.goldenHookMult === "number" && o.goldenHookMult >= 1
        ? o.goldenHookMult
        : 1;
    const powerUps: Partial<Record<PowerUpId, number>> = {};
    if (o.powerUps && typeof o.powerUps === "object") {
      for (const [k, v] of Object.entries(o.powerUps)) {
        if (isPowerUpId(k) && typeof v === "number" && v > 0) {
          powerUps[k] = Math.floor(v);
        }
      }
    }
    return { weaponId, goldenHookMult, powerUps };
  } catch {
    return defaultFeature();
  }
}

async function assertGameEnabled() {
  const db = getDb();
  const controlRows = await db
    .select({ enabled: gameControls.enabled })
    .from(gameControls)
    .where(eq(gameControls.gameId, DRAGON_FISHER_GAME_ID))
    .limit(1);
  if (controlRows[0]?.enabled === "no") {
    throw new Error("Dragon Fisher is currently disabled");
  }
}

function publicBoss() {
  if (!globalBoss || globalBoss.killed) return null;
  const now = Date.now();
  if (now > globalBoss.expiresAt) {
    globalBoss = null;
    lastBossEndedAt = now;
    return null;
  }
  return {
    active: true as const,
    instanceId: globalBoss.instanceId,
    hitsTaken: globalBoss.fish.hitsTaken,
    hitsRequired: globalBoss.fish.hitsRequired,
    payoutMult: globalBoss.fish.payoutMult,
    expiresAt: globalBoss.expiresAt,
  };
}

export async function getDragonFisherOpenSession() {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, DRAGON_FISHER_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  const cfg = await loadEngineConfig();
  setDragonFisherConfig(cfg);

  const balRows = await db
    .select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const balance = Number(balRows[0]?.balance ?? 0);

  if (!rows[0]) {
    return {
      sessionId: null as string | null,
      weaponId: "bamboo" as WeaponTierId,
      goldenHookMult: 1,
      powerUps: {} as Partial<Record<PowerUpId, number>>,
      balance,
      boss: publicBoss(),
      config: cfg,
    };
  }

  const feat = parseFeature(rows[0].featureState);
  return {
    sessionId: rows[0].id,
    weaponId: feat.weaponId,
    goldenHookMult: feat.goldenHookMult,
    powerUps: feat.powerUps,
    balance,
    boss: publicBoss(),
    config: cfg,
  };
}

export async function dragonFisherEnsureSession(input?: { weaponId?: string }) {
  await assertNotInMaintenanceForBets();
  await assertGameEnabled();
  const user = await requireUser();
  const cfg = await loadEngineConfig();
  setDragonFisherConfig(cfg);

  const weaponId = isWeaponTierId(input?.weaponId) ? input!.weaponId! : "bamboo";
  const db = getDb();

  const existing = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, DRAGON_FISHER_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const feat = parseFeature(existing[0].featureState);
    feat.weaponId = weaponId;
    await db
      .update(playSessions)
      .set({
        featureState: JSON.stringify(feat),
        bet: String(getWeapon(cfg, weaponId).betCost),
        updatedAt: new Date(),
      })
      .where(eq(playSessions.id, existing[0].id));
    return getDragonFisherOpenSession();
  }

  const id = newId();
  const feat = defaultFeature(weaponId);
  await db.insert(playSessions).values({
    id,
    userId: user.id,
    gameId: DRAGON_FISHER_GAME_ID,
    status: "open",
    bet: String(getWeapon(cfg, weaponId).betCost),
    ante: "no",
    freeSpinsLeft: 0,
    fsSessionWin: "0",
    fsBombAcc: "0",
    fsSpinsPlayed: 0,
    featureState: JSON.stringify(feat),
  });

  return getDragonFisherOpenSession();
}

async function loadOpenSessionRow(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        eq(playSessions.gameId, DRAGON_FISHER_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function maybeSpawnBoss(cfg: DragonFisherConfig) {
  const now = Date.now();
  if (globalBoss && !globalBoss.killed && now <= globalBoss.expiresAt) return;
  if (globalBoss?.killed || (globalBoss && now > globalBoss.expiresAt)) {
    lastBossEndedAt = now;
    globalBoss = null;
  }
  if (now - lastBossEndedAt < cfg.boss.cooldownSec * 1000) return;
  const rng = createRng(newShotSeed("boss"));
  if (!rng.chance(cfg.boss.spawnChance)) return;
  globalBoss = createBossPool({ cfg, rng, now });
}

export async function dragonFisherFireShot(input: {
  weaponId: string;
  target: { instanceId: string };
}) {
  await assertNotInMaintenanceForBets();
  await assertGameEnabled();
  const user = await requireUser();
  const cfg = await loadEngineConfig();
  setDragonFisherConfig(cfg);

  if (!isWeaponTierId(input.weaponId)) throw new Error("Invalid weapon");
  const weapon = getWeapon(cfg, input.weaponId);
  const maxBet = await getMaxSingleBet();
  if (weapon.betCost > maxBet) throw new Error(`Bet exceeds max ₱${maxBet}`);
  if (weapon.betCost < cfg.minBet || weapon.betCost > cfg.maxBet) {
    throw new Error(`Bet must be between ₱${cfg.minBet} and ₱${cfg.maxBet}`);
  }

  maybeSpawnBoss(cfg);

  let target: ShotTargetSnapshot;
  // Boss is identified by server instanceId only — never trust client tierId.
  if (globalBoss && !globalBoss.killed && input.target.instanceId === globalBoss.instanceId) {
    const boss = publicBoss();
    if (!boss || !globalBoss) throw new Error("Boss is not on screen");
    target = {
      instanceId: globalBoss.instanceId,
      tierId: "boss",
      hitsTaken: globalBoss.fish.hitsTaken,
      hitsRequired: globalBoss.fish.hitsRequired,
      payoutMult: globalBoss.fish.payoutMult,
    };
  } else {
    target = lookupLiveFish(user.id, input.target.instanceId);
  }

  const db = getDb();
  let session = await loadOpenSessionRow(user.id);
  if (!session) {
    await dragonFisherEnsureSession({ weaponId: input.weaponId });
    session = await loadOpenSessionRow(user.id);
  }
  if (!session) throw new Error("Could not open play session");

  const feat = parseFeature(session.featureState);
  feat.weaponId = input.weaponId;
  const seed = newShotSeed("shot");
  const goldenHookMult = feat.goldenHookMult > 1 ? feat.goldenHookMult : undefined;

  const shot = resolveShot({
    weaponId: input.weaponId,
    target,
    goldenHookMult,
    seed,
    cfg,
  });

  let credit = shot.credit;
  let bossShares: ReturnType<typeof splitBossPayout> | null = null;

  if (shot.hit && target.tierId === "boss" && globalBoss) {
    const { killed } = applyBossHit({
      pool: globalBoss,
      userId: user.id,
      username: user.username,
    });
    shot.hitsTaken = globalBoss.fish.hitsTaken;
    shot.killed = killed;
    shot.isBossKill = killed;
    if (killed) {
      const pot = bossPotFromKill({
        cfg,
        betCost: weapon.betCost,
        payoutMult: globalBoss.fish.payoutMult,
        goldenHookMult,
      });
      bossShares = splitBossPayout({
        boss: cfg.boss,
        pool: globalBoss,
        finisherUserId: user.id,
        totalPot: pot,
      });
      const mine = bossShares.find((s) => s.userId === user.id);
      credit = mine?.credit ?? 0;
      shot.credit = credit;
      if (goldenHookMult && goldenHookMult > 1) feat.goldenHookMult = 1;
      lastBossEndedAt = Date.now();
      // Keep pool until after credits; clear below
    }
  } else if (shot.hit && target.tierId !== "boss") {
    updateFishAfterShot(user.id, target, shot.hitsTaken, shot.killed);
    if (shot.killed && goldenHookMult && goldenHookMult > 1 && target.tierId !== "crate") {
      feat.goldenHookMult = 1;
    }
  }

  if (shot.crateDrop) {
    const id = shot.crateDrop.id;
    if (id === "mult-2x" || id === "mult-3x") {
      feat.goldenHookMult = Math.max(feat.goldenHookMult, shot.crateDrop.value);
    } else if (id === "net-bomb" || id === "freeze-lure" || id === "golden-hook") {
      const key = id as PowerUpId;
      feat.powerUps[key] = (feat.powerUps[key] ?? 0) + 1;
      if (id === "golden-hook") feat.goldenHookMult = Math.max(feat.goldenHookMult, 2);
    }
  }

  const result = await db.transaction(async (tx) => {
    const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const u = urows[0];
    if (!u) throw new Error("User not found");
    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(Number(u.balance), pending);
    if (available + 1e-9 < weapon.betCost) throw new Error("Insufficient balance");

    let { balance } = await writeLedgerDelta(tx, {
      userId: user.id,
      username: user.username,
      delta: -weapon.betCost,
      type: "bet",
      game: DRAGON_FISHER_GAME_ID,
      note: `Dragon Fisher shot (${weapon.label})`,
    });

    if (credit > 0) {
      ({ balance } = await writeLedgerDelta(tx, {
        userId: user.id,
        username: user.username,
        delta: credit,
        type: "win",
        game: DRAGON_FISHER_GAME_ID,
        note: shot.isBossKill
          ? "Dragon Fisher boss share"
          : shot.crateDrop
            ? `Dragon Fisher crate (${shot.crateDrop.label})`
            : `Dragon Fisher catch (${target.tierId})`,
      }));
    }

    // Credit other boss contributors
    if (bossShares) {
      for (const share of bossShares) {
        if (share.userId === user.id || share.credit <= 0) continue;
        await writeLedgerDelta(tx, {
          userId: share.userId,
          username: share.username,
          delta: share.credit,
          type: "win",
          game: DRAGON_FISHER_GAME_ID,
          note: "Dragon Fisher boss contributor share",
        });
      }
    }

    await tx
      .update(playSessions)
      .set({
        featureState: JSON.stringify(feat),
        bet: String(weapon.betCost),
        updatedAt: new Date(),
      })
      .where(eq(playSessions.id, session!.id));

    return { balance };
  });

  if (shot.isBossKill) {
    globalBoss = null;
  }

  await recordGameEngineAuditLog({
    gameId: DRAGON_FISHER_GAME_ID,
    roundId: newId(),
    userId: user.id,
    username: user.username,
    betAmount: weapon.betCost,
    payoutAmount: credit,
    multiplier: weapon.betCost > 0 ? +(credit / weapon.betCost).toFixed(4) : 0,
    resultMeta: {
      weaponId: input.weaponId,
      tierId: target.tierId,
      hit: shot.hit,
      killed: shot.killed,
      seed: shot.seed,
      gameName: GAME_NAME,
    },
  });

  const tier = getFishTier(cfg, target.tierId);
  return {
    balance: result.balance,
    shot,
    targetInstanceId: target.instanceId,
    weaponId: input.weaponId,
    fishUpdate: {
      instanceId: target.instanceId,
      hitsTaken: shot.hitsTaken,
      hitsRequired: shot.hitsRequired,
      payoutMult: target.payoutMult,
      killed: shot.killed,
    },
    goldenHookMult: feat.goldenHookMult,
    powerUps: feat.powerUps,
    boss: publicBoss(),
    killBanner:
      shot.killed && credit > 0
        ? { label: tier.label, credit, tierId: target.tierId }
        : shot.killed && shot.crateDrop
          ? { label: shot.crateDrop.label, credit, tierId: target.tierId }
          : null,
    crateDrop: shot.crateDrop,
  };
}

export async function dragonFisherSetWeapon(input: { weaponId: string }) {
  await assertGameEnabled();
  const user = await requireUser();
  if (!isWeaponTierId(input.weaponId)) throw new Error("Invalid weapon");
  const cfg = await loadEngineConfig();
  let session = await loadOpenSessionRow(user.id);
  if (!session) {
    await dragonFisherEnsureSession({ weaponId: input.weaponId });
    return getDragonFisherOpenSession();
  }
  const feat = parseFeature(session.featureState);
  feat.weaponId = input.weaponId;
  const db = getDb();
  await db
    .update(playSessions)
    .set({
      featureState: JSON.stringify(feat),
      bet: String(getWeapon(cfg, input.weaponId).betCost),
      updatedAt: new Date(),
    })
    .where(eq(playSessions.id, session.id));
  return getDragonFisherOpenSession();
}

export async function dragonFisherBuyPowerUp(input: { powerUpId: string }) {
  await assertNotInMaintenanceForBets();
  await assertGameEnabled();
  const user = await requireUser();
  if (!isPowerUpId(input.powerUpId)) throw new Error("Invalid power-up");
  const cfg = await loadEngineConfig();
  setDragonFisherConfig(cfg);
  const power = cfg.powerUps.find((p) => p.id === input.powerUpId);
  if (!power || power.cost <= 0) throw new Error("Power-up not for sale");

  let session = await loadOpenSessionRow(user.id);
  if (!session) {
    await dragonFisherEnsureSession({});
    session = await loadOpenSessionRow(user.id);
  }
  if (!session) throw new Error("Could not open play session");
  const feat = parseFeature(session.featureState);

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const u = urows[0];
    if (!u) throw new Error("User not found");
    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(Number(u.balance), pending);
    if (available + 1e-9 < power.cost) throw new Error("Insufficient balance");

    const { balance } = await writeLedgerDelta(tx, {
      userId: user.id,
      username: user.username,
      delta: -power.cost,
      type: "bet",
      game: DRAGON_FISHER_GAME_ID,
      note: `Dragon Fisher power-up (${power.label})`,
    });

    feat.powerUps[power.id] = (feat.powerUps[power.id] ?? 0) + 1;
    if (power.id === "golden-hook") {
      feat.goldenHookMult = Math.max(feat.goldenHookMult, 2);
    }

    await tx
      .update(playSessions)
      .set({
        featureState: JSON.stringify(feat),
        updatedAt: new Date(),
      })
      .where(eq(playSessions.id, session!.id));

    return { balance };
  });

  return {
    balance: result.balance,
    goldenHookMult: feat.goldenHookMult,
    powerUps: feat.powerUps,
  };
}

export async function dragonFisherUseNetBomb(input: {
  weaponId: string;
  targets: { instanceId: string }[];
}) {
  await assertNotInMaintenanceForBets();
  await assertGameEnabled();
  const user = await requireUser();
  if (!isWeaponTierId(input.weaponId)) throw new Error("Invalid weapon");
  const cfg = await loadEngineConfig();
  setDragonFisherConfig(cfg);

  const session = await loadOpenSessionRow(user.id);
  if (!session) throw new Error("No open session");
  const feat = parseFeature(session.featureState);
  const stock = feat.powerUps["net-bomb"] ?? 0;
  if (stock < 1) throw new Error("No Net Bomb available");

  const targets: ShotTargetSnapshot[] = [];
  for (const t of (input.targets ?? []).slice(0, 12)) {
    if (globalBoss && t.instanceId === globalBoss.instanceId) continue; // boss not net-bombable
    try {
      targets.push(lookupLiveFish(user.id, t.instanceId));
    } catch {
      // skip unknown / expired — already logged as suspicious in lookupLiveFish
    }
  }
  if (targets.length === 0) throw new Error("No valid fish targets");
  const seed = newShotSeed("net");
  const goldenHookMult = feat.goldenHookMult > 1 ? feat.goldenHookMult : undefined;
  const results = resolveNetBomb({
    weaponId: input.weaponId,
    targets,
    goldenHookMult,
    seed,
    cfg,
  });

  let totalCredit = 0;
  let hookConsumed = false;
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    const t = targets[i]!;
    if (r.hit) {
      updateFishAfterShot(user.id, t, r.hitsTaken, r.killed);
    }
    if (r.killed && t.tierId !== "boss" && t.tierId !== "crate") {
      totalCredit += r.credit;
      if (r.appliedKillMult > 1) hookConsumed = true;
    }
    if (r.crateDrop?.coinCredit) totalCredit += r.crateDrop.coinCredit;
    if (r.crateDrop) {
      const id = r.crateDrop.id;
      if (id === "mult-2x" || id === "mult-3x") {
        feat.goldenHookMult = Math.max(feat.goldenHookMult, r.crateDrop.value);
      } else if (id === "net-bomb" || id === "freeze-lure" || id === "golden-hook") {
        feat.powerUps[id] = (feat.powerUps[id] ?? 0) + 1;
      }
    }
  }
  totalCredit = +totalCredit.toFixed(2);
  feat.powerUps["net-bomb"] = stock - 1;
  if (hookConsumed) feat.goldenHookMult = 1;

  const db = getDb();
  const { balance } = await db.transaction(async (tx) => {
    let bal = 0;
    if (totalCredit > 0) {
      ({ balance: bal } = await writeLedgerDelta(tx, {
        userId: user.id,
        username: user.username,
        delta: totalCredit,
        type: "win",
        game: DRAGON_FISHER_GAME_ID,
        note: "Dragon Fisher Net Bomb",
      }));
    } else {
      const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
      bal = Number(urows[0]?.balance ?? 0);
    }
    await tx
      .update(playSessions)
      .set({
        featureState: JSON.stringify(feat),
        updatedAt: new Date(),
      })
      .where(eq(playSessions.id, session.id));
    return { balance: bal };
  });

  return {
    balance,
    results,
    targetInstanceIds: targets.map((t) => t.instanceId),
    goldenHookMult: feat.goldenHookMult,
    powerUps: feat.powerUps,
    totalCredit,
  };
}

export async function dragonFisherUseFreezeLure() {
  const user = await requireUser();
  const cfg = await loadEngineConfig();
  const session = await loadOpenSessionRow(user.id);
  if (!session) throw new Error("No open session");
  const feat = parseFeature(session.featureState);
  const stock = feat.powerUps["freeze-lure"] ?? 0;
  if (stock < 1) throw new Error("No Freeze Lure available");
  feat.powerUps["freeze-lure"] = stock - 1;
  const db = getDb();
  await db
    .update(playSessions)
    .set({ featureState: JSON.stringify(feat), updatedAt: new Date() })
    .where(eq(playSessions.id, session.id));
  const power = cfg.powerUps.find((p) => p.id === "freeze-lure");
  const durationSec = power?.freezeDurationSec ?? 4;
  const until = Date.now() + durationSec * 1000;
  pruneFish(user.id);
  const prefix = `${user.id}:`;
  for (const [k, v] of fishRegistry) {
    if (!k.startsWith(prefix)) continue;
    v.frozenUntil = Math.max(v.frozenUntil, until);
  }
  return {
    durationSec,
    powerUps: feat.powerUps,
    fish: listLiveFish(user.id),
  };
}

/** Attempt boss spawn check for clients polling. */
export async function dragonFisherBossStatus() {
  await requireUser();
  const cfg = await loadEngineConfig();
  maybeSpawnBoss(cfg);
  return { boss: publicBoss() };
}
