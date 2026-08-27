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

/** Public — Mermaid Riches math config for the live engine. */
export const getMermaidRichesEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMermaidRichesEngineConfig } = await import("../server/superadmin/services.server");
  return getMermaidRichesEngineConfig();
});

export const saveMermaidRichesEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveMermaidRichesEngineConfig } = await import("../server/superadmin/services.server");
    return saveMermaidRichesEngineConfig(data.config);
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

/** Public — Olympus Wrath math config for the live engine. */
export const getOlympusWrathEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getOlympusWrathEngineConfig } = await import("../server/superadmin/services.server");
  return getOlympusWrathEngineConfig();
});

export const saveOlympusWrathEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveOlympusWrathEngineConfig } = await import("../server/superadmin/services.server");
    return saveOlympusWrathEngineConfig(data.config);
  });

/** Public — Enchanted Grove math config for the live engine. */
export const getEnchantedGroveEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getEnchantedGroveEngineConfig } = await import("../server/superadmin/services.server");
  return getEnchantedGroveEngineConfig();
});

export const saveEnchantedGroveEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveEnchantedGroveEngineConfig } = await import("../server/superadmin/services.server");
    return saveEnchantedGroveEngineConfig(data.config);
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

/** Public — Boracay Bounce math config for the live engine. */
export const getBoracayBounceEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBoracayBounceEngineConfig } = await import("../server/superadmin/services.server");
  return getBoracayBounceEngineConfig();
});

export const saveBoracayBounceEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveBoracayBounceEngineConfig } = await import("../server/superadmin/services.server");
    return saveBoracayBounceEngineConfig(data.config);
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

export const getFiestaFireworksEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFiestaFireworksEngineConfig } = await import("../server/superadmin/services.server");
  return getFiestaFireworksEngineConfig();
});

export const saveFiestaFireworksEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFiestaFireworksEngineConfig } = await import("../server/superadmin/services.server");
    return saveFiestaFireworksEngineConfig(data.config);
  });

export const saveGoldenPantherEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGoldenPantherEngineConfig } = await import("../server/superadmin/services.server");
    return saveGoldenPantherEngineConfig(data.config);
  });

/** Public — Aztec Treasure math config for the live engine. */
export const getAztecTreasureEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getAztecTreasureEngineConfig } = await import("../server/superadmin/services.server");
  return getAztecTreasureEngineConfig();
});

export const saveAztecTreasureEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveAztecTreasureEngineConfig } = await import("../server/superadmin/services.server");
    return saveAztecTreasureEngineConfig(data.config);
  });

/** Public — Pirate Plunder math config for the live engine. */
export const getPiratePlunderEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPiratePlunderEngineConfig } = await import("../server/superadmin/services.server");
  return getPiratePlunderEngineConfig();
});

export const savePiratePlunderEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { savePiratePlunderEngineConfig } = await import("../server/superadmin/services.server");
    return savePiratePlunderEngineConfig(data.config);
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

/** Public — Mahjong Ways 2 math config for the live engine. */
export const getMahjongWays2EngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMahjongWays2EngineConfig } = await import("../server/superadmin/services.server");
  return getMahjongWays2EngineConfig();
});

export const saveMahjongWays2EngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveMahjongWays2EngineConfig } = await import("../server/superadmin/services.server");
    return saveMahjongWays2EngineConfig(data.config);
  });

/** Public — Dragon & Phoenix math config for the live engine. */
export const getDragonPhoenixEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDragonPhoenixEngineConfig } = await import("../server/superadmin/services.server");
  return getDragonPhoenixEngineConfig();
});

export const saveDragonPhoenixEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveDragonPhoenixEngineConfig } = await import("../server/superadmin/services.server");
    return saveDragonPhoenixEngineConfig(data.config);
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

/** Public — Manila Nights math config for the live engine. */
export const getManilaNightsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getManilaNightsEngineConfig } = await import("../server/superadmin/services.server");
  return getManilaNightsEngineConfig();
});

export const saveManilaNightsEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveManilaNightsEngineConfig } = await import("../server/superadmin/services.server");
    return saveManilaNightsEngineConfig(data.config);
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

/** Public — Mega Ace math config for the live engine. */
export const getMegaAceEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMegaAceEngineConfig } = await import("../server/superadmin/services.server");
  return getMegaAceEngineConfig();
});

export const saveMegaAceEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveMegaAceEngineConfig } = await import("../server/superadmin/services.server");
    return saveMegaAceEngineConfig(data.config);
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

/** Public — Boxing King math config for the live engine. */
export const getBoxingKingEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBoxingKingEngineConfig } = await import("../server/superadmin/services.server");
  return getBoxingKingEngineConfig();
});

export const saveBoxingKingEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveBoxingKingEngineConfig } = await import("../server/superadmin/services.server");
    return saveBoxingKingEngineConfig(data.config);
  });

/** Public — Goal Rush math config for the live engine. */
export const getGoalRushEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGoalRushEngineConfig } = await import("../server/superadmin/services.server");
  return getGoalRushEngineConfig();
});

export const saveGoalRushEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGoalRushEngineConfig } = await import("../server/superadmin/services.server");
    return saveGoalRushEngineConfig(data.config);
  });

/** Public — Money Coming math config for the live engine. */
export const getMoneyComingEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMoneyComingEngineConfig } = await import("../server/superadmin/services.server");
  return getMoneyComingEngineConfig();
});

export const saveMoneyComingEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveMoneyComingEngineConfig } = await import("../server/superadmin/services.server");
    return saveMoneyComingEngineConfig(data.config);
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

/** Public — Fortune Ox math config for the live engine. */
export const getFortuneOxEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneOxEngineConfig } = await import("../server/superadmin/services.server");
  return getFortuneOxEngineConfig();
});

export const saveFortuneOxEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFortuneOxEngineConfig } = await import("../server/superadmin/services.server");
    return saveFortuneOxEngineConfig(data.config);
  });

/** Public — Fortune Tiger math config for the live engine. */
export const getFortuneTigerEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneTigerEngineConfig } = await import("../server/superadmin/services.server");
  return getFortuneTigerEngineConfig();
});

export const saveFortuneTigerEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFortuneTigerEngineConfig } = await import("../server/superadmin/services.server");
    return saveFortuneTigerEngineConfig(data.config);
  });

/** Public — Fortune Rabbit math config for the live engine. */
export const getFortuneRabbitEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneRabbitEngineConfig } = await import("../server/superadmin/services.server");
  return getFortuneRabbitEngineConfig();
});

export const saveFortuneRabbitEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFortuneRabbitEngineConfig } = await import("../server/superadmin/services.server");
    return saveFortuneRabbitEngineConfig(data.config);
  });

/** Public — Dust & Dollars math config for the live engine. */
export const getDustDollarsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDustDollarsEngineConfig } = await import("../server/superadmin/services.server");
  return getDustDollarsEngineConfig();
});

export const saveDustDollarsEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveDustDollarsEngineConfig } = await import("../server/superadmin/services.server");
    return saveDustDollarsEngineConfig(data.config);
  });

/** Public — Cleopatra Gold math config for the live engine. */
export const getCleopatraGoldEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCleopatraGoldEngineConfig } = await import("../server/superadmin/services.server");
  return getCleopatraGoldEngineConfig();
});

export const saveCleopatraGoldEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCleopatraGoldEngineConfig } = await import("../server/superadmin/services.server");
    return saveCleopatraGoldEngineConfig(data.config);
  });

/** Public — Gold Mine Dig math config for the live engine. */
export const getGoldMineEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGoldMineEngineConfig } = await import("../server/superadmin/services.server");
  return getGoldMineEngineConfig();
});

export const saveGoldMineEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGoldMineEngineConfig } = await import("../server/superadmin/services.server");
    return saveGoldMineEngineConfig(data.config);
  });

/** Public — Jeepney Jackpot math config for the live engine. */
export const getJeepneyJackpotEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getJeepneyJackpotEngineConfig } = await import("../server/superadmin/services.server");
  return getJeepneyJackpotEngineConfig();
});

export const saveJeepneyJackpotEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveJeepneyJackpotEngineConfig } = await import("../server/superadmin/services.server");
    return saveJeepneyJackpotEngineConfig(data.config);
  });

/** Public — Sari-Sari Spin math config for the live engine. */
export const getSariSariSpinEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSariSariSpinEngineConfig } = await import("../server/superadmin/services.server");
  return getSariSariSpinEngineConfig();
});

export const saveSariSariSpinEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveSariSariSpinEngineConfig } = await import("../server/superadmin/services.server");
    return saveSariSariSpinEngineConfig(data.config);
  });

/** Public — Carabao Charge math config for the live engine. */
export const getCarabaoChargeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCarabaoChargeEngineConfig } = await import("../server/superadmin/services.server");
  return getCarabaoChargeEngineConfig();
});

export const saveCarabaoChargeEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCarabaoChargeEngineConfig } = await import("../server/superadmin/services.server");
    return saveCarabaoChargeEngineConfig(data.config);
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

export const getCrazySevensEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCrazySevensEngineConfig } = await import("../server/superadmin/services.server");
  return getCrazySevensEngineConfig();
});

export const saveCrazySevensEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCrazySevensEngineConfig } = await import("../server/superadmin/services.server");
    return saveCrazySevensEngineConfig(data.config);
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

export const getAceHighEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getAceHighEngineConfig } = await import("../server/superadmin/services.server");
  return getAceHighEngineConfig();
});

export const saveAceHighEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveAceHighEngineConfig } = await import("../server/superadmin/services.server");
    return saveAceHighEngineConfig(data.config);
  });

/** Baccarat admin RPCs live in `@/functions/baccarat` (`get/saveBaccaratAdminConfigFn`). */

/** Superadmin — Lucky 9 engine config (game_controls.engineConfig). */
export const getLucky9EngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLucky9EngineConfig } = await import("../server/superadmin/services.server");
  return getLucky9EngineConfig();
});

export const saveLucky9EngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveLucky9EngineConfig } = await import("../server/superadmin/services.server");
    return saveLucky9EngineConfig(data.config);
  });

/** Superadmin — Three Card Poker engine config (game_controls.engineConfig). */
export const getThreeCardPokerEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getThreeCardPokerEngineConfig } = await import("../server/superadmin/services.server");
    return getThreeCardPokerEngineConfig();
  },
);

export const saveThreeCardPokerEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveThreeCardPokerEngineConfig } = await import("../server/superadmin/services.server");
    return saveThreeCardPokerEngineConfig(data.config);
  });

/** Superadmin — Color Game engine config. */
export const getColorGameEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getColorGameEngineConfig } = await import("../server/superadmin/services.server");
  return getColorGameEngineConfig();
});

export const saveColorGameEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveColorGameEngineConfig } = await import("../server/superadmin/services.server");
    return saveColorGameEngineConfig(data.config);
  });

/** Superadmin — Tongits Arena engine config. */
export const getTongitsArenaEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getTongitsArenaEngineConfig } = await import("../server/superadmin/services.server");
  return getTongitsArenaEngineConfig();
});

export const saveTongitsArenaEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveTongitsArenaEngineConfig } = await import("../server/superadmin/services.server");
    return saveTongitsArenaEngineConfig(data.config);
  });

/** Superadmin — Lucky Drop engine config. */
export const getLuckyDropEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyDropEngineConfig } = await import("../server/superadmin/services.server");
  return getLuckyDropEngineConfig();
});

export const saveLuckyDropEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveLuckyDropEngineConfig } = await import("../server/superadmin/services.server");
    return saveLuckyDropEngineConfig(data.config);
  });

/** Superadmin — Color Game Pro engine config. */
export const getColorGameProEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getColorGameProEngineConfig } = await import("../server/superadmin/services.server");
  return getColorGameProEngineConfig();
});

export const saveColorGameProEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveColorGameProEngineConfig } = await import("../server/superadmin/services.server");
    return saveColorGameProEngineConfig(data.config);
  });

/** Superadmin — Lucky Nine Plus engine config. */
export const getLuckyNinePlusEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyNinePlusEngineConfig } = await import("../server/superadmin/services.server");
  return getLuckyNinePlusEngineConfig();
});

export const saveLuckyNinePlusEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveLuckyNinePlusEngineConfig } = await import("../server/superadmin/services.server");
    return saveLuckyNinePlusEngineConfig(data.config);
  });

/** Superadmin — Drop Deluxe engine config. */
export const getDropDeluxeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDropDeluxeEngineConfig } = await import("../server/superadmin/services.server");
  return getDropDeluxeEngineConfig();
});

export const saveDropDeluxeEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveDropDeluxeEngineConfig } = await import("../server/superadmin/services.server");
    return saveDropDeluxeEngineConfig(data.config);
  });

/** Superadmin — Poker Showdown engine config. */
export const getPokerShowdownEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPokerShowdownEngineConfig } = await import("../server/superadmin/services.server");
  return getPokerShowdownEngineConfig();
});

export const savePokerShowdownEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { savePokerShowdownEngineConfig } = await import("../server/superadmin/services.server");
    return savePokerShowdownEngineConfig(data.config);
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

const playSessionCleanupSchema = z.object({
  staleOpenHours: z.number().int().positive().max(168).optional(),
  purgeClosedDays: z.number().int().positive().max(365).optional(),
  dryRun: z.boolean().optional(),
});

export const cleanupPlaySessionsFn = createServerFn({ method: "POST" })
  .validator(playSessionCleanupSchema)
  .handler(async ({ data }) => {
    const { runPlaySessionCleanup } = await import("../server/superadmin/services.server");
    return runPlaySessionCleanup(data);
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
      imageUrl: "/promos/promo-daily-race.webp",
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
      imageUrl: "/images/thumbnails/chinese_thumb.webp",
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
  .validator(
    z.object({
      scope: z.enum(["all", "slots", "cards", "fishing", "table", "live"]),
      deadSpinPct: z.number(),
      winChancePct: z.number(),
      maxMultiplier: z.number(),
      rtp: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const { superBulkUpdateGameControls } = await import("../server/superadmin/bulk-game-controls.server");
    return superBulkUpdateGameControls(data);
  });

export const getBulkOutcomeSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCurrentBulkOutcomeSettings } = await import("../server/superadmin/bulk-game-controls.server");
  return getCurrentBulkOutcomeSettings();
});

export const listGameSettingsLogsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listGameSettingsLogs } = await import("../server/superadmin/bulk-game-controls.server");
  return listGameSettingsLogs();
});

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

export const getLuckyNekoEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyNekoEngineConfig } = await import("../server/superadmin/services.server");
  return getLuckyNekoEngineConfig();
});

export const saveLuckyNekoEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveLuckyNekoEngineConfig } = await import("../server/superadmin/services.server");
    return saveLuckyNekoEngineConfig(data.config);
  });

export const getFortuneMouseEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneMouseEngineConfig } = await import("../server/superadmin/services.server");
  return getFortuneMouseEngineConfig();
});

export const saveFortuneMouseEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFortuneMouseEngineConfig } = await import("../server/superadmin/services.server");
    return saveFortuneMouseEngineConfig(data.config);
  });

export const getProsperityLionEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getProsperityLionEngineConfig } = await import("../server/superadmin/services.server");
  return getProsperityLionEngineConfig();
});

export const saveProsperityLionEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveProsperityLionEngineConfig } = await import("../server/superadmin/services.server");
    return saveProsperityLionEngineConfig(data.config);
  });

export const getCoinVolcanoEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCoinVolcanoEngineConfig } = await import("../server/superadmin/services.server");
  return getCoinVolcanoEngineConfig();
});

export const saveCoinVolcanoEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCoinVolcanoEngineConfig } = await import("../server/superadmin/services.server");
    return saveCoinVolcanoEngineConfig(data.config);
  });

export const getCashManiaEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCashManiaEngineConfig } = await import("../server/superadmin/services.server");
  return getCashManiaEngineConfig();
});

export const saveCashManiaEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCashManiaEngineConfig } = await import("../server/superadmin/services.server");
    return saveCashManiaEngineConfig(data.config);
  });

export const getZeusStrikeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getZeusStrikeEngineConfig } = await import("../server/superadmin/services.server");
  return getZeusStrikeEngineConfig();
});

export const saveZeusStrikeEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveZeusStrikeEngineConfig } = await import("../server/superadmin/services.server");
    return saveZeusStrikeEngineConfig(data.config);
  });

export const getThorThunderEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getThorThunderEngineConfig } = await import("../server/superadmin/services.server");
  return getThorThunderEngineConfig();
});

export const saveThorThunderEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveThorThunderEngineConfig } = await import("../server/superadmin/services.server");
    return saveThorThunderEngineConfig(data.config);
  });

export const getMayaGoldEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMayaGoldEngineConfig } = await import("../server/superadmin/services.server");
  return getMayaGoldEngineConfig();
});

export const saveMayaGoldEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveMayaGoldEngineConfig } = await import("../server/superadmin/services.server");
    return saveMayaGoldEngineConfig(data.config);
  });

export const getTempleRushEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getTempleRushEngineConfig } = await import("../server/superadmin/services.server");
  return getTempleRushEngineConfig();
});

export const saveTempleRushEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveTempleRushEngineConfig } = await import("../server/superadmin/services.server");
    return saveTempleRushEngineConfig(data.config);
  });

export const getMahjongWays3EngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMahjongWays3EngineConfig } = await import("../server/superadmin/services.server");
  return getMahjongWays3EngineConfig();
});

export const saveMahjongWays3EngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveMahjongWays3EngineConfig } = await import("../server/superadmin/services.server");
    return saveMahjongWays3EngineConfig(data.config);
  });

export const getWildAceEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getWildAceEngineConfig } = await import("../server/superadmin/services.server");
  return getWildAceEngineConfig();
});

export const saveWildAceEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveWildAceEngineConfig } = await import("../server/superadmin/services.server");
    return saveWildAceEngineConfig(data.config);
  });

export const getRoyalAceEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getRoyalAceEngineConfig } = await import("../server/superadmin/services.server");
  return getRoyalAceEngineConfig();
});

export const saveRoyalAceEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveRoyalAceEngineConfig } = await import("../server/superadmin/services.server");
    return saveRoyalAceEngineConfig(data.config);
  });

export const getNeonFruitsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getNeonFruitsEngineConfig } = await import("../server/superadmin/services.server");
  return getNeonFruitsEngineConfig();
});

export const saveNeonFruitsEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveNeonFruitsEngineConfig } = await import("../server/superadmin/services.server");
    return saveNeonFruitsEngineConfig(data.config);
  });

export const getLuckyBarsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyBarsEngineConfig } = await import("../server/superadmin/services.server");
  return getLuckyBarsEngineConfig();
});

export const saveLuckyBarsEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveLuckyBarsEngineConfig } = await import("../server/superadmin/services.server");
    return saveLuckyBarsEngineConfig(data.config);
  });
/* WAVE_B_SLOT_SUPERADMIN */

export const getKnockoutKingEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getKnockoutKingEngineConfig } = await import("../server/superadmin/services.server");
  return getKnockoutKingEngineConfig();
});

export const saveKnockoutKingEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveKnockoutKingEngineConfig } = await import("../server/superadmin/services.server");
    return saveKnockoutKingEngineConfig(data.config);
  });


export const getArenaChampEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getArenaChampEngineConfig } = await import("../server/superadmin/services.server");
  return getArenaChampEngineConfig();
});

export const saveArenaChampEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveArenaChampEngineConfig } = await import("../server/superadmin/services.server");
    return saveArenaChampEngineConfig(data.config);
  });


export const getSafariGoldEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSafariGoldEngineConfig } = await import("../server/superadmin/services.server");
  return getSafariGoldEngineConfig();
});

export const saveSafariGoldEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveSafariGoldEngineConfig } = await import("../server/superadmin/services.server");
    return saveSafariGoldEngineConfig(data.config);
  });


export const getPharaohFireEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPharaohFireEngineConfig } = await import("../server/superadmin/services.server");
  return getPharaohFireEngineConfig();
});

export const savePharaohFireEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { savePharaohFireEngineConfig } = await import("../server/superadmin/services.server");
    return savePharaohFireEngineConfig(data.config);
  });


export const getDesertRichesEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDesertRichesEngineConfig } = await import("../server/superadmin/services.server");
  return getDesertRichesEngineConfig();
});

export const saveDesertRichesEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveDesertRichesEngineConfig } = await import("../server/superadmin/services.server");
    return saveDesertRichesEngineConfig(data.config);
  });


export const getOutlawCoinsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getOutlawCoinsEngineConfig } = await import("../server/superadmin/services.server");
  return getOutlawCoinsEngineConfig();
});

export const saveOutlawCoinsEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveOutlawCoinsEngineConfig } = await import("../server/superadmin/services.server");
    return saveOutlawCoinsEngineConfig(data.config);
  });


export const getCrystalCaveEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCrystalCaveEngineConfig } = await import("../server/superadmin/services.server");
  return getCrystalCaveEngineConfig();
});

export const saveCrystalCaveEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCrystalCaveEngineConfig } = await import("../server/superadmin/services.server");
    return saveCrystalCaveEngineConfig(data.config);
  });


export const getDiamondDigEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDiamondDigEngineConfig } = await import("../server/superadmin/services.server");
  return getDiamondDigEngineConfig();
});

export const saveDiamondDigEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveDiamondDigEngineConfig } = await import("../server/superadmin/services.server");
    return saveDiamondDigEngineConfig(data.config);
  });


export const getCandyBlastEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCandyBlastEngineConfig } = await import("../server/superadmin/services.server");
  return getCandyBlastEngineConfig();
});

export const saveCandyBlastEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCandyBlastEngineConfig } = await import("../server/superadmin/services.server");
    return saveCandyBlastEngineConfig(data.config);
  });


export const getSweetRushEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSweetRushEngineConfig } = await import("../server/superadmin/services.server");
  return getSweetRushEngineConfig();
});

export const saveSweetRushEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveSweetRushEngineConfig } = await import("../server/superadmin/services.server");
    return saveSweetRushEngineConfig(data.config);
  });


export const getStarlightWaysEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getStarlightWaysEngineConfig } = await import("../server/superadmin/services.server");
  return getStarlightWaysEngineConfig();
});

export const saveStarlightWaysEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveStarlightWaysEngineConfig } = await import("../server/superadmin/services.server");
    return saveStarlightWaysEngineConfig(data.config);
  });


export const getGalaxyAceEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGalaxyAceEngineConfig } = await import("../server/superadmin/services.server");
  return getGalaxyAceEngineConfig();
});

export const saveGalaxyAceEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGalaxyAceEngineConfig } = await import("../server/superadmin/services.server");
    return saveGalaxyAceEngineConfig(data.config);
  });


export const getGateOfRaEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateOfRaEngineConfig } = await import("../server/superadmin/services.server");
  return getGateOfRaEngineConfig();
});

export const saveGateOfRaEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGateOfRaEngineConfig } = await import("../server/superadmin/services.server");
    return saveGateOfRaEngineConfig(data.config);
  });


export const getMysticRunesEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMysticRunesEngineConfig } = await import("../server/superadmin/services.server");
  return getMysticRunesEngineConfig();
});

export const saveMysticRunesEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveMysticRunesEngineConfig } = await import("../server/superadmin/services.server");
    return saveMysticRunesEngineConfig(data.config);
  });

// Wave C clones

export const getHaloHaloHitsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getHaloHaloHitsEngineConfig } = await import("../server/superadmin/services.server");
  return getHaloHaloHitsEngineConfig();
});

export const saveHaloHaloHitsEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveHaloHaloHitsEngineConfig } = await import("../server/superadmin/services.server");
    return saveHaloHaloHitsEngineConfig(data.config);
  });


export const getBalutBonusEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBalutBonusEngineConfig } = await import("../server/superadmin/services.server");
  return getBalutBonusEngineConfig();
});

export const saveBalutBonusEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveBalutBonusEngineConfig } = await import("../server/superadmin/services.server");
    return saveBalutBonusEngineConfig(data.config);
  });


export const getSinigangSpinEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSinigangSpinEngineConfig } = await import("../server/superadmin/services.server");
  return getSinigangSpinEngineConfig();
});

export const saveSinigangSpinEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveSinigangSpinEngineConfig } = await import("../server/superadmin/services.server");
    return saveSinigangSpinEngineConfig(data.config);
  });


export const getLechonLuckEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLechonLuckEngineConfig } = await import("../server/superadmin/services.server");
  return getLechonLuckEngineConfig();
});

export const saveLechonLuckEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveLechonLuckEngineConfig } = await import("../server/superadmin/services.server");
    return saveLechonLuckEngineConfig(data.config);
  });


export const getLanternLuckEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLanternLuckEngineConfig } = await import("../server/superadmin/services.server");
  return getLanternLuckEngineConfig();
});

export const saveLanternLuckEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveLanternLuckEngineConfig } = await import("../server/superadmin/services.server");
    return saveLanternLuckEngineConfig(data.config);
  });


export const getPalengkePaysEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPalengkePaysEngineConfig } = await import("../server/superadmin/services.server");
  return getPalengkePaysEngineConfig();
});

export const savePalengkePaysEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { savePalengkePaysEngineConfig } = await import("../server/superadmin/services.server");
    return savePalengkePaysEngineConfig(data.config);
  });


export const getTricycleTreasureEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getTricycleTreasureEngineConfig } = await import("../server/superadmin/services.server");
  return getTricycleTreasureEngineConfig();
});

export const saveTricycleTreasureEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveTricycleTreasureEngineConfig } = await import("../server/superadmin/services.server");
    return saveTricycleTreasureEngineConfig(data.config);
  });


export const getBeachBonanzaEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBeachBonanzaEngineConfig } = await import("../server/superadmin/services.server");
  return getBeachBonanzaEngineConfig();
});

export const saveBeachBonanzaEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveBeachBonanzaEngineConfig } = await import("../server/superadmin/services.server");
    return saveBeachBonanzaEngineConfig(data.config);
  });


export const getIslandFeverEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getIslandFeverEngineConfig } = await import("../server/superadmin/services.server");
  return getIslandFeverEngineConfig();
});

export const saveIslandFeverEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveIslandFeverEngineConfig } = await import("../server/superadmin/services.server");
    return saveIslandFeverEngineConfig(data.config);
  });


export const getNeonMakatiEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getNeonMakatiEngineConfig } = await import("../server/superadmin/services.server");
  return getNeonMakatiEngineConfig();
});

export const saveNeonMakatiEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveNeonMakatiEngineConfig } = await import("../server/superadmin/services.server");
    return saveNeonMakatiEngineConfig(data.config);
  });


export const getQuezonQuestEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getQuezonQuestEngineConfig } = await import("../server/superadmin/services.server");
  return getQuezonQuestEngineConfig();
});

export const saveQuezonQuestEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveQuezonQuestEngineConfig } = await import("../server/superadmin/services.server");
    return saveQuezonQuestEngineConfig(data.config);
  });


export const getCarabaoCashEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCarabaoCashEngineConfig } = await import("../server/superadmin/services.server");
  return getCarabaoCashEngineConfig();
});

export const saveCarabaoCashEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCarabaoCashEngineConfig } = await import("../server/superadmin/services.server");
    return saveCarabaoCashEngineConfig(data.config);
  });


export const getRiceFieldRichesEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getRiceFieldRichesEngineConfig } = await import("../server/superadmin/services.server");
  return getRiceFieldRichesEngineConfig();
});

export const saveRiceFieldRichesEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveRiceFieldRichesEngineConfig } = await import("../server/superadmin/services.server");
    return saveRiceFieldRichesEngineConfig(data.config);
  });


export const getWildPantherEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getWildPantherEngineConfig } = await import("../server/superadmin/services.server");
  return getWildPantherEngineConfig();
});

export const saveWildPantherEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveWildPantherEngineConfig } = await import("../server/superadmin/services.server");
    return saveWildPantherEngineConfig(data.config);
  });

