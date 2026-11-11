import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client";
import { provablyFairSeeds, type ProvablyFairSeed } from "../db/schema";
import { newId } from "../session";

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash("sha256").update(serverSeed).digest("hex");
}

export function generateClientSeed(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Calculates a deterministic float in [0, 1) using HMAC-SHA256.
 * Formula: HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}:${subroll}`)
 */
export function generateOutcomeFloat(params: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  subroll?: number;
}): number {
  const { serverSeed, clientSeed, nonce, subroll = 0 } = params;
  const message = `${clientSeed}:${nonce}:${subroll}`;
  const hmac = crypto.createHmac("sha256", serverSeed).update(message).digest("hex");

  // Take first 8 hex characters (4 bytes = 32 bits)
  const hexSubstring = hmac.substring(0, 8);
  const intVal = parseInt(hexSubstring, 16);

  // Divide by 2^32 (4294967296) for uniform float in [0, 1)
  return intVal / 4294967296;
}

/**
 * Verifies a past game round outcome.
 */
export function verifyProvablyFairRound(params: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  subroll?: number;
  expectedServerSeedHash: string;
}): { isValid: boolean; floatValue: number; calculatedHash: string } {
  const calculatedHash = hashServerSeed(params.serverSeed);
  const isValid = calculatedHash.toLowerCase() === params.expectedServerSeedHash.toLowerCase();
  const floatValue = generateOutcomeFloat({
    serverSeed: params.serverSeed,
    clientSeed: params.clientSeed,
    nonce: params.nonce,
    subroll: params.subroll,
  });

  return { isValid, floatValue, calculatedHash };
}

type SeedDb = Pick<ReturnType<typeof getDb>, "select" | "insert" | "update">;

async function activeSeed(tx: SeedDb, userId: string) {
  const [existing] = await tx
    .select()
    .from(provablyFairSeeds)
    // Every caller already holds the user's row lock. A missing-key locking scan
    // adds cross-user InnoDB gap locks without providing extra seed protection.
    .where(eq(provablyFairSeeds.activeUserKey, userId))
    .limit(1);
  if (existing) return existing;
  const serverSeed = generateServerSeed();
  const seed = {
    id: newId(),
    userId,
    serverSeed,
    serverSeedHash: hashServerSeed(serverSeed),
    clientSeed: generateClientSeed(),
    nonce: 0,
    status: "active" as const,
  };
  await tx.insert(provablyFairSeeds).values(seed);
  return seed;
}

/** Caller must lock the user row; nonce allocation commits with the paid operation. */
export async function reserveRoundSeed(tx: SeedDb, userId: string) {
  const seed = await activeSeed(tx, userId);
  const nonce = seed.nonce + 1;
  if (!Number.isSafeInteger(nonce)) throw new Error("Seed nonce exhausted; rotate seed");
  await tx.update(provablyFairSeeds).set({ nonce }).where(eq(provablyFairSeeds.id, seed.id));
  return { ...seed, nonce };
}

async function seedTransaction<T>(userId: string, fn: (tx: SeedDb) => Promise<T>): Promise<T> {
  const { requireUser } = await import("../session");
  const { lockAccounts } = await import("../financial-locks.server");
  const user = await requireUser();
  if (user.id !== userId) throw new Error("Forbidden");
  return getDb().transaction(async (tx) => {
    await lockAccounts(tx, [userId]);
    return fn(tx);
  });
}

export async function getActiveSeedPair(userId: string) {
  return seedTransaction(userId, async (tx) => {
    const seed = await activeSeed(tx, userId);
    return {
      id: seed.id,
      serverSeedHash: seed.serverSeedHash,
      clientSeed: seed.clientSeed,
      nonce: seed.nonce,
      revealedServerSeed: null,
    };
  });
}

export async function incrementProvablyFairNonce(userId: string) {
  return seedTransaction(userId, (tx) => reserveRoundSeed(tx, userId));
}

export async function updateClientSeed(userId: string, newClientSeed: string) {
  const trimmed = newClientSeed.trim();
  if (!trimmed || trimmed.length > 64) throw new Error("Invalid client seed");
  return seedTransaction(userId, async (tx) => {
    const seed = await activeSeed(tx, userId);
    if (seed.nonce > 0) throw new Error("Rotate the seed before changing a used client seed");
    await tx
      .update(provablyFairSeeds)
      .set({ clientSeed: trimmed })
      .where(eq(provablyFairSeeds.id, seed.id));
    return { ok: true, clientSeed: trimmed };
  });
}

export async function rotateProvablyFairSeedPair(userId: string) {
  return seedTransaction(userId, async (tx) => {
    const old = await activeSeed(tx, userId);
    await tx
      .update(provablyFairSeeds)
      .set({ status: "revealed" })
      .where(eq(provablyFairSeeds.id, old.id));
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    await tx.insert(provablyFairSeeds).values({
      id: newId(),
      userId,
      serverSeed,
      serverSeedHash,
      clientSeed: old.clientSeed,
      nonce: 0,
      status: "active",
    });
    return {
      previousServerSeed: old.serverSeed,
      previousServerSeedHash: old.serverSeedHash,
      newServerSeedHash: serverSeedHash,
      clientSeed: old.clientSeed,
      newNonce: 0,
    };
  });
}
