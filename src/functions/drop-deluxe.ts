/**
 * Drop Deluxe client RPC bridge (createServerFn).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dropDeluxeDealSchema = z.object({
  bets: z.record(z.string(), z.number().finite().min(0).max(100_000)),
});

export const dropDeluxeDealFn = createServerFn({ method: "POST" })
  .validator(dropDeluxeDealSchema)
  .handler(async ({ data }) => {
    const { dropDeluxePaidDeal } = await import("../server/games/drop-deluxe.server");
    return JSON.parse(JSON.stringify(await dropDeluxePaidDeal(data))) as Awaited<
      ReturnType<typeof dropDeluxePaidDeal>
    >;
  });

export const getDropDeluxeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDropDeluxeEngineConfigPublic } = await import("../server/games/drop-deluxe.server");
  return getDropDeluxeEngineConfigPublic();
});
