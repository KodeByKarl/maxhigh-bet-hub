/**
 * Admin portal server logic (Domain 2).
 * Keep all admin-only DB operations here — not in player services.
 */
import { eq, desc, sql, like, or, and } from "drizzle-orm";
import { hash } from "bcryptjs";
import { getDb } from "../db/client";
import { auditLogs, liveWins, transactions, users } from "../db/schema";
import type { PublicUser, UserRole } from "@/lib/user";
import type { AdminAuditLogRow, AdminDashboardStats, AdminUserRow, AdminTransactionRow, AdminDayPulse, WinLoseSummary, WinLoseByLevelRow, WinLoseByProductRow } from "@/lib/admin-types";
import { money, newId, requireAdmin, toPublicUser } from "../session";
import { writeAuditLog } from "./audit.server";

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
  await requireAdmin();
  const db = getDb();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [userCounts] = await db
    .select({
      totalUsers: sql<number>`count(*)`,
      totalPlayers: sql<number>`sum(case when ${users.role} = 'player' then 1 else 0 end)`,
      totalAdmins: sql<number>`sum(case when ${users.role} in ('admin','superadmin') then 1 else 0 end)`,
    })
    .from(users);

  const [betRow] = await db
    .select({
      totalBets: sql<number>`count(*)`,
      betVolume: sql<string>`coalesce(sum(abs(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.type, "bet"));

  const [winRow] = await db
    .select({
      biggest: sql<string>`coalesce(max(${liveWins.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(liveWins)
    .where(sql`${liveWins.createdAt} >= ${dayAgo}`);

  const totalUsers = Number(userCounts?.totalUsers ?? 0);
  const totalPlayers = Number(userCounts?.totalPlayers ?? 0);
  const totalAdmins = Number(userCounts?.totalAdmins ?? 0);
  const totalBets = Number(betRow?.totalBets ?? 0);
  const betVolume = Number(betRow?.betVolume ?? 0);
  const biggestWin24h = Number(winRow?.biggest ?? 0);
  const liveWins24h = Number(winRow?.count ?? 0);

  return {
    totalUsers,
    totalPlayers,
    totalAdmins,
    totalBets,
    betVolume,
    biggestWin24h,
    liveWins24h,
    labels: {
      totalUsers: totalUsers.toLocaleString("en-PH"),
      totalPlayers: totalPlayers.toLocaleString("en-PH"),
      totalAdmins: totalAdmins.toLocaleString("en-PH"),
      totalBets: totalBets.toLocaleString("en-PH"),
      betVolume: formatPhp(betVolume),
      biggestWin24h: formatPhp(biggestWin24h),
      liveWins24h: liveWins24h.toLocaleString("en-PH"),
    },
  };
}

export async function listAdminUsers(opts?: {
  q?: string;
  limit?: number;
}): Promise<AdminUserRow[]> {
  await requireAdmin();
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
  const q = opts?.q?.trim();

  const rows = q
    ? await db
        .select()
        .from(users)
        .where(
          or(
            like(users.email, `%${q}%`),
            like(users.username, `%${q}%`),
            like(users.displayName, `%${q}%`),
          ),
        )
        .orderBy(desc(users.createdAt))
        .limit(limit)
    : await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);

  return rows.map((u) => ({
    ...toPublicUser(u),
    createdAt: u.createdAt?.toISOString?.() ?? String(u.createdAt),
  }));
}

export async function adminCreatePlayer(data: {
  email?: string;
  username: string;
  password: string;
  balance?: number;
  role?: UserRole;
  displayName?: string;
}): Promise<PublicUser> {
  const actor = await requireAdmin();
  const role: UserRole = data.role ?? "player";

  // Only superadmin may create admin/superadmin accounts
  if (role !== "player" && actor.role !== "superadmin") {
    throw new Error("Only superadmin can create staff accounts");
  }

  const db = getDb();
  const id = newId();
  const email = data.email?.trim().toLowerCase() || null;
  const username = data.username.trim().toLowerCase();
  try {
    await db.insert(users).values({
      id,
      email,
      username,
      passwordHash: await hash(data.password, 10),
      balance: money(data.balance ?? 0),
      role,
      displayName: data.displayName?.trim() || null,
    });
  } catch {
    throw new Error("Username or email already exists");
  }

  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const created = toPublicUser(rows[0]!);

  await writeAuditLog({
    actor,
    action: "user.create",
    summary: `Created ${created.role} account @${created.username}`,
    targetType: "user",
    targetId: created.id,
    meta: {
      email: created.email,
      username: created.username,
      role: created.role,
      balance: created.balance,
    },
  });

  return created;
}

export async function adminAdjustUserBalance(data: {
  userId: string;
  delta: number;
  note?: string;
}): Promise<PublicUser> {
  const actor = await requireAdmin();
  if (!Number.isFinite(data.delta) || data.delta === 0) {
    throw new Error("Invalid amount");
  }

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(users).where(eq(users.id, data.userId)).limit(1);
    const user = rows[0];
    if (!user) throw new Error("User not found");

    const current = Number(user.balance);
    const next = +(current + data.delta).toFixed(2);
    if (next < 0) throw new Error("Balance cannot go negative");

    await tx.update(users).set({ balance: money(next) }).where(eq(users.id, user.id));
    await tx.insert(transactions).values({
      id: newId(),
      userId: user.id,
      type: "adjust",
      amount: money(data.delta),
      balanceAfter: money(next),
      game: "Admin",
      note: data.note?.trim() || "Admin balance adjust",
    });

    return { ...user, balance: money(next), previousBalance: current };
  });

  const updated = toPublicUser(result);
  await writeAuditLog({
    actor,
    action: "user.balance_adjust",
    summary: `Adjusted @${result.username} balance by ${data.delta > 0 ? "+" : ""}${data.delta.toFixed(2)} → ₱${Number(result.balance).toFixed(2)}`,
    targetType: "user",
    targetId: result.id,
    meta: {
      delta: data.delta,
      previousBalance: result.previousBalance,
      newBalance: Number(result.balance),
      note: data.note ?? null,
    },
  });

  return updated;
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);
  const q = opts?.q?.trim();
  const game = opts?.game?.trim();

  const filters = [];
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
  await requireAdmin();
  const db = getDb();
  const [row] = await db
    .select({
      betVolume: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
      winVolume: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then ${transactions.amount} else 0 end), 0)`,
      depositVolume: sql<number>`coalesce(sum(case when ${transactions.type} = 'deposit' then abs(${transactions.amount}) else 0 end), 0)`,
      withdrawVolume: sql<number>`coalesce(sum(case when ${transactions.type} = 'withdraw' then abs(${transactions.amount}) else 0 end), 0)`,
      betCount: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then 1 else 0 end), 0)`,
      winCount: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then 1 else 0 end), 0)`,
    })
    .from(transactions);

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
  await requireAdmin();
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);

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
    .where(eq(users.role, "player"))
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
  await requireAdmin();
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 200);

  const rows = await db
    .select({
      product: sql<string>`coalesce(nullif(${transactions.game}, ''), 'Unknown')`,
      betVolume: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
      winVolume: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then ${transactions.amount} else 0 end), 0)`,
      betCount: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then 1 else 0 end), 0)`,
      winCount: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then 1 else 0 end), 0)`,
    })
    .from(transactions)
    .where(or(eq(transactions.type, "bet"), eq(transactions.type, "win"), eq(transactions.type, "jackpot")))
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
