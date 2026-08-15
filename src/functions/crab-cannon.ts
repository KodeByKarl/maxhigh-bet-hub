/**
 * Crab Cannon client RPC bridge (createServerFn).
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

export const crabCannonFireShotFn = createServerFn({ method: "POST" })
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { crabCannonFireShot } = await import("../server/games/crab-cannon.server");
    return JSON.parse(JSON.stringify(await crabCannonFireShot(data))) as Awaited<
      ReturnType<typeof crabCannonFireShot>
    >;
  });

export const crabCannonEnsureSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { crabCannonEnsureSession } = await import("../server/games/crab-cannon.server");
    return crabCannonEnsureSession(data);
  });

export const getCrabCannonSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCrabCannonOpenSession } = await import("../server/games/crab-cannon.server");
  return getCrabCannonOpenSession();
});

export const getCrabCannonEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCrabCannonEngineConfigPublic } = await import("../server/games/crab-cannon.server");
  return getCrabCannonEngineConfigPublic();
});

export const crabCannonSetWeaponFn = createServerFn({ method: "POST" })
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { crabCannonSetWeapon } = await import("../server/games/crab-cannon.server");
    return crabCannonSetWeapon(data);
  });

export const crabCannonBuyPowerUpFn = createServerFn({ method: "POST" })
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { crabCannonBuyPowerUp } = await import("../server/games/crab-cannon.server");
    return crabCannonBuyPowerUp(data);
  });

export const crabCannonUseNetBombFn = createServerFn({ method: "POST" })
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { crabCannonUseNetBomb } = await import("../server/games/crab-cannon.server");
    return JSON.parse(JSON.stringify(await crabCannonUseNetBomb(data))) as Awaited<
      ReturnType<typeof crabCannonUseNetBomb>
    >;
  });

export const crabCannonUseFreezeLureFn = createServerFn({ method: "POST" }).handler(async () => {
  const { crabCannonUseFreezeLure } = await import("../server/games/crab-cannon.server");
  return crabCannonUseFreezeLure();
});


export const crabCannonSyncSpawnsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { crabCannonSyncSpawns } = await import("../server/games/crab-cannon.server");
  return crabCannonSyncSpawns();
});

export const crabCannonBossStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { crabCannonBossStatus } = await import("../server/games/crab-cannon.server");
  return crabCannonBossStatus();
});

/** Superadmin — load engineConfig from game_controls. */
export const getCrabCannonAdminConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCrabCannonEngineConfig } = await import("../server/superadmin/services.server");
  return getCrabCannonEngineConfig();
});

/** Superadmin — persist engineConfig JSON. */
export const saveCrabCannonAdminConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCrabCannonEngineConfig } = await import("../server/superadmin/services.server");
    return saveCrabCannonEngineConfig(data.config);
  });
