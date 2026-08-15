/**
 * Admin portal server logic (Domain 2).
 * Keep all admin-only DB operations here — not in player services.
 */
import { eq, desc, sql, like, or, and, inArray } from "drizzle-orm";
import { hash } from "bcryptjs";
import { getDb } from "../db/client";
import { auditLogs, liveWins, transactions, users } from "../db/schema";
import type { PublicUser, UserRole } from "@/lib/user";
import type { AdminAuditLogRow, AdminDashboardStats, AdminUserRow, AdminTransactionRow, AdminDayPulse, WinLoseSummary, WinLoseByLevelRow, WinLoseByProductRow } from "@/lib/admin-types";
import { destroyUserSessions, money, newId, requireAdmin, toPublicUser } from "../session";
import { writeAuditLog } from "./audit.server";
import { requirePermission } from "../auth/rbac.server";
import { assertCanManageChips, scopeToDownline, isInDownline } from "../auth/network-scope.server";

export type { AdminDashboardStats, AdminUserRow, AdminAuditLogRow, AdminTransactionRow, AdminDayPulse, WinLoseSummary, WinLoseByLevelRow, WinLoseByProductRow };

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function startOfWeekMonday(ref = new Date()) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

function dayBounds(dayIndex: number) {
  const idx = Math.min(6, Math.max(0, Math.floor(dayIndex)));
  const start = startOfWeekMonday();
  start.setDate(start.getDate() + idx);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end, idx };
}

function formatPhp(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function fetchAdminDashboard(): Promise<AdminDashboardStats> {
  const actor = await requirePermission("DASHBOARD_VIEW");
  const db = getDb();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [actorRow] = await db.select().from(users).where(eq(users.id, actor.id)).limit(1);
  const agentBalance = actorRow ? Number(actorRow.balance) : actor.balance;

  // Count all players on the platform (superadmin handles staff/admin counts)
  const [playerCountRow] = await db
    .select({
      totalPlayers: sql<number>`sum(case when ${users.role} = 'player' then 1 else 0 end)`,
    })
    .from(users);

  let downlinePlayers = Number(playerCountRow?.totalPlayers ?? 0);
  if (actor.role === "agent") {
    const [own] = await db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.parentAgentId, actor.id), eq(users.role, "player")));
    downlinePlayers = Number(own?.n ?? 0);
  } else if (actor.role === "master_agent") {
    const networkIds = await scopeToDownline(actor, { playersOnly: true });
    downlinePlayers = networkIds?.length ?? 0;
  }

  // All player bets & wins platform-wide
  const [betRow] = await db
    .select({
      totalBets: sql<number>`count(*)`,
      betVolume: sql<string>`coalesce(sum(abs(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.type, "bet"));

  const [winRow] = await db
    .select({
      winVolume: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.type, "win"));

  const [liveWinRow] = await db
    .select({
      biggest: sql<string>`coalesce(max(${liveWins.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(liveWins)
    .where(sql`${liveWins.createdAt} >= ${dayAgo}`);

  const totalPlayers = Number(playerCountRow?.totalPlayers ?? 0);
  const totalBets = Number(betRow?.totalBets ?? 0);
  const betVolume = Number(betRow?.betVolume ?? 0);
  const winVolume = Number(winRow?.winVolume ?? 0);
  const netEarnings = +(betVolume - winVolume).toFixed(2);
  const biggestWin24h = Number(liveWinRow?.biggest ?? 0);
  const liveWins24h = Number(liveWinRow?.count ?? 0);

  return {
    totalUsers: totalPlayers,   // admin sees players only; admin/staff counts are superadmin scope
    totalPlayers,
    totalAdmins: 0,             // hidden from admin — superadmin only
    totalBets,
    betVolume,
    winVolume,
    netEarnings,
    biggestWin24h,
    liveWins24h,
    agentBalance,
    agentUsername: actor.username,
    agentRole: actor.role,
    downlinePlayers,
    labels: {
      totalUsers: totalPlayers.toLocaleString("en-PH"),
      totalPlayers: totalPlayers.toLocaleString("en-PH"),
      totalAdmins: "—",
      totalBets: totalBets.toLocaleString("en-PH"),
      betVolume: formatPhp(betVolume),
      winVolume: formatPhp(winVolume),
      netEarnings: formatPhp(netEarnings),
      biggestWin24h: formatPhp(biggestWin24h),
      liveWins24h: liveWins24h.toLocaleString("en-PH"),
      agentBalance: formatPhp(agentBalance),
    },
  };
}

export async function listAdminUsers(opts?: {
  q?: string;
  limit?: number;
}): Promise<AdminUserRow[]> {
  const actor = await requirePermission("USER_LIST");
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
  const q = opts?.q?.trim();

  const filters = [];
  if (q) {
    filters.push(
      or(
        like(users.email, `%${q}%`),
        like(users.username, `%${q}%`),
        like(users.displayName, `%${q}%`),
      ),
    );
  }

  // Agents only see their direct players; master agents see their network.
  const networkIds = await scopeToDownline(actor);
  if (networkIds !== null) {
    if (networkIds.length === 0) return [];
    filters.push(inArray(users.id, networkIds));
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;
  const rows = whereClause
    ? await db.select().from(users).where(whereClause).orderBy(desc(users.createdAt)).limit(limit)
    : await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);

  const uplineIds = Array.from(new Set(rows.map((u) => u.parentAgentId).filter(Boolean))) as string[];
  const agentMap = new Map<string, string>();

  if (uplineIds.length > 0) {
    const agents = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(sql`${users.id} in (${sql.join(uplineIds.map((id) => sql`${id}`), sql`, `)})`);
    for (const a of agents) {
      agentMap.set(a.id, a.displayName || a.username);
    }
  }

  return rows.map((u) => ({
    ...toPublicUser(u),
    isLocked: u.isLocked === "yes" || (u.failedAttempts ?? 0) >= 3 || Boolean(u.lockedUntil && new Date() < new Date(u.lockedUntil)),
    failedAttempts: u.failedAttempts ?? 0,
    parentAgentId: u.parentAgentId ?? null,
    agentName: u.parentAgentId ? (agentMap.get(u.parentAgentId) ?? "System / Direct") : "System / Direct",
    createdAt: u.createdAt?.toISOString?.() ?? String(u.createdAt),
  }));
}

export async function adminUpdateUser(data: {
  userId: string;
  displayName?: string;
  email?: string;
  password?: string;
}): Promise<PublicUser> {
  const actor = await requireAdmin();
  const db = getDb();

  const rows = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const user = rows[0];
  if (!user) throw new Error("User not found");

  if (!(await isInDownline(actor, user.id))) {
    throw new Error("Forbidden — user is outside your downline");
  }

  const updates: Record<string, unknown> = {};
  if (data.displayName !== undefined) updates.displayName = data.displayName.trim() || null;
  if (data.email !== undefined) updates.email = data.email.trim().toLowerCase() || null;
  if (data.password && data.password.trim().length >= 6) {
    updates.passwordHash = await hash(data.password.trim(), 10);
  }

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, user.id));
    await writeAuditLog({
      actor,
      action: "user.update",
      summary: `Updated profile for @${user.username}`,
      targetType: "user",
      targetId: user.id,
      meta: updates,
    });
  }

  const updatedRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return toPublicUser(updatedRows[0]!);
}

export async function adminCreatePlayer(data: {
  email?: string;
  username: string;
  password: string;
  balance?: number;
  role?: UserRole;
  displayName?: string;
  publicUserId?: string;
}): Promise<PublicUser> {
  const actor = await requirePermission("USER_CREATE");
  const role: UserRole = data.role ?? "player";

  // Role create matrix:
  // - superadmin: any role
  // - agent / master_agent: player or agent only (domain downline)
  // - admin: players only
  if (actor.role === "superadmin") {
    // ok
  } else if (actor.role === "agent" || actor.role === "master_agent") {
    if (role !== "player" && role !== "agent") {
      throw new Error("You can only create Player or Agent accounts");
    }
  } else if (role !== "player") {
    throw new Error("Only superadmin can create staff accounts");
  }

  const db = getDb();
  const initialBalance = data.balance ?? 0;
  if (!Number.isFinite(initialBalance) || initialBalance < 0) {
    throw new Error("Invalid initial balance");
  }

  const id = newId();
  const email = data.email?.trim().toLowerCase() || null;
  const username = data.username.trim().toLowerCase();
  const publicUserId = (data.publicUserId?.trim() || username).toLowerCase();
  if (publicUserId.length < 3) throw new Error("User ID must be at least 3 characters");
  if (!/^[a-z0-9_]+$/.test(publicUserId)) throw new Error("User ID must be letters, numbers, or _");

  const [existingUsername] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existingUsername) throw new Error("Username already exists");
  const [existingPublicId] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.publicUserId, publicUserId))
    .limit(1);
  if (existingPublicId) throw new Error("User ID already exists");

  // Hash outside the transaction so we don't hold row locks during bcrypt.
  const passwordHash = await hash(data.password, 10);
  const { writeLedgerDelta } = await import("../wallet.server");

  let created: PublicUser;
  try {
    created = await db.transaction(async (tx) => {
      // Agent/master_agent: deduct opening chips atomically with ledger + user insert.
      if (initialBalance > 0 && actor.role !== "superadmin") {
        await writeLedgerDelta(tx, {
          userId: actor.id,
          username: actor.username,
          delta: -initialBalance,
          type: "adjust",
          game: "ChipTransfer",
          note: `Initial chips for @${username}`,
        });
      }

      await tx.insert(users).values({
        id,
        publicUserId,
        email,
        username,
        passwordHash,
        // Start at 0; credit via ledger below so balance + transactions stay consistent.
        balance: money(0),
        role,
        displayName: data.displayName?.trim() || null,
        parentAgentId: actor.id,
      });

      if (initialBalance > 0) {
        await writeLedgerDelta(tx, {
          userId: id,
          username,
          delta: initialBalance,
          type: "adjust",
          game: "ChipTransfer",
          note: `Opening balance from @${actor.username}`,
        });
      }

      const rows = await tx.select().from(users).where(eq(users.id, id)).limit(1);
      return toPublicUser(rows[0]!);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Insufficient balance")) {
      throw new Error(
        `Insufficient wallet balance. You need ₱${initialBalance.toFixed(2)} to create this account.`,
      );
    }
    if (msg.includes("Duplicate") || msg.includes("already exists")) {
      throw new Error("Username or User ID already exists");
    }
    throw err instanceof Error ? err : new Error("Username or User ID already exists");
  }

  await writeAuditLog({
    actor,
    action: "user.create",
    summary: `Created ${created.role} account @${created.username} with ₱${initialBalance.toFixed(2)} initial balance`,
    targetType: "user",
    targetId: created.id,
    meta: {
      email: created.email,
      username: created.username,
      publicUserId: created.publicUserId,
      role: created.role,
      balance: created.balance,
      deductedFromAgent: actor.role === "superadmin" ? null : actor.username,
    },
  });

  // Agent earns Master Agent by creating another Agent under their domain.
  let agentPromoted = false;
  if (created.role === "agent" && actor.role === "agent") {
    await db
      .update(users)
      .set({ role: "master_agent" })
      .where(and(eq(users.id, actor.id), eq(users.role, "agent")));
    agentPromoted = true;
    await writeAuditLog({
      actor,
      action: "agent.promoted",
      summary: `Agent @${actor.username} earned Master Agent after creating Agent @${created.username}`,
      targetType: "user",
      targetId: actor.id,
      meta: {
        from: "agent",
        to: "master_agent",
        reason: "created_sub_agent",
        subAgentId: created.id,
        subAgentUsername: created.username,
      },
    });
  }

  return { ...created, agentPromoted };
}

export async function adminAdjustUserBalance(data: {
  userId: string;
  delta: number;
  note?: string;
  confirmPassword?: string;
}): Promise<PublicUser> {
  const actor = await requirePermission("USER_ADJUST_BALANCE", { targetType: "user", targetId: data.userId });
  if (!Number.isFinite(data.delta) || data.delta === 0) {
    throw new Error("Invalid amount");
  }

  if (actor.role === "superadmin") {
    const { verifySuperadminChipPassword } = await import("../superadmin/services.server");
    await verifySuperadminChipPassword(actor.id, data.confirmPassword);
  }

  const db = getDb();
  const unlimited = actor.role === "superadmin";

  const result = await db.transaction(async (tx) => {
    const targetRows = await tx.select().from(users).where(eq(users.id, data.userId)).limit(1);
    const target = targetRows[0];
    if (!target) throw new Error("User not found");

    await assertCanManageChips(
      actor,
      {
        id: target.id,
        role: target.role,
        parentAgentId: target.parentAgentId ?? null,
        username: target.username,
      },
      tx,
    );

    const actorRows = await tx.select().from(users).where(eq(users.id, actor.id)).limit(1);
    const actorUser = actorRows[0];
    if (!actorUser) throw new Error("Actor not found");

    // Non-superadmin: add = deduct from actor wallet; withdraw = credit actor wallet
    let actorNextBalance = Number(actorUser.balance);
    if (!unlimited) {
      if (data.delta > 0 && Number(actorUser.balance) < data.delta) {
        throw new Error(
          `Insufficient chip balance. You have ₱${Number(actorUser.balance).toFixed(2)}, but need ₱${data.delta.toFixed(2)} to add chips.`,
        );
      }
      actorNextBalance = +(Number(actorUser.balance) - data.delta).toFixed(2);
      if (actorNextBalance < 0) {
        throw new Error(`Insufficient chip balance. You have ₱${Number(actorUser.balance).toFixed(2)}.`);
      }
      await tx.update(users).set({ balance: money(actorNextBalance) }).where(eq(users.id, actor.id));
      await tx.insert(transactions).values({
        id: newId(),
        userId: actor.id,
        type: "adjust",
        amount: money(-data.delta),
        balanceAfter: money(actorNextBalance),
        game: "ChipTransfer",
        note:
          data.note?.trim() ||
          (data.delta > 0
            ? `Chip transfer to @${target.username}`
            : `Chip withdrawal from @${target.username}`),
      });
    }

    const current = Number(target.balance);
    const next = +(current + data.delta).toFixed(2);
    if (next < 0) {
      throw new Error(
        `@${target.username} only has ₱${current.toFixed(2)} — cannot withdraw ₱${Math.abs(data.delta).toFixed(2)}.`,
      );
    }

    await tx.update(users).set({ balance: money(next) }).where(eq(users.id, target.id));
    await tx.insert(transactions).values({
      id: newId(),
      userId: target.id,
      type: "adjust",
      amount: money(data.delta),
      balanceAfter: money(next),
      game: "ChipTransfer",
      note: data.note?.trim() || `Chip transfer from @${actor.username}`,
    });

    return {
      ...target,
      balance: money(next),
      previousBalance: current,
      actorNextBalance,
    };
  });

  const updated = toPublicUser(result);
  const timestamp = new Date().toISOString();
  await writeAuditLog({
    actor,
    action: "user.balance_adjust",
    summary: `@${actor.username} ${data.delta > 0 ? "added" : "withdrew"} ₱${Math.abs(data.delta).toFixed(2)} chips ${data.delta > 0 ? "to" : "from"} @${result.username}`,
    targetType: "user",
    targetId: result.id,
    meta: {
      actorId: actor.id,
      targetId: result.id,
      amount: Math.abs(data.delta),
      delta: data.delta,
      timestamp,
      role: actor.role,
      previousBalance: result.previousBalance,
      newBalance: Number(result.balance),
      note: data.note ?? null,
      fromUsername: actor.username,
      fromRole: actor.role,
      unlimited,
      actorBalanceAfter: unlimited ? null : result.actorNextBalance,
    },
  });

  return updated;
}

export async function adminLockUser(data: {
  userId: string;
  reason?: string;
}): Promise<PublicUser> {
  const actor = await requirePermission("USER_LOCK", { targetType: "user", targetId: data.userId });
  const db = getDb();
  const now = new Date();

  const rows = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const user = rows[0];
  if (!user) throw new Error("User not found");

  const lockReason = data.reason?.trim() || "Locked by admin";

  await db
    .update(users)
    .set({
      isLocked: "yes",
      lockedAt: now,
      lockedBy: actor.id,
      lockReason,
      lockedUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    })
    .where(eq(users.id, user.id));

  // Force logout: immediately terminate all active sessions for this user
  const terminatedCount = await destroyUserSessions(user.id);

  await writeAuditLog({
    actor,
    action: "user.lock",
    summary: `Locked account @${user.username}. Reason: ${lockReason} (${terminatedCount} sessions terminated)`,
    targetType: "user",
    targetId: user.id,
    meta: {
      username: user.username,
      isLocked: true,
      lockedBy: actor.username,
      lockReason,
      terminatedSessionsCount: terminatedCount,
    },
  });

  const updatedRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return toPublicUser(updatedRows[0]!);
}

export async function adminUnlockUser(data: {
  userId: string;
}): Promise<PublicUser> {
  const actor = await requirePermission("USER_UNLOCK", { targetType: "user", targetId: data.userId });
  const db = getDb();
  const now = new Date();

  const rows = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const user = rows[0];
  if (!user) throw new Error("User not found");

  await db
    .update(users)
    .set({
      isLocked: "no",
      failedAttempts: 0,
      lockedUntil: null,
      unlockedAt: now,
      unlockedBy: actor.id,
    })
    .where(eq(users.id, user.id));

  await writeAuditLog({
    actor,
    action: "user.unlock",
    summary: `Unlocked account @${user.username}`,
    targetType: "user",
    targetId: user.id,
    meta: {
      username: user.username,
      isLocked: false,
      unlockedBy: actor.username,
    },
  });

  const updatedRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return toPublicUser(updatedRows[0]!);
}

export async function adminForceLogoutUser(data: {
  userId: string;
}): Promise<{ ok: boolean; username: string; terminatedSessionsCount: number }> {
  const actor = await requirePermission("USER_FORCE_LOGOUT", { targetType: "user", targetId: data.userId });
  const db = getDb();

  const rows = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const user = rows[0];
  if (!user) throw new Error("User not found");

  const terminatedCount = await destroyUserSessions(user.id);

  await writeAuditLog({
    actor,
    action: "user.force_logout",
    summary: `Invalidated all active sessions for @${user.username} (${terminatedCount} session(s) destroyed)`,
    targetType: "user",
    targetId: user.id,
    meta: {
      username: user.username,
      terminatedSessionsCount: terminatedCount,
      performedBy: actor.username,
    },
  });

  return { ok: true, username: user.username, terminatedSessionsCount: terminatedCount };
}

export async function adminResetFailedAttempts(data: {
  userId: string;
}): Promise<{ ok: boolean; username: string; failedAttempts: number }> {
  const actor = await requirePermission("USER_RESET_FAILED", { targetType: "user", targetId: data.userId });
  const db = getDb();

  const rows = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const user = rows[0];
  if (!user) throw new Error("User not found");

  await db
    .update(users)
    .set({ failedAttempts: 0 })
    .where(eq(users.id, user.id));

  await writeAuditLog({
    actor,
    action: "user.reset_failed_attempts",
    summary: `Reset failed login attempts counter to 0 for @${user.username}`,
    targetType: "user",
    targetId: user.id,
    meta: {
      username: user.username,
      previousFailedAttempts: user.failedAttempts ?? 0,
      resetBy: actor.username,
    },
  });

  return { ok: true, username: user.username, failedAttempts: 0 };
}

export async function adminToggleUserLock(data: {
  userId: string;
  lock?: boolean;
  reason?: string;
}): Promise<PublicUser> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const user = rows[0];
  if (!user) throw new Error("User not found");

  const currentlyLocked = user.isLocked === "yes" || (user.failedAttempts ?? 0) >= 3;
  const nextLockState = data.lock !== undefined ? data.lock : !currentlyLocked;

  if (nextLockState) {
    return adminLockUser({ userId: data.userId, reason: data.reason });
  } else {
    return adminUnlockUser({ userId: data.userId });
  }
}

export async function recordAdminLogin(actor: PublicUser) {
  await writeAuditLog({
    actor,
    action: "admin.login",
    summary: `${actor.username} signed in to admin portal`,
    targetType: "session",
    targetId: actor.id,
  });
}

export async function listAdminAuditLogs(opts?: {
  q?: string;
  action?: string;
  limit?: number;
  /** Filter to a day this week: 0=Mon … 6=Sun */
  dayIndex?: number;
  /**
   * system = staff/ops only (no player bet/win noise)
   * all = everything in audit_logs
   */
  scope?: "system" | "all";
}): Promise<AdminAuditLogRow[]> {
  await requirePermission("AUDIT_LOG_VIEW");
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 300);
  const q = opts?.q?.trim();
  const action = opts?.action?.trim();
  const scope = opts?.scope ?? "all";

  const filters = [];
  if (scope === "system") {
    // Player gameplay belongs in Player ledger (transactions), not System actions
    filters.push(
      sql`${auditLogs.action} NOT IN ('game.bet', 'game.win', 'game.adjust')`,
    );
  }
  if (q) {
    filters.push(
      or(
        like(auditLogs.actorUsername, `%${q}%`),
        like(auditLogs.summary, `%${q}%`),
        like(auditLogs.action, `%${q}%`),
      ),
    );
  }
  if (action) {
    filters.push(eq(auditLogs.action, action));
  }
  if (opts?.dayIndex !== undefined && opts.dayIndex !== null) {
    const { start, end } = dayBounds(opts.dayIndex);
    filters.push(and(sql`${auditLogs.createdAt} >= ${start}`, sql`${auditLogs.createdAt} < ${end}`));
  }

  const rows =
    filters.length > 0
      ? await db
          .select()
          .from(auditLogs)
          .where(and(...filters))
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit)
      : await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);

  return rows.map((r) => ({
    id: r.id,
    actorId: r.actorId,
    actorUsername: r.actorUsername,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    summary: r.summary,
    meta: r.meta,
    createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
  }));
}

export async function fetchAdminDayPulse(dayIndex: number): Promise<AdminDayPulse> {
  await requirePermission("DASHBOARD_VIEW");
  const db = getDb();
  const { start, end, idx } = dayBounds(dayIndex);

  const [txRow] = await db
    .select({
      bets: sql<number>`sum(case when ${transactions.type} = 'bet' then 1 else 0 end)`,
      wins: sql<number>`sum(case when ${transactions.type} = 'win' then 1 else 0 end)`,
      betVolume: sql<string>`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
      winVolume: sql<string>`coalesce(sum(case when ${transactions.type} = 'win' then abs(${transactions.amount}) else 0 end), 0)`,
      playersActive: sql<number>`count(distinct ${transactions.userId})`,
    })
    .from(transactions)
    .where(and(sql`${transactions.createdAt} >= ${start}`, sql`${transactions.createdAt} < ${end}`));

  const [sessionRow] = await db
    .select({
      sessions: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, "game.session_open"),
        sql`${auditLogs.createdAt} >= ${start}`,
        sql`${auditLogs.createdAt} < ${end}`,
      ),
    );

  const bets = Number(txRow?.bets ?? 0);
  const wins = Number(txRow?.wins ?? 0);
  const betVolume = Number(txRow?.betVolume ?? 0);
  const winVolume = Number(txRow?.winVolume ?? 0);
  const playersActive = Number(txRow?.playersActive ?? 0);
  const sessions = Number(sessionRow?.sessions ?? 0);

  const dateKey = start.toISOString().slice(0, 10);
  const dateLabel = start.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return {
    dayIndex: idx,
    label: WEEK_LABELS[idx],
    dateKey,
    dateLabel,
    bets,
    wins,
    betVolume,
    winVolume,
    sessions,
    playersActive,
    labels: {
      bets: bets.toLocaleString("en-PH"),
      wins: wins.toLocaleString("en-PH"),
      betVolume: formatPhp(betVolume),
      winVolume: formatPhp(winVolume),
      sessions: sessions.toLocaleString("en-PH"),
      playersActive: playersActive.toLocaleString("en-PH"),
    },
  };
}

function txLabel(type: AdminTransactionRow["type"], amount: number): string {
  if (type === "bet") return "Bet / Loss";
  if (type === "win") return "Win";
  if (type === "deposit") return "Deposit";
  if (type === "withdraw") return "Withdraw";
  if (type === "jackpot") return "Jackpot";
  return amount >= 0 ? "Credit" : "Debit";
}

export async function listAdminTransactions(opts?: {
  q?: string;
  type?: AdminTransactionRow["type"] | "all" | "fund" | "game";
  game?: string;
  limit?: number;
}): Promise<AdminTransactionRow[]> {
  const actor = await requirePermission("TRANSACTION_LIST");
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);
  const q = opts?.q?.trim();
  const game = opts?.game?.trim();
  const networkIds = await scopeToDownline(actor, { playersOnly: true });

  const filters = [];
  if (networkIds !== null) {
    if (networkIds.length === 0) return [];
    filters.push(inArray(transactions.userId, networkIds));
  }
  if (opts?.type === "fund") {
    filters.push(or(eq(transactions.type, "deposit"), eq(transactions.type, "withdraw"))!);
  } else if (opts?.type === "game") {
    filters.push(
      or(
        eq(transactions.type, "bet"),
        eq(transactions.type, "win"),
        eq(transactions.type, "jackpot"),
      )!,
    );
  } else if (opts?.type && opts.type !== "all") {
    filters.push(eq(transactions.type, opts.type));
  }
  if (game) filters.push(like(transactions.game, `%${game}%`));
  if (q) {
    filters.push(
      or(
        like(users.username, `%${q}%`),
        like(users.email, `%${q}%`),
        like(transactions.note, `%${q}%`),
        like(transactions.game, `%${q}%`),
      ),
    );
  }

  const base = db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      username: users.username,
      email: users.email,
      type: transactions.type,
      amount: transactions.amount,
      balanceAfter: transactions.balanceAfter,
      game: transactions.game,
      note: transactions.note,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .innerJoin(users, eq(transactions.userId, users.id));

  const rows =
    filters.length > 0
      ? await base.where(and(...filters)).orderBy(desc(transactions.createdAt)).limit(limit)
      : await base.orderBy(desc(transactions.createdAt)).limit(limit);

  return rows.map((r) => {
    const amount = Number(r.amount);
    const type = r.type as AdminTransactionRow["type"];
    return {
      id: r.id,
      userId: r.userId,
      username: r.username,
      email: r.email,
      type,
      amount,
      absAmount: Math.abs(amount),
      balanceAfter: Number(r.balanceAfter),
      game: r.game,
      note: r.note,
      label: txLabel(type, amount),
      createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
    };
  });
}

export async function fetchWinLoseSummary(): Promise<WinLoseSummary> {
  const actor = await requirePermission("REPORTS_VIEW");
  const db = getDb();
  const networkIds = await scopeToDownline(actor, { playersOnly: true });

  if (networkIds !== null && networkIds.length === 0) {
    return {
      betVolume: 0,
      winVolume: 0,
      net: 0,
      depositVolume: 0,
      withdrawVolume: 0,
      betCount: 0,
      winCount: 0,
    };
  }

  const scope = networkIds !== null ? inArray(transactions.userId, networkIds) : undefined;

  const [row] = await db
    .select({
      betVolume: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
      winVolume: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then ${transactions.amount} else 0 end), 0)`,
      depositVolume: sql<number>`coalesce(sum(case when ${transactions.type} = 'deposit' then abs(${transactions.amount}) else 0 end), 0)`,
      withdrawVolume: sql<number>`coalesce(sum(case when ${transactions.type} = 'withdraw' then abs(${transactions.amount}) else 0 end), 0)`,
      betCount: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then 1 else 0 end), 0)`,
      winCount: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then 1 else 0 end), 0)`,
    })
    .from(transactions)
    .where(scope);

  const betVolume = Number(row?.betVolume ?? 0);
  const winVolume = Number(row?.winVolume ?? 0);
  return {
    betVolume,
    winVolume,
    net: +(winVolume - betVolume).toFixed(2),
    depositVolume: Number(row?.depositVolume ?? 0),
    withdrawVolume: Number(row?.withdrawVolume ?? 0),
    betCount: Number(row?.betCount ?? 0),
    winCount: Number(row?.winCount ?? 0),
  };
}

/** Win/Lose by player account (level = member account). */
export async function fetchWinLoseByLevel(opts?: { limit?: number }): Promise<WinLoseByLevelRow[]> {
  const actor = await requirePermission("REPORTS_VIEW");
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);
  const networkIds = await scopeToDownline(actor, { playersOnly: true });

  if (networkIds !== null && networkIds.length === 0) return [];

  const filters = [eq(users.role, "player")];
  if (networkIds !== null) filters.push(inArray(users.id, networkIds));

  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      role: users.role,
      betVolume: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
      winVolume: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then ${transactions.amount} else 0 end), 0)`,
      betCount: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then 1 else 0 end), 0)`,
      winCount: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then 1 else 0 end), 0)`,
    })
    .from(users)
    .leftJoin(transactions, eq(transactions.userId, users.id))
    .where(and(...filters))
    .groupBy(users.id, users.username, users.role)
    .orderBy(
      desc(
        sql`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
      ),
    )
    .limit(limit);

  return rows.map((r) => {
    const betVolume = Number(r.betVolume);
    const winVolume = Number(r.winVolume);
    return {
      userId: r.userId,
      username: r.username,
      role: r.role as WinLoseByLevelRow["role"],
      betVolume,
      winVolume,
      net: +(winVolume - betVolume).toFixed(2),
      betCount: Number(r.betCount),
      winCount: Number(r.winCount),
    };
  });
}

/** Win/Lose by product (game name). */
export async function fetchWinLoseByProduct(opts?: { limit?: number }): Promise<WinLoseByProductRow[]> {
  const actor = await requirePermission("REPORTS_VIEW");
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 200);
  const networkIds = await scopeToDownline(actor, { playersOnly: true });

  if (networkIds !== null && networkIds.length === 0) return [];

  const filters = [
    or(eq(transactions.type, "bet"), eq(transactions.type, "win"), eq(transactions.type, "jackpot"))!,
  ];
  if (networkIds !== null) filters.push(inArray(transactions.userId, networkIds));

  const rows = await db
    .select({
      product: sql<string>`coalesce(nullif(${transactions.game}, ''), 'Unknown')`,
      betVolume: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
      winVolume: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then ${transactions.amount} else 0 end), 0)`,
      betCount: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then 1 else 0 end), 0)`,
      winCount: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then 1 else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(...filters))
    .groupBy(sql`coalesce(nullif(${transactions.game}, ''), 'Unknown')`)
    .orderBy(
      desc(
        sql`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
      ),
    )
    .limit(limit);

  return rows.map((r) => {
    const betVolume = Number(r.betVolume);
    const winVolume = Number(r.winVolume);
    return {
      product: r.product,
      betVolume,
      winVolume,
      net: +(winVolume - betVolume).toFixed(2),
      betCount: Number(r.betCount),
      winCount: Number(r.winCount),
    };
  });
}

export type ChipDistributionLogRow = {
  id: string;
  actorUsername: string;
  targetId: string | null;
  targetUsername: string;
  amount: number;
  runningBalance: number;
  summary: string;
  createdAt: string;
};

/** Add/withdraw chip history scoped to the caller's network. */
export async function listChipDistributionLogs(opts?: {
  adminUsername?: string;
  limit?: number;
}): Promise<ChipDistributionLogRow[]> {
  const actor = await requirePermission("TRANSACTION_LIST");
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 300);
  const adminUsername = opts?.adminUsername?.trim().toLowerCase();
  const networkIds = await scopeToDownline(actor, { playersOnly: true });

  if (networkIds !== null && networkIds.length === 0) return [];

  const filters = [
    or(
      eq(auditLogs.action, "user.balance_adjust"),
      eq(auditLogs.action, "super.balance_adjust"),
    )!,
  ];
  if (networkIds !== null) {
    filters.push(inArray(auditLogs.targetId, networkIds));
  }
  if (adminUsername) {
    filters.push(like(auditLogs.actorUsername, `%${adminUsername}%`));
  }

  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(...filters))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  const targetIds = Array.from(new Set(rows.map((r) => r.targetId).filter(Boolean))) as string[];
  const nameMap = new Map<string, string>();
  if (targetIds.length > 0) {
    const targets = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(inArray(users.id, targetIds));
    for (const t of targets) nameMap.set(t.id, t.username);
  }

  return rows.map((r) => {
    let amount = 0;
    let runningBalance = 0;
    try {
      const meta = r.meta ? (JSON.parse(r.meta) as Record<string, unknown>) : {};
      amount = Number(meta.delta ?? meta.amount ?? 0);
      runningBalance = Number(meta.newBalance ?? meta.next ?? meta.adminBalance ?? 0);
    } catch {
      /* ignore */
    }
    return {
      id: r.id,
      actorUsername: r.actorUsername,
      targetId: r.targetId,
      targetUsername: (r.targetId && nameMap.get(r.targetId)) || "unknown",
      amount: Math.abs(amount),
      runningBalance,
      summary: r.summary,
      createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
    };
  });
}
