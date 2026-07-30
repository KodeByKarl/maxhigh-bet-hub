import { eq, desc, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import { gameControls, gameSettingsLogs } from "../db/schema";
import { newId } from "../session";
import { writeAuditLog } from "../admin/audit.server";
import { requirePermission } from "../auth/rbac.server";

export type BulkGameControlsInput = {
  scope: "all" | "slots" | "table" | "live" | string[];
  deadSpinPct: number;
  winChancePct: number;
  maxMultiplier: number;
  rtp: number;
};

export type GameSettingsLogRowType = {
  id: string;
  actorId: string | null;
  actorUsername: string;
  scope: string;
  affectedCount: number;
  deadSpinPct: number;
  winChancePct: number;
  maxMultiplier: number;
  rtp: number;
  beforeSnapshot: string | null;
  afterSnapshot: string | null;
  createdAt: string;
};

export async function superBulkUpdateGameControls(input: BulkGameControlsInput): Promise<{
  ok: boolean;
  affectedCount: number;
  logId: string;
}> {
  const actor = await requirePermission("GAME_CONTROL_UPDATE");
  const db = getDb();

  // Validate percentages and limits
  const deadSpinPct = +Math.max(0, Math.min(100, input.deadSpinPct)).toFixed(2);
  const winChancePct = +Math.max(0, Math.min(100, input.winChancePct)).toFixed(2);
  const maxMultiplier = +Math.max(1, Math.min(100000, input.maxMultiplier)).toFixed(2);
  const rtp = +Math.max(50, Math.min(150, input.rtp)).toFixed(2);

  // 1. Fetch matching game control rows before update
  const allControls = await db.select().from(gameControls);

  let targetIds: string[] = [];
  if (Array.isArray(input.scope)) {
    targetIds = input.scope;
  } else if (input.scope === "all") {
    targetIds = allControls.map((c) => c.gameId);
  } else {
    const scopeStr = input.scope;
    targetIds = allControls
      .filter((c) => c.gameId.toLowerCase().includes(scopeStr.toLowerCase()))
      .map((c) => c.gameId);
  }

  if (targetIds.length === 0) {
    targetIds = allControls.map((c) => c.gameId);
  }

  const beforeControls = allControls.filter((c) => targetIds.includes(c.gameId));
  const beforeSnapshot = JSON.stringify(beforeControls);

  const engineConfigJson = JSON.stringify({
    deadSpinPct,
    winChancePct,
    maxMultiplier,
    rtp,
  });

  // 2. Perform bulk update
  await db
    .update(gameControls)
    .set({
      rtp: String(rtp),
      engineConfig: engineConfigJson,
    })
    .where(inArray(gameControls.gameId, targetIds));

  // 3. Fetch after snapshot
  const afterControls = await db
    .select()
    .from(gameControls)
    .where(inArray(gameControls.gameId, targetIds));
  const afterSnapshot = JSON.stringify(afterControls);

  // 4. Write immutable record in game_settings_logs
  const logId = newId();
  const scopeLabel = Array.isArray(input.scope) ? `custom (${targetIds.length} games)` : input.scope;

  await db.insert(gameSettingsLogs).values({
    id: logId,
    actorId: actor.id,
    actorUsername: actor.username,
    scope: scopeLabel,
    affectedCount: targetIds.length,
    deadSpinPct: String(deadSpinPct),
    winChancePct: String(winChancePct),
    maxMultiplier: String(maxMultiplier),
    rtp: String(rtp),
    beforeSnapshot,
    afterSnapshot,
  });

  // 5. Write audit log
  await writeAuditLog({
    actor,
    action: "super.bulk_game_update",
    summary: `Bulk updated ${targetIds.length} game controls (RTP: ${rtp}%, WinChance: ${winChancePct}%, DeadSpin: ${deadSpinPct}%)`,
    targetType: "game_controls",
    targetId: logId,
    meta: {
      scope: scopeLabel,
      affectedCount: targetIds.length,
      rtp,
      winChancePct,
      deadSpinPct,
      maxMultiplier,
    },
  });

  return { ok: true, affectedCount: targetIds.length, logId };
}

export async function listGameSettingsLogs(opts?: { limit?: number }): Promise<GameSettingsLogRowType[]> {
  await requirePermission("AUDIT_LOG_VIEW");
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);

  const rows = await db
    .select()
    .from(gameSettingsLogs)
    .orderBy(desc(gameSettingsLogs.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    actorId: r.actorId,
    actorUsername: r.actorUsername,
    scope: r.scope,
    affectedCount: Number(r.affectedCount),
    deadSpinPct: Number(r.deadSpinPct),
    winChancePct: Number(r.winChancePct),
    maxMultiplier: Number(r.maxMultiplier),
    rtp: Number(r.rtp),
    beforeSnapshot: r.beforeSnapshot,
    afterSnapshot: r.afterSnapshot,
    createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
  }));
}
