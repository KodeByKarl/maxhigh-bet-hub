/**
 * Audit log writer for Domain 2 admin actions & game audit logs.
 */
import { getDb } from "../db/client";
import { auditLogs } from "../db/schema";
import { newId } from "../session";
import type { PublicUser } from "@/lib/user";

export type AuditAction =
  | "admin.login"
  | "admin.logout"
  | "user.create"
  | "user.balance_adjust"
  | "user.role_change"
  | "game.bet"
  | "game.win";

export async function writeAuditLog(opts: {
  actor: Pick<PublicUser, "id" | "username"> | null;
  action: AuditAction | string;
  summary: string;
  targetType?: string | null;
  targetId?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      id: newId(),
      actorId: opts.actor?.id ?? null,
      actorUsername: opts.actor?.username ?? "system",
      action: opts.action,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      summary: opts.summary ? opts.summary.slice(0, 512) : "",
      meta: opts.meta ? JSON.stringify(opts.meta) : null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[AuditLog] Failed writing audit log:", err);
  }
}
