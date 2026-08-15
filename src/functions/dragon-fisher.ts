/**
 * Dragon Fisher client RPC bridge (createServerFn).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const targetSchema = z.object({
  instanceId: z.string().min(1).max(64),
});

const fireSchema = z.object({
  weaponId: z.enum(["bamboo", "spinning", "trolling", "harpoon", "master"]),
  target: targetSchema,
});

const weaponSchema = z.object({
  weaponId: z.enum(["bamboo", "spinning", "trolling", "harpoon", "master"]),
});

const powerSchema = z.object({
  powerUpId: z.enum(["net-bomb", "freeze-lure", "golden-hook"]),
});

const netBombSchema = z.object({
  weaponId: z.enum(["bamboo", "spinning", "trolling", "harpoon", "master"]),
  targets: z.array(targetSchema).max(12),
});

export const dragonFisherFireShotFn = createServerFn({ method: "POST" })
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { dragonFisherFireShot } = await import("../server/games/dragon-fisher.server");
    return JSON.parse(JSON.stringify(await dragonFisherFireShot(data))) as Awaited<
      ReturnType<typeof dragonFisherFireShot>
    >;
  });

export const dragonFisherEnsureSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { dragonFisherEnsureSession } = await import("../server/games/dragon-fisher.server");
    return dragonFisherEnsureSession(data);
  });

export const getDragonFisherSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDragonFisherOpenSession } = await import("../server/games/dragon-fisher.server");
  return getDragonFisherOpenSession();
});

export const getDragonFisherEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDragonFisherEngineConfigPublic } = await import("../server/games/dragon-fisher.server");
  return getDragonFisherEngineConfigPublic();
});

export const dragonFisherSetWeaponFn = createServerFn({ method: "POST" })
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { dragonFisherSetWeapon } = await import("../server/games/dragon-fisher.server");
    return dragonFisherSetWeapon(data);
  });

export const dragonFisherBuyPowerUpFn = createServerFn({ method: "POST" })
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { dragonFisherBuyPowerUp } = await import("../server/games/dragon-fisher.server");
    return dragonFisherBuyPowerUp(data);
  });

export const dragonFisherUseNetBombFn = createServerFn({ method: "POST" })
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { dragonFisherUseNetBomb } = await import("../server/games/dragon-fisher.server");
    return JSON.parse(JSON.stringify(await dragonFisherUseNetBomb(data))) as Awaited<
      ReturnType<typeof dragonFisherUseNetBomb>
    >;
  });

export const dragonFisherUseFreezeLureFn = createServerFn({ method: "POST" }).handler(async () => {
  const { dragonFisherUseFreezeLure } = await import("../server/games/dragon-fisher.server");
  return dragonFisherUseFreezeLure();
});


export const dragonFisherSyncSpawnsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { dragonFisherSyncSpawns } = await import("../server/games/dragon-fisher.server");
  return dragonFisherSyncSpawns();
});

export const dragonFisherBossStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { dragonFisherBossStatus } = await import("../server/games/dragon-fisher.server");
  return dragonFisherBossStatus();
});

/** Superadmin — load engineConfig from game_controls. */
export const getDragonFisherAdminConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDragonFisherEngineConfig } = await import("../server/superadmin/services.server");
  return getDragonFisherEngineConfig();
});

/** Superadmin — persist engineConfig JSON. */
export const saveDragonFisherAdminConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveDragonFisherEngineConfig } = await import("../server/superadmin/services.server");
    return saveDragonFisherEngineConfig(data.config);
  });
