/**
 * Domain 3 Superadmin RPC — client-safe.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Matches users.id varchar(36) — UUIDs and legacy custom ids like usr_*. */
const userIdSchema = z.string().min(1).max(36);
const userRoleSchema = z.enum(["player", "admin", "agent", "master_agent", "superadmin"]);

export const getSuperDashboardFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchSuperDashboard } = await import("../server/superadmin/services.server");
  return fetchSuperDashboard();
});

const listUsersSchema = z.object({
  q: z.string().max(128).optional(),
  role: z.enum(["player", "admin", "agent", "master_agent", "superadmin", "all"]).optional(),
  limit: z.number().int().min(1).max(300).optional(),
});

export const listSuperUsersFn = createServerFn({ method: "GET" })
  .validator(listUsersSchema)
  .handler(async ({ data }) => {
    const { listSuperUsers } = await import("../server/superadmin/services.server");
    return listSuperUsers(data);
  });

const setRoleSchema = z.object({
  userId: userIdSchema,
  role: userRoleSchema,
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
  role: userRoleSchema,
  displayName: z.string().max(128).optional(),
  parentAgentId: userIdSchema.optional(),
  publicUserId: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
});

export const superCreateUserFn = createServerFn({ method: "POST" })
  .validator(createUserSchema)
  .handler(async ({ data }) => {
    const { superCreateUser } = await import("../server/superadmin/services.server");
    return superCreateUser(data);
  });

const updateUserSchema = z.object({
  userId: userIdSchema,
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
  userId: userIdSchema,
  delta: z.number().finite(),
  note: z.string().max(500).optional(),
  confirmPassword: z.string().min(1).max(128),
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

export const superSetJackpotEnabledFn = createServerFn({ method: "POST" })
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }) => {
    const { superSetJackpotEnabled } = await import("../server/superadmin/services.server");
    return superSetJackpotEnabled(data.enabled);
  });

export const superSetUltraMegaJackpotFn = createServerFn({ method: "POST" })
  .validator(jackpotSchema)
  .handler(async ({ data }) => {
    const { superSetUltraMegaJackpot } = await import("../server/superadmin/services.server");
    return superSetUltraMegaJackpot(data.amount);
  });

export const assignJackpotToPlayerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: z.string().min(1).max(64),
      resetAmount: z.number().finite().nonnegative().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { assignJackpotToPlayer } = await import("../server/superadmin/services.server");
    return assignJackpotToPlayer(data);
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
  const { getChineseNewYearEngineConfig } = await import("../server/superadmin/services.server");
  return getChineseNewYearEngineConfig();
});

export const saveChineseNewYearEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveChineseNewYearEngineConfig } = await import("../server/superadmin/services.server");
    return saveChineseNewYearEngineConfig(data.config);
  });

export const saveGoldenPantherEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGoldenPantherEngineConfig } = await import("../server/superadmin/services.server");
    return saveGoldenPantherEngineConfig(data.config);
  });

/** Public — Mahjong Ways math config for the live engine. */
export const getMahjongWaysEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMahjongWaysEngineConfig } = await import("../server/superadmin/services.server");
  return getMahjongWaysEngineConfig();
});

export const saveMahjongWaysEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveMahjongWaysEngineConfig } = await import("../server/superadmin/services.server");
    return saveMahjongWaysEngineConfig(data.config);
  });

/** Public — Starlight Ace math config for the live engine. */
export const getStarlightAceEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getStarlightAceEngineConfig } = await import("../server/superadmin/services.server");
  return getStarlightAceEngineConfig();
});

export const saveStarlightAceEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveStarlightAceEngineConfig } = await import("../server/superadmin/services.server");
    return saveStarlightAceEngineConfig(data.config);
  });

/** Public — Super Ace math config for the live engine. */
export const getSuperAceEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSuperAceEngineConfig } = await import("../server/superadmin/services.server");
  return getSuperAceEngineConfig();
});

export const saveSuperAceEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveSuperAceEngineConfig } = await import("../server/superadmin/services.server");
    return saveSuperAceEngineConfig(data.config);
  });

/** Public — Frontier Gold math config for the live engine. */
export const getFrontierGoldEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFrontierGoldEngineConfig } = await import("../server/superadmin/services.server");
  return getFrontierGoldEngineConfig();
});

export const saveFrontierGoldEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFrontierGoldEngineConfig } = await import("../server/superadmin/services.server");
    return saveFrontierGoldEngineConfig(data.config);
  });

/** Public — Buffalo Reign (buffalo-reign) math config. */
export const getBuffaloReignEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBuffaloReignEngineConfig } = await import("../server/superadmin/services.server");
  return getBuffaloReignEngineConfig();
});

export const saveBuffaloReignEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveBuffaloReignEngineConfig } = await import("../server/superadmin/services.server");
    return saveBuffaloReignEngineConfig(data.config);
  });

/** Public — Fire Spike math config for the live engine. */
export const getFireSpikeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFireSpikeEngineConfig } = await import("../server/superadmin/services.server");
  return getFireSpikeEngineConfig();
});

export const saveFireSpikeEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFireSpikeEngineConfig } = await import("../server/superadmin/services.server");
    return saveFireSpikeEngineConfig(data.config);
  });

/** Public — Fortune Gems math config for the live engine. */
export const getFortuneGemsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneGemsEngineConfig } = await import("../server/superadmin/services.server");
  return getFortuneGemsEngineConfig();
});

export const saveFortuneGemsEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFortuneGemsEngineConfig } = await import("../server/superadmin/services.server");
    return saveFortuneGemsEngineConfig(data.config);
  });

export const getPugLifeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPugLifeEngineConfig } = await import("../server/superadmin/services.server");
  return getPugLifeEngineConfig();
});

export const savePugLifeEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { savePugLifeEngineConfig } = await import("../server/superadmin/services.server");
    return savePugLifeEngineConfig(data.config);
  });

export const getReelRiotEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getReelRiotEngineConfig } = await import("../server/superadmin/services.server");
  return getReelRiotEngineConfig();
});

export const saveReelRiotEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveReelRiotEngineConfig } = await import("../server/superadmin/services.server");
    return saveReelRiotEngineConfig(data.config);
  });

/** Public — Piñata Wins math config for the live engine. */
export const getPinataWinsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPinataWinsEngineConfig } = await import("../server/superadmin/services.server");
  return getPinataWinsEngineConfig();
});

export const savePinataWinsEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { savePinataWinsEngineConfig } = await import("../server/superadmin/services.server");
    return savePinataWinsEngineConfig(data.config);
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

export const superGetUserSecurityDetailsFn = createServerFn({ method: "GET" })
  .validator(z.object({ userId: userIdSchema }))
  .handler(async ({ data }) => {
    const { superGetUserSecurityDetails } = await import("../server/superadmin/services.server");
    return superGetUserSecurityDetails(data.userId);
  });

export const superToggleLockUserFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: userIdSchema,
      lock: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { adminToggleUserLock } = await import("../server/admin/services.server");
    const { getDb } = await import("../server/db/client");
    const { users } = await import("../server/db/schema");
    const { eq } = await import("drizzle-orm");
    await adminToggleUserLock(data);
    const db = getDb();
    const [row] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
    if (!row) throw new Error("User not found");
    return {
      id: row.id,
      username: row.username,
      isLocked: (row.isLocked ?? "no") as "yes" | "no",
    };
  });

export const superForceLogoutUserFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: userIdSchema }))
  .handler(async ({ data }) => {
    const { adminForceLogoutUser } = await import("../server/admin/services.server");
    return adminForceLogoutUser(data);
  });

export const superResetFailedAttemptsFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: userIdSchema }))
  .handler(async ({ data }) => {
    const { adminResetFailedAttempts } = await import("../server/admin/services.server");
    return adminResetFailedAttempts(data);
  });

export const getPlatformEarningsGraphFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        period: z.enum(["day", "week", "month"]).optional(),
        gameId: z.string().max(64).optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const { fetchPlatformEarningsGraph } = await import("../server/superadmin/services.server");
    return fetchPlatformEarningsGraph(data);
  });


