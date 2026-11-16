/**
 * General game sound volume, stored in the existing `platform_settings` table under its own row id so that no schema change
 * (and therefore no production migration) is required. The row is never read by maintenance/limit code, which only reads
 * id = "default". The JSON payload lives in the nullable text column `announcement_banner` of that dedicated row.
 */
import { eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { platformSettings } from "./db/schema";
import { writeAuditLog } from "./admin/audit.server";
import { requireSuperadmin } from "./session";
import {
  DEFAULT_GAME_SOUND_SETTING,
  normalizeGameSoundSetting,
  type GameSoundSetting,
} from "@/lib/game-sound-settings";

const ROW_ID = "game-sound";

/** Public read (every role, including anonymous): exposes only the two non-sensitive sound fields. */
export async function readGameSoundSetting(): Promise<GameSoundSetting> {
  try {
    const rows = await getDb()
      .select({ payload: platformSettings.announcementBanner })
      .from(platformSettings)
      .where(eq(platformSettings.id, ROW_ID))
      .limit(1);
    const payload = rows[0]?.payload;
    if (!payload) return DEFAULT_GAME_SOUND_SETTING;
    return normalizeGameSoundSetting(JSON.parse(payload));
  } catch {
    return DEFAULT_GAME_SOUND_SETTING;
  }
}

/** Super Admin only. */
export async function saveGameSoundSetting(input: GameSoundSetting): Promise<GameSoundSetting> {
  const actor = await requireSuperadmin();
  const next = normalizeGameSoundSetting(input);
  const before = await readGameSoundSetting();
  const db = getDb();
  const payload = JSON.stringify(next);
  const existing = await db
    .select({ id: platformSettings.id })
    .from(platformSettings)
    .where(eq(platformSettings.id, ROW_ID))
    .limit(1);
  if (existing[0]) {
    await db
      .update(platformSettings)
      .set({ announcementBanner: payload })
      .where(eq(platformSettings.id, ROW_ID));
  } else {
    await db.insert(platformSettings).values({ id: ROW_ID, announcementBanner: payload });
  }
  await writeAuditLog({
    actor,
    action: "super.game_sound",
    summary: `Game sound set to ${next.muted ? "MUTED" : `${next.volumePercent}%`}`,
    targetType: "settings",
    targetId: ROW_ID,
    meta: { before, after: next },
  });
  return next;
}
