/**
 * Tongits Arena client RPC bridge (createServerFn).
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

export const tongitsArenaDealFn = createServerFn({ method: "POST" })
  .validator(dealSchema)
  .handler(async ({ data }) => {
    const { tongitsArenaPaidDeal } = await import("../server/games/tongits-arena.server");
    return JSON.parse(JSON.stringify(await tongitsArenaPaidDeal(data))) as Awaited<
      ReturnType<typeof tongitsArenaPaidDeal>
    >;
  });

export const tongitsArenaPlayFn = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(async ({ data }) => {
    const { tongitsArenaPlay } = await import("../server/games/tongits-arena.server");
    return JSON.parse(JSON.stringify(await tongitsArenaPlay(data))) as Awaited<
      ReturnType<typeof tongitsArenaPlay>
    >;
  });

export const tongitsArenaFoldFn = createServerFn({ method: "POST" })
  .validator(sessionSchema)
  .handler(async ({ data }) => {
    const { tongitsArenaFold } = await import("../server/games/tongits-arena.server");
    return JSON.parse(JSON.stringify(await tongitsArenaFold(data))) as Awaited<
      ReturnType<typeof tongitsArenaFold>
    >;
  });

export const getTongitsArenaSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getTongitsArenaOpenSession } = await import("../server/games/tongits-arena.server");
  return getTongitsArenaOpenSession();
});

/** Public engine config for the live table UI (reads game_controls.engineConfig). */
export const getTongitsArenaEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getTongitsArenaEngineConfigPublic } = await import(
      "../server/games/tongits-arena.server"
    );
    return getTongitsArenaEngineConfigPublic();
  },
);
