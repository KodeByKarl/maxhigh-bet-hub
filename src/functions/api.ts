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

const myTransactionsSchema = z.object({
  tab: z.enum(["funds", "play", "all"]).optional(),
  limit: z.number().int().min(1).max(300).optional(),
});

export const listMyTransactionsFn = createServerFn({ method: "GET" })
  .validator(myTransactionsSchema)
  .handler(async ({ data }) => {
    const { listMyTransactions } = await import("../server/services.server");
    return listMyTransactions(data);
  });

export const getMyWalletSummaryFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchMyWalletSummary } = await import("../server/services.server");
  return fetchMyWalletSummary();
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

const mermaidRichesSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const mermaidRichesSpinFn = createServerFn({ method: "POST" })
  .validator(mermaidRichesSpinSchema)
  .handler(async ({ data }) => {
    const { mermaidRichesPaidSpin } = await import("../server/games/mermaid-riches.server");
    return mermaidRichesPaidSpin(data);
  });

const mermaidRichesFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const mermaidRichesFreeSpinFn = createServerFn({ method: "POST" })
  .validator(mermaidRichesFreeSpinSchema)
  .handler(async ({ data }) => {
    const { mermaidRichesFreeSpin } = await import("../server/games/mermaid-riches.server");
    return mermaidRichesFreeSpin(data);
  });

const mermaidRichesBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const mermaidRichesBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(mermaidRichesBuySchema)
  .handler(async ({ data }) => {
    const { mermaidRichesBuyFeature } = await import("../server/games/mermaid-riches.server");
    return mermaidRichesBuyFeature(data);
  });

export const getMermaidRichesSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMermaidRichesOpenSession } = await import("../server/games/mermaid-riches.server");
  return getMermaidRichesOpenSession();
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

const aztecTreasureSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const aztecTreasureSpinFn = createServerFn({ method: "POST" })
  .validator(aztecTreasureSpinSchema)
  .handler(async ({ data }) => {
    const { aztecTreasurePaidSpin } = await import("../server/games/aztec-treasure.server");
    return aztecTreasurePaidSpin(data);
  });

const aztecTreasureFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const aztecTreasureFreeSpinFn = createServerFn({ method: "POST" })
  .validator(aztecTreasureFreeSpinSchema)
  .handler(async ({ data }) => {
    const { aztecTreasureFreeSpin } = await import("../server/games/aztec-treasure.server");
    return aztecTreasureFreeSpin(data);
  });

const aztecTreasureBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const aztecTreasureBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(aztecTreasureBuySchema)
  .handler(async ({ data }) => {
    const { aztecTreasureBuyFeature } = await import("../server/games/aztec-treasure.server");
    return aztecTreasureBuyFeature(data);
  });

export const getAztecTreasureSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getAztecTreasureOpenSession } = await import("../server/games/aztec-treasure.server");
  return getAztecTreasureOpenSession();
});

const piratePlunderSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const piratePlunderSpinFn = createServerFn({ method: "POST" })
  .validator(piratePlunderSpinSchema)
  .handler(async ({ data }) => {
    const { piratePlunderPaidSpin } = await import("../server/games/pirate-plunder.server");
    return piratePlunderPaidSpin(data);
  });

const piratePlunderFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const piratePlunderFreeSpinFn = createServerFn({ method: "POST" })
  .validator(piratePlunderFreeSpinSchema)
  .handler(async ({ data }) => {
    const { piratePlunderFreeSpin } = await import("../server/games/pirate-plunder.server");
    return piratePlunderFreeSpin(data);
  });

const piratePlunderBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const piratePlunderBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(piratePlunderBuySchema)
  .handler(async ({ data }) => {
    const { piratePlunderBuyFeature } = await import("../server/games/pirate-plunder.server");
    return piratePlunderBuyFeature(data);
  });

export const getPiratePlunderSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPiratePlunderOpenSession } = await import("../server/games/pirate-plunder.server");
  return getPiratePlunderOpenSession();
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

const fiestaFireworksSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  autoCollect: z.boolean().optional(),
});

export const fiestaFireworksSpinFn = createServerFn({ method: "POST" })
  .validator(fiestaFireworksSpinSchema)
  .handler(async ({ data }) => {
    const { fiestaFireworksPaidSpin } = await import("../server/games/fiesta-fireworks.server");
    return fiestaFireworksPaidSpin(data);
  });

export const fiestaFireworksCollectFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { fiestaFireworksCollect } = await import("../server/games/fiesta-fireworks.server");
    return fiestaFireworksCollect(data);
  });

export const fiestaFireworksGambleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().min(1),
      choice: z.enum(["red", "black"]),
    }),
  )
  .handler(async ({ data }) => {
    const { fiestaFireworksGamble } = await import("../server/games/fiesta-fireworks.server");
    return fiestaFireworksGamble(data);
  });

export const getFiestaFireworksSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFiestaFireworksOpenSession } = await import("../server/games/fiesta-fireworks.server");
  return getFiestaFireworksOpenSession();
});

export const getFiestaFireworksEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFiestaFireworksEngineConfig } = await import("../server/superadmin/services.server");
  return getFiestaFireworksEngineConfig();
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

const boracayBounceSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const boracayBounceSpinFn = createServerFn({ method: "POST" })
  .validator(boracayBounceSpinSchema)
  .handler(async ({ data }) => {
    const { boracayBouncePaidSpin } = await import("../server/games/boracay-bounce.server");
    return boracayBouncePaidSpin(data);
  });

const boracayBounceFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const boracayBounceFreeSpinFn = createServerFn({ method: "POST" })
  .validator(boracayBounceFreeSpinSchema)
  .handler(async ({ data }) => {
    const { boracayBounceFreeSpin } = await import("../server/games/boracay-bounce.server");
    return boracayBounceFreeSpin(data);
  });

const boracayBounceBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const boracayBounceBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(boracayBounceBuySchema)
  .handler(async ({ data }) => {
    const { boracayBounceBuyFeature } = await import("../server/games/boracay-bounce.server");
    return boracayBounceBuyFeature(data);
  });

export const getBoracayBounceSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBoracayBounceOpenSession } = await import("../server/games/boracay-bounce.server");
  return getBoracayBounceOpenSession();
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

const olympusWrathSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const olympusWrathSpinFn = createServerFn({ method: "POST" })
  .validator(olympusWrathSpinSchema)
  .handler(async ({ data }) => {
    const { olympusWrathPaidSpin } = await import("../server/games/olympus-wrath.server");
    return olympusWrathPaidSpin(data);
  });

const olympusWrathFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const olympusWrathFreeSpinFn = createServerFn({ method: "POST" })
  .validator(olympusWrathFreeSpinSchema)
  .handler(async ({ data }) => {
    const { olympusWrathFreeSpin } = await import("../server/games/olympus-wrath.server");
    return olympusWrathFreeSpin(data);
  });

export const olympusWrathBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(olympusWrathSpinSchema)
  .handler(async ({ data }) => {
    const { olympusWrathBuyFeature } = await import("../server/games/olympus-wrath.server");
    return olympusWrathBuyFeature(data);
  });

export const getOlympusWrathSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getOlympusWrathOpenSession } = await import("../server/games/olympus-wrath.server");
  return getOlympusWrathOpenSession();
});

const enchantedGroveSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const enchantedGroveSpinFn = createServerFn({ method: "POST" })
  .validator(enchantedGroveSpinSchema)
  .handler(async ({ data }) => {
    const { enchantedGrovePaidSpin } = await import("../server/games/enchanted-grove.server");
    return enchantedGrovePaidSpin(data);
  });

const enchantedGroveFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const enchantedGroveFreeSpinFn = createServerFn({ method: "POST" })
  .validator(enchantedGroveFreeSpinSchema)
  .handler(async ({ data }) => {
    const { enchantedGroveFreeSpin } = await import("../server/games/enchanted-grove.server");
    return enchantedGroveFreeSpin(data);
  });

export const enchantedGroveBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(enchantedGroveSpinSchema)
  .handler(async ({ data }) => {
    const { enchantedGroveBuyFeature } = await import("../server/games/enchanted-grove.server");
    return enchantedGroveBuyFeature(data);
  });

export const getEnchantedGroveSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getEnchantedGroveOpenSession } = await import("../server/games/enchanted-grove.server");
  return getEnchantedGroveOpenSession();
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

const mahjongWays2SpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const mahjongWays2SpinFn = createServerFn({ method: "POST" })
  .validator(mahjongWays2SpinSchema)
  .handler(async ({ data }) => {
    const { mahjongWays2PaidSpin } = await import("../server/games/mahjong-ways-2.server");
    return mahjongWays2PaidSpin(data);
  });

const mahjongWays2FreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const mahjongWays2FreeSpinFn = createServerFn({ method: "POST" })
  .validator(mahjongWays2FreeSpinSchema)
  .handler(async ({ data }) => {
    const { mahjongWays2FreeSpin } = await import("../server/games/mahjong-ways-2.server");
    return mahjongWays2FreeSpin(data);
  });

const mahjongWays2BuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const mahjongWays2BuyFeatureFn = createServerFn({ method: "POST" })
  .validator(mahjongWays2BuySchema)
  .handler(async ({ data }) => {
    const { mahjongWays2BuyFeature } = await import("../server/games/mahjong-ways-2.server");
    return mahjongWays2BuyFeature(data);
  });

export const getMahjongWays2SessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMahjongWays2OpenSession } = await import("../server/games/mahjong-ways-2.server");
  return getMahjongWays2OpenSession();
});

const dragonPhoenixSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const dragonPhoenixSpinFn = createServerFn({ method: "POST" })
  .validator(dragonPhoenixSpinSchema)
  .handler(async ({ data }) => {
    const { dragonPhoenixPaidSpin } = await import("../server/games/dragon-phoenix.server");
    return dragonPhoenixPaidSpin(data);
  });

const dragonPhoenixFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const dragonPhoenixFreeSpinFn = createServerFn({ method: "POST" })
  .validator(dragonPhoenixFreeSpinSchema)
  .handler(async ({ data }) => {
    const { dragonPhoenixFreeSpin } = await import("../server/games/dragon-phoenix.server");
    return dragonPhoenixFreeSpin(data);
  });

const dragonPhoenixBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const dragonPhoenixBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(dragonPhoenixBuySchema)
  .handler(async ({ data }) => {
    const { dragonPhoenixBuyFeature } = await import("../server/games/dragon-phoenix.server");
    return dragonPhoenixBuyFeature(data);
  });

export const getDragonPhoenixSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDragonPhoenixOpenSession } = await import("../server/games/dragon-phoenix.server");
  return getDragonPhoenixOpenSession();
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

const manilaNightsSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const manilaNightsSpinFn = createServerFn({ method: "POST" })
  .validator(manilaNightsSpinSchema)
  .handler(async ({ data }) => {
    const { manilaNightsPaidSpin } = await import("../server/games/manila-nights.server");
    return manilaNightsPaidSpin(data);
  });

const manilaNightsFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const manilaNightsFreeSpinFn = createServerFn({ method: "POST" })
  .validator(manilaNightsFreeSpinSchema)
  .handler(async ({ data }) => {
    const { manilaNightsFreeSpin } = await import("../server/games/manila-nights.server");
    return manilaNightsFreeSpin(data);
  });

const manilaNightsBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const manilaNightsBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(manilaNightsBuySchema)
  .handler(async ({ data }) => {
    const { manilaNightsBuyFeature } = await import("../server/games/manila-nights.server");
    return manilaNightsBuyFeature(data);
  });

export const getManilaNightsSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getManilaNightsOpenSession } = await import("../server/games/manila-nights.server");
  return getManilaNightsOpenSession();
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

const megaAceSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const megaAceSpinFn = createServerFn({ method: "POST" })
  .validator(megaAceSpinSchema)
  .handler(async ({ data }) => {
    const { megaAcePaidSpin } = await import("../server/games/mega-ace.server");
    return megaAcePaidSpin(data);
  });

const megaAceFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const megaAceFreeSpinFn = createServerFn({ method: "POST" })
  .validator(megaAceFreeSpinSchema)
  .handler(async ({ data }) => {
    const { megaAceFreeSpin } = await import("../server/games/mega-ace.server");
    return megaAceFreeSpin(data);
  });

const megaAceBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const megaAceBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(megaAceBuySchema)
  .handler(async ({ data }) => {
    const { megaAceBuyFeature } = await import("../server/games/mega-ace.server");
    return megaAceBuyFeature(data);
  });

export const getMegaAceSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMegaAceOpenSession } = await import("../server/games/mega-ace.server");
  return getMegaAceOpenSession();
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

const boxingKingSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const boxingKingSpinFn = createServerFn({ method: "POST" })
  .validator(boxingKingSpinSchema)
  .handler(async ({ data }) => {
    const { boxingKingPaidSpin } = await import("../server/games/boxing-king.server");
    return boxingKingPaidSpin(data);
  });

export const getBoxingKingEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBoxingKingEngineConfigPublic } = await import("../server/games/boxing-king.server");
  return getBoxingKingEngineConfigPublic();
});

const goalRushSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const goalRushSpinFn = createServerFn({ method: "POST" })
  .validator(goalRushSpinSchema)
  .handler(async ({ data }) => {
    const { goalRushPaidSpin } = await import("../server/games/goal-rush.server");
    return goalRushPaidSpin(data);
  });

export const getGoalRushEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGoalRushEngineConfigPublic } = await import("../server/games/goal-rush.server");
  return getGoalRushEngineConfigPublic();
});

const moneyComingSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const moneyComingSpinFn = createServerFn({ method: "POST" })
  .validator(moneyComingSpinSchema)
  .handler(async ({ data }) => {
    const { moneyComingPaidSpin } = await import("../server/games/money-coming.server");
    return moneyComingPaidSpin(data);
  });

export const getMoneyComingEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMoneyComingEngineConfigPublic } = await import("../server/games/money-coming.server");
  return getMoneyComingEngineConfigPublic();
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

const fortuneOxSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  exMode: z.boolean().optional(),
});

export const fortuneOxSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneOxSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneOxPaidSpin } = await import("../server/games/fortune-ox.server");
    return fortuneOxPaidSpin(data);
  });

export const getFortuneOxEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneOxEngineConfigPublic } = await import("../server/games/fortune-ox.server");
  return getFortuneOxEngineConfigPublic();
});

const fortuneTigerSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  exMode: z.boolean().optional(),
});

export const fortuneTigerSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneTigerSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneTigerPaidSpin } = await import("../server/games/fortune-tiger.server");
    return fortuneTigerPaidSpin(data);
  });

export const getFortuneTigerEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneTigerEngineConfigPublic } = await import("../server/games/fortune-tiger.server");
  return getFortuneTigerEngineConfigPublic();
});

const fortuneRabbitSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  exMode: z.boolean().optional(),
});

export const fortuneRabbitSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneRabbitSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneRabbitPaidSpin } = await import("../server/games/fortune-rabbit.server");
    return fortuneRabbitPaidSpin(data);
  });

export const getFortuneRabbitEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneRabbitEngineConfigPublic } = await import("../server/games/fortune-rabbit.server");
  return getFortuneRabbitEngineConfigPublic();
});

const dustDollarsSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const dustDollarsSpinFn = createServerFn({ method: "POST" })
  .validator(dustDollarsSpinSchema)
  .handler(async ({ data }) => {
    const { dustDollarsPaidSpin } = await import("../server/games/dust-dollars.server");
    return dustDollarsPaidSpin(data);
  });

const dustDollarsFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const dustDollarsFreeSpinFn = createServerFn({ method: "POST" })
  .validator(dustDollarsFreeSpinSchema)
  .handler(async ({ data }) => {
    const { dustDollarsFreeSpin } = await import("../server/games/dust-dollars.server");
    return dustDollarsFreeSpin(data);
  });

const dustDollarsBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const dustDollarsBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(dustDollarsBuySchema)
  .handler(async ({ data }) => {
    const { dustDollarsBuyFeature } = await import("../server/games/dust-dollars.server");
    return dustDollarsBuyFeature(data);
  });

export const getDustDollarsSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDustDollarsOpenSession } = await import("../server/games/dust-dollars.server");
  return getDustDollarsOpenSession();
});

const cleopatraGoldSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean().optional().default(false),
});

export const cleopatraGoldSpinFn = createServerFn({ method: "POST" })
  .validator(cleopatraGoldSpinSchema)
  .handler(async ({ data }) => {
    const { cleopatraGoldPaidSpin } = await import("../server/games/cleopatra-gold.server");
    return cleopatraGoldPaidSpin({ bet: data.bet, ante: !!data.ante });
  });

const cleopatraGoldFreeSpinSchema = z.object({
  sessionId: z.string().min(1),
});

export const cleopatraGoldFreeSpinFn = createServerFn({ method: "POST" })
  .validator(cleopatraGoldFreeSpinSchema)
  .handler(async ({ data }) => {
    const { cleopatraGoldFreeSpin } = await import("../server/games/cleopatra-gold.server");
    return cleopatraGoldFreeSpin(data);
  });

const cleopatraGoldBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const cleopatraGoldBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(cleopatraGoldBuySchema)
  .handler(async ({ data }) => {
    const { cleopatraGoldBuyFeature } = await import("../server/games/cleopatra-gold.server");
    return cleopatraGoldBuyFeature(data);
  });

export const getCleopatraGoldSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCleopatraGoldOpenSession } = await import("../server/games/cleopatra-gold.server");
  return getCleopatraGoldOpenSession();
});

const goldMineSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const goldMineSpinFn = createServerFn({ method: "POST" })
  .validator(goldMineSpinSchema)
  .handler(async ({ data }) => {
    const { goldMinePaidSpin } = await import("../server/games/gold-mine.server");
    return goldMinePaidSpin(data);
  });

const goldMineFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const goldMineFreeSpinFn = createServerFn({ method: "POST" })
  .validator(goldMineFreeSpinSchema)
  .handler(async ({ data }) => {
    const { goldMineFreeSpin } = await import("../server/games/gold-mine.server");
    return goldMineFreeSpin(data);
  });

const goldMineBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const goldMineBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(goldMineBuySchema)
  .handler(async ({ data }) => {
    const { goldMineBuyFeature } = await import("../server/games/gold-mine.server");
    return goldMineBuyFeature(data);
  });

export const getGoldMineSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGoldMineOpenSession } = await import("../server/games/gold-mine.server");
  return getGoldMineOpenSession();
});

const jeepneyJackpotSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const jeepneyJackpotSpinFn = createServerFn({ method: "POST" })
  .validator(jeepneyJackpotSpinSchema)
  .handler(async ({ data }) => {
    const { jeepneyJackpotPaidSpin } = await import("../server/games/jeepney-jackpot.server");
    return jeepneyJackpotPaidSpin(data);
  });

const jeepneyJackpotFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const jeepneyJackpotFreeSpinFn = createServerFn({ method: "POST" })
  .validator(jeepneyJackpotFreeSpinSchema)
  .handler(async ({ data }) => {
    const { jeepneyJackpotFreeSpin } = await import("../server/games/jeepney-jackpot.server");
    return jeepneyJackpotFreeSpin(data);
  });

const jeepneyJackpotBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const jeepneyJackpotBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(jeepneyJackpotBuySchema)
  .handler(async ({ data }) => {
    const { jeepneyJackpotBuyFeature } = await import("../server/games/jeepney-jackpot.server");
    return jeepneyJackpotBuyFeature(data);
  });

export const getJeepneyJackpotSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getJeepneyJackpotOpenSession } = await import("../server/games/jeepney-jackpot.server");
  return getJeepneyJackpotOpenSession();
});

const sariSariSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  exMode: z.boolean().optional(),
});

export const sariSariSpinFn = createServerFn({ method: "POST" })
  .validator(sariSariSpinSchema)
  .handler(async ({ data }) => {
    const { sariSariSpinPaidSpin } = await import("../server/games/sari-sari-spin.server");
    return sariSariSpinPaidSpin(data);
  });

export const getSariSariSpinEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSariSariSpinEngineConfigPublic } = await import("../server/games/sari-sari-spin.server");
  return getSariSariSpinEngineConfigPublic();
});

const carabaoChargeSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean().optional().default(false),
});

export const carabaoChargeSpinFn = createServerFn({ method: "POST" })
  .validator(carabaoChargeSpinSchema)
  .handler(async ({ data }) => {
    const { carabaoChargePaidSpin } = await import("../server/games/carabao-charge.server");
    return carabaoChargePaidSpin({ bet: data.bet, ante: !!data.ante });
  });

const carabaoChargeFreeSpinSchema = z.object({
  sessionId: z.string().min(1),
});

export const carabaoChargeFreeSpinFn = createServerFn({ method: "POST" })
  .validator(carabaoChargeFreeSpinSchema)
  .handler(async ({ data }) => {
    const { carabaoChargeFreeSpin } = await import("../server/games/carabao-charge.server");
    return carabaoChargeFreeSpin(data);
  });

const carabaoChargeBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const carabaoChargeBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(carabaoChargeBuySchema)
  .handler(async ({ data }) => {
    const { carabaoChargeBuyFeature } = await import("../server/games/carabao-charge.server");
    return carabaoChargeBuyFeature(data);
  });

export const getCarabaoChargeSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCarabaoChargeOpenSession } = await import("../server/games/carabao-charge.server");
  return getCarabaoChargeOpenSession();
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

const crazySevensSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  held: z.array(z.boolean()).max(3).optional(),
  previousReels: z
    .array(z.string())
    .length(3)
    .nullable()
    .optional(),
});

export const crazySevensSpinFn = createServerFn({ method: "POST" })
  .validator(crazySevensSpinSchema)
  .handler(async ({ data }) => {
    const { crazySevensPaidSpin } = await import("../server/games/crazy-sevens.server");
    return JSON.parse(
      JSON.stringify(
        await crazySevensPaidSpin({
          bet: data.bet,
          held: data.held,
          previousReels:
            (data.previousReels as import("@/components/maxhigh/crazy-sevens/types").RrReels | null) ??
            null,
        }),
      ),
    ) as Awaited<ReturnType<typeof crazySevensPaidSpin>>;
  });

export const getCrazySevensEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCrazySevensEngineConfigPublic } = await import("../server/games/crazy-sevens.server");
  return getCrazySevensEngineConfigPublic();
});

export const getCrazySevensJackpotFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCrazySevensJackpotPool } = await import("../server/games/crazy-sevens.server");
  return getCrazySevensJackpotPool();
});


const luckyNekoSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  exMode: z.boolean().optional(),
});

export const luckyNekoSpinFn = createServerFn({ method: "POST" })
  .validator(luckyNekoSpinSchema)
  .handler(async ({ data }) => {
    const { luckyNekoPaidSpin } = await import("../server/games/lucky-neko.server");
    return luckyNekoPaidSpin(data);
  });

export const getLuckyNekoEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyNekoEngineConfigPublic } = await import("../server/games/lucky-neko.server");
  return getLuckyNekoEngineConfigPublic();
});

const fortuneMouseSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  exMode: z.boolean().optional(),
});

export const fortuneMouseSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneMouseSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneMousePaidSpin } = await import("../server/games/fortune-mouse.server");
    return fortuneMousePaidSpin(data);
  });

export const getFortuneMouseEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneMouseEngineConfigPublic } = await import("../server/games/fortune-mouse.server");
  return getFortuneMouseEngineConfigPublic();
});

const prosperityLionSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  exMode: z.boolean().optional(),
});

export const prosperityLionSpinFn = createServerFn({ method: "POST" })
  .validator(prosperityLionSpinSchema)
  .handler(async ({ data }) => {
    const { prosperityLionPaidSpin } = await import("../server/games/prosperity-lion.server");
    return prosperityLionPaidSpin(data);
  });

export const getProsperityLionEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getProsperityLionEngineConfigPublic } = await import("../server/games/prosperity-lion.server");
  return getProsperityLionEngineConfigPublic();
});

const coinVolcanoSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const coinVolcanoSpinFn = createServerFn({ method: "POST" })
  .validator(coinVolcanoSpinSchema)
  .handler(async ({ data }) => {
    const { coinVolcanoPaidSpin } = await import("../server/games/coin-volcano.server");
    return coinVolcanoPaidSpin(data);
  });

export const getCoinVolcanoEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCoinVolcanoEngineConfigPublic } = await import("../server/games/coin-volcano.server");
  return getCoinVolcanoEngineConfigPublic();
});

const cashManiaSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const cashManiaSpinFn = createServerFn({ method: "POST" })
  .validator(cashManiaSpinSchema)
  .handler(async ({ data }) => {
    const { cashManiaPaidSpin } = await import("../server/games/cash-mania.server");
    return cashManiaPaidSpin(data);
  });

export const getCashManiaEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCashManiaEngineConfigPublic } = await import("../server/games/cash-mania.server");
  return getCashManiaEngineConfigPublic();
});

const zeusStrikeSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const zeusStrikeSpinFn = createServerFn({ method: "POST" })
  .validator(zeusStrikeSpinSchema)
  .handler(async ({ data }) => {
    const { zeusStrikePaidSpin } = await import("../server/games/zeus-strike.server");
    return zeusStrikePaidSpin(data);
  });

const zeusStrikeFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const zeusStrikeFreeSpinFn = createServerFn({ method: "POST" })
  .validator(zeusStrikeFreeSpinSchema)
  .handler(async ({ data }) => {
    const { zeusStrikeFreeSpin } = await import("../server/games/zeus-strike.server");
    return zeusStrikeFreeSpin(data);
  });

export const zeusStrikeBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(zeusStrikeSpinSchema)
  .handler(async ({ data }) => {
    const { zeusStrikeBuyFeature } = await import("../server/games/zeus-strike.server");
    return zeusStrikeBuyFeature(data);
  });

export const getZeusStrikeSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getZeusStrikeOpenSession } = await import("../server/games/zeus-strike.server");
  return getZeusStrikeOpenSession();
});

const thorThunderSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const thorThunderSpinFn = createServerFn({ method: "POST" })
  .validator(thorThunderSpinSchema)
  .handler(async ({ data }) => {
    const { thorThunderPaidSpin } = await import("../server/games/thor-thunder.server");
    return thorThunderPaidSpin(data);
  });

const thorThunderFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const thorThunderFreeSpinFn = createServerFn({ method: "POST" })
  .validator(thorThunderFreeSpinSchema)
  .handler(async ({ data }) => {
    const { thorThunderFreeSpin } = await import("../server/games/thor-thunder.server");
    return thorThunderFreeSpin(data);
  });

export const thorThunderBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(thorThunderSpinSchema)
  .handler(async ({ data }) => {
    const { thorThunderBuyFeature } = await import("../server/games/thor-thunder.server");
    return thorThunderBuyFeature(data);
  });

export const getThorThunderSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getThorThunderOpenSession } = await import("../server/games/thor-thunder.server");
  return getThorThunderOpenSession();
});

const mayaGoldSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const mayaGoldSpinFn = createServerFn({ method: "POST" })
  .validator(mayaGoldSpinSchema)
  .handler(async ({ data }) => {
    const { mayaGoldPaidSpin } = await import("../server/games/maya-gold.server");
    return mayaGoldPaidSpin(data);
  });

const mayaGoldFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const mayaGoldFreeSpinFn = createServerFn({ method: "POST" })
  .validator(mayaGoldFreeSpinSchema)
  .handler(async ({ data }) => {
    const { mayaGoldFreeSpin } = await import("../server/games/maya-gold.server");
    return mayaGoldFreeSpin(data);
  });

const mayaGoldBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const mayaGoldBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(mayaGoldBuySchema)
  .handler(async ({ data }) => {
    const { mayaGoldBuyFeature } = await import("../server/games/maya-gold.server");
    return mayaGoldBuyFeature(data);
  });

export const getMayaGoldSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMayaGoldOpenSession } = await import("../server/games/maya-gold.server");
  return getMayaGoldOpenSession();
});

const templeRushSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const templeRushSpinFn = createServerFn({ method: "POST" })
  .validator(templeRushSpinSchema)
  .handler(async ({ data }) => {
    const { templeRushPaidSpin } = await import("../server/games/temple-rush.server");
    return templeRushPaidSpin(data);
  });

const templeRushFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const templeRushFreeSpinFn = createServerFn({ method: "POST" })
  .validator(templeRushFreeSpinSchema)
  .handler(async ({ data }) => {
    const { templeRushFreeSpin } = await import("../server/games/temple-rush.server");
    return templeRushFreeSpin(data);
  });

const templeRushBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const templeRushBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(templeRushBuySchema)
  .handler(async ({ data }) => {
    const { templeRushBuyFeature } = await import("../server/games/temple-rush.server");
    return templeRushBuyFeature(data);
  });

export const getTempleRushSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getTempleRushOpenSession } = await import("../server/games/temple-rush.server");
  return getTempleRushOpenSession();
});

const mahjongWays3SpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const mahjongWays3SpinFn = createServerFn({ method: "POST" })
  .validator(mahjongWays3SpinSchema)
  .handler(async ({ data }) => {
    const { mahjongWays3PaidSpin } = await import("../server/games/mahjong-ways-3.server");
    return mahjongWays3PaidSpin(data);
  });

const mahjongWays3FreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const mahjongWays3FreeSpinFn = createServerFn({ method: "POST" })
  .validator(mahjongWays3FreeSpinSchema)
  .handler(async ({ data }) => {
    const { mahjongWays3FreeSpin } = await import("../server/games/mahjong-ways-3.server");
    return mahjongWays3FreeSpin(data);
  });

const mahjongWays3BuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const mahjongWays3BuyFeatureFn = createServerFn({ method: "POST" })
  .validator(mahjongWays3BuySchema)
  .handler(async ({ data }) => {
    const { mahjongWays3BuyFeature } = await import("../server/games/mahjong-ways-3.server");
    return mahjongWays3BuyFeature(data);
  });

export const getMahjongWays3SessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMahjongWays3OpenSession } = await import("../server/games/mahjong-ways-3.server");
  return getMahjongWays3OpenSession();
});

const wildAceSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const wildAceSpinFn = createServerFn({ method: "POST" })
  .validator(wildAceSpinSchema)
  .handler(async ({ data }) => {
    const { wildAcePaidSpin } = await import("../server/games/wild-ace.server");
    return wildAcePaidSpin(data);
  });

const wildAceFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const wildAceFreeSpinFn = createServerFn({ method: "POST" })
  .validator(wildAceFreeSpinSchema)
  .handler(async ({ data }) => {
    const { wildAceFreeSpin } = await import("../server/games/wild-ace.server");
    return wildAceFreeSpin(data);
  });

const wildAceBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const wildAceBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(wildAceBuySchema)
  .handler(async ({ data }) => {
    const { wildAceBuyFeature } = await import("../server/games/wild-ace.server");
    return wildAceBuyFeature(data);
  });

export const getWildAceSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getWildAceOpenSession } = await import("../server/games/wild-ace.server");
  return getWildAceOpenSession();
});

const royalAceSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const royalAceSpinFn = createServerFn({ method: "POST" })
  .validator(royalAceSpinSchema)
  .handler(async ({ data }) => {
    const { royalAcePaidSpin } = await import("../server/games/royal-ace.server");
    return royalAcePaidSpin(data);
  });

const royalAceFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const royalAceFreeSpinFn = createServerFn({ method: "POST" })
  .validator(royalAceFreeSpinSchema)
  .handler(async ({ data }) => {
    const { royalAceFreeSpin } = await import("../server/games/royal-ace.server");
    return royalAceFreeSpin(data);
  });

const royalAceBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const royalAceBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(royalAceBuySchema)
  .handler(async ({ data }) => {
    const { royalAceBuyFeature } = await import("../server/games/royal-ace.server");
    return royalAceBuyFeature(data);
  });

export const getRoyalAceSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getRoyalAceOpenSession } = await import("../server/games/royal-ace.server");
  return getRoyalAceOpenSession();
});

const neonFruitsSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  held: z.array(z.boolean()).max(3).optional(),
  previousReels: z
    .array(z.string())
    .length(3)
    .nullable()
    .optional(),
});

export const neonFruitsSpinFn = createServerFn({ method: "POST" })
  .validator(neonFruitsSpinSchema)
  .handler(async ({ data }) => {
    const { neonFruitsPaidSpin } = await import("../server/games/neon-fruits.server");
    return JSON.parse(
      JSON.stringify(
        await neonFruitsPaidSpin({
          bet: data.bet,
          held: data.held,
          previousReels:
            (data.previousReels as import("@/components/maxhigh/neon-fruits/types").RrReels | null) ??
            null,
        }),
      ),
    ) as Awaited<ReturnType<typeof neonFruitsPaidSpin>>;
  });

export const getNeonFruitsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getNeonFruitsEngineConfigPublic } = await import("../server/games/neon-fruits.server");
  return getNeonFruitsEngineConfigPublic();
});

export const getNeonFruitsJackpotFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getNeonFruitsJackpotPool } = await import("../server/games/neon-fruits.server");
  return getNeonFruitsJackpotPool();
});

const luckyBarsSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  held: z.array(z.boolean()).max(3).optional(),
  previousReels: z
    .array(z.string())
    .length(3)
    .nullable()
    .optional(),
});

export const luckyBarsSpinFn = createServerFn({ method: "POST" })
  .validator(luckyBarsSpinSchema)
  .handler(async ({ data }) => {
    const { luckyBarsPaidSpin } = await import("../server/games/lucky-bars.server");
    return JSON.parse(
      JSON.stringify(
        await luckyBarsPaidSpin({
          bet: data.bet,
          held: data.held,
          previousReels:
            (data.previousReels as import("@/components/maxhigh/lucky-bars/types").RrReels | null) ??
            null,
        }),
      ),
    ) as Awaited<ReturnType<typeof luckyBarsPaidSpin>>;
  });

export const getLuckyBarsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyBarsEngineConfigPublic } = await import("../server/games/lucky-bars.server");
  return getLuckyBarsEngineConfigPublic();
});

export const getLuckyBarsJackpotFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyBarsJackpotPool } = await import("../server/games/lucky-bars.server");
  return getLuckyBarsJackpotPool();
});


/* WAVE_B_SLOT_API */

const knockoutKingSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const knockoutKingSpinFn = createServerFn({ method: "POST" })
  .validator(knockoutKingSpinSchema)
  .handler(async ({ data }) => {
    const { knockoutKingPaidSpin } = await import("../server/games/knockout-king.server");
    return knockoutKingPaidSpin(data);
  });

export const getKnockoutKingEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getKnockoutKingEngineConfigPublic } = await import("../server/games/knockout-king.server");
  return getKnockoutKingEngineConfigPublic();
});


const arenaChampSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const arenaChampSpinFn = createServerFn({ method: "POST" })
  .validator(arenaChampSpinSchema)
  .handler(async ({ data }) => {
    const { arenaChampPaidSpin } = await import("../server/games/arena-champ.server");
    return arenaChampPaidSpin(data);
  });

export const getArenaChampEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getArenaChampEngineConfigPublic } = await import("../server/games/arena-champ.server");
  return getArenaChampEngineConfigPublic();
});


const safariGoldSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean().optional().default(false),
});

export const safariGoldSpinFn = createServerFn({ method: "POST" })
  .validator(safariGoldSpinSchema)
  .handler(async ({ data }) => {
    const { safariGoldPaidSpin } = await import("../server/games/safari-gold.server");
    return safariGoldPaidSpin({ bet: data.bet, ante: !!data.ante });
  });

const safariGoldFreeSpinSchema = z.object({
  sessionId: z.string().min(1),
});

export const safariGoldFreeSpinFn = createServerFn({ method: "POST" })
  .validator(safariGoldFreeSpinSchema)
  .handler(async ({ data }) => {
    const { safariGoldFreeSpin } = await import("../server/games/safari-gold.server");
    return safariGoldFreeSpin(data);
  });

const safariGoldBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const safariGoldBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(safariGoldBuySchema)
  .handler(async ({ data }) => {
    const { safariGoldBuyFeature } = await import("../server/games/safari-gold.server");
    return safariGoldBuyFeature(data);
  });

export const getSafariGoldSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSafariGoldOpenSession } = await import("../server/games/safari-gold.server");
  return getSafariGoldOpenSession();
});


const pharaohFireSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean().optional().default(false),
});

export const pharaohFireSpinFn = createServerFn({ method: "POST" })
  .validator(pharaohFireSpinSchema)
  .handler(async ({ data }) => {
    const { pharaohFirePaidSpin } = await import("../server/games/pharaoh-fire.server");
    return pharaohFirePaidSpin({ bet: data.bet, ante: !!data.ante });
  });

const pharaohFireFreeSpinSchema = z.object({
  sessionId: z.string().min(1),
});

export const pharaohFireFreeSpinFn = createServerFn({ method: "POST" })
  .validator(pharaohFireFreeSpinSchema)
  .handler(async ({ data }) => {
    const { pharaohFireFreeSpin } = await import("../server/games/pharaoh-fire.server");
    return pharaohFireFreeSpin(data);
  });

const pharaohFireBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const pharaohFireBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(pharaohFireBuySchema)
  .handler(async ({ data }) => {
    const { pharaohFireBuyFeature } = await import("../server/games/pharaoh-fire.server");
    return pharaohFireBuyFeature(data);
  });

export const getPharaohFireSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPharaohFireOpenSession } = await import("../server/games/pharaoh-fire.server");
  return getPharaohFireOpenSession();
});


const desertRichesSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const desertRichesSpinFn = createServerFn({ method: "POST" })
  .validator(desertRichesSpinSchema)
  .handler(async ({ data }) => {
    const { desertRichesPaidSpin } = await import("../server/games/desert-riches.server");
    return desertRichesPaidSpin(data);
  });

const desertRichesFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const desertRichesFreeSpinFn = createServerFn({ method: "POST" })
  .validator(desertRichesFreeSpinSchema)
  .handler(async ({ data }) => {
    const { desertRichesFreeSpin } = await import("../server/games/desert-riches.server");
    return desertRichesFreeSpin(data);
  });

const desertRichesBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const desertRichesBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(desertRichesBuySchema)
  .handler(async ({ data }) => {
    const { desertRichesBuyFeature } = await import("../server/games/desert-riches.server");
    return desertRichesBuyFeature(data);
  });

export const getDesertRichesSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDesertRichesOpenSession } = await import("../server/games/desert-riches.server");
  return getDesertRichesOpenSession();
});


const outlawCoinsSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const outlawCoinsSpinFn = createServerFn({ method: "POST" })
  .validator(outlawCoinsSpinSchema)
  .handler(async ({ data }) => {
    const { outlawCoinsPaidSpin } = await import("../server/games/outlaw-coins.server");
    return outlawCoinsPaidSpin(data);
  });

const outlawCoinsFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const outlawCoinsFreeSpinFn = createServerFn({ method: "POST" })
  .validator(outlawCoinsFreeSpinSchema)
  .handler(async ({ data }) => {
    const { outlawCoinsFreeSpin } = await import("../server/games/outlaw-coins.server");
    return outlawCoinsFreeSpin(data);
  });

const outlawCoinsBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const outlawCoinsBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(outlawCoinsBuySchema)
  .handler(async ({ data }) => {
    const { outlawCoinsBuyFeature } = await import("../server/games/outlaw-coins.server");
    return outlawCoinsBuyFeature(data);
  });

export const getOutlawCoinsSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getOutlawCoinsOpenSession } = await import("../server/games/outlaw-coins.server");
  return getOutlawCoinsOpenSession();
});


const crystalCaveSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const crystalCaveSpinFn = createServerFn({ method: "POST" })
  .validator(crystalCaveSpinSchema)
  .handler(async ({ data }) => {
    const { crystalCavePaidSpin } = await import("../server/games/crystal-cave.server");
    return crystalCavePaidSpin(data);
  });

const crystalCaveFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const crystalCaveFreeSpinFn = createServerFn({ method: "POST" })
  .validator(crystalCaveFreeSpinSchema)
  .handler(async ({ data }) => {
    const { crystalCaveFreeSpin } = await import("../server/games/crystal-cave.server");
    return crystalCaveFreeSpin(data);
  });

const crystalCaveBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const crystalCaveBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(crystalCaveBuySchema)
  .handler(async ({ data }) => {
    const { crystalCaveBuyFeature } = await import("../server/games/crystal-cave.server");
    return crystalCaveBuyFeature(data);
  });

export const getCrystalCaveSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCrystalCaveOpenSession } = await import("../server/games/crystal-cave.server");
  return getCrystalCaveOpenSession();
});


const diamondDigSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const diamondDigSpinFn = createServerFn({ method: "POST" })
  .validator(diamondDigSpinSchema)
  .handler(async ({ data }) => {
    const { diamondDigPaidSpin } = await import("../server/games/diamond-dig.server");
    return diamondDigPaidSpin(data);
  });

const diamondDigFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const diamondDigFreeSpinFn = createServerFn({ method: "POST" })
  .validator(diamondDigFreeSpinSchema)
  .handler(async ({ data }) => {
    const { diamondDigFreeSpin } = await import("../server/games/diamond-dig.server");
    return diamondDigFreeSpin(data);
  });

const diamondDigBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const diamondDigBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(diamondDigBuySchema)
  .handler(async ({ data }) => {
    const { diamondDigBuyFeature } = await import("../server/games/diamond-dig.server");
    return diamondDigBuyFeature(data);
  });

export const getDiamondDigSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getDiamondDigOpenSession } = await import("../server/games/diamond-dig.server");
  return getDiamondDigOpenSession();
});


const candyBlastSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const candyBlastSpinFn = createServerFn({ method: "POST" })
  .validator(candyBlastSpinSchema)
  .handler(async ({ data }) => {
    const { candyBlastPaidSpin } = await import("../server/games/candy-blast.server");
    return candyBlastPaidSpin(data);
  });

const candyBlastFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const candyBlastFreeSpinFn = createServerFn({ method: "POST" })
  .validator(candyBlastFreeSpinSchema)
  .handler(async ({ data }) => {
    const { candyBlastFreeSpin } = await import("../server/games/candy-blast.server");
    return candyBlastFreeSpin(data);
  });

const candyBlastBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const candyBlastBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(candyBlastBuySchema)
  .handler(async ({ data }) => {
    const { candyBlastBuyFeature } = await import("../server/games/candy-blast.server");
    return candyBlastBuyFeature(data);
  });

export const getCandyBlastSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCandyBlastOpenSession } = await import("../server/games/candy-blast.server");
  return getCandyBlastOpenSession();
});


const sweetRushSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const sweetRushSpinFn = createServerFn({ method: "POST" })
  .validator(sweetRushSpinSchema)
  .handler(async ({ data }) => {
    const { sweetRushPaidSpin } = await import("../server/games/sweet-rush.server");
    return sweetRushPaidSpin(data);
  });

const sweetRushFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const sweetRushFreeSpinFn = createServerFn({ method: "POST" })
  .validator(sweetRushFreeSpinSchema)
  .handler(async ({ data }) => {
    const { sweetRushFreeSpin } = await import("../server/games/sweet-rush.server");
    return sweetRushFreeSpin(data);
  });

const sweetRushBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const sweetRushBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(sweetRushBuySchema)
  .handler(async ({ data }) => {
    const { sweetRushBuyFeature } = await import("../server/games/sweet-rush.server");
    return sweetRushBuyFeature(data);
  });

export const getSweetRushSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSweetRushOpenSession } = await import("../server/games/sweet-rush.server");
  return getSweetRushOpenSession();
});


const starlightWaysSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const starlightWaysSpinFn = createServerFn({ method: "POST" })
  .validator(starlightWaysSpinSchema)
  .handler(async ({ data }) => {
    const { starlightWaysPaidSpin } = await import("../server/games/starlight-ways.server");
    return starlightWaysPaidSpin(data);
  });

const starlightWaysFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const starlightWaysFreeSpinFn = createServerFn({ method: "POST" })
  .validator(starlightWaysFreeSpinSchema)
  .handler(async ({ data }) => {
    const { starlightWaysFreeSpin } = await import("../server/games/starlight-ways.server");
    return starlightWaysFreeSpin(data);
  });

const starlightWaysBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const starlightWaysBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(starlightWaysBuySchema)
  .handler(async ({ data }) => {
    const { starlightWaysBuyFeature } = await import("../server/games/starlight-ways.server");
    return starlightWaysBuyFeature(data);
  });

export const getStarlightWaysSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getStarlightWaysOpenSession } = await import("../server/games/starlight-ways.server");
  return getStarlightWaysOpenSession();
});


const galaxyAceSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const galaxyAceSpinFn = createServerFn({ method: "POST" })
  .validator(galaxyAceSpinSchema)
  .handler(async ({ data }) => {
    const { galaxyAcePaidSpin } = await import("../server/games/galaxy-ace.server");
    return galaxyAcePaidSpin(data);
  });

const galaxyAceFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const galaxyAceFreeSpinFn = createServerFn({ method: "POST" })
  .validator(galaxyAceFreeSpinSchema)
  .handler(async ({ data }) => {
    const { galaxyAceFreeSpin } = await import("../server/games/galaxy-ace.server");
    return galaxyAceFreeSpin(data);
  });

const galaxyAceBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const galaxyAceBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(galaxyAceBuySchema)
  .handler(async ({ data }) => {
    const { galaxyAceBuyFeature } = await import("../server/games/galaxy-ace.server");
    return galaxyAceBuyFeature(data);
  });

export const getGalaxyAceSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGalaxyAceOpenSession } = await import("../server/games/galaxy-ace.server");
  return getGalaxyAceOpenSession();
});


const gateOfRaSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const gateOfRaSpinFn = createServerFn({ method: "POST" })
  .validator(gateOfRaSpinSchema)
  .handler(async ({ data }) => {
    const { gateOfRaPaidSpin } = await import("../server/games/gate-of-ra.server");
    return gateOfRaPaidSpin(data);
  });

const gateOfRaFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const gateOfRaFreeSpinFn = createServerFn({ method: "POST" })
  .validator(gateOfRaFreeSpinSchema)
  .handler(async ({ data }) => {
    const { gateOfRaFreeSpin } = await import("../server/games/gate-of-ra.server");
    return gateOfRaFreeSpin(data);
  });

export const gateOfRaBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(gateOfRaSpinSchema)
  .handler(async ({ data }) => {
    const { gateOfRaBuyFeature } = await import("../server/games/gate-of-ra.server");
    return gateOfRaBuyFeature(data);
  });

export const getGateOfRaSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateOfRaOpenSession } = await import("../server/games/gate-of-ra.server");
  return getGateOfRaOpenSession();
});


const mysticRunesSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const mysticRunesSpinFn = createServerFn({ method: "POST" })
  .validator(mysticRunesSpinSchema)
  .handler(async ({ data }) => {
    const { mysticRunesPaidSpin } = await import("../server/games/mystic-runes.server");
    return mysticRunesPaidSpin(data);
  });

const mysticRunesFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const mysticRunesFreeSpinFn = createServerFn({ method: "POST" })
  .validator(mysticRunesFreeSpinSchema)
  .handler(async ({ data }) => {
    const { mysticRunesFreeSpin } = await import("../server/games/mystic-runes.server");
    return mysticRunesFreeSpin(data);
  });

export const mysticRunesBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(mysticRunesSpinSchema)
  .handler(async ({ data }) => {
    const { mysticRunesBuyFeature } = await import("../server/games/mystic-runes.server");
    return mysticRunesBuyFeature(data);
  });

export const getMysticRunesSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMysticRunesOpenSession } = await import("../server/games/mystic-runes.server");
  return getMysticRunesOpenSession();
});

const aceHighDealSchema = z.object({
  baseBet: z.number().finite().positive().max(100_000),
  tieBet: z.number().finite().min(0).max(100_000).optional(),
  aceBonusBet: z.number().finite().min(0).max(100_000).optional(),
});

export const aceHighDealFn = createServerFn({ method: "POST" })
  .validator(aceHighDealSchema)
  .handler(async ({ data }) => {
    const { aceHighPaidDeal } = await import("../server/games/ace-high.server");
    return JSON.parse(JSON.stringify(await aceHighPaidDeal(data))) as Awaited<
      ReturnType<typeof aceHighPaidDeal>
    >;
  });

export const aceHighWarFn = createServerFn({ method: "POST" })
  .validator(z.object({}).optional())
  .handler(async () => {
    const { aceHighGoToWar } = await import("../server/games/ace-high.server");
    return JSON.parse(JSON.stringify(await aceHighGoToWar())) as Awaited<
      ReturnType<typeof aceHighGoToWar>
    >;
  });

export const aceHighFoldFn = createServerFn({ method: "POST" })
  .validator(z.object({}).optional())
  .handler(async () => {
    const { aceHighFold } = await import("../server/games/ace-high.server");
    return JSON.parse(JSON.stringify(await aceHighFold())) as Awaited<
      ReturnType<typeof aceHighFold>
    >;
  });

export const getAceHighSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getAceHighOpenSession } = await import("../server/games/ace-high.server");
  return getAceHighOpenSession();
});

export const getAceHighEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getAceHighEngineConfigPublic } = await import("../server/games/ace-high.server");
  return getAceHighEngineConfigPublic();
});


// Wave C clones

const haloHaloHitsSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  exMode: z.boolean().optional(),
});

export const haloHaloHitsFn = createServerFn({ method: "POST" })
  .validator(haloHaloHitsSchema)
  .handler(async ({ data }) => {
    const { haloHaloHitsPaidSpin } = await import("../server/games/halo-halo-hits.server");
    return haloHaloHitsPaidSpin(data);
  });

export const getHaloHaloHitsEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getHaloHaloHitsEngineConfigPublic } = await import("../server/games/halo-halo-hits.server");
  return getHaloHaloHitsEngineConfigPublic();
});


const balutBonusSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  exMode: z.boolean().optional(),
});

export const balutBonusFn = createServerFn({ method: "POST" })
  .validator(balutBonusSchema)
  .handler(async ({ data }) => {
    const { balutBonusPaidSpin } = await import("../server/games/balut-bonus.server");
    return balutBonusPaidSpin(data);
  });

export const getBalutBonusEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBalutBonusEngineConfigPublic } = await import("../server/games/balut-bonus.server");
  return getBalutBonusEngineConfigPublic();
});


const sinigangSpinSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  autoCollect: z.boolean().optional(),
});

export const sinigangSpinSpinFn = createServerFn({ method: "POST" })
  .validator(sinigangSpinSpinSchema)
  .handler(async ({ data }) => {
    const { sinigangSpinPaidSpin } = await import("../server/games/sinigang-spin.server");
    return sinigangSpinPaidSpin(data);
  });

export const sinigangSpinCollectFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { sinigangSpinCollect } = await import("../server/games/sinigang-spin.server");
    return sinigangSpinCollect(data);
  });

export const sinigangSpinGambleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().min(1),
      choice: z.enum(["red", "black"]),
    }),
  )
  .handler(async ({ data }) => {
    const { sinigangSpinGamble } = await import("../server/games/sinigang-spin.server");
    return sinigangSpinGamble(data);
  });

export const getSinigangSpinSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSinigangSpinOpenSession } = await import("../server/games/sinigang-spin.server");
  return getSinigangSpinOpenSession();
});


const lechonLuckSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  autoCollect: z.boolean().optional(),
});

export const lechonLuckSpinFn = createServerFn({ method: "POST" })
  .validator(lechonLuckSpinSchema)
  .handler(async ({ data }) => {
    const { lechonLuckPaidSpin } = await import("../server/games/lechon-luck.server");
    return lechonLuckPaidSpin(data);
  });

export const lechonLuckCollectFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { lechonLuckCollect } = await import("../server/games/lechon-luck.server");
    return lechonLuckCollect(data);
  });

export const lechonLuckGambleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().min(1),
      choice: z.enum(["red", "black"]),
    }),
  )
  .handler(async ({ data }) => {
    const { lechonLuckGamble } = await import("../server/games/lechon-luck.server");
    return lechonLuckGamble(data);
  });

export const getLechonLuckSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLechonLuckOpenSession } = await import("../server/games/lechon-luck.server");
  return getLechonLuckOpenSession();
});


const lanternLuckSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  autoCollect: z.boolean().optional(),
});

export const lanternLuckSpinFn = createServerFn({ method: "POST" })
  .validator(lanternLuckSpinSchema)
  .handler(async ({ data }) => {
    const { lanternLuckPaidSpin } = await import("../server/games/lantern-luck.server");
    return lanternLuckPaidSpin(data);
  });

export const lanternLuckCollectFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { lanternLuckCollect } = await import("../server/games/lantern-luck.server");
    return lanternLuckCollect(data);
  });

export const lanternLuckGambleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().min(1),
      choice: z.enum(["red", "black"]),
    }),
  )
  .handler(async ({ data }) => {
    const { lanternLuckGamble } = await import("../server/games/lantern-luck.server");
    return lanternLuckGamble(data);
  });

export const getLanternLuckSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLanternLuckOpenSession } = await import("../server/games/lantern-luck.server");
  return getLanternLuckOpenSession();
});


const palengkePaysSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const palengkePaysSpinFn = createServerFn({ method: "POST" })
  .validator(palengkePaysSpinSchema)
  .handler(async ({ data }) => {
    const { palengkePaysPaidSpin } = await import("../server/games/palengke-pays.server");
    return palengkePaysPaidSpin(data);
  });

const palengkePaysFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const palengkePaysFreeSpinFn = createServerFn({ method: "POST" })
  .validator(palengkePaysFreeSpinSchema)
  .handler(async ({ data }) => {
    const { palengkePaysFreeSpin } = await import("../server/games/palengke-pays.server");
    return palengkePaysFreeSpin(data);
  });

const palengkePaysBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const palengkePaysBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(palengkePaysBuySchema)
  .handler(async ({ data }) => {
    const { palengkePaysBuyFeature } = await import("../server/games/palengke-pays.server");
    return palengkePaysBuyFeature(data);
  });

export const getPalengkePaysSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getPalengkePaysOpenSession } = await import("../server/games/palengke-pays.server");
  return getPalengkePaysOpenSession();
});


const tricycleTreasureSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const tricycleTreasureSpinFn = createServerFn({ method: "POST" })
  .validator(tricycleTreasureSpinSchema)
  .handler(async ({ data }) => {
    const { tricycleTreasurePaidSpin } = await import("../server/games/tricycle-treasure.server");
    return tricycleTreasurePaidSpin(data);
  });

const tricycleTreasureFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const tricycleTreasureFreeSpinFn = createServerFn({ method: "POST" })
  .validator(tricycleTreasureFreeSpinSchema)
  .handler(async ({ data }) => {
    const { tricycleTreasureFreeSpin } = await import("../server/games/tricycle-treasure.server");
    return tricycleTreasureFreeSpin(data);
  });

const tricycleTreasureBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const tricycleTreasureBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(tricycleTreasureBuySchema)
  .handler(async ({ data }) => {
    const { tricycleTreasureBuyFeature } = await import("../server/games/tricycle-treasure.server");
    return tricycleTreasureBuyFeature(data);
  });

export const getTricycleTreasureSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getTricycleTreasureOpenSession } = await import("../server/games/tricycle-treasure.server");
  return getTricycleTreasureOpenSession();
});


const beachBonanzaSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const beachBonanzaSpinFn = createServerFn({ method: "POST" })
  .validator(beachBonanzaSpinSchema)
  .handler(async ({ data }) => {
    const { beachBonanzaPaidSpin } = await import("../server/games/beach-bonanza.server");
    return beachBonanzaPaidSpin(data);
  });

const beachBonanzaFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const beachBonanzaFreeSpinFn = createServerFn({ method: "POST" })
  .validator(beachBonanzaFreeSpinSchema)
  .handler(async ({ data }) => {
    const { beachBonanzaFreeSpin } = await import("../server/games/beach-bonanza.server");
    return beachBonanzaFreeSpin(data);
  });

const beachBonanzaBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const beachBonanzaBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(beachBonanzaBuySchema)
  .handler(async ({ data }) => {
    const { beachBonanzaBuyFeature } = await import("../server/games/beach-bonanza.server");
    return beachBonanzaBuyFeature(data);
  });

export const getBeachBonanzaSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBeachBonanzaOpenSession } = await import("../server/games/beach-bonanza.server");
  return getBeachBonanzaOpenSession();
});


const islandFeverSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const islandFeverSpinFn = createServerFn({ method: "POST" })
  .validator(islandFeverSpinSchema)
  .handler(async ({ data }) => {
    const { islandFeverPaidSpin } = await import("../server/games/island-fever.server");
    return islandFeverPaidSpin(data);
  });

const islandFeverFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const islandFeverFreeSpinFn = createServerFn({ method: "POST" })
  .validator(islandFeverFreeSpinSchema)
  .handler(async ({ data }) => {
    const { islandFeverFreeSpin } = await import("../server/games/island-fever.server");
    return islandFeverFreeSpin(data);
  });

const islandFeverBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const islandFeverBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(islandFeverBuySchema)
  .handler(async ({ data }) => {
    const { islandFeverBuyFeature } = await import("../server/games/island-fever.server");
    return islandFeverBuyFeature(data);
  });

export const getIslandFeverSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getIslandFeverOpenSession } = await import("../server/games/island-fever.server");
  return getIslandFeverOpenSession();
});


const neonMakatiSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const neonMakatiSpinFn = createServerFn({ method: "POST" })
  .validator(neonMakatiSpinSchema)
  .handler(async ({ data }) => {
    const { neonMakatiPaidSpin } = await import("../server/games/neon-makati.server");
    return neonMakatiPaidSpin(data);
  });

const neonMakatiFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const neonMakatiFreeSpinFn = createServerFn({ method: "POST" })
  .validator(neonMakatiFreeSpinSchema)
  .handler(async ({ data }) => {
    const { neonMakatiFreeSpin } = await import("../server/games/neon-makati.server");
    return neonMakatiFreeSpin(data);
  });

const neonMakatiBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const neonMakatiBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(neonMakatiBuySchema)
  .handler(async ({ data }) => {
    const { neonMakatiBuyFeature } = await import("../server/games/neon-makati.server");
    return neonMakatiBuyFeature(data);
  });

export const getNeonMakatiSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getNeonMakatiOpenSession } = await import("../server/games/neon-makati.server");
  return getNeonMakatiOpenSession();
});


const quezonQuestSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const quezonQuestSpinFn = createServerFn({ method: "POST" })
  .validator(quezonQuestSpinSchema)
  .handler(async ({ data }) => {
    const { quezonQuestPaidSpin } = await import("../server/games/quezon-quest.server");
    return quezonQuestPaidSpin(data);
  });

const quezonQuestFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const quezonQuestFreeSpinFn = createServerFn({ method: "POST" })
  .validator(quezonQuestFreeSpinSchema)
  .handler(async ({ data }) => {
    const { quezonQuestFreeSpin } = await import("../server/games/quezon-quest.server");
    return quezonQuestFreeSpin(data);
  });

const quezonQuestBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const quezonQuestBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(quezonQuestBuySchema)
  .handler(async ({ data }) => {
    const { quezonQuestBuyFeature } = await import("../server/games/quezon-quest.server");
    return quezonQuestBuyFeature(data);
  });

export const getQuezonQuestSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getQuezonQuestOpenSession } = await import("../server/games/quezon-quest.server");
  return getQuezonQuestOpenSession();
});


const carabaoCashSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean().optional().default(false),
});

export const carabaoCashSpinFn = createServerFn({ method: "POST" })
  .validator(carabaoCashSpinSchema)
  .handler(async ({ data }) => {
    const { carabaoCashPaidSpin } = await import("../server/games/carabao-cash.server");
    return carabaoCashPaidSpin({ bet: data.bet, ante: !!data.ante });
  });

const carabaoCashFreeSpinSchema = z.object({
  sessionId: z.string().min(1),
});

export const carabaoCashFreeSpinFn = createServerFn({ method: "POST" })
  .validator(carabaoCashFreeSpinSchema)
  .handler(async ({ data }) => {
    const { carabaoCashFreeSpin } = await import("../server/games/carabao-cash.server");
    return carabaoCashFreeSpin(data);
  });

const carabaoCashBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const carabaoCashBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(carabaoCashBuySchema)
  .handler(async ({ data }) => {
    const { carabaoCashBuyFeature } = await import("../server/games/carabao-cash.server");
    return carabaoCashBuyFeature(data);
  });

export const getCarabaoCashSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCarabaoCashOpenSession } = await import("../server/games/carabao-cash.server");
  return getCarabaoCashOpenSession();
});


const riceFieldRichesSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean().optional().default(false),
});

export const riceFieldRichesSpinFn = createServerFn({ method: "POST" })
  .validator(riceFieldRichesSpinSchema)
  .handler(async ({ data }) => {
    const { riceFieldRichesPaidSpin } = await import("../server/games/rice-field-riches.server");
    return riceFieldRichesPaidSpin({ bet: data.bet, ante: !!data.ante });
  });

const riceFieldRichesFreeSpinSchema = z.object({
  sessionId: z.string().min(1),
});

export const riceFieldRichesFreeSpinFn = createServerFn({ method: "POST" })
  .validator(riceFieldRichesFreeSpinSchema)
  .handler(async ({ data }) => {
    const { riceFieldRichesFreeSpin } = await import("../server/games/rice-field-riches.server");
    return riceFieldRichesFreeSpin(data);
  });

const riceFieldRichesBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const riceFieldRichesBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(riceFieldRichesBuySchema)
  .handler(async ({ data }) => {
    const { riceFieldRichesBuyFeature } = await import("../server/games/rice-field-riches.server");
    return riceFieldRichesBuyFeature(data);
  });

export const getRiceFieldRichesSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getRiceFieldRichesOpenSession } = await import("../server/games/rice-field-riches.server");
  return getRiceFieldRichesOpenSession();
});


const wildPantherSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const wildPantherSpinFn = createServerFn({ method: "POST" })
  .validator(wildPantherSpinSchema)
  .handler(async ({ data }) => {
    const { wildPantherPaidSpin } = await import("../server/games/wild-panther.server");
    return wildPantherPaidSpin(data);
  });

const wildPantherFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const wildPantherFreeSpinFn = createServerFn({ method: "POST" })
  .validator(wildPantherFreeSpinSchema)
  .handler(async ({ data }) => {
    const { wildPantherFreeSpin } = await import("../server/games/wild-panther.server");
    return wildPantherFreeSpin(data);
  });

const wildPantherBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const wildPantherBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(wildPantherBuySchema)
  .handler(async ({ data }) => {
    const { wildPantherBuyFeature } = await import("../server/games/wild-panther.server");
    return wildPantherBuyFeature(data);
  });

export const getWildPantherSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getWildPantherOpenSession } = await import("../server/games/wild-panther.server");
  return getWildPantherOpenSession();
});

/** Re-export Baccarat RPCs (canonical defs live in ./baccarat). */
export { baccaratDealFn, getBaccaratEngineConfigFn } from "./baccarat";

/** Re-export Lucky 9 RPCs (canonical defs live in ./lucky9). */
export { lucky9DealFn, getLucky9EngineConfigFn } from "./lucky9";
export {
  threeCardPokerDealFn,
  threeCardPokerPlayFn,
  threeCardPokerFoldFn,
  getThreeCardPokerSessionFn,
  getThreeCardPokerEngineConfigFn,
} from "./threecardpoker";
export { colorGameDealFn, getColorGameEngineConfigFn } from "./color-game";
export {
  tongitsArenaDealFn,
  tongitsArenaPlayFn,
  tongitsArenaFoldFn,
  getTongitsArenaSessionFn,
  getTongitsArenaEngineConfigFn,
} from "./tongits-arena";
export { luckyDropDealFn, getLuckyDropEngineConfigFn } from "./lucky-drop";
export { colorGameProDealFn, getColorGameProEngineConfigFn } from "./color-game-pro";
export { luckyNinePlusDealFn, getLuckyNinePlusEngineConfigFn } from "./lucky-nine-plus";
export { dropDeluxeDealFn, getDropDeluxeEngineConfigFn } from "./drop-deluxe";
export {
  pokerShowdownDealFn,
  pokerShowdownPlayFn,
  pokerShowdownFoldFn,
  getPokerShowdownSessionFn,
  getPokerShowdownEngineConfigFn,
} from "./poker-showdown";

