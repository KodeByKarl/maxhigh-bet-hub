/**
 * Phoenix Fisher client RPC bridge (createServerFn).
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

export const phoenixFisherFireShotFn = createServerFn({ method: "POST" })
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { phoenixFisherFireShot } = await import("../server/games/phoenix-fisher.server");
    return JSON.parse(JSON.stringify(await phoenixFisherFireShot(data))) as Awaited<
      ReturnType<typeof phoenixFisherFireShot>
    >;
  });

export const phoenixFisherEnsureSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { phoenixFisherEnsureSession } = await import("../server/games/phoenix-fisher.server");
    return phoenixFisherEnsureSession(data);
  });

export const getPhoenixFisherSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPhoenixFisherOpenSession } = await import("../server/games/phoenix-fisher.server");
  return getPhoenixFisherOpenSession();
});

export const getPhoenixFisherEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPhoenixFisherEngineConfigPublic } = await import("../server/games/phoenix-fisher.server");
  return getPhoenixFisherEngineConfigPublic();
});

export const phoenixFisherSetWeaponFn = createServerFn({ method: "POST" })
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { phoenixFisherSetWeapon } = await import("../server/games/phoenix-fisher.server");
    return phoenixFisherSetWeapon(data);
  });

export const phoenixFisherBuyPowerUpFn = createServerFn({ method: "POST" })
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { phoenixFisherBuyPowerUp } = await import("../server/games/phoenix-fisher.server");
    return phoenixFisherBuyPowerUp(data);
  });

export const phoenixFisherUseNetBombFn = createServerFn({ method: "POST" })
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { phoenixFisherUseNetBomb } = await import("../server/games/phoenix-fisher.server");
    return JSON.parse(JSON.stringify(await phoenixFisherUseNetBomb(data))) as Awaited<
      ReturnType<typeof phoenixFisherUseNetBomb>
    >;
  });

export const phoenixFisherUseFreezeLureFn = createServerFn({ method: "POST" }).handler(async () => {
  const { phoenixFisherUseFreezeLure } = await import("../server/games/phoenix-fisher.server");
  return phoenixFisherUseFreezeLure();
});


export const phoenixFisherSyncSpawnsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { phoenixFisherSyncSpawns } = await import("../server/games/phoenix-fisher.server");
  return phoenixFisherSyncSpawns();
});

export const phoenixFisherBossStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { phoenixFisherBossStatus } = await import("../server/games/phoenix-fisher.server");
  return phoenixFisherBossStatus();
});

/** Superadmin — load engineConfig from game_controls. */
export const getPhoenixFisherAdminConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPhoenixFisherEngineConfig } = await import("../server/superadmin/services.server");
  return getPhoenixFisherEngineConfig();
});

/** Superadmin — persist engineConfig JSON. */
export const savePhoenixFisherAdminConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { savePhoenixFisherEngineConfig } = await import("../server/superadmin/services.server");
    return savePhoenixFisherEngineConfig(data.config);
  });
