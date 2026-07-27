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
  ante: z.boolean(),
});

export const chineseNewYearSpinFn = createServerFn({ method: "POST" })
  .validator(chineseNewYearSpinSchema)
  .handler(async ({ data }) => {
    const { resolveSpinScript } = await import("../components/maxhigh/chinese-new-year/spinResolver");
    const script = resolveSpinScript(data.bet, data.ante, false);
    return {
      script,
      session: { sessionId: "demo-session", freeSpinsLeft: script.freeSpinsAwarded, fsSessionWin: 0, fsBombAcc: 0, fsSpinsPlayed: 0, inFree: script.freeSpinsAwarded > 0 },
      balance: 10000 + script.totalWin,
    };
  });

export const chineseNewYearFreeSpinFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string() }))
  .handler(async () => {
    const { resolveSpinScript } = await import("../components/maxhigh/chinese-new-year/spinResolver");
    const script = resolveSpinScript(5, false, true);
    return {
      script,
      session: { sessionId: "demo-session", freeSpinsLeft: 0, fsSessionWin: script.totalWin, fsBombAcc: script.bombAccumulator, fsSpinsPlayed: 1, inFree: false },
      balance: 10000 + script.totalWin,
    };
  });

export const chineseNewYearBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(z.object({ bet: z.number(), mode: z.enum(["normal", "super"]) }))
  .handler(async ({ data }) => {
    return {
      balance: 10000 - data.bet * 100,
      session: { sessionId: "demo-session", freeSpinsLeft: 10, fsSessionWin: 0, fsBombAcc: 0, fsSpinsPlayed: 0, inFree: true },
    };
  });

export const getChineseNewYearSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  return { sessionId: null, freeSpinsLeft: 0, fsSessionWin: 0, fsBombAcc: 0, fsSpinsPlayed: 0, inFree: false, bet: 5, ante: false };
});

export const getChineseNewYearEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { DEFAULT_CHINESE_NEW_YEAR_CONFIG } = await import("../lib/chinese-new-year-config");
  return DEFAULT_CHINESE_NEW_YEAR_CONFIG;
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

const walletRequestSchema = z.object({
  type: z.enum(["deposit", "withdraw"]),
  amount: z.number().finite().positive().max(1_000_000),
  note: z.string().max(300).optional(),
});

export const createWalletRequestFn = createServerFn({ method: "POST" })
  .validator(walletRequestSchema)
  .handler(async ({ data }) => {
    const { createWalletRequest } = await import("../server/services.server");
    return createWalletRequest(data);
  });

export const listMyWalletRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listMyWalletRequests } = await import("../server/services.server");
  return listMyWalletRequests();
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
