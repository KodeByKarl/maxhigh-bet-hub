/**
 * Poker Showdown client RPC bridge (createServerFn).
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

export const pokerShowdownDealFn = createServerFn({ method: "POST" })
  .validator(dealSchema)
  .handler(async ({ data }) => {
    const { pokerShowdownPaidDeal } = await import("../server/games/poker-showdown.server");
    return JSON.parse(JSON.stringify(await pokerShowdownPaidDeal(data))) as Awaited<
      ReturnType<typeof pokerShowdownPaidDeal>
    >;
  });

export const pokerShowdownPlayFn = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(async ({ data }) => {
    const { pokerShowdownPlay } = await import("../server/games/poker-showdown.server");
    return JSON.parse(JSON.stringify(await pokerShowdownPlay(data))) as Awaited<
      ReturnType<typeof pokerShowdownPlay>
    >;
  });

export const pokerShowdownFoldFn = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(async ({ data }) => {
    const { pokerShowdownFold } = await import("../server/games/poker-showdown.server");
    return JSON.parse(JSON.stringify(await pokerShowdownFold(data))) as Awaited<
      ReturnType<typeof pokerShowdownFold>
    >;
  });

export const getPokerShowdownSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPokerShowdownOpenSession } = await import("../server/games/poker-showdown.server");
  return getPokerShowdownOpenSession();
});

/** Public engine config for the live table UI (reads game_controls.engineConfig). */
export const getPokerShowdownEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getPokerShowdownEngineConfigPublic } = await import(
      "../server/games/poker-showdown.server"
    );
    return getPokerShowdownEngineConfigPublic();
  },
);
