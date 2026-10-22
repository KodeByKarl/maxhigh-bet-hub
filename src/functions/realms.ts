/**
 * Realms family client RPC bridge (createServerFn) — one set of calls for all
 * 50 titles, each naming its gameId. Superadmin save/load lives in
 * `@/functions/superadmin`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isRealmsGameId } from "@/lib/realms";

const gameIdSchema = z.string().min(1).max(64).refine(isRealmsGameId, "Unknown game");

const gameSchema = z.object({ gameId: gameIdSchema });

const spinSchema = z.object({
  gameId: gameIdSchema,
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

const freeSpinSchema = z.object({
  gameId: gameIdSchema,
  sessionId: z.string().min(1).max(64),
});

const buySchema = z.object({
  gameId: gameIdSchema,
  bet: z.number().finite().positive().max(100_000),
  quantity: z.number().int().min(1).max(50),
});

export const realmsSpinFn = createServerFn({ method: "POST" })
  .validator(spinSchema)
  .handler(async ({ data }) => {
    const { realmsPaidSpin } = await import("../server/games/realms.server");
    return realmsPaidSpin(data);
  });

export const realmsFreeSpinFn = createServerFn({ method: "POST" })
  .validator(freeSpinSchema)
  .handler(async ({ data }) => {
    const { realmsFreeSpin } = await import("../server/games/realms.server");
    return realmsFreeSpin(data);
  });

export const realmsBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(buySchema)
  .handler(async ({ data }) => {
    const { realmsBuyFeature } = await import("../server/games/realms.server");
    return realmsBuyFeature(data);
  });

export const getRealmsSessionFn = createServerFn({ method: "GET" })
  .validator(gameSchema)
  .handler(async ({ data }) => {
    const { getRealmsOpenSession } = await import("../server/games/realms.server");
    return getRealmsOpenSession(data.gameId);
  });

/** Public — current math for a title (defaults until superadmin saves). */
export const getRealmsEngineConfigFn = createServerFn({ method: "GET" })
  .validator(gameSchema)
  .handler(async ({ data }) => {
    const { loadRealmsEngineConfig } = await import("../server/games/realms.server");
    return loadRealmsEngineConfig(data.gameId);
  });
