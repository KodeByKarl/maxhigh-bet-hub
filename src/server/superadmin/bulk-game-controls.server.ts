import { desc, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { gameControls, gameSettingsLogs } from "../db/schema";
import { newId } from "../session";
import { writeAuditLog } from "../admin/audit.server";
import { requirePermission } from "../auth/rbac.server";
import { slotGames, type GameCategory } from "@/lib/games";

export type BulkGameControlsInput = {
  scope: "all" | "slots" | "cards" | "fishing" | "table" | "live";
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

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {};
  } catch {
    return {};
  }
}

/** Merge global outcome sliders into each game's full engine JSON (never wipe symbols / FS math). */
export function mergeOutcomeIntoEngineConfig(
  existing: string | null | undefined,
  patch: { deadSpinPct: number; winChancePct: number; maxMultiplier: number; rtp: number },
): string {
  const cfg = parseJsonObject(existing);
  cfg.deadSpinChancePercent = patch.deadSpinPct;
  cfg.deadSpinPct = patch.deadSpinPct;
  cfg.winChancePct = patch.winChancePct;
  cfg.winChancePercent = patch.winChancePct;
  cfg.maxMultiplier = patch.maxMultiplier;
  cfg.maxWinMult = patch.maxMultiplier;
  cfg.targetRtp = patch.rtp;
  cfg.rtpTarget = patch.rtp;
  return JSON.stringify(cfg);
}

export type BulkOutcomeSnapshot = {
  deadSpinPct: number;
  winChancePct: number;
  maxMultiplier: number;
  rtp: number;
  /** Where the displayed values came from */
  source: "live" | "audit_log" | "default";
  configuredGameCount: number;
  lastAppliedAt: string | null;
};

function readNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function readOutcomeFromEngine(
  raw: string | null | undefined,
  rtpLabel?: string | null,
): Partial<BulkOutcomeSnapshot> | null {
  const cfg = parseJsonObject(raw);
  const deadSpinPct = readNum(cfg.deadSpinChancePercent ?? cfg.deadSpinPct);
  const winChancePct = readNum(cfg.winChancePct ?? cfg.winChancePercent);
  const maxMultiplier = readNum(cfg.maxWinMult ?? cfg.maxMultiplier);
  let rtp = readNum(cfg.targetRtp ?? cfg.rtpTarget);
  if (rtp == null && rtpLabel) {
    const m = rtpLabel.match(/([\d.]+)/);
    if (m) rtp = readNum(m[1]);
  }
  if (deadSpinPct == null && winChancePct == null && maxMultiplier == null && rtp == null) {
    return null;
  }
  return {
    deadSpinPct: deadSpinPct ?? undefined,
    winChancePct: winChancePct ?? undefined,
    maxMultiplier: maxMultiplier ?? undefined,
    rtp: rtp ?? undefined,
  } as Partial<BulkOutcomeSnapshot>;
}

/** Pick the most common rounded value in a list (live DB consensus). */
function modeRounded(values: number[], decimals = 0): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  for (const v of values) {
    const key = +v.toFixed(decimals);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

const PANEL_DEFAULTS: BulkOutcomeSnapshot = {
  deadSpinPct: 40,
  winChancePct: 60,
  maxMultiplier: 5000,
  rtp: 96,
  source: "default",
  configuredGameCount: 0,
  lastAppliedAt: null,
};

/** Read the sliders from live game_controls (not just audit history). */
export async function getCurrentBulkOutcomeSettings(): Promise<BulkOutcomeSnapshot> {
  await requirePermission("GAME_CONTROL_UPDATE");
  const db = getDb();

  const [latestLog] = await db
    .select({ createdAt: gameSettingsLogs.createdAt })
    .from(gameSettingsLogs)
    .orderBy(desc(gameSettingsLogs.createdAt))
    .limit(1);

  const rows = await db
    .select({ engineConfig: gameControls.engineConfig, rtp: gameControls.rtp })
    .from(gameControls);

  const deads: number[] = [];
  const wins: number[] = [];
  const maxes: number[] = [];
  const rtps: number[] = [];
  let configuredGameCount = 0;

  for (const row of rows) {
    const parsed = readOutcomeFromEngine(row.engineConfig, row.rtp);
    if (!parsed) continue;
    configuredGameCount++;
    if (parsed.deadSpinPct != null) deads.push(parsed.deadSpinPct);
    if (parsed.winChancePct != null) wins.push(parsed.winChancePct);
    if (parsed.maxMultiplier != null) maxes.push(parsed.maxMultiplier);
    if (parsed.rtp != null) rtps.push(parsed.rtp);
  }

  if (configuredGameCount === 0) {
    return {
      ...PANEL_DEFAULTS,
      lastAppliedAt: latestLog?.createdAt?.toISOString?.() ?? null,
    };
  }

  return {
    deadSpinPct: modeRounded(deads, 0) ?? PANEL_DEFAULTS.deadSpinPct,
    winChancePct: modeRounded(wins, 0) ?? PANEL_DEFAULTS.winChancePct,
    maxMultiplier: modeRounded(maxes, 0) ?? PANEL_DEFAULTS.maxMultiplier,
    rtp: modeRounded(rtps, 1) ?? PANEL_DEFAULTS.rtp,
    source: "live",
    configuredGameCount,
    lastAppliedAt: latestLog?.createdAt?.toISOString?.() ?? null,
  };
}

  if (scope === "all") return null;
  if (scope === "slots") return "slot";
  if (scope === "cards" || scope === "table" || scope === "live") return "cards";
  if (scope === "fishing") return "fishing";
  return null;
}

export async function superBulkUpdateGameControls(input: BulkGameControlsInput): Promise<{
  ok: boolean;
  affectedCount: number;
  logId: string;
  deadSpinPct: number;
  winChancePct: number;
  maxMultiplier: number;
  rtp: number;
}> {
  const actor = await requirePermission("GAME_CONTROL_UPDATE");
  const db = getDb();

  const deadSpinPct = +Math.max(0, Math.min(100, input.deadSpinPct)).toFixed(2);
  const winChancePct = +Math.max(0, Math.min(100, input.winChancePct)).toFixed(2);
  const maxMultiplier = +Math.max(1, Math.min(100000, input.maxMultiplier)).toFixed(2);
  const rtp = +Math.max(50, Math.min(150, input.rtp)).toFixed(2);

  const category = catalogCategoryForScope(input.scope);
  const targets = slotGames.filter((g) => (category ? g.category === category : true));
  if (targets.length === 0) {
    throw new Error("No games in that category");
  }

  const existingRows = await db.select().from(gameControls);
  const byId = new Map(existingRows.map((r) => [r.gameId, r]));
  const beforeSnapshot = JSON.stringify(
    targets.map((g) => {
      const row = byId.get(g.id);
      return row
        ? { gameId: row.gameId, rtp: row.rtp, engineConfig: row.engineConfig }
        : { gameId: g.id, rtp: null, engineConfig: null };
    }),
  );

  const patch = { deadSpinPct, winChancePct, maxMultiplier, rtp };

  for (const game of targets) {
    const existing = byId.get(game.id);
    const engineConfig = mergeOutcomeIntoEngineConfig(existing?.engineConfig, patch);
    const rtpLabel = `${rtp}%`;

    if (!existing) {
      await db.insert(gameControls).values({
        gameId: game.id,
        enabled: "yes",
        featured: "no",
        sortOrder: 0,
        tag: game.tag ?? null,
        rtp: rtpLabel,
        volatility: game.volatility,
        minBet: game.minBet,
        maxBet: game.maxBet,
        engineConfig,
      });
    } else {
      await db
        .update(gameControls)
        .set({
          rtp: rtpLabel,
          engineConfig,
        })
        .where(eq(gameControls.gameId, game.id));
    }
  }

  const afterRows = await db.select().from(gameControls);
  const afterById = new Map(afterRows.map((r) => [r.gameId, r]));
  const afterSnapshot = JSON.stringify(
    targets.map((g) => {
      const row = afterById.get(g.id);
      return row
        ? { gameId: row.gameId, rtp: row.rtp, engineConfig: row.engineConfig }
        : { gameId: g.id, rtp: null, engineConfig: null };
    }),
  );

  const logId = newId();
  const scopeLabel = input.scope;

  await db.insert(gameSettingsLogs).values({
    id: logId,
    actorId: actor.id,
    actorUsername: actor.username,
    scope: scopeLabel,
    affectedCount: targets.length,
    deadSpinPct: String(deadSpinPct),
    winChancePct: String(winChancePct),
    maxMultiplier: String(maxMultiplier),
    rtp: String(rtp),
    beforeSnapshot,
    afterSnapshot,
  });

  await writeAuditLog({
    actor,
    action: "super.bulk_game_update",
    summary: `Bulk updated ${targets.length} games (RTP: ${rtp}%, WinChance: ${winChancePct}%, DeadSpin: ${deadSpinPct}%)`,
    targetType: "game_controls",
    targetId: logId,
    meta: {
      scope: scopeLabel,
      affectedCount: targets.length,
      rtp,
      winChancePct,
      deadSpinPct,
      maxMultiplier,
    },
  });

  return {
    ok: true,
    affectedCount: targets.length,
    logId,
    deadSpinPct,
    winChancePct,
    maxMultiplier,
    rtp,
  };
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
