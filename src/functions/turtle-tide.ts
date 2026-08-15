/**
 * Turtle Tide client RPC bridge (createServerFn).
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

export const turtleTideFireShotFn = createServerFn({ method: "POST" })
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { turtleTideFireShot } = await import("../server/games/turtle-tide.server");
    return JSON.parse(JSON.stringify(await turtleTideFireShot(data))) as Awaited<
      ReturnType<typeof turtleTideFireShot>
    >;
  });

export const turtleTideEnsureSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { turtleTideEnsureSession } = await import("../server/games/turtle-tide.server");
    return turtleTideEnsureSession(data);
  });

export const getTurtleTideSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getTurtleTideOpenSession } = await import("../server/games/turtle-tide.server");
  return getTurtleTideOpenSession();
});

export const getTurtleTideEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getTurtleTideEngineConfigPublic } = await import("../server/games/turtle-tide.server");
  return getTurtleTideEngineConfigPublic();
});

export const turtleTideSetWeaponFn = createServerFn({ method: "POST" })
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { turtleTideSetWeapon } = await import("../server/games/turtle-tide.server");
    return turtleTideSetWeapon(data);
  });

export const turtleTideBuyPowerUpFn = createServerFn({ method: "POST" })
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { turtleTideBuyPowerUp } = await import("../server/games/turtle-tide.server");
    return turtleTideBuyPowerUp(data);
  });

export const turtleTideUseNetBombFn = createServerFn({ method: "POST" })
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { turtleTideUseNetBomb } = await import("../server/games/turtle-tide.server");
    return JSON.parse(JSON.stringify(await turtleTideUseNetBomb(data))) as Awaited<
      ReturnType<typeof turtleTideUseNetBomb>
    >;
  });

export const turtleTideUseFreezeLureFn = createServerFn({ method: "POST" }).handler(async () => {
  const { turtleTideUseFreezeLure } = await import("../server/games/turtle-tide.server");
  return turtleTideUseFreezeLure();
});


export const turtleTideSyncSpawnsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { turtleTideSyncSpawns } = await import("../server/games/turtle-tide.server");
  return turtleTideSyncSpawns();
});

export const turtleTideBossStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { turtleTideBossStatus } = await import("../server/games/turtle-tide.server");
  return turtleTideBossStatus();
});

/** Superadmin — load engineConfig from game_controls. */
export const getTurtleTideAdminConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getTurtleTideEngineConfig } = await import("../server/superadmin/services.server");
  return getTurtleTideEngineConfig();
});

/** Superadmin — persist engineConfig JSON. */
export const saveTurtleTideAdminConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveTurtleTideEngineConfig } = await import("../server/superadmin/services.server");
    return saveTurtleTideEngineConfig(data.config);
  });
