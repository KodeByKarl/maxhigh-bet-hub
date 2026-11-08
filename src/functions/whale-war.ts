import { operationIdentity } from "@/lib/operation-identity";
/**
 * Whale War client RPC bridge (createServerFn).
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

export const whaleWarFireShotFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fireSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "whaleWarFireShotFn",
      data,
      async () => {
        const { whaleWarFireShot } = await import("../server/games/whale-war.server");
        return JSON.parse(JSON.stringify(await whaleWarFireShot(data))) as Awaited<
          ReturnType<typeof whaleWarFireShot>
        >;
      },
      "whale-war",
    );
  });

export const whaleWarEnsureSessionFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(z.object({ weaponId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "whaleWarEnsureSessionFn",
      data,
      async () => {
        const { whaleWarEnsureSession } = await import("../server/games/whale-war.server");
        return whaleWarEnsureSession(data);
      },
      "whale-war",
    );
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
  .middleware([operationIdentity])
  .validator(weaponSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "whaleWarSetWeaponFn",
      data,
      async () => {
        const { whaleWarSetWeapon } = await import("../server/games/whale-war.server");
        return whaleWarSetWeapon(data);
      },
      "whale-war",
    );
  });

export const whaleWarBuyPowerUpFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(powerSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "whaleWarBuyPowerUpFn",
      data,
      async () => {
        const { whaleWarBuyPowerUp } = await import("../server/games/whale-war.server");
        return whaleWarBuyPowerUp(data);
      },
      "whale-war",
    );
  });

export const whaleWarUseNetBombFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(netBombSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "whaleWarUseNetBombFn",
      data,
      async () => {
        const { whaleWarUseNetBomb } = await import("../server/games/whale-war.server");
        return JSON.parse(JSON.stringify(await whaleWarUseNetBomb(data))) as Awaited<
          ReturnType<typeof whaleWarUseNetBomb>
        >;
      },
      "whale-war",
    );
  });

export const whaleWarUseFreezeLureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .handler(async () => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "whaleWarUseFreezeLureFn",
      null,
      async () => {
        const { whaleWarUseFreezeLure } = await import("../server/games/whale-war.server");
        return whaleWarUseFreezeLure();
      },
      "whale-war",
    );
  });

export const whaleWarSyncSpawnsFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .handler(async () => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "whaleWarSyncSpawnsFn",
      null,
      async () => {
        const { whaleWarSyncSpawns } = await import("../server/games/whale-war.server");
        return whaleWarSyncSpawns();
      },
      "whale-war",
    );
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
  .middleware([operationIdentity])
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveWhaleWarEngineConfig } = await import("../server/superadmin/services.server");
    return saveWhaleWarEngineConfig(data.config);
  });
