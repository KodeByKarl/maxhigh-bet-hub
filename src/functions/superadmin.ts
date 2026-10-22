import { riskControlsSchema } from "@/lib/risk-controls"; /**
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

/** Public — Golden Panther math config for the live engine. */
export const getGoldenPantherEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getGoldenPantherEngineConfig } = await import("../server/superadmin/services.server");
    return getGoldenPantherEngineConfig();
  },
);

export const saveGoldenPantherEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGoldenPantherEngineConfig } = await import("../server/superadmin/services.server");
    return saveGoldenPantherEngineConfig(data.config);
  });

export const getEnchantedGroveEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getEnchantedGroveEngineConfig } = await import("../server/superadmin/services.server");
    return getEnchantedGroveEngineConfig();
  },
);

export const saveEnchantedGroveEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveEnchantedGroveEngineConfig } = await import("../server/superadmin/services.server");
    return saveEnchantedGroveEngineConfig(data.config);
  });

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

export const getCleopatraGoldEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getCleopatraGoldEngineConfig } = await import("../server/superadmin/services.server");
    return getCleopatraGoldEngineConfig();
  },
);

export const saveCleopatraGoldEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCleopatraGoldEngineConfig } = await import("../server/superadmin/services.server");
    return saveCleopatraGoldEngineConfig(data.config);
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

export const getProsperityLionEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getProsperityLionEngineConfig } = await import("../server/superadmin/services.server");
    return getProsperityLionEngineConfig();
  },
);

export const saveProsperityLionEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveProsperityLionEngineConfig } = await import("../server/superadmin/services.server");
    return saveProsperityLionEngineConfig(data.config);
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

export const getFortuneRabbitEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getFortuneRabbitEngineConfig } = await import("../server/superadmin/services.server");
    return getFortuneRabbitEngineConfig();
  },
);

export const saveFortuneRabbitEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFortuneRabbitEngineConfig } = await import("../server/superadmin/services.server");
    return saveFortuneRabbitEngineConfig(data.config);
  });

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

export const getRubyRavenEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getRubyRavenEngineConfig } = await import("../server/superadmin/services.server");
  return getRubyRavenEngineConfig();
});

export const saveRubyRavenEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveRubyRavenEngineConfig } = await import("../server/superadmin/services.server");
    return saveRubyRavenEngineConfig(data.config);
  });

export const getMidnightOwlEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMidnightOwlEngineConfig } = await import("../server/superadmin/services.server");
  return getMidnightOwlEngineConfig();
});

export const saveMidnightOwlEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveMidnightOwlEngineConfig } = await import("../server/superadmin/services.server");
    return saveMidnightOwlEngineConfig(data.config);
  });

export const getHoneyHiveEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getHoneyHiveEngineConfig } = await import("../server/superadmin/services.server");
  return getHoneyHiveEngineConfig();
});

export const saveHoneyHiveEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveHoneyHiveEngineConfig } = await import("../server/superadmin/services.server");
    return saveHoneyHiveEngineConfig(data.config);
  });

export const getSolarSerpentEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSolarSerpentEngineConfig } = await import("../server/superadmin/services.server");
  return getSolarSerpentEngineConfig();
});

export const saveSolarSerpentEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveSolarSerpentEngineConfig } = await import("../server/superadmin/services.server");
    return saveSolarSerpentEngineConfig(data.config);
  });

export const getFrostFoxEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFrostFoxEngineConfig } = await import("../server/superadmin/services.server");
  return getFrostFoxEngineConfig();
});

export const saveFrostFoxEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFrostFoxEngineConfig } = await import("../server/superadmin/services.server");
    return saveFrostFoxEngineConfig(data.config);
  });

export const getCoralCobraEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCoralCobraEngineConfig } = await import("../server/superadmin/services.server");
  return getCoralCobraEngineConfig();
});

export const saveCoralCobraEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCoralCobraEngineConfig } = await import("../server/superadmin/services.server");
    return saveCoralCobraEngineConfig(data.config);
  });

export const getLotusLynxEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLotusLynxEngineConfig } = await import("../server/superadmin/services.server");
  return getLotusLynxEngineConfig();
});

export const saveLotusLynxEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveLotusLynxEngineConfig } = await import("../server/superadmin/services.server");
    return saveLotusLynxEngineConfig(data.config);
  });

export const getEmberTigerEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getEmberTigerEngineConfig } = await import("../server/superadmin/services.server");
  return getEmberTigerEngineConfig();
});

export const saveEmberTigerEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveEmberTigerEngineConfig } = await import("../server/superadmin/services.server");
    return saveEmberTigerEngineConfig(data.config);
  });

export const getJadeJaguarEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getJadeJaguarEngineConfig } = await import("../server/superadmin/services.server");
  return getJadeJaguarEngineConfig();
});

export const saveJadeJaguarEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveJadeJaguarEngineConfig } = await import("../server/superadmin/services.server");
    return saveJadeJaguarEngineConfig(data.config);
  });

export const saveRealmsEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ gameId: z.string().min(1).max(64), config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveRealmsEngineConfig } = await import("../server/superadmin/services.server");
    return saveRealmsEngineConfig(data.gameId, data.config);
  });

/** Public — Buffalo Reign (buffalo-reign) math config. */

export const saveFireSpikeEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveFireSpikeEngineConfig } = await import("../server/superadmin/services.server");
    return saveFireSpikeEngineConfig(data.config);
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
export const getLuckyNinePlusEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getLuckyNinePlusEngineConfig } = await import("../server/superadmin/services.server");
    return getLuckyNinePlusEngineConfig();
  },
);

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
export const getPokerShowdownEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getPokerShowdownEngineConfig } = await import("../server/superadmin/services.server");
    return getPokerShowdownEngineConfig();
  },
);

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

const saveRiskSchema = riskControlsSchema;

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
    const { superBulkUpdateGameControls } =
      await import("../server/superadmin/bulk-game-controls.server");
    return superBulkUpdateGameControls(data);
  });

export const getBulkOutcomeSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCurrentBulkOutcomeSettings } =
    await import("../server/superadmin/bulk-game-controls.server");
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

export const saveCoinVolcanoEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveCoinVolcanoEngineConfig } = await import("../server/superadmin/services.server");
    return saveCoinVolcanoEngineConfig(data.config);
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
