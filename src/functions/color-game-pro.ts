import { operationIdentity } from "@/lib/operation-identity";
/**
 * Color Game Pro client RPC bridge (createServerFn).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const spotBetSchema = z.record(z.string(), z.number().finite().min(0).max(100_000));

const colorGameProDealSchema = z.object({
  bets: spotBetSchema,
});

export const colorGameProDealFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(colorGameProDealSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "colorGameProDealFn",
      data,
      async () => {
        const { colorGameProPaidDeal } = await import("../server/games/color-game-pro.server");
        return JSON.parse(JSON.stringify(await colorGameProPaidDeal(data))) as Awaited<
          ReturnType<typeof colorGameProPaidDeal>
        >;
      },
      "color-game-pro",
    );
  });

export const getColorGameProEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getColorGameProEngineConfigPublic } =
    await import("../server/games/color-game-pro.server");
  return getColorGameProEngineConfigPublic();
});
