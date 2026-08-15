/**
 * Octopus Armada client RPC bridge (createServerFn).
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

export const octopusArmadaFireShotFn = createServerFn({ method: "POST" })
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { octopusArmadaFireShot } = await import("../server/games/octopus-armada.server");
    return JSON.parse(JSON.stringify(await octopusArmadaFireShot(data))) as Awaited<
      ReturnType<typeof octopusArmadaFireShot>
    >;
  });

export const octopusArmadaEnsureSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { octopusArmadaEnsureSession } = await import("../server/games/octopus-armada.server");
    return octopusArmadaEnsureSession(data);
  });

export const getOctopusArmadaSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getOctopusArmadaOpenSession } = await import("../server/games/octopus-armada.server");
  return getOctopusArmadaOpenSession();
});

export const getOctopusArmadaEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getOctopusArmadaEngineConfigPublic } = await import("../server/games/octopus-armada.server");
  return getOctopusArmadaEngineConfigPublic();
});

export const octopusArmadaSetWeaponFn = createServerFn({ method: "POST" })
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { octopusArmadaSetWeapon } = await import("../server/games/octopus-armada.server");
    return octopusArmadaSetWeapon(data);
  });

export const octopusArmadaBuyPowerUpFn = createServerFn({ method: "POST" })
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { octopusArmadaBuyPowerUp } = await import("../server/games/octopus-armada.server");
    return octopusArmadaBuyPowerUp(data);
  });

export const octopusArmadaUseNetBombFn = createServerFn({ method: "POST" })
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { octopusArmadaUseNetBomb } = await import("../server/games/octopus-armada.server");
    return JSON.parse(JSON.stringify(await octopusArmadaUseNetBomb(data))) as Awaited<
      ReturnType<typeof octopusArmadaUseNetBomb>
    >;
  });

export const octopusArmadaUseFreezeLureFn = createServerFn({ method: "POST" }).handler(async () => {
  const { octopusArmadaUseFreezeLure } = await import("../server/games/octopus-armada.server");
  return octopusArmadaUseFreezeLure();
});


export const octopusArmadaSyncSpawnsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { octopusArmadaSyncSpawns } = await import("../server/games/octopus-armada.server");
  return octopusArmadaSyncSpawns();
});

export const octopusArmadaBossStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { octopusArmadaBossStatus } = await import("../server/games/octopus-armada.server");
  return octopusArmadaBossStatus();
});

/** Superadmin — load engineConfig from game_controls. */
export const getOctopusArmadaAdminConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getOctopusArmadaEngineConfig } = await import("../server/superadmin/services.server");
  return getOctopusArmadaEngineConfig();
});

/** Superadmin — persist engineConfig JSON. */
export const saveOctopusArmadaAdminConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveOctopusArmadaEngineConfig } = await import("../server/superadmin/services.server");
    return saveOctopusArmadaEngineConfig(data.config);
  });
