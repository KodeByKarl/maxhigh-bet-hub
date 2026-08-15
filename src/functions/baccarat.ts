/**
 * Baccarat client RPC bridge (createServerFn).
 * Player + superadmin engine config live here so Vite/TanStack picks them up.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const baccaratDealSchema = z.object({
  playerBet: z.number().finite().min(0).max(100_000).optional(),
  bankerBet: z.number().finite().min(0).max(100_000).optional(),
  tieBet: z.number().finite().min(0).max(100_000).optional(),
  playerPairBet: z.number().finite().min(0).max(100_000).optional(),
  bankerPairBet: z.number().finite().min(0).max(100_000).optional(),
});

export const baccaratDealFn = createServerFn({ method: "POST" })
  .validator(baccaratDealSchema)
  .handler(async ({ data }) => {
    const { baccaratPaidDeal } = await import("../server/games/baccarat.server");
    return JSON.parse(JSON.stringify(await baccaratPaidDeal(data))) as Awaited<
      ReturnType<typeof baccaratPaidDeal>
    >;
  });

/** Public engine config for the live table UI. */
export const getBaccaratEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBaccaratEngineConfigPublic } = await import("../server/games/baccarat.server");
  return getBaccaratEngineConfigPublic();
});

/** Superadmin — load engineConfig from game_controls. */
export const getBaccaratAdminConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBaccaratEngineConfig } = await import("../server/superadmin/services.server");
  return getBaccaratEngineConfig();
});

/** Superadmin — persist engineConfig JSON. */
export const saveBaccaratAdminConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveBaccaratEngineConfig } = await import("../server/superadmin/services.server");
    return saveBaccaratEngineConfig(data.config);
  });
