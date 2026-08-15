import { and, eq, inArray, lt } from "drizzle-orm";
import { getDb } from "./db/client";
import { playSessions } from "./db/schema";

export const PLAY_SESSION_STALE_OPEN_HOURS = 24;
export const PLAY_SESSION_PURGE_CLOSED_DAYS = 30;

export type PlaySessionCleanupResult = {
  dedupedClosed: number;
  staleClosed: number;
  purged: number;
  staleOpenHours: number;
  purgeClosedDays: number;
  dryRun: boolean;
};

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * D1 maintenance:
 * 1) Keep at most one open session per (userId, gameId) — close older duplicates.
 * 2) Close abandoned opens (no free spins left, updated_at older than threshold).
 * 3) Delete closed sessions older than purge threshold.
 */
export async function cleanupPlaySessions(opts?: {
  staleOpenHours?: number;
  purgeClosedDays?: number;
  dryRun?: boolean;
}): Promise<PlaySessionCleanupResult> {
  const staleOpenHours = opts?.staleOpenHours ?? PLAY_SESSION_STALE_OPEN_HOURS;
  const purgeClosedDays = opts?.purgeClosedDays ?? PLAY_SESSION_PURGE_CLOSED_DAYS;
  const dryRun = opts?.dryRun ?? false;
  const db = getDb();

  let dedupedClosed = 0;
  let staleClosed = 0;
  let purged = 0;

  const opens = await db
    .select({
      id: playSessions.id,
      userId: playSessions.userId,
      gameId: playSessions.gameId,
      updatedAt: playSessions.updatedAt,
    })
    .from(playSessions)
    .where(eq(playSessions.status, "open"));

  const keepByKey = new Map<string, { id: string; updatedAt: Date | null }>();
  const dupIds: string[] = [];
  for (const row of opens) {
    const key = `${row.userId}::${row.gameId}`;
    const prev = keepByKey.get(key);
    const ts = row.updatedAt ? new Date(row.updatedAt).getTime() : 0;
    if (!prev) {
      keepByKey.set(key, { id: row.id, updatedAt: row.updatedAt });
      continue;
    }
    const prevTs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
    if (ts >= prevTs) {
      dupIds.push(prev.id);
      keepByKey.set(key, { id: row.id, updatedAt: row.updatedAt });
    } else {
      dupIds.push(row.id);
    }
  }

  if (dupIds.length > 0) {
    dedupedClosed = dupIds.length;
    if (!dryRun) {
      for (let i = 0; i < dupIds.length; i += 200) {
        const chunk = dupIds.slice(i, i + 200);
        await db
          .update(playSessions)
          .set({
            status: "closed",
            freeSpinsLeft: 0,
            featureState: null,
          })
          .where(inArray(playSessions.id, chunk));
      }
    }
  }

  const staleCutoff = hoursAgo(staleOpenHours);
  if (dryRun) {
    const staleRows = await db
      .select({ id: playSessions.id })
      .from(playSessions)
      .where(
        and(
          eq(playSessions.status, "open"),
          eq(playSessions.freeSpinsLeft, 0),
          lt(playSessions.updatedAt, staleCutoff),
        ),
      );
    staleClosed = staleRows.length;
  } else {
    const staleResult = await db
      .update(playSessions)
      .set({
        status: "closed",
        featureState: null,
      })
      .where(
        and(
          eq(playSessions.status, "open"),
          eq(playSessions.freeSpinsLeft, 0),
          lt(playSessions.updatedAt, staleCutoff),
        ),
      );
    staleClosed = staleResult[0]?.affectedRows ?? 0;
  }

  const purgeCutoff = daysAgo(purgeClosedDays);
  if (dryRun) {
    const oldClosed = await db
      .select({ id: playSessions.id })
      .from(playSessions)
      .where(and(eq(playSessions.status, "closed"), lt(playSessions.updatedAt, purgeCutoff)));
    purged = oldClosed.length;
  } else {
    const purgeResult = await db
      .delete(playSessions)
      .where(and(eq(playSessions.status, "closed"), lt(playSessions.updatedAt, purgeCutoff)));
    purged = purgeResult[0]?.affectedRows ?? 0;
  }

  return {
    dedupedClosed,
    staleClosed,
    purged,
    staleOpenHours,
    purgeClosedDays,
    dryRun,
  };
}
