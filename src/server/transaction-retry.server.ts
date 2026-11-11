import { setTimeout as delay } from "node:timers/promises";
import { randomInt } from "node:crypto";

export function transactionConflict(error: unknown): boolean {
  let current = error;
  for (let i = 0; i < 5 && current && typeof current === "object"; i++) {
    const item = current as { code?: string; errno?: number; cause?: unknown };
    if (
      [1020, 1205, 1213].includes(Number(item.errno)) ||
      ["ER_CHECKREAD", "ER_LOCK_WAIT_TIMEOUT", "ER_LOCK_DEADLOCK"].includes(item.code ?? "")
    )
      return true;
    current = item.cause;
  }
  return false;
}

/** Only retry after Drizzle has completed its transaction rollback. Never retry
 * transport/commit-acknowledgement failures with an unknown commit outcome. */
export async function retryTransaction<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= 3 || !transactionConflict(error)) throw error;
      await delay(20 * 2 ** attempt + randomInt(0, 21));
    }
  }
}
