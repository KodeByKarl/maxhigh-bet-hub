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
  /** Number of free spins to purchase (not fixed to freeSpinsBase). */
  quantity: z.number().int().min(1).max(50),
});

export const goldenPantherBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(goldenPantherBuySchema)
  .handler(async ({ data }) => {
    const { goldenPantherBuyFeature } = await import("../server/games/golden-panther.server");
    return goldenPantherBuyFeature(data);
  });

export const getGoldenPantherSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGoldenPantherOpenSession } = await import("../server/games/golden-panther.server");
  return getGoldenPantherOpenSession();
});

const enchantedGroveSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
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

const enchantedGroveBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const enchantedGroveBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(enchantedGroveBuySchema)
  .handler(async ({ data }) => {
    const { enchantedGroveBuyFeature } = await import("../server/games/enchanted-grove.server");
    return enchantedGroveBuyFeature(data);
  });

export const getEnchantedGroveSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getEnchantedGroveOpenSession } = await import("../server/games/enchanted-grove.server");
  return getEnchantedGroveOpenSession();
});

const olympusWrathSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
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

const olympusWrathBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const olympusWrathBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(olympusWrathBuySchema)
  .handler(async ({ data }) => {
    const { olympusWrathBuyFeature } = await import("../server/games/olympus-wrath.server");
    return olympusWrathBuyFeature(data);
  });

export const getOlympusWrathSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getOlympusWrathOpenSession } = await import("../server/games/olympus-wrath.server");
  return getOlympusWrathOpenSession();
});

const godlyGatesSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
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

const godlyGatesBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const godlyGatesBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(godlyGatesBuySchema)
  .handler(async ({ data }) => {
    const { godlyGatesBuyFeature } = await import("../server/games/godly-gates.server");
    return godlyGatesBuyFeature(data);
  });

export const getGodlyGatesSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGodlyGatesOpenSession } = await import("../server/games/godly-gates.server");
  return getGodlyGatesOpenSession();
});

const thorThunderSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
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

const thorThunderBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const thorThunderBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(thorThunderBuySchema)
  .handler(async ({ data }) => {
    const { thorThunderBuyFeature } = await import("../server/games/thor-thunder.server");
    return thorThunderBuyFeature(data);
  });

export const getThorThunderSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getThorThunderOpenSession } = await import("../server/games/thor-thunder.server");
  return getThorThunderOpenSession();
});

const zeusStrikeSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
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

const zeusStrikeBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const zeusStrikeBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(zeusStrikeBuySchema)
  .handler(async ({ data }) => {
    const { zeusStrikeBuyFeature } = await import("../server/games/zeus-strike.server");
    return zeusStrikeBuyFeature(data);
  });

export const getZeusStrikeSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getZeusStrikeOpenSession } = await import("../server/games/zeus-strike.server");
  return getZeusStrikeOpenSession();
});

const gateOfRaSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
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

const gateOfRaBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const gateOfRaBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(gateOfRaBuySchema)
  .handler(async ({ data }) => {
    const { gateOfRaBuyFeature } = await import("../server/games/gate-of-ra.server");
    return gateOfRaBuyFeature(data);
  });

export const getGateOfRaSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateOfRaOpenSession } = await import("../server/games/gate-of-ra.server");
  return getGateOfRaOpenSession();
});

const desertRichesSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
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
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
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

const pharaohFireSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const pharaohFireSpinFn = createServerFn({ method: "POST" })
  .validator(pharaohFireSpinSchema)
  .handler(async ({ data }) => {
    const { pharaohFirePaidSpin } = await import("../server/games/pharaoh-fire.server");
    return pharaohFirePaidSpin(data);
  });

const pharaohFireFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const pharaohFireFreeSpinFn = createServerFn({ method: "POST" })
  .validator(pharaohFireFreeSpinSchema)
  .handler(async ({ data }) => {
    const { pharaohFireFreeSpin } = await import("../server/games/pharaoh-fire.server");
    return pharaohFireFreeSpin(data);
  });

const pharaohFireBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
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
  quantity: z.number().int().min(1).max(50),
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
  quantity: z.number().int().min(1).max(50),
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

const cleopatraGoldSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const cleopatraGoldSpinFn = createServerFn({ method: "POST" })
  .validator(cleopatraGoldSpinSchema)
  .handler(async ({ data }) => {
    const { cleopatraGoldPaidSpin } = await import("../server/games/cleopatra-gold.server");
    return cleopatraGoldPaidSpin(data);
  });

const cleopatraGoldFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const cleopatraGoldFreeSpinFn = createServerFn({ method: "POST" })
  .validator(cleopatraGoldFreeSpinSchema)
  .handler(async ({ data }) => {
    const { cleopatraGoldFreeSpin } = await import("../server/games/cleopatra-gold.server");
    return cleopatraGoldFreeSpin(data);
  });

const cleopatraGoldBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
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

const safariGoldSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const safariGoldSpinFn = createServerFn({ method: "POST" })
  .validator(safariGoldSpinSchema)
  .handler(async ({ data }) => {
    const { safariGoldPaidSpin } = await import("../server/games/safari-gold.server");
    return safariGoldPaidSpin(data);
  });

const safariGoldFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const safariGoldFreeSpinFn = createServerFn({ method: "POST" })
  .validator(safariGoldFreeSpinSchema)
  .handler(async ({ data }) => {
    const { safariGoldFreeSpin } = await import("../server/games/safari-gold.server");
    return safariGoldFreeSpin(data);
  });

const safariGoldBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
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

const buffaloReignSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const buffaloReignSpinFn = createServerFn({ method: "POST" })
  .validator(buffaloReignSpinSchema)
  .handler(async ({ data }) => {
    const { buffaloReignPaidSpin } = await import("../server/games/buffalo-reign.server");
    return buffaloReignPaidSpin(data);
  });

const buffaloReignFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const buffaloReignFreeSpinFn = createServerFn({ method: "POST" })
  .validator(buffaloReignFreeSpinSchema)
  .handler(async ({ data }) => {
    const { buffaloReignFreeSpin } = await import("../server/games/buffalo-reign.server");
    return buffaloReignFreeSpin(data);
  });

const buffaloReignBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
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

const stampedeSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean().optional().default(false),
});

export const stampedeSpinFn = createServerFn({ method: "POST" })
  .validator(stampedeSpinSchema)
  .handler(async ({ data }) => {
    const { stampedePaidSpin } = await import("../server/games/wild-frontier-stampede.server");
    return stampedePaidSpin({ bet: data.bet, ante: !!data.ante });
  });

const stampedeFreeSpinSchema = z.object({
  sessionId: z.string().min(1),
});

export const stampedeFreeSpinFn = createServerFn({ method: "POST" })
  .validator(stampedeFreeSpinSchema)
  .handler(async ({ data }) => {
    const { stampedeFreeSpin } = await import("../server/games/wild-frontier-stampede.server");
    return stampedeFreeSpin(data);
  });

const stampedeBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const stampedeBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(stampedeBuySchema)
  .handler(async ({ data }) => {
    const { stampedeBuyFeature } = await import("../server/games/wild-frontier-stampede.server");
    return stampedeBuyFeature(data);
  });

export const getStampedeSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getStampedeOpenSession } = await import("../server/games/wild-frontier-stampede.server");
  return getStampedeOpenSession();
});

export const getStampedeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getStampedeEngineConfig } = await import("../server/games/wild-frontier-stampede.server");
  return getStampedeEngineConfig();
});

const prosperityLionSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const prosperityLionSpinFn = createServerFn({ method: "POST" })
  .validator(prosperityLionSpinSchema)
  .handler(async ({ data }) => {
    const { prosperityLionPaidSpin } = await import("../server/games/prosperity-lion.server");
    return prosperityLionPaidSpin(data);
  });

const prosperityLionFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const prosperityLionFreeSpinFn = createServerFn({ method: "POST" })
  .validator(prosperityLionFreeSpinSchema)
  .handler(async ({ data }) => {
    const { prosperityLionFreeSpin } = await import("../server/games/prosperity-lion.server");
    return prosperityLionFreeSpin(data);
  });

const prosperityLionBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const prosperityLionBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(prosperityLionBuySchema)
  .handler(async ({ data }) => {
    const { prosperityLionBuyFeature } = await import("../server/games/prosperity-lion.server");
    return prosperityLionBuyFeature(data);
  });

export const getProsperityLionSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getProsperityLionOpenSession } = await import("../server/games/prosperity-lion.server");
  return getProsperityLionOpenSession();
});

const fortuneMouseSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const fortuneMouseSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneMouseSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneMousePaidSpin } = await import("../server/games/fortune-mouse.server");
    return fortuneMousePaidSpin(data);
  });

const fortuneMouseFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const fortuneMouseFreeSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneMouseFreeSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneMouseFreeSpin } = await import("../server/games/fortune-mouse.server");
    return fortuneMouseFreeSpin(data);
  });

const fortuneMouseBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const fortuneMouseBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(fortuneMouseBuySchema)
  .handler(async ({ data }) => {
    const { fortuneMouseBuyFeature } = await import("../server/games/fortune-mouse.server");
    return fortuneMouseBuyFeature(data);
  });

export const getFortuneMouseSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneMouseOpenSession } = await import("../server/games/fortune-mouse.server");
  return getFortuneMouseOpenSession();
});

const fortuneRabbitSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const fortuneRabbitSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneRabbitSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneRabbitPaidSpin } = await import("../server/games/fortune-rabbit.server");
    return fortuneRabbitPaidSpin(data);
  });

const fortuneRabbitFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const fortuneRabbitFreeSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneRabbitFreeSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneRabbitFreeSpin } = await import("../server/games/fortune-rabbit.server");
    return fortuneRabbitFreeSpin(data);
  });

const fortuneRabbitBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const fortuneRabbitBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(fortuneRabbitBuySchema)
  .handler(async ({ data }) => {
    const { fortuneRabbitBuyFeature } = await import("../server/games/fortune-rabbit.server");
    return fortuneRabbitBuyFeature(data);
  });

export const getFortuneRabbitSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneRabbitOpenSession } = await import("../server/games/fortune-rabbit.server");
  return getFortuneRabbitOpenSession();
});

const fortuneOxSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const fortuneOxSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneOxSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneOxPaidSpin } = await import("../server/games/fortune-ox.server");
    return fortuneOxPaidSpin(data);
  });

const fortuneOxFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const fortuneOxFreeSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneOxFreeSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneOxFreeSpin } = await import("../server/games/fortune-ox.server");
    return fortuneOxFreeSpin(data);
  });

const fortuneOxBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const fortuneOxBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(fortuneOxBuySchema)
  .handler(async ({ data }) => {
    const { fortuneOxBuyFeature } = await import("../server/games/fortune-ox.server");
    return fortuneOxBuyFeature(data);
  });

export const getFortuneOxSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneOxOpenSession } = await import("../server/games/fortune-ox.server");
  return getFortuneOxOpenSession();
});

const fortuneTigerSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const fortuneTigerSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneTigerSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneTigerPaidSpin } = await import("../server/games/fortune-tiger.server");
    return fortuneTigerPaidSpin(data);
  });

const fortuneTigerFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const fortuneTigerFreeSpinFn = createServerFn({ method: "POST" })
  .validator(fortuneTigerFreeSpinSchema)
  .handler(async ({ data }) => {
    const { fortuneTigerFreeSpin } = await import("../server/games/fortune-tiger.server");
    return fortuneTigerFreeSpin(data);
  });

const fortuneTigerBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const fortuneTigerBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(fortuneTigerBuySchema)
  .handler(async ({ data }) => {
    const { fortuneTigerBuyFeature } = await import("../server/games/fortune-tiger.server");
    return fortuneTigerBuyFeature(data);
  });

export const getFortuneTigerSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFortuneTigerOpenSession } = await import("../server/games/fortune-tiger.server");
  return getFortuneTigerOpenSession();
});

const luckyNekoSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const luckyNekoSpinFn = createServerFn({ method: "POST" })
  .validator(luckyNekoSpinSchema)
  .handler(async ({ data }) => {
    const { luckyNekoPaidSpin } = await import("../server/games/lucky-neko.server");
    return luckyNekoPaidSpin(data);
  });

const luckyNekoFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const luckyNekoFreeSpinFn = createServerFn({ method: "POST" })
  .validator(luckyNekoFreeSpinSchema)
  .handler(async ({ data }) => {
    const { luckyNekoFreeSpin } = await import("../server/games/lucky-neko.server");
    return luckyNekoFreeSpin(data);
  });

const luckyNekoBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const luckyNekoBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(luckyNekoBuySchema)
  .handler(async ({ data }) => {
    const { luckyNekoBuyFeature } = await import("../server/games/lucky-neko.server");
    return luckyNekoBuyFeature(data);
  });

export const getLuckyNekoSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLuckyNekoOpenSession } = await import("../server/games/lucky-neko.server");
  return getLuckyNekoOpenSession();
});

const rubyRavenSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const rubyRavenSpinFn = createServerFn({ method: "POST" })
  .validator(rubyRavenSpinSchema)
  .handler(async ({ data }) => {
    const { rubyRavenPaidSpin } = await import("../server/games/ruby-raven.server");
    return rubyRavenPaidSpin(data);
  });

const rubyRavenFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const rubyRavenFreeSpinFn = createServerFn({ method: "POST" })
  .validator(rubyRavenFreeSpinSchema)
  .handler(async ({ data }) => {
    const { rubyRavenFreeSpin } = await import("../server/games/ruby-raven.server");
    return rubyRavenFreeSpin(data);
  });

const rubyRavenBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const rubyRavenBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(rubyRavenBuySchema)
  .handler(async ({ data }) => {
    const { rubyRavenBuyFeature } = await import("../server/games/ruby-raven.server");
    return rubyRavenBuyFeature(data);
  });

export const getRubyRavenSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getRubyRavenOpenSession } = await import("../server/games/ruby-raven.server");
  return getRubyRavenOpenSession();
});

const midnightOwlSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const midnightOwlSpinFn = createServerFn({ method: "POST" })
  .validator(midnightOwlSpinSchema)
  .handler(async ({ data }) => {
    const { midnightOwlPaidSpin } = await import("../server/games/midnight-owl.server");
    return midnightOwlPaidSpin(data);
  });

const midnightOwlFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const midnightOwlFreeSpinFn = createServerFn({ method: "POST" })
  .validator(midnightOwlFreeSpinSchema)
  .handler(async ({ data }) => {
    const { midnightOwlFreeSpin } = await import("../server/games/midnight-owl.server");
    return midnightOwlFreeSpin(data);
  });

const midnightOwlBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const midnightOwlBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(midnightOwlBuySchema)
  .handler(async ({ data }) => {
    const { midnightOwlBuyFeature } = await import("../server/games/midnight-owl.server");
    return midnightOwlBuyFeature(data);
  });

export const getMidnightOwlSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getMidnightOwlOpenSession } = await import("../server/games/midnight-owl.server");
  return getMidnightOwlOpenSession();
});

const honeyHiveSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const honeyHiveSpinFn = createServerFn({ method: "POST" })
  .validator(honeyHiveSpinSchema)
  .handler(async ({ data }) => {
    const { honeyHivePaidSpin } = await import("../server/games/honey-hive.server");
    return honeyHivePaidSpin(data);
  });

const honeyHiveFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const honeyHiveFreeSpinFn = createServerFn({ method: "POST" })
  .validator(honeyHiveFreeSpinSchema)
  .handler(async ({ data }) => {
    const { honeyHiveFreeSpin } = await import("../server/games/honey-hive.server");
    return honeyHiveFreeSpin(data);
  });

const honeyHiveBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const honeyHiveBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(honeyHiveBuySchema)
  .handler(async ({ data }) => {
    const { honeyHiveBuyFeature } = await import("../server/games/honey-hive.server");
    return honeyHiveBuyFeature(data);
  });

export const getHoneyHiveSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getHoneyHiveOpenSession } = await import("../server/games/honey-hive.server");
  return getHoneyHiveOpenSession();
});

const solarSerpentSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const solarSerpentSpinFn = createServerFn({ method: "POST" })
  .validator(solarSerpentSpinSchema)
  .handler(async ({ data }) => {
    const { solarSerpentPaidSpin } = await import("../server/games/solar-serpent.server");
    return solarSerpentPaidSpin(data);
  });

const solarSerpentFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const solarSerpentFreeSpinFn = createServerFn({ method: "POST" })
  .validator(solarSerpentFreeSpinSchema)
  .handler(async ({ data }) => {
    const { solarSerpentFreeSpin } = await import("../server/games/solar-serpent.server");
    return solarSerpentFreeSpin(data);
  });

const solarSerpentBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const solarSerpentBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(solarSerpentBuySchema)
  .handler(async ({ data }) => {
    const { solarSerpentBuyFeature } = await import("../server/games/solar-serpent.server");
    return solarSerpentBuyFeature(data);
  });

export const getSolarSerpentSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSolarSerpentOpenSession } = await import("../server/games/solar-serpent.server");
  return getSolarSerpentOpenSession();
});

const frostFoxSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const frostFoxSpinFn = createServerFn({ method: "POST" })
  .validator(frostFoxSpinSchema)
  .handler(async ({ data }) => {
    const { frostFoxPaidSpin } = await import("../server/games/frost-fox.server");
    return frostFoxPaidSpin(data);
  });

const frostFoxFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const frostFoxFreeSpinFn = createServerFn({ method: "POST" })
  .validator(frostFoxFreeSpinSchema)
  .handler(async ({ data }) => {
    const { frostFoxFreeSpin } = await import("../server/games/frost-fox.server");
    return frostFoxFreeSpin(data);
  });

const frostFoxBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const frostFoxBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(frostFoxBuySchema)
  .handler(async ({ data }) => {
    const { frostFoxBuyFeature } = await import("../server/games/frost-fox.server");
    return frostFoxBuyFeature(data);
  });

export const getFrostFoxSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFrostFoxOpenSession } = await import("../server/games/frost-fox.server");
  return getFrostFoxOpenSession();
});

const coralCobraSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const coralCobraSpinFn = createServerFn({ method: "POST" })
  .validator(coralCobraSpinSchema)
  .handler(async ({ data }) => {
    const { coralCobraPaidSpin } = await import("../server/games/coral-cobra.server");
    return coralCobraPaidSpin(data);
  });

const coralCobraFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const coralCobraFreeSpinFn = createServerFn({ method: "POST" })
  .validator(coralCobraFreeSpinSchema)
  .handler(async ({ data }) => {
    const { coralCobraFreeSpin } = await import("../server/games/coral-cobra.server");
    return coralCobraFreeSpin(data);
  });

const coralCobraBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const coralCobraBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(coralCobraBuySchema)
  .handler(async ({ data }) => {
    const { coralCobraBuyFeature } = await import("../server/games/coral-cobra.server");
    return coralCobraBuyFeature(data);
  });

export const getCoralCobraSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCoralCobraOpenSession } = await import("../server/games/coral-cobra.server");
  return getCoralCobraOpenSession();
});

const lotusLynxSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const lotusLynxSpinFn = createServerFn({ method: "POST" })
  .validator(lotusLynxSpinSchema)
  .handler(async ({ data }) => {
    const { lotusLynxPaidSpin } = await import("../server/games/lotus-lynx.server");
    return lotusLynxPaidSpin(data);
  });

const lotusLynxFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const lotusLynxFreeSpinFn = createServerFn({ method: "POST" })
  .validator(lotusLynxFreeSpinSchema)
  .handler(async ({ data }) => {
    const { lotusLynxFreeSpin } = await import("../server/games/lotus-lynx.server");
    return lotusLynxFreeSpin(data);
  });

const lotusLynxBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const lotusLynxBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(lotusLynxBuySchema)
  .handler(async ({ data }) => {
    const { lotusLynxBuyFeature } = await import("../server/games/lotus-lynx.server");
    return lotusLynxBuyFeature(data);
  });

export const getLotusLynxSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getLotusLynxOpenSession } = await import("../server/games/lotus-lynx.server");
  return getLotusLynxOpenSession();
});

const emberTigerSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const emberTigerSpinFn = createServerFn({ method: "POST" })
  .validator(emberTigerSpinSchema)
  .handler(async ({ data }) => {
    const { emberTigerPaidSpin } = await import("../server/games/ember-tiger.server");
    return emberTigerPaidSpin(data);
  });

const emberTigerFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const emberTigerFreeSpinFn = createServerFn({ method: "POST" })
  .validator(emberTigerFreeSpinSchema)
  .handler(async ({ data }) => {
    const { emberTigerFreeSpin } = await import("../server/games/ember-tiger.server");
    return emberTigerFreeSpin(data);
  });

const emberTigerBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const emberTigerBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(emberTigerBuySchema)
  .handler(async ({ data }) => {
    const { emberTigerBuyFeature } = await import("../server/games/ember-tiger.server");
    return emberTigerBuyFeature(data);
  });

export const getEmberTigerSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getEmberTigerOpenSession } = await import("../server/games/ember-tiger.server");
  return getEmberTigerOpenSession();
});

const jadeJaguarSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const jadeJaguarSpinFn = createServerFn({ method: "POST" })
  .validator(jadeJaguarSpinSchema)
  .handler(async ({ data }) => {
    const { jadeJaguarPaidSpin } = await import("../server/games/jade-jaguar.server");
    return jadeJaguarPaidSpin(data);
  });

const jadeJaguarFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const jadeJaguarFreeSpinFn = createServerFn({ method: "POST" })
  .validator(jadeJaguarFreeSpinSchema)
  .handler(async ({ data }) => {
    const { jadeJaguarFreeSpin } = await import("../server/games/jade-jaguar.server");
    return jadeJaguarFreeSpin(data);
  });

const jadeJaguarBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const jadeJaguarBuyFeatureFn = createServerFn({ method: "POST" })
  .validator(jadeJaguarBuySchema)
  .handler(async ({ data }) => {
    const { jadeJaguarBuyFeature } = await import("../server/games/jade-jaguar.server");
    return jadeJaguarBuyFeature(data);
  });

export const getJadeJaguarSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getJadeJaguarOpenSession } = await import("../server/games/jade-jaguar.server");
  return getJadeJaguarOpenSession();
});

export const getGoldenPantherEngineConfigFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getGoldenPantherEngineConfig } = await import("../server/superadmin/services.server");
    return getGoldenPantherEngineConfig();
  },
);

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
export {
  luckyDropStartFn,
  luckyDropGuessFn,
  luckyDropSkipFn,
  luckyDropCashoutFn,
  getLuckyDropOpenRunFn,
  getLuckyDropEngineConfigFn,
} from "./lucky-drop";
export { colorGameProDealFn, getColorGameProEngineConfigFn } from "./color-game-pro";
export { luckyNinePlusDealFn, getLuckyNinePlusEngineConfigFn } from "./lucky-nine-plus";
export {
  dropDeluxeDealFn,
  dropDeluxeDrawFn,
  getDropDeluxeOpenHandFn,
  getDropDeluxeEngineConfigFn,
} from "./drop-deluxe";
export {
  pokerShowdownDealFn,
  pokerShowdownPlayFn,
  pokerShowdownFoldFn,
  getPokerShowdownSessionFn,
  getPokerShowdownEngineConfigFn,
} from "./poker-showdown";
