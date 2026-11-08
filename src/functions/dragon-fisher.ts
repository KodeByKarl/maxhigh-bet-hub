import { operationIdentity } from "@/lib/operation-identity";
/**
 * Dragon Fisher client RPC bridge (createServerFn).
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

export const dragonFisherFireShotFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "dragonFisherFireShotFn",
      data,
      async () => {
        const { dragonFisherFireShot } = await import("../server/games/dragon-fisher.server");
        return JSON.parse(JSON.stringify(await dragonFisherFireShot(data))) as Awaited<
          ReturnType<typeof dragonFisherFireShot>
        >;
      },
      "dragon-fisher",
    );
  });

export const dragonFisherEnsureSessionFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "dragonFisherEnsureSessionFn",
      data,
      async () => {
        const { dragonFisherEnsureSession } = await import("../server/games/dragon-fisher.server");
        return dragonFisherEnsureSession(data);
      },
      "dragon-fisher",
    );
  });

export const getDragonFisherSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDragonFisherOpenSession } = await import("../server/games/dragon-fisher.server");
  return getDragonFisherOpenSession();
});

export const getDragonFisherEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDragonFisherEngineConfigPublic } =
    await import("../server/games/dragon-fisher.server");
  return getDragonFisherEngineConfigPublic();
});

export const dragonFisherSetWeaponFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "dragonFisherSetWeaponFn",
      data,
      async () => {
        const { dragonFisherSetWeapon } = await import("../server/games/dragon-fisher.server");
        return dragonFisherSetWeapon(data);
      },
      "dragon-fisher",
    );
  });

export const dragonFisherBuyPowerUpFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "dragonFisherBuyPowerUpFn",
      data,
      async () => {
        const { dragonFisherBuyPowerUp } = await import("../server/games/dragon-fisher.server");
        return dragonFisherBuyPowerUp(data);
      },
      "dragon-fisher",
    );
  });

export const dragonFisherUseNetBombFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "dragonFisherUseNetBombFn",
      data,
      async () => {
        const { dragonFisherUseNetBomb } = await import("../server/games/dragon-fisher.server");
        return JSON.parse(JSON.stringify(await dragonFisherUseNetBomb(data))) as Awaited<
          ReturnType<typeof dragonFisherUseNetBomb>
        >;
      },
      "dragon-fisher",
    );
  });

export const dragonFisherUseFreezeLureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .handler(async () => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "dragonFisherUseFreezeLureFn",
      null,
      async () => {
        const { dragonFisherUseFreezeLure } = await import("../server/games/dragon-fisher.server");
        return dragonFisherUseFreezeLure();
      },
      "dragon-fisher",
    );
  });

export const dragonFisherSyncSpawnsFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .handler(async () => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "dragonFisherSyncSpawnsFn",
      null,
      async () => {
        const { dragonFisherSyncSpawns } = await import("../server/games/dragon-fisher.server");
        return dragonFisherSyncSpawns();
      },
      "dragon-fisher",
    );
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
  .middleware([operationIdentity])
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveDragonFisherEngineConfig } = await import("../server/superadmin/services.server");
    return saveDragonFisherEngineConfig(data.config);
  });
