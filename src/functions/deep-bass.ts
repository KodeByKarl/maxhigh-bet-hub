import { operationIdentity } from "@/lib/operation-identity";
/**
 * Deep Bass client RPC bridge (createServerFn).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const targetSchema = z.object({
  instanceId: z.string().min(1).max(64),
});

const fireSchema = z.object({
  weaponId: z.enum(["mini", "half", "bamboo", "spinning", "trolling", "harpoon", "master"]),
  target: targetSchema,
});

const weaponSchema = z.object({
  weaponId: z.enum(["mini", "half", "bamboo", "spinning", "trolling", "harpoon", "master"]),
});

const powerSchema = z.object({
  powerUpId: z.enum(["net-bomb", "freeze-lure", "golden-hook"]),
});

const netBombSchema = z.object({
  weaponId: z.enum(["mini", "half", "bamboo", "spinning", "trolling", "harpoon", "master"]),
  targets: z.array(targetSchema).max(12),
});

export const deepBassFireShotFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "deepBassFireShotFn",
      data,
      async () => {
        const { deepBassFireShot } = await import("../server/games/deep-bass.server");
        return JSON.parse(JSON.stringify(await deepBassFireShot(data))) as Awaited<
          ReturnType<typeof deepBassFireShot>
        >;
      },
      "deep-bass",
    );
  });

export const deepBassEnsureSessionFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "deepBassEnsureSessionFn",
      data,
      async () => {
        const { deepBassEnsureSession } = await import("../server/games/deep-bass.server");
        return deepBassEnsureSession(data);
      },
      "deep-bass",
    );
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
  .middleware([operationIdentity])
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "deepBassSetWeaponFn",
      data,
      async () => {
        const { deepBassSetWeapon } = await import("../server/games/deep-bass.server");
        return deepBassSetWeapon(data);
      },
      "deep-bass",
    );
  });

export const deepBassBuyPowerUpFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "deepBassBuyPowerUpFn",
      data,
      async () => {
        const { deepBassBuyPowerUp } = await import("../server/games/deep-bass.server");
        return deepBassBuyPowerUp(data);
      },
      "deep-bass",
    );
  });

export const deepBassUseNetBombFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "deepBassUseNetBombFn",
      data,
      async () => {
        const { deepBassUseNetBomb } = await import("../server/games/deep-bass.server");
        return JSON.parse(JSON.stringify(await deepBassUseNetBomb(data))) as Awaited<
          ReturnType<typeof deepBassUseNetBomb>
        >;
      },
      "deep-bass",
    );
  });

export const deepBassUseFreezeLureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .handler(async () => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "deepBassUseFreezeLureFn",
      null,
      async () => {
        const { deepBassUseFreezeLure } = await import("../server/games/deep-bass.server");
        return deepBassUseFreezeLure();
      },
      "deep-bass",
    );
  });

export const deepBassSyncSpawnsFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .handler(async () => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "deepBassSyncSpawnsFn",
      null,
      async () => {
        const { deepBassSyncSpawns } = await import("../server/games/deep-bass.server");
        return deepBassSyncSpawns();
      },
      "deep-bass",
    );
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
  .middleware([operationIdentity])
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveDeepBassEngineConfig } = await import("../server/superadmin/services.server");
    return saveDeepBassEngineConfig(data.config);
  });
