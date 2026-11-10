import { operationIdentity } from "@/lib/operation-identity";
/**
 * Access-restriction RPCs: public lobby status, admin limit status, and applying a developer-signed grant.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAccessStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { publicAccessStatus } = await import("../server/access-admin.server");
  return publicAccessStatus();
});

export const getAdminLimitStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { adminLimitStatus } = await import("../server/access-admin.server");
  return adminLimitStatus();
});

const grantSchema = z.object({
  payload: z.string().min(2).max(8192),
  signature: z.string().min(8).max(256),
  keyId: z.string().min(1).max(64),
  confirm: z.string().max(64),
  confirmPassword: z.string().max(256).optional(),
});

export const applyEntitlementGrantFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(grantSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "applyEntitlementGrantFn",
      data,
      async () => {
        const { applyGrantAction } = await import("../server/access-admin.server");
        return applyGrantAction(data);
      },
      undefined,
    );
  });
