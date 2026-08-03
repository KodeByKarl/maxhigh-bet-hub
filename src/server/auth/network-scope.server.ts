/**
 * Downline user-id scope and chip hierarchy guards for agent / master_agent / superadmin.
 * null = unrestricted (admin / superadmin) for list scoping.
 */
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import type { PublicUser, UserRole } from "@/lib/user";

export type ChipTargetUser = {
  id: string;
  role: UserRole;
  parentAgentId: string | null;
  username?: string;
};

/** Alias for reusable list/read scoping — same rules as resolveNetworkUserIds. */
export async function scopeToDownline(
  actor: PublicUser,
  opts?: { playersOnly?: boolean },
): Promise<string[] | null> {
  return resolveNetworkUserIds(actor, opts);
}

/**
 * Downline user-id scope for agent / master_agent reports.
 * null = unrestricted (admin / superadmin)
 */
export async function resolveNetworkUserIds(
  actor: PublicUser,
  opts?: { playersOnly?: boolean },
): Promise<string[] | null> {
  if (actor.role === "superadmin" || actor.role === "admin") return null;

  const db = getDb();
  const playersOnly = opts?.playersOnly === true;

  if (actor.role === "agent") {
    // Agents may only view Players they personally created
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.parentAgentId, actor.id), eq(users.role, "player")));
    return rows.map((r) => r.id);
  }

  if (actor.role === "master_agent") {
    const agents = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.parentAgentId, actor.id), eq(users.role, "agent")));
    const agentIds = agents.map((a) => a.id);
    const uplineIds = [actor.id, ...agentIds];
    const downline = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(inArray(users.parentAgentId, uplineIds));

    // Master: own agents + players under self or those agents
    const playerIds = downline.filter((d) => d.role === "player").map((d) => d.id);
    if (playersOnly) {
      return playerIds;
    }
    return Array.from(new Set([...agentIds, ...playerIds]));
  }

  return [];
}

/**
 * Whether `targetId` is inside the actor's downline (or unrestricted).
 * Used for IDOR checks on single-resource reads.
 */
export async function isInDownline(actor: PublicUser, targetId: string): Promise<boolean> {
  if (actor.id === targetId) return true;
  const scope = await scopeToDownline(actor);
  if (scope === null) return true;
  return scope.includes(targetId);
}

type Queryable = {
  select: ReturnType<typeof getDb>["select"];
};

/**
 * Permission check for add/withdraw chips against ownership hierarchy.
 * Throws Forbidden (403-style) if outside hierarchy.
 */
export async function assertCanManageChips(
  actor: Pick<PublicUser, "id" | "role" | "username">,
  target: ChipTargetUser,
  dbOrTx?: Queryable,
): Promise<void> {
  if (target.id === actor.id) {
    throw new Error("Forbidden — cannot manage chips on your own account");
  }

  if (actor.role === "superadmin") {
    if (target.role === "master_agent" || target.role === "agent" || target.role === "player") {
      return;
    }
    throw new Error(
      `Forbidden — Super Admin can only manage chips for Master Agents, Agents, and Players (got '${target.role}')`,
    );
  }

  if (actor.role === "agent") {
    if (target.role !== "player" || target.parentAgentId !== actor.id) {
      throw new Error("Forbidden — Agents can only manage chips for Players they created");
    }
    return;
  }

  if (actor.role === "master_agent") {
    const directDownline = target.parentAgentId === actor.id;
    if (directDownline) {
      if (target.role === "agent" || target.role === "player") return;
      throw new Error("Forbidden — Master Agent can only manage Agents and Players in their downline");
    }

    let underMyAgent = false;
    if (target.parentAgentId) {
      const q = dbOrTx ?? getDb();
      const uplineRows = await q.select().from(users).where(eq(users.id, target.parentAgentId)).limit(1);
      underMyAgent = uplineRows[0]?.parentAgentId === actor.id;
    }
    if (underMyAgent && target.role === "player") return;

    throw new Error(
      "Forbidden — Master Agent can only withdraw/add chips from Agents they created and Players under their downline",
    );
  }

  // Legacy admin: allow unrestricted float-backed adjusts (existing behavior)
  if (actor.role === "admin") return;

  throw new Error("Forbidden — insufficient privileges to manage chips");
}
