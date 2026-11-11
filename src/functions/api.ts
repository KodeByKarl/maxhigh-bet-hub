import { operationIdentity } from "@/lib/operation-identity";
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
  .middleware([operationIdentity])
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const { loginUser } = await import("../server/services.server");
    return loginUser(data.username, data.password);
  });

export const logoutFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .handler(async () => {
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
  .middleware([operationIdentity])
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
  .middleware([operationIdentity])
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
  .middleware([operationIdentity])
  .validator(goldenPantherSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "goldenPantherSpinFn",
      data,
      async () => {
        const { goldenPantherPaidSpin } = await import("../server/games/golden-panther.server");
        return goldenPantherPaidSpin(data);
      },
      "golden-panther",
    );
  });

const goldenPantherFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const goldenPantherFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(goldenPantherFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "goldenPantherFreeSpinFn",
      data,
      async () => {
        const { goldenPantherFreeSpin } = await import("../server/games/golden-panther.server");
        return goldenPantherFreeSpin(data);
      },
      "golden-panther",
    );
  });

const goldenPantherBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  /** Number of free spins to purchase (not fixed to freeSpinsBase). */
  quantity: z.number().int().min(1).max(50),
});

export const goldenPantherBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(goldenPantherBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "goldenPantherBuyFeatureFn",
      data,
      async () => {
        const { goldenPantherBuyFeature } = await import("../server/games/golden-panther.server");
        return goldenPantherBuyFeature(data);
      },
      "golden-panther",
    );
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
  .middleware([operationIdentity])
  .validator(enchantedGroveSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "enchantedGroveSpinFn",
      data,
      async () => {
        const { enchantedGrovePaidSpin } = await import("../server/games/enchanted-grove.server");
        return enchantedGrovePaidSpin(data);
      },
      "enchanted-grove",
    );
  });

const enchantedGroveFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const enchantedGroveFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(enchantedGroveFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "enchantedGroveFreeSpinFn",
      data,
      async () => {
        const { enchantedGroveFreeSpin } = await import("../server/games/enchanted-grove.server");
        return enchantedGroveFreeSpin(data);
      },
      "enchanted-grove",
    );
  });

const enchantedGroveBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const enchantedGroveBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(enchantedGroveBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "enchantedGroveBuyFeatureFn",
      data,
      async () => {
        const { enchantedGroveBuyFeature } = await import("../server/games/enchanted-grove.server");
        return enchantedGroveBuyFeature(data);
      },
      "enchanted-grove",
    );
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
  .middleware([operationIdentity])
  .validator(olympusWrathSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "olympusWrathSpinFn",
      data,
      async () => {
        const { olympusWrathPaidSpin } = await import("../server/games/olympus-wrath.server");
        return olympusWrathPaidSpin(data);
      },
      "olympus-wrath",
    );
  });

const olympusWrathFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const olympusWrathFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(olympusWrathFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "olympusWrathFreeSpinFn",
      data,
      async () => {
        const { olympusWrathFreeSpin } = await import("../server/games/olympus-wrath.server");
        return olympusWrathFreeSpin(data);
      },
      "olympus-wrath",
    );
  });

const olympusWrathBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const olympusWrathBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(olympusWrathBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "olympusWrathBuyFeatureFn",
      data,
      async () => {
        const { olympusWrathBuyFeature } = await import("../server/games/olympus-wrath.server");
        return olympusWrathBuyFeature(data);
      },
      "olympus-wrath",
    );
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
  .middleware([operationIdentity])
  .validator(godlyGatesSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "godlyGatesSpinFn",
      data,
      async () => {
        const { godlyGatesPaidSpin } = await import("../server/games/godly-gates.server");
        return godlyGatesPaidSpin(data);
      },
      "godly-gates",
    );
  });

const godlyGatesFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const godlyGatesFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(godlyGatesFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "godlyGatesFreeSpinFn",
      data,
      async () => {
        const { godlyGatesFreeSpin } = await import("../server/games/godly-gates.server");
        return godlyGatesFreeSpin(data);
      },
      "godly-gates",
    );
  });

const godlyGatesBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const godlyGatesBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(godlyGatesBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "godlyGatesBuyFeatureFn",
      data,
      async () => {
        const { godlyGatesBuyFeature } = await import("../server/games/godly-gates.server");
        return godlyGatesBuyFeature(data);
      },
      "godly-gates",
    );
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
  .middleware([operationIdentity])
  .validator(thorThunderSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "thorThunderSpinFn",
      data,
      async () => {
        const { thorThunderPaidSpin } = await import("../server/games/thor-thunder.server");
        return thorThunderPaidSpin(data);
      },
      "thor-thunder",
    );
  });

const thorThunderFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const thorThunderFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(thorThunderFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "thorThunderFreeSpinFn",
      data,
      async () => {
        const { thorThunderFreeSpin } = await import("../server/games/thor-thunder.server");
        return thorThunderFreeSpin(data);
      },
      "thor-thunder",
    );
  });

const thorThunderBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const thorThunderBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(thorThunderBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "thorThunderBuyFeatureFn",
      data,
      async () => {
        const { thorThunderBuyFeature } = await import("../server/games/thor-thunder.server");
        return thorThunderBuyFeature(data);
      },
      "thor-thunder",
    );
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
  .middleware([operationIdentity])
  .validator(zeusStrikeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "zeusStrikeSpinFn",
      data,
      async () => {
        const { zeusStrikePaidSpin } = await import("../server/games/zeus-strike.server");
        return zeusStrikePaidSpin(data);
      },
      "zeus-strike",
    );
  });

const zeusStrikeFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const zeusStrikeFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(zeusStrikeFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "zeusStrikeFreeSpinFn",
      data,
      async () => {
        const { zeusStrikeFreeSpin } = await import("../server/games/zeus-strike.server");
        return zeusStrikeFreeSpin(data);
      },
      "zeus-strike",
    );
  });

const zeusStrikeBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const zeusStrikeBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(zeusStrikeBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "zeusStrikeBuyFeatureFn",
      data,
      async () => {
        const { zeusStrikeBuyFeature } = await import("../server/games/zeus-strike.server");
        return zeusStrikeBuyFeature(data);
      },
      "zeus-strike",
    );
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
  .middleware([operationIdentity])
  .validator(gateOfRaSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "gateOfRaSpinFn",
      data,
      async () => {
        const { gateOfRaPaidSpin } = await import("../server/games/gate-of-ra.server");
        return gateOfRaPaidSpin(data);
      },
      "gate-of-ra",
    );
  });

const gateOfRaFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const gateOfRaFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(gateOfRaFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "gateOfRaFreeSpinFn",
      data,
      async () => {
        const { gateOfRaFreeSpin } = await import("../server/games/gate-of-ra.server");
        return gateOfRaFreeSpin(data);
      },
      "gate-of-ra",
    );
  });

const gateOfRaBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const gateOfRaBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(gateOfRaBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "gateOfRaBuyFeatureFn",
      data,
      async () => {
        const { gateOfRaBuyFeature } = await import("../server/games/gate-of-ra.server");
        return gateOfRaBuyFeature(data);
      },
      "gate-of-ra",
    );
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
  .middleware([operationIdentity])
  .validator(desertRichesSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "desertRichesSpinFn",
      data,
      async () => {
        const { desertRichesPaidSpin } = await import("../server/games/desert-riches.server");
        return desertRichesPaidSpin(data);
      },
      "desert-riches",
    );
  });

const desertRichesFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const desertRichesFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(desertRichesFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "desertRichesFreeSpinFn",
      data,
      async () => {
        const { desertRichesFreeSpin } = await import("../server/games/desert-riches.server");
        return desertRichesFreeSpin(data);
      },
      "desert-riches",
    );
  });

const desertRichesBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const desertRichesBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(desertRichesBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "desertRichesBuyFeatureFn",
      data,
      async () => {
        const { desertRichesBuyFeature } = await import("../server/games/desert-riches.server");
        return desertRichesBuyFeature(data);
      },
      "desert-riches",
    );
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
  .middleware([operationIdentity])
  .validator(pharaohFireSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "pharaohFireSpinFn",
      data,
      async () => {
        const { pharaohFirePaidSpin } = await import("../server/games/pharaoh-fire.server");
        return pharaohFirePaidSpin(data);
      },
      "pharaoh-fire",
    );
  });

const pharaohFireFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const pharaohFireFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(pharaohFireFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "pharaohFireFreeSpinFn",
      data,
      async () => {
        const { pharaohFireFreeSpin } = await import("../server/games/pharaoh-fire.server");
        return pharaohFireFreeSpin(data);
      },
      "pharaoh-fire",
    );
  });

const pharaohFireBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const pharaohFireBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(pharaohFireBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "pharaohFireBuyFeatureFn",
      data,
      async () => {
        const { pharaohFireBuyFeature } = await import("../server/games/pharaoh-fire.server");
        return pharaohFireBuyFeature(data);
      },
      "pharaoh-fire",
    );
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
  .middleware([operationIdentity])
  .validator(templeRushSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "templeRushSpinFn",
      data,
      async () => {
        const { templeRushPaidSpin } = await import("../server/games/temple-rush.server");
        return templeRushPaidSpin(data);
      },
      "temple-rush",
    );
  });

const templeRushFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const templeRushFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(templeRushFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "templeRushFreeSpinFn",
      data,
      async () => {
        const { templeRushFreeSpin } = await import("../server/games/temple-rush.server");
        return templeRushFreeSpin(data);
      },
      "temple-rush",
    );
  });

const templeRushBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const templeRushBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(templeRushBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "templeRushBuyFeatureFn",
      data,
      async () => {
        const { templeRushBuyFeature } = await import("../server/games/temple-rush.server");
        return templeRushBuyFeature(data);
      },
      "temple-rush",
    );
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
  .middleware([operationIdentity])
  .validator(mayaGoldSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "mayaGoldSpinFn",
      data,
      async () => {
        const { mayaGoldPaidSpin } = await import("../server/games/maya-gold.server");
        return mayaGoldPaidSpin(data);
      },
      "maya-gold",
    );
  });

const mayaGoldFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const mayaGoldFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(mayaGoldFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "mayaGoldFreeSpinFn",
      data,
      async () => {
        const { mayaGoldFreeSpin } = await import("../server/games/maya-gold.server");
        return mayaGoldFreeSpin(data);
      },
      "maya-gold",
    );
  });

const mayaGoldBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const mayaGoldBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(mayaGoldBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "mayaGoldBuyFeatureFn",
      data,
      async () => {
        const { mayaGoldBuyFeature } = await import("../server/games/maya-gold.server");
        return mayaGoldBuyFeature(data);
      },
      "maya-gold",
    );
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
  .middleware([operationIdentity])
  .validator(cleopatraGoldSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "cleopatraGoldSpinFn",
      data,
      async () => {
        const { cleopatraGoldPaidSpin } = await import("../server/games/cleopatra-gold.server");
        return cleopatraGoldPaidSpin(data);
      },
      "cleopatra-gold",
    );
  });

const cleopatraGoldFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const cleopatraGoldFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(cleopatraGoldFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "cleopatraGoldFreeSpinFn",
      data,
      async () => {
        const { cleopatraGoldFreeSpin } = await import("../server/games/cleopatra-gold.server");
        return cleopatraGoldFreeSpin(data);
      },
      "cleopatra-gold",
    );
  });

const cleopatraGoldBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const cleopatraGoldBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(cleopatraGoldBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "cleopatraGoldBuyFeatureFn",
      data,
      async () => {
        const { cleopatraGoldBuyFeature } = await import("../server/games/cleopatra-gold.server");
        return cleopatraGoldBuyFeature(data);
      },
      "cleopatra-gold",
    );
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
  .middleware([operationIdentity])
  .validator(safariGoldSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "safariGoldSpinFn",
      data,
      async () => {
        const { safariGoldPaidSpin } = await import("../server/games/safari-gold.server");
        return safariGoldPaidSpin(data);
      },
      "safari-gold",
    );
  });

const safariGoldFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const safariGoldFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(safariGoldFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "safariGoldFreeSpinFn",
      data,
      async () => {
        const { safariGoldFreeSpin } = await import("../server/games/safari-gold.server");
        return safariGoldFreeSpin(data);
      },
      "safari-gold",
    );
  });

const safariGoldBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const safariGoldBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(safariGoldBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "safariGoldBuyFeatureFn",
      data,
      async () => {
        const { safariGoldBuyFeature } = await import("../server/games/safari-gold.server");
        return safariGoldBuyFeature(data);
      },
      "safari-gold",
    );
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
  .middleware([operationIdentity])
  .validator(buffaloReignSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "buffaloReignSpinFn",
      data,
      async () => {
        const { buffaloReignPaidSpin } = await import("../server/games/buffalo-reign.server");
        return buffaloReignPaidSpin(data);
      },
      "buffalo-reign",
    );
  });

const buffaloReignFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const buffaloReignFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(buffaloReignFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "buffaloReignFreeSpinFn",
      data,
      async () => {
        const { buffaloReignFreeSpin } = await import("../server/games/buffalo-reign.server");
        return buffaloReignFreeSpin(data);
      },
      "buffalo-reign",
    );
  });

const buffaloReignBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const buffaloReignBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(buffaloReignBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "buffaloReignBuyFeatureFn",
      data,
      async () => {
        const { buffaloReignBuyFeature } = await import("../server/games/buffalo-reign.server");
        return buffaloReignBuyFeature(data);
      },
      "buffalo-reign",
    );
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
  .middleware([operationIdentity])
  .validator(stampedeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "stampedeSpinFn",
      data,
      async () => {
        const { stampedePaidSpin } = await import("../server/games/wild-frontier-stampede.server");
        return stampedePaidSpin({ bet: data.bet, ante: !!data.ante });
      },
      "wild-frontier-stampede",
    );
  });

const stampedeFreeSpinSchema = z.object({
  sessionId: z.string().min(1),
});

export const stampedeFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(stampedeFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "stampedeFreeSpinFn",
      data,
      async () => {
        const { stampedeFreeSpin } = await import("../server/games/wild-frontier-stampede.server");
        return stampedeFreeSpin(data);
      },
      "wild-frontier-stampede",
    );
  });

const stampedeBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const stampedeBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(stampedeBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "stampedeBuyFeatureFn",
      data,
      async () => {
        const { stampedeBuyFeature } =
          await import("../server/games/wild-frontier-stampede.server");
        return stampedeBuyFeature(data);
      },
      "wild-frontier-stampede",
    );
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
  .middleware([operationIdentity])
  .validator(prosperityLionSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "prosperityLionSpinFn",
      data,
      async () => {
        const { prosperityLionPaidSpin } = await import("../server/games/prosperity-lion.server");
        return prosperityLionPaidSpin(data);
      },
      "prosperity-lion",
    );
  });

const prosperityLionFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const prosperityLionFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(prosperityLionFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "prosperityLionFreeSpinFn",
      data,
      async () => {
        const { prosperityLionFreeSpin } = await import("../server/games/prosperity-lion.server");
        return prosperityLionFreeSpin(data);
      },
      "prosperity-lion",
    );
  });

const prosperityLionBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const prosperityLionBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(prosperityLionBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "prosperityLionBuyFeatureFn",
      data,
      async () => {
        const { prosperityLionBuyFeature } = await import("../server/games/prosperity-lion.server");
        return prosperityLionBuyFeature(data);
      },
      "prosperity-lion",
    );
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
  .middleware([operationIdentity])
  .validator(fortuneMouseSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneMouseSpinFn",
      data,
      async () => {
        const { fortuneMousePaidSpin } = await import("../server/games/fortune-mouse.server");
        return fortuneMousePaidSpin(data);
      },
      "fortune-mouse",
    );
  });

const fortuneMouseFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const fortuneMouseFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fortuneMouseFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneMouseFreeSpinFn",
      data,
      async () => {
        const { fortuneMouseFreeSpin } = await import("../server/games/fortune-mouse.server");
        return fortuneMouseFreeSpin(data);
      },
      "fortune-mouse",
    );
  });

const fortuneMouseBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const fortuneMouseBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fortuneMouseBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneMouseBuyFeatureFn",
      data,
      async () => {
        const { fortuneMouseBuyFeature } = await import("../server/games/fortune-mouse.server");
        return fortuneMouseBuyFeature(data);
      },
      "fortune-mouse",
    );
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
  .middleware([operationIdentity])
  .validator(fortuneRabbitSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneRabbitSpinFn",
      data,
      async () => {
        const { fortuneRabbitPaidSpin } = await import("../server/games/fortune-rabbit.server");
        return fortuneRabbitPaidSpin(data);
      },
      "fortune-rabbit",
    );
  });

const fortuneRabbitFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const fortuneRabbitFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fortuneRabbitFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneRabbitFreeSpinFn",
      data,
      async () => {
        const { fortuneRabbitFreeSpin } = await import("../server/games/fortune-rabbit.server");
        return fortuneRabbitFreeSpin(data);
      },
      "fortune-rabbit",
    );
  });

const fortuneRabbitBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const fortuneRabbitBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fortuneRabbitBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneRabbitBuyFeatureFn",
      data,
      async () => {
        const { fortuneRabbitBuyFeature } = await import("../server/games/fortune-rabbit.server");
        return fortuneRabbitBuyFeature(data);
      },
      "fortune-rabbit",
    );
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
  .middleware([operationIdentity])
  .validator(fortuneOxSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneOxSpinFn",
      data,
      async () => {
        const { fortuneOxPaidSpin } = await import("../server/games/fortune-ox.server");
        return fortuneOxPaidSpin(data);
      },
      "fortune-ox",
    );
  });

const fortuneOxFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const fortuneOxFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fortuneOxFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneOxFreeSpinFn",
      data,
      async () => {
        const { fortuneOxFreeSpin } = await import("../server/games/fortune-ox.server");
        return fortuneOxFreeSpin(data);
      },
      "fortune-ox",
    );
  });

const fortuneOxBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const fortuneOxBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fortuneOxBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneOxBuyFeatureFn",
      data,
      async () => {
        const { fortuneOxBuyFeature } = await import("../server/games/fortune-ox.server");
        return fortuneOxBuyFeature(data);
      },
      "fortune-ox",
    );
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
  .middleware([operationIdentity])
  .validator(fortuneTigerSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneTigerSpinFn",
      data,
      async () => {
        const { fortuneTigerPaidSpin } = await import("../server/games/fortune-tiger.server");
        return fortuneTigerPaidSpin(data);
      },
      "fortune-tiger",
    );
  });

const fortuneTigerFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const fortuneTigerFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fortuneTigerFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneTigerFreeSpinFn",
      data,
      async () => {
        const { fortuneTigerFreeSpin } = await import("../server/games/fortune-tiger.server");
        return fortuneTigerFreeSpin(data);
      },
      "fortune-tiger",
    );
  });

const fortuneTigerBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const fortuneTigerBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fortuneTigerBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fortuneTigerBuyFeatureFn",
      data,
      async () => {
        const { fortuneTigerBuyFeature } = await import("../server/games/fortune-tiger.server");
        return fortuneTigerBuyFeature(data);
      },
      "fortune-tiger",
    );
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
  .middleware([operationIdentity])
  .validator(luckyNekoSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "luckyNekoSpinFn",
      data,
      async () => {
        const { luckyNekoPaidSpin } = await import("../server/games/lucky-neko.server");
        return luckyNekoPaidSpin(data);
      },
      "lucky-neko",
    );
  });

const luckyNekoFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const luckyNekoFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(luckyNekoFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "luckyNekoFreeSpinFn",
      data,
      async () => {
        const { luckyNekoFreeSpin } = await import("../server/games/lucky-neko.server");
        return luckyNekoFreeSpin(data);
      },
      "lucky-neko",
    );
  });

const luckyNekoBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const luckyNekoBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(luckyNekoBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "luckyNekoBuyFeatureFn",
      data,
      async () => {
        const { luckyNekoBuyFeature } = await import("../server/games/lucky-neko.server");
        return luckyNekoBuyFeature(data);
      },
      "lucky-neko",
    );
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
  .middleware([operationIdentity])
  .validator(rubyRavenSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "rubyRavenSpinFn",
      data,
      async () => {
        const { rubyRavenPaidSpin } = await import("../server/games/ruby-raven.server");
        return rubyRavenPaidSpin(data);
      },
      "ruby-raven",
    );
  });

const rubyRavenFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const rubyRavenFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(rubyRavenFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "rubyRavenFreeSpinFn",
      data,
      async () => {
        const { rubyRavenFreeSpin } = await import("../server/games/ruby-raven.server");
        return rubyRavenFreeSpin(data);
      },
      "ruby-raven",
    );
  });

const rubyRavenBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const rubyRavenBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(rubyRavenBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "rubyRavenBuyFeatureFn",
      data,
      async () => {
        const { rubyRavenBuyFeature } = await import("../server/games/ruby-raven.server");
        return rubyRavenBuyFeature(data);
      },
      "ruby-raven",
    );
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
  .middleware([operationIdentity])
  .validator(midnightOwlSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "midnightOwlSpinFn",
      data,
      async () => {
        const { midnightOwlPaidSpin } = await import("../server/games/midnight-owl.server");
        return midnightOwlPaidSpin(data);
      },
      "midnight-owl",
    );
  });

const midnightOwlFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const midnightOwlFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(midnightOwlFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "midnightOwlFreeSpinFn",
      data,
      async () => {
        const { midnightOwlFreeSpin } = await import("../server/games/midnight-owl.server");
        return midnightOwlFreeSpin(data);
      },
      "midnight-owl",
    );
  });

const midnightOwlBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const midnightOwlBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(midnightOwlBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "midnightOwlBuyFeatureFn",
      data,
      async () => {
        const { midnightOwlBuyFeature } = await import("../server/games/midnight-owl.server");
        return midnightOwlBuyFeature(data);
      },
      "midnight-owl",
    );
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
  .middleware([operationIdentity])
  .validator(honeyHiveSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "honeyHiveSpinFn",
      data,
      async () => {
        const { honeyHivePaidSpin } = await import("../server/games/honey-hive.server");
        return honeyHivePaidSpin(data);
      },
      "honey-hive",
    );
  });

const honeyHiveFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const honeyHiveFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(honeyHiveFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "honeyHiveFreeSpinFn",
      data,
      async () => {
        const { honeyHiveFreeSpin } = await import("../server/games/honey-hive.server");
        return honeyHiveFreeSpin(data);
      },
      "honey-hive",
    );
  });

const honeyHiveBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const honeyHiveBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(honeyHiveBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "honeyHiveBuyFeatureFn",
      data,
      async () => {
        const { honeyHiveBuyFeature } = await import("../server/games/honey-hive.server");
        return honeyHiveBuyFeature(data);
      },
      "honey-hive",
    );
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
  .middleware([operationIdentity])
  .validator(solarSerpentSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "solarSerpentSpinFn",
      data,
      async () => {
        const { solarSerpentPaidSpin } = await import("../server/games/solar-serpent.server");
        return solarSerpentPaidSpin(data);
      },
      "solar-serpent",
    );
  });

const solarSerpentFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const solarSerpentFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(solarSerpentFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "solarSerpentFreeSpinFn",
      data,
      async () => {
        const { solarSerpentFreeSpin } = await import("../server/games/solar-serpent.server");
        return solarSerpentFreeSpin(data);
      },
      "solar-serpent",
    );
  });

const solarSerpentBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const solarSerpentBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(solarSerpentBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "solarSerpentBuyFeatureFn",
      data,
      async () => {
        const { solarSerpentBuyFeature } = await import("../server/games/solar-serpent.server");
        return solarSerpentBuyFeature(data);
      },
      "solar-serpent",
    );
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
  .middleware([operationIdentity])
  .validator(frostFoxSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "frostFoxSpinFn",
      data,
      async () => {
        const { frostFoxPaidSpin } = await import("../server/games/frost-fox.server");
        return frostFoxPaidSpin(data);
      },
      "frost-fox",
    );
  });

const frostFoxFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const frostFoxFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(frostFoxFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "frostFoxFreeSpinFn",
      data,
      async () => {
        const { frostFoxFreeSpin } = await import("../server/games/frost-fox.server");
        return frostFoxFreeSpin(data);
      },
      "frost-fox",
    );
  });

const frostFoxBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const frostFoxBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(frostFoxBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "frostFoxBuyFeatureFn",
      data,
      async () => {
        const { frostFoxBuyFeature } = await import("../server/games/frost-fox.server");
        return frostFoxBuyFeature(data);
      },
      "frost-fox",
    );
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
  .middleware([operationIdentity])
  .validator(coralCobraSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "coralCobraSpinFn",
      data,
      async () => {
        const { coralCobraPaidSpin } = await import("../server/games/coral-cobra.server");
        return coralCobraPaidSpin(data);
      },
      "coral-cobra",
    );
  });

const coralCobraFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const coralCobraFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(coralCobraFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "coralCobraFreeSpinFn",
      data,
      async () => {
        const { coralCobraFreeSpin } = await import("../server/games/coral-cobra.server");
        return coralCobraFreeSpin(data);
      },
      "coral-cobra",
    );
  });

const coralCobraBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const coralCobraBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(coralCobraBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "coralCobraBuyFeatureFn",
      data,
      async () => {
        const { coralCobraBuyFeature } = await import("../server/games/coral-cobra.server");
        return coralCobraBuyFeature(data);
      },
      "coral-cobra",
    );
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
  .middleware([operationIdentity])
  .validator(lotusLynxSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "lotusLynxSpinFn",
      data,
      async () => {
        const { lotusLynxPaidSpin } = await import("../server/games/lotus-lynx.server");
        return lotusLynxPaidSpin(data);
      },
      "lotus-lynx",
    );
  });

const lotusLynxFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const lotusLynxFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(lotusLynxFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "lotusLynxFreeSpinFn",
      data,
      async () => {
        const { lotusLynxFreeSpin } = await import("../server/games/lotus-lynx.server");
        return lotusLynxFreeSpin(data);
      },
      "lotus-lynx",
    );
  });

const lotusLynxBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const lotusLynxBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(lotusLynxBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "lotusLynxBuyFeatureFn",
      data,
      async () => {
        const { lotusLynxBuyFeature } = await import("../server/games/lotus-lynx.server");
        return lotusLynxBuyFeature(data);
      },
      "lotus-lynx",
    );
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
  .middleware([operationIdentity])
  .validator(emberTigerSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "emberTigerSpinFn",
      data,
      async () => {
        const { emberTigerPaidSpin } = await import("../server/games/ember-tiger.server");
        return emberTigerPaidSpin(data);
      },
      "ember-tiger",
    );
  });

const emberTigerFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const emberTigerFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(emberTigerFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "emberTigerFreeSpinFn",
      data,
      async () => {
        const { emberTigerFreeSpin } = await import("../server/games/ember-tiger.server");
        return emberTigerFreeSpin(data);
      },
      "ember-tiger",
    );
  });

const emberTigerBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const emberTigerBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(emberTigerBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "emberTigerBuyFeatureFn",
      data,
      async () => {
        const { emberTigerBuyFeature } = await import("../server/games/ember-tiger.server");
        return emberTigerBuyFeature(data);
      },
      "ember-tiger",
    );
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
  .middleware([operationIdentity])
  .validator(jadeJaguarSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "jadeJaguarSpinFn",
      data,
      async () => {
        const { jadeJaguarPaidSpin } = await import("../server/games/jade-jaguar.server");
        return jadeJaguarPaidSpin(data);
      },
      "jade-jaguar",
    );
  });

const jadeJaguarFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const jadeJaguarFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(jadeJaguarFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "jadeJaguarFreeSpinFn",
      data,
      async () => {
        const { jadeJaguarFreeSpin } = await import("../server/games/jade-jaguar.server");
        return jadeJaguarFreeSpin(data);
      },
      "jade-jaguar",
    );
  });

const jadeJaguarBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const jadeJaguarBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(jadeJaguarBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "jadeJaguarBuyFeatureFn",
      data,
      async () => {
        const { jadeJaguarBuyFeature } = await import("../server/games/jade-jaguar.server");
        return jadeJaguarBuyFeature(data);
      },
      "jade-jaguar",
    );
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
  .middleware([operationIdentity])
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

export const heartbeatFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .handler(async () => {
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
  .middleware([operationIdentity])
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
  .middleware([operationIdentity])
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
  .middleware([operationIdentity])
  .validator(agentMsgSchema)
  .handler(async ({ data }) => {
    const { addAgentSupportMessage } = await import("../server/services.server");
    return addAgentSupportMessage(data.ticketId, data.text);
  });

const resolveTicketSchema = z.object({
  ticketId: z.string().min(1),
});

export const resolveSupportTicketFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
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
  .middleware([operationIdentity])
  .validator(createTicketSchema)
  .handler(async ({ data }) => {
    const { createPlayerTicket } = await import("../server/services.server");
    return createPlayerTicket(data.playerName, data.concern);
  });

const assignAgentSchema = z.object({
  ticketId: z.string().min(1),
});

export const assignAgentToTicketFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(assignAgentSchema)
  .handler(async ({ data }) => {
    const { assignAgentToTicket } = await import("../server/services.server");
    return assignAgentToTicket(data.ticketId);
  });

const fireSpikeSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const fireSpikeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(fireSpikeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "fireSpikeSpinFn",
      data,
      async () => {
        const { fireSpikePaidSpin } = await import("../server/games/fire-spike.server");
        return fireSpikePaidSpin(data);
      },
      "fire-spike",
    );
  });

export const getFireSpikeEngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFireSpikeEngineConfigPublic } = await import("../server/games/fire-spike.server");
  return getFireSpikeEngineConfigPublic();
});

const coinVolcanoSpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
});

export const coinVolcanoSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(coinVolcanoSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "coinVolcanoSpinFn",
      data,
      async () => {
        const { coinVolcanoPaidSpin } = await import("../server/games/coin-volcano.server");
        return coinVolcanoPaidSpin(data);
      },
      "coin-volcano",
    );
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
  .middleware([operationIdentity])
  .validator(aceHighDealSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "aceHighDealFn",
      data,
      async () => {
        const { aceHighPaidDeal } = await import("../server/games/ace-high.server");
        return JSON.parse(JSON.stringify(await aceHighPaidDeal(data))) as Awaited<
          ReturnType<typeof aceHighPaidDeal>
        >;
      },
      "ace-high",
    );
  });

export const aceHighWarFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(z.object({}).optional())
  .handler(async () => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "aceHighWarFn",
      null,
      async () => {
        const { aceHighGoToWar } = await import("../server/games/ace-high.server");
        return JSON.parse(JSON.stringify(await aceHighGoToWar())) as Awaited<
          ReturnType<typeof aceHighGoToWar>
        >;
      },
      "ace-high",
    );
  });

export const aceHighFoldFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(z.object({}).optional())
  .handler(async () => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "aceHighFoldFn",
      null,
      async () => {
        const { aceHighFold } = await import("../server/games/ace-high.server");
        return JSON.parse(JSON.stringify(await aceHighFold())) as Awaited<
          ReturnType<typeof aceHighFold>
        >;
      },
      "ace-high",
    );
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
  .middleware([operationIdentity])
  .validator(wildPantherSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "wildPantherSpinFn",
      data,
      async () => {
        const { wildPantherPaidSpin } = await import("../server/games/wild-panther.server");
        return wildPantherPaidSpin(data);
      },
      "wild-panther",
    );
  });

const wildPantherFreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const wildPantherFreeSpinFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(wildPantherFreeSpinSchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "wildPantherFreeSpinFn",
      data,
      async () => {
        const { wildPantherFreeSpin } = await import("../server/games/wild-panther.server");
        return wildPantherFreeSpin(data);
      },
      "wild-panther",
    );
  });

const wildPantherBuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
});

export const wildPantherBuyFeatureFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(wildPantherBuySchema)
  .handler(async ({ data }) => {
    const { withFinancialOperation } = await import("../server/operation.server");
    return withFinancialOperation(
      "wildPantherBuyFeatureFn",
      data,
      async () => {
        const { wildPantherBuyFeature } = await import("../server/games/wild-panther.server");
        return wildPantherBuyFeature(data);
      },
      "wild-panther",
    );
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

export { createWalletRequestFn, reviewWalletRequestFn } from "./wallet";
export {
  getActiveSeedPairFn,
  updateClientSeedFn,
  rotateProvablyFairSeedPairFn,
  verifyProvablyFairRoundFn,
} from "./provably-fair";
