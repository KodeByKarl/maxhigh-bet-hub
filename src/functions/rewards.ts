import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { operationIdentity } from "@/lib/operation-identity";

export const listMyRewardsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listMyRewards } = await import("../server/rewards.server");
  return listMyRewards();
});
export const claimRewardFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    const { claimReward } = await import("../server/rewards.server");
    return withFinancialOperation("claimReward", data, () => claimReward(data.id));
  });
