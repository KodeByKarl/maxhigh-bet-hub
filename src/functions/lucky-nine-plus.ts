/**
 * Lucky Nine Plus client RPC bridge (createServerFn).
 * Player deal + public engine config. Superadmin save/load lives in `@/functions/superadmin`
 * (same pattern as Ace High).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const luckyNinePlusDealSchema = z.object({
  playerBet: z.number().finite().min(0).max(100_000).optional(),
  dealerBet: z.number().finite().min(0).max(100_000).optional(),
  tieBet: z.number().finite().min(0).max(100_000).optional(),
});

export const luckyNinePlusDealFn = createServerFn({ method: "POST" })
  .validator(luckyNinePlusDealSchema)
  .handler(async ({ data }) => {
    const { luckyNinePlusPaidDeal } = await import("../server/games/lucky-nine-plus.server");
    return JSON.parse(JSON.stringify(await luckyNinePlusPaidDeal(data))) as Awaited<
      ReturnType<typeof luckyNinePlusPaidDeal>
    >;
  });

/** Public engine config for the live table UI (reads game_controls.engineConfig). */
export const getLuckyNinePlusEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyNinePlusEngineConfigPublic } = await import("../server/games/lucky-nine-plus.server");
  return getLuckyNinePlusEngineConfigPublic();
});
