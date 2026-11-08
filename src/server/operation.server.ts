import { createHash, randomUUID } from "node:crypto";
import { eq, and, sql } from "drizzle-orm";
import { getRequestHeader } from "@tanstack/react-start/server";
import { getDb } from "./db/client";
import { financialOperations, gameControls, playSessions } from "./db/schema";
import { transactionContext } from "./db/transaction-context.server";
import { requireUser } from "./session";
import { lockAccounts } from "./financial-locks.server";
import { reserveRoundSeed } from "./provably-fair/engine.server";
import { roundRandom, type RoundRandom } from "./round-random.server";
import { lockFishingRoom } from "./fishing-state.server";
import { signedMinorUnits } from "@/lib/money";
import { encodeOperation, decodeOperation } from "./operation-codec.server";
import { retryTransaction } from "./transaction-retry.server";

const hash = (input: string) => createHash("sha256").update(input).digest("hex");

/** The entire handler (including prechecks and resolution) shares one commit. */
export async function withFinancialOperation<T>(
  action: string,
  input: unknown,
  fn: () => Promise<T>,
  gameId?: string,
): Promise<T> {
  const actor = await requireUser();
  const key = getRequestHeader("Idempotency-Key");
  if (!key || !/^[a-zA-Z0-9_-]{16,128}$/.test(key))
    throw new Error("A valid Idempotency-Key is required");
  const id = hash(`${actor.id}:${key}`);
  const inputHash = hash(JSON.stringify({ action, input }));
  function checkAmounts(value: unknown, name = "") {
    if (typeof value === "number" && /bet|ante|pairplus|amount|delta|wager|cost/i.test(name))
      signedMinorUnits(value);
    else if (value && typeof value === "object")
      for (const [key, item] of Object.entries(value)) checkAmounts(item, key);
  }
  checkAmounts(input);
  try {
    return await retryTransaction(() =>
      getDb().transaction(async (tx) => {
        if (
          gameId &&
          [
            "deep-bass",
            "dragon-fisher",
            "crab-cannon",
            "shark-hunter",
            "octopus-armada",
            "turtle-tide",
            "whale-war",
          ].includes(gameId)
        )
          await lockFishingRoom(tx, gameId);
        // Contributions already serialize on this pool row. Lock it before the
        // first MVCC snapshot so strict InnoDB snapshot isolation cannot reject
        // a later contribution because another player's commit changed the row.
        if (gameId || action === "assignJackpotToPlayerFn")
          await tx.execute(sql`SELECT id FROM jackpot WHERE id = 'mega' FOR UPDATE`);
        const targetId =
          input && typeof input === "object" && "userId" in input ? String(input.userId) : actor.id;
        const lockedUsers = await lockAccounts(tx, [actor.id, targetId]);
        const currentActor = lockedUsers.find((user) => user.id === actor.id);
        if (!currentActor || currentActor.role !== actor.role || currentActor.isLocked === "yes")
          throw new Error("Session privileges changed");
        const [prior] = await tx
          .select()
          .from(financialOperations)
          .where(eq(financialOperations.id, id))
          .limit(1);
        if (prior) {
          if (prior.inputHash !== inputHash)
            throw new Error("Idempotency key already used for different input");
          if (!prior.result) throw new Error("Operation is not complete");
          return decodeOperation<T>(prior.result);
        }
        await tx.insert(financialOperations).values({ id, userId: actor.id, action, inputHash });
        const seed = await reserveRoundSeed(tx, actor.id);
        const rng: RoundRandom = {
          serverSeed: seed.serverSeed,
          clientSeed: seed.clientSeed,
          nonce: seed.nonce,
          draws: 0,
        };
        const control = gameId
          ? (
              await tx.select().from(gameControls).where(eq(gameControls.gameId, gameId)).limit(1)
            )[0]
          : undefined;
        const priorFeature = gameId
          ? await tx
              .select()
              .from(playSessions)
              .where(
                and(
                  eq(playSessions.userId, actor.id),
                  eq(playSessions.gameId, gameId),
                  eq(playSessions.status, "open"),
                ),
              )
          : [];
        const result = await transactionContext.run(tx as unknown as ReturnType<typeof getDb>, () =>
          roundRandom.run(rng, fn),
        );
        const canonicalResult = JSON.parse(JSON.stringify(result ?? null)) as T;
        const proof = {
          roundId: id,
          serverSeedHash: seed.serverSeedHash,
          clientSeed: seed.clientSeed,
          nonce: seed.nonce,
          draws: rng.draws,
          gameId,
          action,
          input: gameId ? input : undefined,
          inputHash,
          engineConfig: control?.engineConfig ?? null,
          effectiveEngineConfig: rng.effectiveConfig ?? null,
          gameControl: control ?? null,
          priorFeature,
          version: process.env.RELEASE_SHA ?? "working-tree",
          resultHash: hash(JSON.stringify(canonicalResult)),
          entropy: "HMAC-SHA256/u32/v1",
        };
        await tx
          .update(financialOperations)
          .set({ result: encodeOperation(canonicalResult), proof: encodeOperation(proof) })
          .where(eq(financialOperations.id, id));
        return canonicalResult;
      }),
    );
  } catch (error) {
    if (error instanceof Error && /^Failed query:/.test(error.message)) {
      throw new Error("Financial service unavailable. Retry with the same operation key.");
    }
    throw error;
  }
}
