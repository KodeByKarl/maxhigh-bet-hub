/**
 * Domain 3 Superadmin RPC — client-safe.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getSuperDashboardFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchSuperDashboard } = await import("../server/superadmin/services.server");
  return fetchSuperDashboard();
});

const listUsersSchema = z.object({
  q: z.string().max(128).optional(),
  role: z.enum(["player", "admin", "superadmin", "all"]).optional(),
  limit: z.number().int().min(1).max(300).optional(),
});

export const listSuperUsersFn = createServerFn({ method: "GET" })
  .validator(listUsersSchema)
  .handler(async ({ data }) => {
    const { listSuperUsers } = await import("../server/superadmin/services.server");
    return listSuperUsers(data);
  });

const setRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["player", "admin", "superadmin"]),
});

export const superSetUserRoleFn = createServerFn({ method: "POST" })
  .validator(setRoleSchema)
  .handler(async ({ data }) => {
    const { superSetUserRole } = await import("../server/superadmin/services.server");
    return superSetUserRole(data);
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
  role: z.enum(["player", "admin", "superadmin"]),
  displayName: z.string().max(128).optional(),
});

export const superCreateUserFn = createServerFn({ method: "POST" })
  .validator(createUserSchema)
  .handler(async ({ data }) => {
    const { superCreateUser } = await import("../server/superadmin/services.server");
    return superCreateUser(data);
  });

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.union([z.string().email().max(255), z.null()]).optional(),
  ),
  username: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  displayName: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.union([z.string().max(128), z.null()]).optional(),
  ),
  password: z.string().min(6).max(128).optional(),
});

export const superUpdateUserFn = createServerFn({ method: "POST" })
  .validator(updateUserSchema)
  .handler(async ({ data }) => {
    const { superUpdateUser } = await import("../server/superadmin/services.server");
    return superUpdateUser(data);
  });

const adjustSchema = z.object({
  userId: z.string().uuid(),
  delta: z.number().finite(),
  note: z.string().max(500).optional(),
});

export const superAdjustBalanceFn = createServerFn({ method: "POST" })
  .validator(adjustSchema)
  .handler(async ({ data }) => {
    const { superAdjustBalance } = await import("../server/superadmin/services.server");
    return superAdjustBalance(data);
  });

export const listSuperGamesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listSuperGames } = await import("../server/superadmin/services.server");
  return listSuperGames();
});

const updateGameSchema = z.object({
  gameId: z.string().min(1).max(64),
  enabled: z.boolean().optional(),
  featured: z.boolean().optional(),
  tag: z.string().max(32).nullable().optional(),
  rtp: z.string().max(32).nullable().optional(),
  volatility: z.string().max(32).nullable().optional(),
  minBet: z.string().max(32).nullable().optional(),
  maxBet: z.string().max(32).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const superUpdateGameFn = createServerFn({ method: "POST" })
  .validator(updateGameSchema)
  .handler(async ({ data }) => {
    const { superUpdateGame } = await import("../server/superadmin/services.server");
    return superUpdateGame(data);
  });

const jackpotSchema = z.object({
  amount: z.number().finite().nonnegative(),
});

export const superSetJackpotFn = createServerFn({ method: "POST" })
  .validator(jackpotSchema)
  .handler(async ({ data }) => {
    const { superSetJackpot } = await import("../server/superadmin/services.server");
    return superSetJackpot(data.amount);
  });

/** Public — enabled games for casino lobby. */
export const getCatalogGamesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listEnabledCatalogGames } = await import("../server/superadmin/services.server");
  return listEnabledCatalogGames();
});

/** Public — Candy Peak math config for the live engine. */
export const getCandyPeakEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCandyPeakEngineConfig } = await import("../server/superadmin/services.server");
  return getCandyPeakEngineConfig();
});

export const saveCandyPeakEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCandyPeakEngineConfig } = await import("../server/superadmin/services.server");
    return saveCandyPeakEngineConfig(data.config);
  });

const listWalletSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export const listWalletRequestsFn = createServerFn({ method: "GET" })
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

export const reviewWalletRequestFn = createServerFn({ method: "POST" })
  .validator(reviewWalletSchema)
  .handler(async ({ data }) => {
    const { reviewWalletRequest } = await import("../server/superadmin/services.server");
    return reviewWalletRequest(data);
  });

export const getPlatformSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPlatformSettings } = await import("../server/superadmin/services.server");
  return getPlatformSettings();
});

const saveSettingsSchema = z.object({
  maintenanceMode: z.boolean(),
  announcementBanner: z.string().max(1000),
  minDeposit: z.number().finite().nonnegative(),
  maxDeposit: z.number().finite().positive(),
  minWithdraw: z.number().finite().nonnegative(),
  maxWithdraw: z.number().finite().positive(),
});

export const savePlatformSettingsFn = createServerFn({ method: "POST" })
  .validator(saveSettingsSchema)
  .handler(async ({ data }) => {
    const { savePlatformSettings } = await import("../server/superadmin/services.server");
    return savePlatformSettings(data);
  });

export const listPromotionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listPromotions } = await import("../server/superadmin/services.server");
  return listPromotions();
});

const createPromoSchema = z.object({
  code: z.string().min(2).max(64),
  description: z.string().max(500).optional(),
  bonusPercent: z.number().finite().positive(),
  maxBonus: z.number().finite().positive(),
  wageringMultiplier: z.number().finite().positive(),
});

export const createPromotionFn = createServerFn({ method: "POST" })
  .validator(createPromoSchema)
  .handler(async ({ data }) => {
    const { createPromotion } = await import("../server/superadmin/services.server");
    return createPromotion(data);
  });

export const togglePromotionFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), enabled: z.boolean() }))
  .handler(async ({ data }) => {
    const { togglePromotion } = await import("../server/superadmin/services.server");
    return togglePromotion(data.id, data.enabled);
  });

export const getRiskControlsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getRiskControls } = await import("../server/superadmin/services.server");
  return getRiskControls();
});

const saveRiskSchema = z.object({
  maxSingleBet: z.number().finite().positive(),
  maxDailyPayout: z.number().finite().positive(),
  autoFlagLargeWins: z.boolean(),
  largeWinThreshold: z.number().finite().positive(),
});

export const saveRiskControlsFn = createServerFn({ method: "POST" })
  .validator(saveRiskSchema)
  .handler(async ({ data }) => {
    const { saveRiskControls } = await import("../server/superadmin/services.server");
    return saveRiskControls(data);
  });

