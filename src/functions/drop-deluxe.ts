import { operationIdentity } from "@/lib/operation-identity";
/**
 * Deluxe Draw (drop-deluxe) client RPC bridge (createServerFn).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export const dropDeluxeDealFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(z.object({ bet: z.number().finite().positive().max(100_000) }))
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "dropDeluxeDealFn",
      data,
      async () => {
        const { dropDeluxeDeal } = await import("../server/games/drop-deluxe.server");
        return clone(await dropDeluxeDeal(data));
      },
      "drop-deluxe",
    );
  });

export const dropDeluxeDrawFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(z.object({ holds: z.array(z.boolean()).length(5) }))
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "dropDeluxeDrawFn",
      data,
      async () => {
        const { dropDeluxeDraw } = await import("../server/games/drop-deluxe.server");
        return clone(await dropDeluxeDraw(data));
      },
      "drop-deluxe",
    );
  });

export const getDropDeluxeOpenHandFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDropDeluxeOpenHand } = await import("../server/games/drop-deluxe.server");
  return clone(await getDropDeluxeOpenHand());
});

export const getDropDeluxeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDropDeluxeEngineConfigPublic } = await import("../server/games/drop-deluxe.server");
  return getDropDeluxeEngineConfigPublic();
});
