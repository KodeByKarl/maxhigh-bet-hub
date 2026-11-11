import { and, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { playSessions } from "./db/schema";

export async function assertNoOpenFeature(userId: string, gameId: string) {
  const [feature] = await getDb()
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        eq(playSessions.gameId, gameId),
        eq(playSessions.status, "open"),
      ),
    )
    .for("update")
    .limit(1);
  if (feature && (Number(feature.freeSpinsLeft) > 0 || feature.featureState))
    throw new Error("Finish your current paid feature first");
}
