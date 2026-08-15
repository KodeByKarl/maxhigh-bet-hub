/**
 * Deep Bass client RPC bridge (createServerFn).
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

export const deepBassFireShotFn = createServerFn({ method: "POST" })
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { deepBassFireShot } = await import("../server/games/deep-bass.server");
    return JSON.parse(JSON.stringify(await deepBassFireShot(data))) as Awaited<
      ReturnType<typeof deepBassFireShot>
    >;
  });

export const deepBassEnsureSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { deepBassEnsureSession } = await import("../server/games/deep-bass.server");
    return deepBassEnsureSession(data);
  });

export const getDeepBassSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDeepBassOpenSession } = await import("../server/games/deep-bass.server");
  return getDeepBassOpenSession();
});

export const getDeepBassEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDeepBassEngineConfigPublic } = await import("../server/games/deep-bass.server");
  return getDeepBassEngineConfigPublic();
});

export const deepBassSetWeaponFn = createServerFn({ method: "POST" })
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { deepBassSetWeapon } = await import("../server/games/deep-bass.server");
    return deepBassSetWeapon(data);
  });

export const deepBassBuyPowerUpFn = createServerFn({ method: "POST" })
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { deepBassBuyPowerUp } = await import("../server/games/deep-bass.server");
    return deepBassBuyPowerUp(data);
  });

export const deepBassUseNetBombFn = createServerFn({ method: "POST" })
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { deepBassUseNetBomb } = await import("../server/games/deep-bass.server");
    return JSON.parse(JSON.stringify(await deepBassUseNetBomb(data))) as Awaited<
      ReturnType<typeof deepBassUseNetBomb>
    >;
  });

export const deepBassUseFreezeLureFn = createServerFn({ method: "POST" }).handler(async () => {
  const { deepBassUseFreezeLure } = await import("../server/games/deep-bass.server");
  return deepBassUseFreezeLure();
});


export const deepBassSyncSpawnsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { deepBassSyncSpawns } = await import("../server/games/deep-bass.server");
  return deepBassSyncSpawns();
});

export const deepBassBossStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { deepBassBossStatus } = await import("../server/games/deep-bass.server");
  return deepBassBossStatus();
});

/** Superadmin — load engineConfig from game_controls. */
export const getDeepBassAdminConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDeepBassEngineConfig } = await import("../server/superadmin/services.server");
  return getDeepBassEngineConfig();
});

/** Superadmin — persist engineConfig JSON. */
export const saveDeepBassAdminConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveDeepBassEngineConfig } = await import("../server/superadmin/services.server");
    return saveDeepBassEngineConfig(data.config);
  });
