/**
 * Color Game client RPC bridge (createServerFn).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const spotBetSchema = z.record(z.string(), z.number().finite().min(0).max(100_000));

const colorGameDealSchema = z.object({
  bets: spotBetSchema,
});

export const colorGameDealFn = createServerFn({ method: "POST" })
  .validator(colorGameDealSchema)
  .handler(async ({ data }) => {
    const { colorGamePaidDeal } = await import("../server/games/color-game.server");
    return JSON.parse(JSON.stringify(await colorGamePaidDeal(data))) as Awaited<
      ReturnType<typeof colorGamePaidDeal>
    >;
  });

export const getColorGameEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getColorGameEngineConfigPublic } = await import("../server/games/color-game.server");
  return getColorGameEngineConfigPublic();
});
