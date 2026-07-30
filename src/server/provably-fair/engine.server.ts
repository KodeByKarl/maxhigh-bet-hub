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

  // Divide by 2^32 - 1 (4294967295) for uniform float in [0, 1)
  return intVal / 4294967295;
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

/**
 * Gets or initializes the active Provably Fair seed pair for a user.
 */
export async function getActiveSeedPair(userId: string): Promise<{
  id: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  revealedServerSeed: string | null;
}> {
  const db = getDb();

  const [active] = await db
    .select()
    .from(provablyFairSeeds)
    .where(and(eq(provablyFairSeeds.userId, userId), eq(provablyFairSeeds.status, "active")))
    .limit(1);

  if (active) {
    return {
      id: active.id,
      serverSeedHash: active.serverSeedHash,
      clientSeed: active.clientSeed,
      nonce: active.nonce,
      revealedServerSeed: null,
    };
  }

  // Create new initial seed pair
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const clientSeed = generateClientSeed();
  const id = newId();

  await db.insert(provablyFairSeeds).values({
    id,
    userId,
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce: 0,
    status: "active",
  });

  return {
    id,
    serverSeedHash,
    clientSeed,
    nonce: 0,
    revealedServerSeed: null,
  };
}

/**
 * Increments the nonce for a user's active seed pair upon a wager/spin.
 */
export async function incrementProvablyFairNonce(userId: string): Promise<{
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}> {
  const db = getDb();
  const active = await getActiveSeedPair(userId);

  const [fullActive] = await db
    .select()
    .from(provablyFairSeeds)
    .where(eq(provablyFairSeeds.id, active.id))
    .limit(1);

  if (!fullActive) throw new Error("Active seed pair error");

  const nextNonce = fullActive.nonce + 1;
  await db
    .update(provablyFairSeeds)
    .set({ nonce: nextNonce })
    .where(eq(provablyFairSeeds.id, fullActive.id));

  return {
    serverSeed: fullActive.serverSeed,
    clientSeed: fullActive.clientSeed,
    nonce: nextNonce,
  };
}

/**
 * Updates the client seed for the active seed pair.
 */
export async function updateClientSeed(userId: string, newClientSeed: string): Promise<{ ok: boolean; clientSeed: string }> {
  const db = getDb();
  const trimmed = newClientSeed.trim();
  if (!trimmed || trimmed.length > 64) {
    throw new Error("Invalid client seed");
  }

  const active = await getActiveSeedPair(userId);

  await db
    .update(provablyFairSeeds)
    .set({ clientSeed: trimmed })
    .where(eq(provablyFairSeeds.id, active.id));

  return { ok: true, clientSeed: trimmed };
}

/**
 * Rotates the server seed: marks current seed as 'revealed', reveals serverSeed to player,
 * and generates a brand new active seed pair.
 */
export async function rotateProvablyFairSeedPair(userId: string): Promise<{
  previousServerSeed: string;
  previousServerSeedHash: string;
  newServerSeedHash: string;
  clientSeed: string;
  newNonce: number;
}> {
  const db = getDb();

  const [active] = await db
    .select()
    .from(provablyFairSeeds)
    .where(and(eq(provablyFairSeeds.userId, userId), eq(provablyFairSeeds.status, "active")))
    .limit(1);

  if (active) {
    // Reveal old server seed
    await db
      .update(provablyFairSeeds)
      .set({ status: "revealed" })
      .where(eq(provablyFairSeeds.id, active.id));
  }

  // Create new active seed pair
  const newServerSeed = generateServerSeed();
  const newServerSeedHash = hashServerSeed(newServerSeed);
  const clientSeed = active?.clientSeed ?? generateClientSeed();
  const id = newId();

  await db.insert(provablyFairSeeds).values({
    id,
    userId,
    serverSeed: newServerSeed,
    serverSeedHash: newServerSeedHash,
    clientSeed,
    nonce: 0,
    status: "active",
  });

  return {
    previousServerSeed: active?.serverSeed ?? "",
    previousServerSeedHash: active?.serverSeedHash ?? "",
    newServerSeedHash,
    clientSeed,
    newNonce: 0,
  };
}
