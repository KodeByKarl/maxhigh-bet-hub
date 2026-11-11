import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { operationIdentity } from "@/lib/operation-identity";

export const createWalletRequestFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(
    z.object({
      type: z.enum(["deposit", "withdraw"]),
      amount: z.number().positive().max(1_000_000),
      note: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    const { createWalletRequest } = await import("../server/services.server");
    return withFinancialOperation("createWalletRequest", data, () => createWalletRequest(data));
  });
export const reviewWalletRequestFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(
    z.object({
      id: z.string().uuid(),
      decision: z.enum(["approve", "reject"]),
      note: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    const { reviewWalletRequest } = await import("../server/superadmin/services.server");
    return withFinancialOperation("reviewWalletRequest", data, () => reviewWalletRequest(data));
  });

export const listMyWalletRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listMyWalletRequests } = await import("../server/services.server");
  return listMyWalletRequests();
});
export const listPendingWalletRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listWalletRequests } = await import("../server/superadmin/services.server");
  return listWalletRequests({ status: "pending" });
});
