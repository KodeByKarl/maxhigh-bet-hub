import { AsyncLocalStorage } from "node:async_hooks";
import { eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { fishingRooms } from "./db/schema";
import { transactionContext } from "./db/transaction-context.server";

const activeRoom = new AsyncLocalStorage<string>();
const maximumRoomBytes = 8 * 1024 * 1024;
const stringify = (value: unknown) =>
  JSON.stringify(value, (_key, item) => (item instanceof Map ? { __map: [...item] } : item));
const parse = (value: string) =>
  JSON.parse(value, (_key, item) =>
    item && typeof item === "object" && "__map" in item ? new Map(item.__map) : item,
  );

export async function lockFishingRoom(
  tx: Pick<ReturnType<typeof getDb>, "insert" | "select">,
  gameId: string,
) {
  await tx
    .insert(fishingRooms)
    .values({ gameId, state: "{}" })
    .onDuplicateKeyUpdate({ set: { gameId } });
  const [room] = await tx
    .select()
    .from(fishingRooms)
    .where(eq(fishingRooms.gameId, gameId))
    .for("update")
    .limit(1);
  return room;
}

/** DB room lock precedes all participant locks, including boss contributors. */
export async function withFishingRoom<T, S>(
  gameId: string,
  capture: () => S,
  restore: (value: S) => void,
  fn: () => Promise<T>,
): Promise<T> {
  if (activeRoom.getStore() === gameId) return fn();
  return getDb().transaction(async (tx) => {
    const room = await lockFishingRoom(tx, gameId);
    if (Buffer.byteLength(room.state) > maximumRoomBytes)
      throw new Error("Fishing room capacity reached; retry later");
    const committed = parse(room.state);
    restore(committed);
    try {
      const result = await transactionContext.run(tx as unknown as ReturnType<typeof getDb>, () =>
        activeRoom.run(gameId, fn),
      );
      const snapshot = stringify(capture());
      if (Buffer.byteLength(snapshot) > maximumRoomBytes)
        throw new Error("Fishing room capacity reached; retry later");
      await tx.update(fishingRooms).set({ state: snapshot }).where(eq(fishingRooms.gameId, gameId));
      return result;
    } catch (error) {
      restore(committed);
      throw error;
    } finally {
      // The DB is authoritative. Do not retain inactive players/boss contributors
      // in seven module-level registries between requests.
      restore(parse("{}"));
    }
  });
}
