import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getActiveSeedPairFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { getActiveSeedPair } = await import("../server/provably-fair/engine.server");
    return getActiveSeedPair(data.userId);
  });

export const updateClientSeedFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), newClientSeed: z.string().min(1).max(64) }))
  .handler(async ({ data }) => {
    const { updateClientSeed } = await import("../server/provably-fair/engine.server");
    return updateClientSeed(data.userId, data.newClientSeed);
  });

export const rotateProvablyFairSeedPairFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { rotateProvablyFairSeedPair } = await import("../server/provably-fair/engine.server");
    return rotateProvablyFairSeedPair(data.userId);
  });

const verifySchema = z.object({
  serverSeed: z.string().min(1),
  clientSeed: z.string().min(1),
  nonce: z.number().int().nonnegative(),
  subroll: z.number().int().nonnegative().optional(),
  expectedServerSeedHash: z.string().min(1),
});

export const verifyProvablyFairRoundFn = createServerFn({ method: "POST" })
  .validator(verifySchema)
  .handler(async ({ data }) => {
    const { verifyProvablyFairRound } = await import("../server/provably-fair/engine.server");
    return verifyProvablyFairRound(data);
  });
