import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listMyRoundReceiptsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUser } = await import("../server/session");
  const { getDb } = await import("../server/db/client");
  const { financialOperations, provablyFairSeeds } = await import("../server/db/schema");
  const { decodeOperation } = await import("../server/operation-codec.server");
  const { eq, desc, and, inArray } = await import("drizzle-orm");
  const user = await requireUser();
  const rows = await getDb()
    .select()
    .from(financialOperations)
    .where(eq(financialOperations.userId, user.id))
    .orderBy(desc(financialOperations.createdAt))
    .limit(20);
  const receipts = rows
    .filter((row) => row.proof)
    .map((row) => ({
      row,
      proof: decodeOperation<Record<string, import("../server/operation-codec.server").JsonValue>>(
        row.proof!,
      ),
    }));
  const hashes = [...new Set(receipts.map(({ proof }) => String(proof.serverSeedHash)))];
  const seeds = hashes.length
    ? await getDb()
        .select()
        .from(provablyFairSeeds)
        .where(
          and(
            eq(provablyFairSeeds.userId, user.id),
            inArray(provablyFairSeeds.serverSeedHash, hashes),
            eq(provablyFairSeeds.status, "revealed"),
          ),
        )
    : [];
  const revealed = new Map(seeds.map((seed) => [seed.serverSeedHash, seed.serverSeed]));
  return receipts.map(({ row, proof }) => {
    return {
      id: row.id,
      action: row.action,
      proof,
      result: decodeOperation(row.result ?? "null"),
      revealedServerSeed: revealed.get(String(proof.serverSeedHash)) ?? null,
    };
  });
});

export const getActiveSeedPairFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { getActiveSeedPair } = await import("../server/provably-fair/engine.server");
    const { requireUser } = await import("../server/session");
    const user = await requireUser();
    if (data.userId !== user.id) throw new Error("Forbidden");
    return getActiveSeedPair(user.id);
  });

export const updateClientSeedFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), newClientSeed: z.string().min(1).max(64) }))
  .handler(async ({ data }) => {
    const { updateClientSeed } = await import("../server/provably-fair/engine.server");
    const { requireUser } = await import("../server/session");
    const user = await requireUser();
    if (data.userId !== user.id) throw new Error("Forbidden");
    return updateClientSeed(user.id, data.newClientSeed);
  });

export const rotateProvablyFairSeedPairFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { rotateProvablyFairSeedPair } = await import("../server/provably-fair/engine.server");
    const { requireUser } = await import("../server/session");
    const user = await requireUser();
    if (data.userId !== user.id) throw new Error("Forbidden");
    return rotateProvablyFairSeedPair(user.id);
  });

const verifySchema = z.object({
  serverSeed: z.string().min(1).max(128),
  clientSeed: z.string().min(1).max(128),
  nonce: z.number().int().nonnegative(),
  subroll: z.number().int().nonnegative().optional(),
  expectedServerSeedHash: z.string().min(1).max(128),
});

export const verifyProvablyFairRoundFn = createServerFn({ method: "POST" })
  .validator(verifySchema)
  .handler(async ({ data }) => {
    const { verifyProvablyFairRound } = await import("../server/provably-fair/engine.server");
    return verifyProvablyFairRound(data);
  });
