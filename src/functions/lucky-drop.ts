/**
 * Lucky Drop client RPC bridge (createServerFn).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const luckyDropDealSchema = z.object({
  bets: z.record(z.string(), z.number().finite().min(0).max(100_000)),
});

export const luckyDropDealFn = createServerFn({ method: "POST" })
  .validator(luckyDropDealSchema)
  .handler(async ({ data }) => {
    const { luckyDropPaidDeal } = await import("../server/games/lucky-drop.server");
    return JSON.parse(JSON.stringify(await luckyDropPaidDeal(data))) as Awaited<
      ReturnType<typeof luckyDropPaidDeal>
    >;
  });

export const getLuckyDropEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyDropEngineConfigPublic } = await import("../server/games/lucky-drop.server");
  return getLuckyDropEngineConfigPublic();
});
