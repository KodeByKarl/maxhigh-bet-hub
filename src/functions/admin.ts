/**
 * Admin portal RPC (Domain 2).
 * Client-safe — must stay outside src/server/**
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAdminDashboardFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchAdminDashboard } = await import("../server/admin/services.server");
  return fetchAdminDashboard();
});

const listUsersSchema = z.object({
  q: z.string().max(128).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export const listAdminUsersFn = createServerFn({ method: "GET" })
  .validator(listUsersSchema)
  .handler(async ({ data }) => {
    const { listAdminUsers } = await import("../server/admin/services.server");
    return listAdminUsers(data);
  });

const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().email().max(255).optional(),
);

const createUserSchema = z.object({
  email: optionalEmail,
  username: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(128),
  balance: z.number().finite().nonnegative().optional(),
  role: z.enum(["player", "admin", "agent", "master_agent", "superadmin"]).optional(),
  displayName: z.string().max(128).optional(),
});

export const adminCreateUserFn = createServerFn({ method: "POST" })
  .validator(createUserSchema)
  .handler(async ({ data }) => {
    const { adminCreatePlayer } = await import("../server/admin/services.server");
    return adminCreatePlayer(data);
  });

const adjustUserSchema = z.object({
  userId: z.string().uuid(),
  delta: z.number().finite(),
  note: z.string().max(500).optional(),
});

export const adminAdjustBalanceFn = createServerFn({ method: "POST" })
  .validator(adjustUserSchema)
  .handler(async ({ data }) => {
    const { adminAdjustUserBalance } = await import("../server/admin/services.server");
    return adminAdjustUserBalance(data);
  });

const toggleLockSchema = z.object({
  userId: z.string().uuid(),
  lock: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});

export const adminToggleUserLockFn = createServerFn({ method: "POST" })
  .validator(toggleLockSchema)
  .handler(async ({ data }) => {
    const { adminToggleUserLock } = await import("../server/admin/services.server");
    return adminToggleUserLock(data);
  });

const lockUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const adminLockUserFn = createServerFn({ method: "POST" })
  .validator(lockUserSchema)
  .handler(async ({ data }) => {
    const { adminLockUser } = await import("../server/admin/services.server");
    return adminLockUser(data);
  });

const userIdOnlySchema = z.object({
  userId: z.string().uuid(),
});

export const adminUnlockUserFn = createServerFn({ method: "POST" })
  .validator(userIdOnlySchema)
  .handler(async ({ data }) => {
    const { adminUnlockUser } = await import("../server/admin/services.server");
    return adminUnlockUser(data);
  });

export const adminForceLogoutUserFn = createServerFn({ method: "POST" })
  .validator(userIdOnlySchema)
  .handler(async ({ data }) => {
    const { adminForceLogoutUser } = await import("../server/admin/services.server");
    return adminForceLogoutUser(data);
  });

export const adminResetFailedAttemptsFn = createServerFn({ method: "POST" })
  .validator(userIdOnlySchema)
  .handler(async ({ data }) => {
    const { adminResetFailedAttempts } = await import("../server/admin/services.server");
    return adminResetFailedAttempts(data);
  });

const auditListSchema = z.object({
  q: z.string().max(128).optional(),
  action: z.string().max(64).optional(),
  limit: z.number().int().min(1).max(300).optional(),
  dayIndex: z.number().int().min(0).max(6).optional(),
  scope: z.enum(["system", "all"]).optional(),
});

export const listAdminAuditLogsFn = createServerFn({ method: "GET" })
  .validator(auditListSchema)
  .handler(async ({ data }) => {
    const { listAdminAuditLogs } = await import("../server/admin/services.server");
    return listAdminAuditLogs(data);
  });

const dayPulseSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
});

export const getAdminDayPulseFn = createServerFn({ method: "GET" })
  .validator(dayPulseSchema)
  .handler(async ({ data }) => {
    const { fetchAdminDayPulse } = await import("../server/admin/services.server");
    return fetchAdminDayPulse(data.dayIndex);
  });

export const recordAdminLoginFn = createServerFn({ method: "POST" }).handler(async () => {
  const { getSessionUser } = await import("../server/session");
  const { recordAdminLogin } = await import("../server/admin/services.server");
  const { isStaffRole } = await import("../lib/user");
  const user = await getSessionUser();
  if (!user || !isStaffRole(user.role)) throw new Error("Admin access only");
  await recordAdminLogin(user);
  return { ok: true as const };
});

const txListSchema = z.object({
  q: z.string().max(128).optional(),
  type: z.enum(["deposit", "withdraw", "bet", "win", "adjust", "jackpot", "all", "fund", "game"]).optional(),
  game: z.string().max(64).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const listAdminTransactionsFn = createServerFn({ method: "GET" })
  .validator(txListSchema)
  .handler(async ({ data }) => {
    const { listAdminTransactions } = await import("../server/admin/services.server");
    return listAdminTransactions(data);
  });

export const getWinLoseSummaryFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchWinLoseSummary } = await import("../server/admin/services.server");
  return fetchWinLoseSummary();
});

const reportLimitSchema = z.object({
  limit: z.number().int().min(1).max(500).optional(),
});

export const getWinLoseByLevelFn = createServerFn({ method: "GET" })
  .validator(reportLimitSchema)
  .handler(async ({ data }) => {
    const { fetchWinLoseByLevel } = await import("../server/admin/services.server");
    return fetchWinLoseByLevel(data);
  });

export const getWinLoseByProductFn = createServerFn({ method: "GET" })
  .validator(reportLimitSchema)
  .handler(async ({ data }) => {
    const { fetchWinLoseByProduct } = await import("../server/admin/services.server");
    return fetchWinLoseByProduct(data);
  });

const listWalletSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

/** Fund In/Out — shared with Superadmin (any staff can approve). */
export const listAdminWalletRequestsFn = createServerFn({ method: "GET" })
  .validator(listWalletSchema)
  .handler(async ({ data }) => {
    const { listWalletRequests } = await import("../server/superadmin/services.server");
    return listWalletRequests(data);
  });

const reviewWalletSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});

export const reviewAdminWalletRequestFn = createServerFn({ method: "POST" })
  .validator(reviewWalletSchema)
  .handler(async ({ data }) => {
    const { reviewWalletRequest } = await import("../server/superadmin/services.server");
    return reviewWalletRequest(data);
  });
