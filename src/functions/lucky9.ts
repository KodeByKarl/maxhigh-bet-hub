/**
 * Lucky 9 client RPC bridge (createServerFn).
 * Player deal + public engine config. Superadmin save/load lives in `@/functions/superadmin`
 * (same pattern as Ace High).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const lucky9DealSchema = z.object({
  playerBet: z.number().finite().min(0).max(100_000).optional(),
  dealerBet: z.number().finite().min(0).max(100_000).optional(),
  tieBet: z.number().finite().min(0).max(100_000).optional(),
});

export const lucky9DealFn = createServerFn({ method: "POST" })
  .validator(lucky9DealSchema)
  .handler(async ({ data }) => {
    const { lucky9PaidDeal } = await import("../server/games/lucky9.server");
    return JSON.parse(JSON.stringify(await lucky9PaidDeal(data))) as Awaited<
      ReturnType<typeof lucky9PaidDeal>
    >;
  });

/** Public engine config for the live table UI (reads game_controls.engineConfig). */
export const getLucky9EngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLucky9EngineConfigPublic } = await import("../server/games/lucky9.server");
  return getLucky9EngineConfigPublic();
});
