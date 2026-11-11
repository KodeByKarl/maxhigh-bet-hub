import { eq } from "drizzle-orm";
import { users } from "./db/schema";
import type { getDb } from "./db/client";

export async function lockAccounts(db: Pick<ReturnType<typeof getDb>, "select">, ids: string[]) {
  const rows = [];
  for (const id of [...new Set(ids)].sort()) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).for("update").limit(1);
    if (!user) throw new Error("User not found");
    rows.push(user);
  }
  return rows;
}
