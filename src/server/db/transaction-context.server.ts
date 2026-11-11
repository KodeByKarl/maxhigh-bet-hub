import { AsyncLocalStorage } from "node:async_hooks";
import type { getDb } from "./client";

type Database = ReturnType<typeof getDb>;
export const transactionContext = new AsyncLocalStorage<Database>();

/** Nested service transactions join the outer atomic operation; errors propagate. */
export function currentTransaction(): Database | undefined {
  return transactionContext.getStore();
}
