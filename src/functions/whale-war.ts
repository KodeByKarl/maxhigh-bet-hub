/**
 * Whale War client RPC bridge (createServerFn).
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

export const whaleWarFireShotFn = createServerFn({ method: "POST" })
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { whaleWarFireShot } = await import("../server/games/whale-war.server");
    return JSON.parse(JSON.stringify(await whaleWarFireShot(data))) as Awaited<
      ReturnType<typeof whaleWarFireShot>
    >;
  });

export const whaleWarEnsureSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { whaleWarEnsureSession } = await import("../server/games/whale-war.server");
    return whaleWarEnsureSession(data);
  });

export const getWhaleWarSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getWhaleWarOpenSession } = await import("../server/games/whale-war.server");
  return getWhaleWarOpenSession();
});

export const getWhaleWarEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getWhaleWarEngineConfigPublic } = await import("../server/games/whale-war.server");
  return getWhaleWarEngineConfigPublic();
});

export const whaleWarSetWeaponFn = createServerFn({ method: "POST" })
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { whaleWarSetWeapon } = await import("../server/games/whale-war.server");
    return whaleWarSetWeapon(data);
  });

export const whaleWarBuyPowerUpFn = createServerFn({ method: "POST" })
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { whaleWarBuyPowerUp } = await import("../server/games/whale-war.server");
    return whaleWarBuyPowerUp(data);
  });

export const whaleWarUseNetBombFn = createServerFn({ method: "POST" })
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { whaleWarUseNetBomb } = await import("../server/games/whale-war.server");
    return JSON.parse(JSON.stringify(await whaleWarUseNetBomb(data))) as Awaited<
      ReturnType<typeof whaleWarUseNetBomb>
    >;
  });

export const whaleWarUseFreezeLureFn = createServerFn({ method: "POST" }).handler(async () => {
  const { whaleWarUseFreezeLure } = await import("../server/games/whale-war.server");
  return whaleWarUseFreezeLure();
});


export const whaleWarSyncSpawnsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { whaleWarSyncSpawns } = await import("../server/games/whale-war.server");
  return whaleWarSyncSpawns();
});

export const whaleWarBossStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { whaleWarBossStatus } = await import("../server/games/whale-war.server");
  return whaleWarBossStatus();
});

/** Superadmin — load engineConfig from game_controls. */
export const getWhaleWarAdminConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getWhaleWarEngineConfig } = await import("../server/superadmin/services.server");
  return getWhaleWarEngineConfig();
});

/** Superadmin — persist engineConfig JSON. */
export const saveWhaleWarAdminConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveWhaleWarEngineConfig } = await import("../server/superadmin/services.server");
    return saveWhaleWarEngineConfig(data.config);
  });
