/**
 * Shark Hunter client RPC bridge (createServerFn).
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

export const sharkHunterFireShotFn = createServerFn({ method: "POST" })
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { sharkHunterFireShot } = await import("../server/games/shark-hunter.server");
    return JSON.parse(JSON.stringify(await sharkHunterFireShot(data))) as Awaited<
      ReturnType<typeof sharkHunterFireShot>
    >;
  });

export const sharkHunterEnsureSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { sharkHunterEnsureSession } = await import("../server/games/shark-hunter.server");
    return sharkHunterEnsureSession(data);
  });

export const getSharkHunterSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSharkHunterOpenSession } = await import("../server/games/shark-hunter.server");
  return getSharkHunterOpenSession();
});

export const getSharkHunterEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSharkHunterEngineConfigPublic } = await import("../server/games/shark-hunter.server");
  return getSharkHunterEngineConfigPublic();
});

export const sharkHunterSetWeaponFn = createServerFn({ method: "POST" })
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { sharkHunterSetWeapon } = await import("../server/games/shark-hunter.server");
    return sharkHunterSetWeapon(data);
  });

export const sharkHunterBuyPowerUpFn = createServerFn({ method: "POST" })
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { sharkHunterBuyPowerUp } = await import("../server/games/shark-hunter.server");
    return sharkHunterBuyPowerUp(data);
  });

export const sharkHunterUseNetBombFn = createServerFn({ method: "POST" })
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { sharkHunterUseNetBomb } = await import("../server/games/shark-hunter.server");
    return JSON.parse(JSON.stringify(await sharkHunterUseNetBomb(data))) as Awaited<
      ReturnType<typeof sharkHunterUseNetBomb>
    >;
  });

export const sharkHunterUseFreezeLureFn = createServerFn({ method: "POST" }).handler(async () => {
  const { sharkHunterUseFreezeLure } = await import("../server/games/shark-hunter.server");
  return sharkHunterUseFreezeLure();
});


export const sharkHunterSyncSpawnsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { sharkHunterSyncSpawns } = await import("../server/games/shark-hunter.server");
  return sharkHunterSyncSpawns();
});

export const sharkHunterBossStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { sharkHunterBossStatus } = await import("../server/games/shark-hunter.server");
  return sharkHunterBossStatus();
});

/** Superadmin — load engineConfig from game_controls. */
export const getSharkHunterAdminConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSharkHunterEngineConfig } = await import("../server/superadmin/services.server");
  return getSharkHunterEngineConfig();
});

/** Superadmin — persist engineConfig JSON. */
export const saveSharkHunterAdminConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveSharkHunterEngineConfig } = await import("../server/superadmin/services.server");
    return saveSharkHunterEngineConfig(data.config);
  });
