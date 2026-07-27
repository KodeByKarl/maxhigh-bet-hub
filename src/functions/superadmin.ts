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

/** Public — Godly Gates math config for the live engine. */
export const getGodlyGatesEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGodlyGatesEngineConfig } = await import("../server/superadmin/services.server");
  return getGodlyGatesEngineConfig();
});

export const saveGodlyGatesEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGodlyGatesEngineConfig } = await import("../server/superadmin/services.server");
    return saveGodlyGatesEngineConfig(data.config);
  });

/** Public — Sugar Surge math config for the live engine. */
export const getSugarSurgeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSugarSurgeEngineConfig } = await import("../server/superadmin/services.server");
  return getSugarSurgeEngineConfig();
});

export const saveSugarSurgeEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveSugarSurgeEngineConfig } = await import("../server/superadmin/services.server");
    return saveSugarSurgeEngineConfig(data.config);
  });

/** Public — Golden Panther math config for the live engine. */
export const getGoldenPantherEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGoldenPantherEngineConfig } = await import("../server/superadmin/services.server");
  return getGoldenPantherEngineConfig();
});

export const getChineseNewYearEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { DEFAULT_CHINESE_NEW_YEAR_CONFIG } = await import("../lib/chinese-new-year-config");
  return DEFAULT_CHINESE_NEW_YEAR_CONFIG;
});

export const saveGoldenPantherEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGoldenPantherEngineConfig } = await import("../server/superadmin/services.server");
    return saveGoldenPantherEngineConfig(data.config);
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

// Carousel & Additional Superadmin RPC exports
export const listCarouselSlidesFn = createServerFn({ method: "GET" }).handler(async () => {
  return [
    {
      id: "daily",
      badge: "Daily",
      title: "Daily Race",
      headline: "Daily Race",
      sub: "Compete for prizes · Active now",
      cta: "Join Race",
      linkUrl: null,
      imageUrl: "/promos/promo-daily-race.png",
      sortOrder: 0,
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "cny",
      badge: "Festive",
      title: "Chinese New Year",
      headline: "Chinese New Year",
      sub: "Play the new Chinese Zodiac slot!",
      cta: "Play Now",
      linkUrl: null,
      imageUrl: "/images/thumbnails/chinese_thumb.png",
      sortOrder: 1,
      enabled: true,
      createdAt: new Date().toISOString(),
    },
  ];
});

export const createCarouselSlideFn = createServerFn({ method: "POST" })
  .validator(z.unknown())
  .handler(async () => ({ success: true }));

export const deleteCarouselSlideFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async () => ({ success: true }));

export const toggleCarouselSlideFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), enabled: z.boolean() }))
  .handler(async () => ({ success: true }));

export const bulkApplyGameOutcomesFn = createServerFn({ method: "POST" })
  .validator(z.unknown())
  .handler(async () => ({ success: true }));

export const listGameSettingsLogsFn = createServerFn({ method: "GET" }).handler(async () => []);

export const assignJackpotToPlayerFn = createServerFn({ method: "POST" })
  .validator(z.unknown())
  .handler(async () => ({ success: true }));

export const superGetUserSecurityDetailsFn = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async () => ({ ip: "127.0.0.1", lastLogin: new Date().toISOString() }));

export const superToggleLockUserFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string(), lock: z.boolean() }))
  .handler(async () => ({ success: true }));

export const superForceLogoutUserFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string() }))
  .handler(async () => ({ success: true }));

export const superResetFailedAttemptsFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string() }))
  .handler(async () => ({ success: true }));

export const getSuperMasterChipPoolFn = createServerFn({ method: "GET" }).handler(async () => ({ pool: 1000000 }));

export const superGenerateMasterChipsFn = createServerFn({ method: "POST" })
  .validator(z.object({ amount: z.number() }))
  .handler(async () => ({ success: true }));

export const getPlatformEarningsGraphFn = createServerFn({ method: "GET" }).handler(async () => {
  return [
    { label: "Mon", earnings: 12000, volume: 150000 },
    { label: "Tue", earnings: 18000, volume: 210000 },
    { label: "Wed", earnings: 15000, volume: 190000 },
    { label: "Thu", earnings: 24000, volume: 310000 },
    { label: "Fri", earnings: 32000, volume: 450000 },
    { label: "Sat", earnings: 45000, volume: 620000 },
    { label: "Sun", earnings: 39000, volume: 510000 },
  ];
});

export const superTransferChipsToAdminFn = createServerFn({ method: "POST" })
  .validator(z.object({ adminId: z.string(), amount: z.number() }))
  .handler(async () => ({ success: true }));


