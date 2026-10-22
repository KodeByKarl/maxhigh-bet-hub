/**
 * Royal Climb (lucky-drop) client RPC bridge (createServerFn).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export const luckyDropStartFn = createServerFn({ method: "POST" })
  .validator(z.object({ bet: z.number().finite().positive().max(100_000) }))
  .handler(async ({ data }) => {
    const { luckyDropStart } = await import("../server/games/lucky-drop.server");
    return clone(await luckyDropStart(data));
  });

export const luckyDropGuessFn = createServerFn({ method: "POST" })
  .validator(z.object({ pick: z.enum(["higher", "lower"]) }))
  .handler(async ({ data }) => {
    const { luckyDropGuess } = await import("../server/games/lucky-drop.server");
    return clone(await luckyDropGuess(data));
  });

export const luckyDropSkipFn = createServerFn({ method: "POST" }).handler(async () => {
  const { luckyDropSkip } = await import("../server/games/lucky-drop.server");
  return clone(await luckyDropSkip());
});

export const luckyDropCashoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { luckyDropCashout } = await import("../server/games/lucky-drop.server");
  return clone(await luckyDropCashout());
});

export const getLuckyDropOpenRunFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyDropOpenRun } = await import("../server/games/lucky-drop.server");
  return clone(await getLuckyDropOpenRun());
});

export const getLuckyDropEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyDropEngineConfigPublic } = await import("../server/games/lucky-drop.server");
  return getLuckyDropEngineConfigPublic();
});
