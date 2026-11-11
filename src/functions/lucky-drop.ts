import { operationIdentity } from "@/lib/operation-identity";
/**
 * Royal Climb (lucky-drop) client RPC bridge (createServerFn).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export const luckyDropStartFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(z.object({ bet: z.number().finite().positive().max(100_000) }))
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "luckyDropStartFn",
      data,
      async () => {
        const { luckyDropStart } = await import("../server/games/lucky-drop.server");
        return clone(await luckyDropStart(data));
      },
      "lucky-drop",
    );
  });

export const luckyDropGuessFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(z.object({ pick: z.enum(["higher", "lower"]) }))
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "luckyDropGuessFn",
      data,
      async () => {
        const { luckyDropGuess } = await import("../server/games/lucky-drop.server");
        return clone(await luckyDropGuess(data));
      },
      "lucky-drop",
    );
  });

export const luckyDropSkipFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .handler(async () => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "luckyDropSkipFn",
      null,
      async () => {
        const { luckyDropSkip } = await import("../server/games/lucky-drop.server");
        return clone(await luckyDropSkip());
      },
      "lucky-drop",
    );
  });

export const luckyDropCashoutFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .handler(async () => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "luckyDropCashoutFn",
      null,
      async () => {
        const { luckyDropCashout } = await import("../server/games/lucky-drop.server");
        return clone(await luckyDropCashout());
      },
      "lucky-drop",
    );
  });

export const getLuckyDropOpenRunFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyDropOpenRun } = await import("../server/games/lucky-drop.server");
  return clone(await getLuckyDropOpenRun());
});

export const getLuckyDropEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyDropEngineConfigPublic } = await import("../server/games/lucky-drop.server");
  return getLuckyDropEngineConfigPublic();
});
