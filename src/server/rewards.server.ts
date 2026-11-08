import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "./db/client";
import { rewardEntitlements } from "./db/schema";
import { requireUser } from "./session";
import { writeLedgerDelta } from "./wallet.server";
import { lockAccounts } from "./financial-locks.server";

export async function listMyRewards() {
  const user = await requireUser();
  const rows = await getDb()
    .select()
    .from(rewardEntitlements)
    .where(eq(rewardEntitlements.userId, user.id))
    .limit(100);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    claimed: row.claimedAt !== null,
  }));
}

export async function claimReward(id: string) {
  const user = await requireUser();
  return getDb().transaction(async (tx) => {
    await lockAccounts(tx, [user.id]);
    const [reward] = await tx
      .select()
      .from(rewardEntitlements)
      .where(and(eq(rewardEntitlements.id, id), eq(rewardEntitlements.userId, user.id)))
      .for("update")
      .limit(1);
    if (!reward) throw new Error("Reward not found");
    if (reward.claimedAt) throw new Error("Reward already claimed");
    await tx
      .update(rewardEntitlements)
      .set({ claimedAt: new Date() })
      .where(and(eq(rewardEntitlements.id, id), isNull(rewardEntitlements.claimedAt)));
    return writeLedgerDelta(tx, {
      userId: user.id,
      username: user.username,
      delta: Number(reward.amount),
      type: "deposit",
      game: "Reward",
      note: `Reward entitlement ${id}`,
    });
  });
}
