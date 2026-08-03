/**
 * Client-safe RPC bridge (createServerFn).
 * Must NOT live under src/server/** — Vite blocks that path from the client.
 * Server implementations are loaded dynamically inside each handler.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const loginSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(1).max(128),
});

export const loginFn = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const { loginUser } = await import("../server/services.server");
    return loginUser(data.username, data.password);
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { logoutUser } = await import("../server/services.server");
  return logoutUser();
});

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchSession } = await import("../server/services.server");
  return fetchSession();
});

export const getProfileFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchProfile } = await import("../server/services.server");
  return fetchProfile();
});

const updateProfileSchema = z.object({
  displayName: z.string().max(128).optional(),
  username: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
});

export const updateProfileFn = createServerFn({ method: "POST" })
  .validator(updateProfileSchema)
  .handler(async ({ data }) => {
    const { updateProfile } = await import("../server/services.server");
    return updateProfile(data);
  });

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6).max(128),
});

export const changePasswordFn = createServerFn({ method: "POST" })
  .validator(changePasswordSchema)
  .handler(async ({ data }) => {
    const { changePassword } = await import("../server/services.server");
    return changePassword(data);
  });

export const getBalanceFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchBalance } = await import("../server/services.server");
  return fetchBalance();
});

/** Player bets only — wins are settled by game server functions. */
const adjustSchema = z.object({
  delta: z.number().finite().negative(),
  type: z.literal("bet"),
  note: z.string().max(500).optional(),
  game: z.string().max(64).optional(),
  gameId: z.string().max(64).optional(),
});

export const adjustBalanceFn = createServerFn({ method: "POST" })
  .validator(adjustSchema)
  .handler(async ({ data }) => {
    const { adjustBalance } = await import("../server/services.server");
    return adjustBalance(data);
  });

const candyPeakSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const candyPeakSpinFn = createServerFn({ method: "POST" })
  .validator(candyPeakSpinSchema)
  .handler(async ({ data }) => {
    const { candyPeakPaidSpin } = await import("../server/games/candy-peak.server");
    return candyPeakPaidSpin(data);
  });

const candyPeakFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const candyPeakFreeSpinFn = createServerFn({ method: "POST" })
  .validator(candyPeakFreeSpinSchema)
  .handler(async ({ data }) => {
    const { candyPeakFreeSpin } = await import("../server/games/candy-peak.server");
    return candyPeakFreeSpin(data);
  });

const candyPeakBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const candyPeakBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(candyPeakBuySchema)
  .handler(async ({ data }) => {
    const { candyPeakBuyFeature } = await import("../server/games/candy-peak.server");
    return candyPeakBuyFeature(data);
  });

export const getCandyPeakSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCandyPeakOpenSession } = await import("../server/games/candy-peak.server");
  return getCandyPeakOpenSession();
});

const goldenPantherSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const goldenPantherSpinFn = createServerFn({ method: "POST" })
  .validator(goldenPantherSpinSchema)
  .handler(async ({ data }) => {
    const { goldenPantherPaidSpin } = await import("../server/games/golden-panther.server");
    return goldenPantherPaidSpin(data);
  });

const goldenPantherFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const goldenPantherFreeSpinFn = createServerFn({ method: "POST" })
  .validator(goldenPantherFreeSpinSchema)
  .handler(async ({ data }) => {
    const { goldenPantherFreeSpin } = await import("../server/games/golden-panther.server");
    return goldenPantherFreeSpin(data);
  });

const goldenPantherBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const goldenPantherBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(goldenPantherBuySchema)
  .handler(async ({ data }) => {
    const { goldenPantherBuyFeature } = await import("../server/games/golden-panther.server");
    return goldenPantherBuyFeature(data);
  });

export const getGoldenPantherSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchGoldenPantherSession } = await import("../server/games/golden-panther.server");
  return fetchGoldenPantherSession();
});

export const getGoldenPantherEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGoldenPantherEngineConfig } = await import("../server/superadmin/services.server");
  return getGoldenPantherEngineConfig();
});

const chineseNewYearSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  autoCollect: z.boolean().optional(),
});

export const chineseNewYearSpinFn = createServerFn({ method: "POST" })
  .validator(chineseNewYearSpinSchema)
  .handler(async ({ data }) => {
    const { chineseNewYearPaidSpin } = await import("../server/games/chinese-new-year.server");
    return chineseNewYearPaidSpin(data);
  });

export const chineseNewYearCollectFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { chineseNewYearCollect } = await import("../server/games/chinese-new-year.server");
    return chineseNewYearCollect(data);
  });

export const chineseNewYearGambleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().min(1),
      choice: z.enum(["red", "black"]),
    }),
  )
  .handler(async ({ data }) => {
    const { chineseNewYearGamble } = await import("../server/games/chinese-new-year.server");
    return chineseNewYearGamble(data);
  });

export const getChineseNewYearSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getChineseNewYearOpenSession } = await import("../server/games/chinese-new-year.server");
  return getChineseNewYearOpenSession();
});

export const getChineseNewYearEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getChineseNewYearEngineConfig } = await import("../server/superadmin/services.server");
  return getChineseNewYearEngineConfig();
});

const sugarSurgeSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const sugarSurgeSpinFn = createServerFn({ method: "POST" })
  .validator(sugarSurgeSpinSchema)
  .handler(async ({ data }) => {
    const { sugarSurgePaidSpin } = await import("../server/games/sugar-surge.server");
    return sugarSurgePaidSpin(data);
  });

const sugarSurgeFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const sugarSurgeFreeSpinFn = createServerFn({ method: "POST" })
  .validator(sugarSurgeFreeSpinSchema)
  .handler(async ({ data }) => {
    const { sugarSurgeFreeSpin } = await import("../server/games/sugar-surge.server");
    return sugarSurgeFreeSpin(data);
  });

const sugarSurgeBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const sugarSurgeBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(sugarSurgeBuySchema)
  .handler(async ({ data }) => {
    const { sugarSurgeBuyFeature } = await import("../server/games/sugar-surge.server");
    return sugarSurgeBuyFeature(data);
  });

export const getSugarSurgeSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSugarSurgeOpenSession } = await import("../server/games/sugar-surge.server");
  return getSugarSurgeOpenSession();
});

const godlyGatesSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const godlyGatesSpinFn = createServerFn({ method: "POST" })
  .validator(godlyGatesSpinSchema)
  .handler(async ({ data }) => {
    const { godlyGatesPaidSpin } = await import("../server/games/godly-gates.server");
    return godlyGatesPaidSpin(data);
  });

const godlyGatesFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const godlyGatesFreeSpinFn = createServerFn({ method: "POST" })
  .validator(godlyGatesFreeSpinSchema)
  .handler(async ({ data }) => {
    const { godlyGatesFreeSpin } = await import("../server/games/godly-gates.server");
    return godlyGatesFreeSpin(data);
  });

export const godlyGatesBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(godlyGatesSpinSchema)
  .handler(async ({ data }) => {
    const { godlyGatesBuyFeature } = await import("../server/games/godly-gates.server");
    return godlyGatesBuyFeature(data);
  });

export const getGodlyGatesSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGodlyGatesOpenSession } = await import("../server/games/godly-gates.server");
  return getGodlyGatesOpenSession();
});

const gameSessionSchema = z.object({
  gameId: z.string().min(1).max(64),
  gameName: z.string().min(1).max(128),
});

/** Log Play Now / session open into audit_logs for precise admin tracking. */
export const recordGameSessionFn = createServerFn({ method: "POST" })
  .validator(gameSessionSchema)
  .handler(async ({ data }) => {
    const { recordGameSessionOpen } = await import("../server/services.server");
    return recordGameSessionOpen(data);
  });

export const getJackpotFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchJackpot } = await import("../server/services.server");
  return fetchJackpot();
});

export const getLiveWinsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listLiveWins } = await import("../server/services.server");
  return listLiveWins();
});

export const getPlatformStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchPlatformStats } = await import("../server/services.server");
  return fetchPlatformStats();
});

export const heartbeatFn = createServerFn({ method: "POST" }).handler(async () => {
  const { heartbeatPresence } = await import("../server/services.server");
  return heartbeatPresence();
});

export const getSupportTicketFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchOrCreatePlayerTicket } = await import("../server/services.server");
  return fetchOrCreatePlayerTicket();
});

const supportMsgSchema = z.object({
  text: z.string().min(1).max(2000),
  lang: z.enum(["en", "tl"]).default("en"),
});

export const sendSupportMessageFn = createServerFn({ method: "POST" })
  .validator(supportMsgSchema)
  .handler(async ({ data }) => {
    const { addPlayerSupportMessage } = await import("../server/services.server");
    return addPlayerSupportMessage(data.text, data.lang);
  });

export const getAdminTicketsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchAdminTickets } = await import("../server/services.server");
  return fetchAdminTickets();
});

const ticketMessagesSchema = z.object({
  ticketId: z.string().min(1),
});

export const getAdminTicketMessagesFn = createServerFn({ method: "POST" })
  .validator(ticketMessagesSchema)
  .handler(async ({ data }) => {
    const { fetchAdminTicketMessages } = await import("../server/services.server");
    return fetchAdminTicketMessages(data.ticketId);
  });

const agentMsgSchema = z.object({
  ticketId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export const sendAdminMessageFn = createServerFn({ method: "POST" })
  .validator(agentMsgSchema)
  .handler(async ({ data }) => {
    const { addAgentSupportMessage } = await import("../server/services.server");
    return addAgentSupportMessage(data.ticketId, data.text);
  });

const resolveTicketSchema = z.object({
  ticketId: z.string().min(1),
});

export const resolveSupportTicketFn = createServerFn({ method: "POST" })
  .validator(resolveTicketSchema)
  .handler(async ({ data }) => {
    const { resolveSupportTicket } = await import("../server/services.server");
    return resolveSupportTicket(data.ticketId);
  });

const createTicketSchema = z.object({
  playerName: z.string().min(1).max(128),
  concern: z.string().min(1).max(2000),
});

export const createPlayerTicketFn = createServerFn({ method: "POST" })
  .validator(createTicketSchema)
  .handler(async ({ data }) => {
    const { createPlayerTicket } = await import("../server/services.server");
    return createPlayerTicket(data.playerName, data.concern);
  });

const assignAgentSchema = z.object({
  ticketId: z.string().min(1),
});

export const assignAgentToTicketFn = createServerFn({ method: "POST" })
  .validator(assignAgentSchema)
  .handler(async ({ data }) => {
    const { assignAgentToTicket } = await import("../server/services.server");
    return assignAgentToTicket(data.ticketId);
  });

const mahjongWaysSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const mahjongWaysSpinFn = createServerFn({ method: "POST" })
  .validator(mahjongWaysSpinSchema)
  .handler(async ({ data }) => {
    const { mahjongWaysPaidSpin } = await import("../server/games/mahjong-ways.server");
    return mahjongWaysPaidSpin(data);
  });

const mahjongWaysFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const mahjongWaysFreeSpinFn = createServerFn({ method: "POST" })
  .validator(mahjongWaysFreeSpinSchema)
  .handler(async ({ data }) => {
    const { mahjongWaysFreeSpin } = await import("../server/games/mahjong-ways.server");
    return mahjongWaysFreeSpin(data);
  });

const mahjongWaysBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const mahjongWaysBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(mahjongWaysBuySchema)
  .handler(async ({ data }) => {
    const { mahjongWaysBuyFeature } = await import("../server/games/mahjong-ways.server");
    return mahjongWaysBuyFeature(data);
  });

export const getMahjongWaysSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMahjongWaysOpenSession } = await import("../server/games/mahjong-ways.server");
  return getMahjongWaysOpenSession();
});

const starlightAceSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const starlightAceSpinFn = createServerFn({ method: "POST" })
  .validator(starlightAceSpinSchema)
  .handler(async ({ data }) => {
    const { starlightAcePaidSpin } = await import("../server/games/starlight-ace.server");
    return starlightAcePaidSpin(data);
  });

const starlightAceFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const starlightAceFreeSpinFn = createServerFn({ method: "POST" })
  .validator(starlightAceFreeSpinSchema)
  .handler(async ({ data }) => {
    const { starlightAceFreeSpin } = await import("../server/games/starlight-ace.server");
    return starlightAceFreeSpin(data);
  });

const starlightAceBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const starlightAceBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(starlightAceBuySchema)
  .handler(async ({ data }) => {
    const { starlightAceBuyFeature } = await import("../server/games/starlight-ace.server");
    return starlightAceBuyFeature(data);
  });

export const getStarlightAceSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getStarlightAceOpenSession } = await import("../server/games/starlight-ace.server");
  return getStarlightAceOpenSession();
});

const superAceSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const superAceSpinFn = createServerFn({ method: "POST" })
  .validator(superAceSpinSchema)
  .handler(async ({ data }) => {
    const { superAcePaidSpin } = await import("../server/games/super-ace.server");
    return superAcePaidSpin(data);
  });

const superAceFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const superAceFreeSpinFn = createServerFn({ method: "POST" })
  .validator(superAceFreeSpinSchema)
  .handler(async ({ data }) => {
    const { superAceFreeSpin } = await import("../server/games/super-ace.server");
    return superAceFreeSpin(data);
  });

const superAceBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const superAceBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(superAceBuySchema)
  .handler(async ({ data }) => {
    const { superAceBuyFeature } = await import("../server/games/super-ace.server");
    return superAceBuyFeature(data);
  });

export const getSuperAceSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSuperAceOpenSession } = await import("../server/games/super-ace.server");
  return getSuperAceOpenSession();
});

const frontierGoldSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const frontierGoldSpinFn = createServerFn({ method: "POST" })
  .validator(frontierGoldSpinSchema)
  .handler(async ({ data }) => {
    const { frontierGoldPaidSpin } = await import("../server/games/frontier-gold.server");
    return frontierGoldPaidSpin(data);
  });

const frontierGoldFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const frontierGoldFreeSpinFn = createServerFn({ method: "POST" })
  .validator(frontierGoldFreeSpinSchema)
  .handler(async ({ data }) => {
    const { frontierGoldFreeSpin } = await import("../server/games/frontier-gold.server");
    return frontierGoldFreeSpin(data);
  });

const frontierGoldBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const frontierGoldBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(frontierGoldBuySchema)
  .handler(async ({ data }) => {
    const { frontierGoldBuyFeature } = await import("../server/games/frontier-gold.server");
    return frontierGoldBuyFeature(data);
  });

export const getFrontierGoldSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFrontierGoldOpenSession } = await import("../server/games/frontier-gold.server");
  return getFrontierGoldOpenSession();
});

const pinataWinsSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const pinataWinsSpinFn = createServerFn({ method: "POST" })
  .validator(pinataWinsSpinSchema)
  .handler(async ({ data }) => {
    const { pinataWinsPaidSpin } = await import("../server/games/pinata-wins.server");
    return pinataWinsPaidSpin(data);
  });

const pinataWinsFreeSpinSchema = z.object({
  sessionId: z.string().min(1),
});

export const pinataWinsFreeSpinFn = createServerFn({ method: "POST" })
  .validator(pinataWinsFreeSpinSchema)
  .handler(async ({ data }) => {
    const { pinataWinsFreeSpin } = await import("../server/games/pinata-wins.server");
    return pinataWinsFreeSpin(data);
  });

const pinataWinsBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const pinataWinsBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(pinataWinsBuySchema)
  .handler(async ({ data }) => {
    const { pinataWinsBuyFeature } = await import("../server/games/pinata-wins.server");
    return pinataWinsBuyFeature(data);
  });

export const getPinataWinsSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPinataWinsOpenSession } = await import("../server/games/pinata-wins.server");
  return getPinataWinsOpenSession();
});

export const getPinataWinsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPinataWinsEngineConfigPublic } = await import("../server/games/pinata-wins.server");
  return getPinataWinsEngineConfigPublic();
});

const buffaloReignSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean().optional().default(false),
});

export const buffaloReignSpinFn = createServerFn({ method: "POST" })
  .validator(buffaloReignSpinSchema)
  .handler(async ({ data }) => {
    const { buffaloReignPaidSpin } = await import("../server/games/buffalo-reign.server");
    return buffaloReignPaidSpin({ bet: data.bet, ante: !!data.ante });
  });

const buffaloReignFreeSpinSchema = z.object({
  sessionId: z.string().min(1),
});

export const buffaloReignFreeSpinFn = createServerFn({ method: "POST" })
  .validator(buffaloReignFreeSpinSchema)
  .handler(async ({ data }) => {
    const { buffaloReignFreeSpin } = await import("../server/games/buffalo-reign.server");
    return buffaloReignFreeSpin(data);
  });

const buffaloReignBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const buffaloReignBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(buffaloReignBuySchema)
  .handler(async ({ data }) => {
    const { buffaloReignBuyFeature } = await import("../server/games/buffalo-reign.server");
    return buffaloReignBuyFeature(data);
  });

export const getBuffaloReignSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBuffaloReignOpenSession } = await import("../server/games/buffalo-reign.server");
  return getBuffaloReignOpenSession();
});

const fireSpikeSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const fireSpikeSpinFn = createServerFn({ method: "POST" })
  .validator(fireSpikeSpinSchema)
  .handler(async ({ data }) => {
    const { fireSpikePaidSpin } = await import("../server/games/fire-spike.server");
    return fireSpikePaidSpin(data);
  });

export const getFireSpikeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFireSpikeEngineConfigPublic } = await import("../server/games/fire-spike.server");
  return getFireSpikeEngineConfigPublic();
});

const fortuneGemsSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  exMode: z.boolean().optional(),
});

export const fortuneGemsSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneGemsSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneGemsPaidSpin } = await import("../server/games/fortune-gems.server");
    return fortuneGemsPaidSpin(data);
  });

export const getFortuneGemsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneGemsEngineConfigPublic } = await import("../server/games/fortune-gems.server");
  return getFortuneGemsEngineConfigPublic();
});

const pugLifeSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  entryPath: z.enum(["base", "featurespins"]).optional(),
  marketCode: z.string().max(8).nullable().optional(),
});

export const pugLifeSpinFn = createServerFn({ method: "POST" })
  .validator(pugLifeSpinSchema)
  .handler(async ({ data }) => {
    const { pugLifePaidSpin } = await import("../server/games/pug-life.server");
    // Clone to a plain JSON-safe payload for TanStack Start serialization.
    return JSON.parse(JSON.stringify(await pugLifePaidSpin(data))) as Awaited<
      ReturnType<typeof pugLifePaidSpin>
    >;
  });

const pugLifeBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  buyId: z.enum(["featurespins", "treat_yoself", "dawgs_den"]),
  marketCode: z.string().max(8).nullable().optional(),
});

export const pugLifeBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(pugLifeBuySchema)
  .handler(async ({ data }) => {
    const { pugLifeBuyFeature } = await import("../server/games/pug-life.server");
    return JSON.parse(JSON.stringify(await pugLifeBuyFeature(data))) as Awaited<
      ReturnType<typeof pugLifeBuyFeature>
    >;
  });

export const getPugLifeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPugLifeEngineConfigPublic } = await import("../server/games/pug-life.server");
  return getPugLifeEngineConfigPublic();
});

const reelRiotSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  held: z.array(z.boolean()).max(3).optional(),
  previousReels: z
    .array(z.string())
    .length(3)
    .nullable()
    .optional(),
});

export const reelRiotSpinFn = createServerFn({ method: "POST" })
  .validator(reelRiotSpinSchema)
  .handler(async ({ data }) => {
    const { reelRiotPaidSpin } = await import("../server/games/reel-riot.server");
    return JSON.parse(
      JSON.stringify(
        await reelRiotPaidSpin({
          bet: data.bet,
          held: data.held,
          previousReels: (data.previousReels as import("@/components/maxhigh/reel-riot/types").RrReels | null) ?? null,
        }),
      ),
    ) as Awaited<ReturnType<typeof reelRiotPaidSpin>>;
  });

export const getReelRiotEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getReelRiotEngineConfigPublic } = await import("../server/games/reel-riot.server");
  return getReelRiotEngineConfigPublic();
});

export const getReelRiotJackpotFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getReelRiotJackpotPool } = await import("../server/games/reel-riot.server");
  return getReelRiotJackpotPool();
});

