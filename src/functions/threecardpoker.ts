/**
 * Three Card Poker client RPC bridge (createServerFn).
 * Player deal / play / fold / session restore + public engine config.
 * Superadmin save/load lives in `@/functions/superadmin`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dealSchema = z.object({
  ante: z.number().finite().min(0.01).max(100_000),
  pairPlus: z.number().finite().min(0).max(100_000).optional(),
});

const sessionSchema = z.object({
  sessionId: z.string().min(1).max(64),
});

export const threeCardPokerDealFn = createServerFn({ method: "POST" })
  .validator(dealSchema)
  .handler(async ({ data }) => {
    const { threeCardPokerPaidDeal } = await import("../server/games/threecardpoker.server");
    return JSON.parse(JSON.stringify(await threeCardPokerPaidDeal(data))) as Awaited<
      ReturnType<typeof threeCardPokerPaidDeal>
    >;
  });

export const threeCardPokerPlayFn = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(async ({ data }) => {
    const { threeCardPokerPlay } = await import("../server/games/threecardpoker.server");
    return JSON.parse(JSON.stringify(await threeCardPokerPlay(data))) as Awaited<
      ReturnType<typeof threeCardPokerPlay>
    >;
  });

export const threeCardPokerFoldFn = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(async ({ data }) => {
    const { threeCardPokerFold } = await import("../server/games/threecardpoker.server");
    return JSON.parse(JSON.stringify(await threeCardPokerFold(data))) as Awaited<
      ReturnType<typeof threeCardPokerFold>
    >;
  });

export const getThreeCardPokerSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getThreeCardPokerOpenSession } = await import("../server/games/threecardpoker.server");
  return getThreeCardPokerOpenSession();
});

/** Public engine config for the live table UI (reads game_controls.engineConfig). */
export const getThreeCardPokerEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getThreeCardPokerEngineConfigPublic } = await import(
      "../server/games/threecardpoker.server"
    );
    return getThreeCardPokerEngineConfigPublic();
  },
);
