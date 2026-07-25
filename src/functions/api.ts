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
