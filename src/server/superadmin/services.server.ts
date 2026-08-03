/**
 * Domain 3 — Superadmin server logic.
 * Full control: users, admins, games, jackpot.
 */
import { eq, desc, sql, like, or, and, asc, inArray } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { getDb } from "../db/client";
import { auditLogs, gameControls, jackpot, platformSettings, promotions, riskControls, sessions, transactions, users, walletRequests } from "../db/schema";
import type { PublicUser, UserRole } from "@/lib/user";
import type {
  PlatformSettingsData,
  PromotionRow,
  RiskControlData,
  SuperDashboard,
  SuperGameRow,
  SuperUserRow,
  SuperWalletRequestRow,
} from "@/lib/superadmin-types";
import { destroyUserSessions, money, newId, requireAdmin, requireSuperadmin, toPublicUser } from "../session";
import { writeAuditLog } from "../admin/audit.server";
import { requirePermission } from "../auth/rbac.server";
import { assertCanManageChips, scopeToDownline } from "../auth/network-scope.server";
import { slotGames } from "@/lib/games";

/** Max failed chip-confirm password attempts before temporary lockout. */
const CHIP_CONFIRM_MAX_FAILURES = 5;
const CHIP_CONFIRM_LOCK_MS = 15 * 60 * 1000;

/**
 * Re-verify Super Admin password before chip add/withdraw.
 * Rate-limits via users.failedAttempts / lockedUntil.
 */
export async function verifySuperadminChipPassword(
  actorId: string,
  confirmPassword: string | undefined,
): Promise<void> {
  if (!confirmPassword || confirmPassword.length === 0) {
    throw new Error("Unauthorized — password confirmation required for chip actions");
  }

  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, actorId)).limit(1);
  if (!row) throw new Error("Unauthorized — please sign in");

  const now = new Date();
  if (row.lockedUntil && now < new Date(row.lockedUntil)) {
    throw new Error("Forbidden — too many failed password attempts; try again later");
  }

  const ok = await compare(confirmPassword, row.passwordHash);
  if (!ok) {
    const nextAttempts = (row.failedAttempts ?? 0) + 1;
    const willLock = nextAttempts >= CHIP_CONFIRM_MAX_FAILURES;
    await db
      .update(users)
      .set({
        failedAttempts: nextAttempts,
        lockedUntil: willLock ? new Date(Date.now() + CHIP_CONFIRM_LOCK_MS) : row.lockedUntil,
      })
      .where(eq(users.id, actorId));
    throw new Error(
      willLock
        ? "Forbidden — incorrect password; account temporarily locked"
        : "Unauthorized — incorrect password",
    );
  }

  if ((row.failedAttempts ?? 0) > 0 || row.lockedUntil) {
    await db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(users.id, actorId));
  }
}

function formatPhp(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function fetchSuperDashboard(): Promise<SuperDashboard> {
  await requireSuperadmin();
  const db = getDb();

  const [userCounts] = await db
    .select({
      totalUsers: sql<number>`count(*)`,
      totalPlayers: sql<number>`sum(case when ${users.role} = 'player' then 1 else 0 end)`,
      totalAdmins: sql<number>`sum(case when ${users.role} = 'admin' then 1 else 0 end)`,
      totalSuperadmins: sql<number>`sum(case when ${users.role} = 'superadmin' then 1 else 0 end)`,
    })
    .from(users);

  const [gameCounts] = await db
    .select({
      gamesEnabled: sql<number>`sum(case when ${gameControls.enabled} = 'yes' then 1 else 0 end)`,
      gamesDisabled: sql<number>`sum(case when ${gameControls.enabled} = 'no' then 1 else 0 end)`,
    })
    .from(gameControls);

  const [betRow] = await db
    .select({
      totalBets: sql<number>`count(*)`,
      betVolume: sql<string>`coalesce(sum(abs(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.type, "bet"));

  const [winRow] = await db
    .select({
      winVolume: sql<string>`coalesce(sum(abs(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.type, "win"));

  const jp = await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
  const jackpotAmt = Number(jp[0]?.amount ?? 0);
  const jackpotEnabled = (jp[0]?.enabled ?? "yes") === "yes";
  const ultraMegaJackpot = Number(jp[0]?.displayAmount ?? 0);

  const totalUsers = Number(userCounts?.totalUsers ?? 0);
  const totalPlayers = Number(userCounts?.totalPlayers ?? 0);
  const totalAdmins = Number(userCounts?.totalAdmins ?? 0);
  const totalSuperadmins = Number(userCounts?.totalSuperadmins ?? 0);
  const gamesEnabled = Number(gameCounts?.gamesEnabled ?? 0);
  const gamesDisabled = Number(gameCounts?.gamesDisabled ?? 0);
  const totalBets = Number(betRow?.totalBets ?? 0);
  const betVolume = Number(betRow?.betVolume ?? 0);
  const winVolume = Number(winRow?.winVolume ?? 0);

  return {
    totalUsers,
    totalPlayers,
    totalAdmins,
    totalSuperadmins,
    gamesEnabled,
    gamesDisabled,
    totalBets,
    betVolume,
    winVolume,
    jackpot: jackpotAmt,
    jackpotEnabled,
    ultraMegaJackpot,
    chipOutflow: 0,
    netEarnings: +(betVolume - winVolume).toFixed(2),
    recoveryTarget: 0,
    labels: {
      totalUsers: totalUsers.toLocaleString("en-PH"),
      totalPlayers: totalPlayers.toLocaleString("en-PH"),
      totalAdmins: totalAdmins.toLocaleString("en-PH"),
      totalSuperadmins: totalSuperadmins.toLocaleString("en-PH"),
      gamesEnabled: gamesEnabled.toLocaleString("en-PH"),
      gamesDisabled: gamesDisabled.toLocaleString("en-PH"),
      totalBets: totalBets.toLocaleString("en-PH"),
      betVolume: formatPhp(betVolume),
      winVolume: formatPhp(winVolume),
      jackpot: formatPhp(jackpotAmt),
      ultraMegaJackpot: formatPhp(ultraMegaJackpot),
      jackpotEnabled: jackpotEnabled ? "ON" : "OFF",
    },
  };
}

export async function listSuperUsers(opts?: {
  q?: string;
  role?: UserRole | "all";
  limit?: number;
}): Promise<SuperUserRow[]> {
  await requireSuperadmin();
  const db = getDb();
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 300);
  const q = opts?.q?.trim();
  const role = opts?.role && opts.role !== "all" ? opts.role : undefined;

  const filters = [];
  if (role) filters.push(eq(users.role, role));
  if (q) {
    filters.push(
      or(like(users.email, `%${q}%`), like(users.username, `%${q}%`), like(users.displayName, `%${q}%`)),
    );
  }

  const base = db.select().from(users);
  const rows =
    filters.length > 0
      ? await base.where(and(...filters)).orderBy(desc(users.createdAt)).limit(limit)
      : await base.orderBy(desc(users.createdAt)).limit(limit);

  const uplineIds = Array.from(new Set(rows.map((u) => u.parentAgentId).filter(Boolean))) as string[];
  const agentMap = new Map<string, string>();

  if (uplineIds.length > 0) {
    const agents = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(sql`${users.id} in (${sql.join(uplineIds.map((id) => sql`${id}`), sql`, `)})`);
    for (const a of agents) {
      agentMap.set(a.id, a.username);
    }
  }

  return rows.map((u) => ({
    id: u.id,
    publicUserId: u.publicUserId,
    email: u.email,
    username: u.username,
    balance: Number(u.balance),
    role: u.role as UserRole,
    displayName: u.displayName,
    isLocked: (u.isLocked === "yes" || (u.failedAttempts ?? 0) >= 3 || Boolean(u.lockedUntil && new Date() < new Date(u.lockedUntil))) ? "yes" : "no",
    failedAttempts: u.failedAttempts ?? 0,
    parentAgentId: u.parentAgentId ?? null,
    parentAgentUsername: u.parentAgentId ? (agentMap.get(u.parentAgentId) ?? "System / Direct") : "System / Direct",
    createdAt: u.createdAt?.toISOString?.() ?? String(u.createdAt),
  }));
}

export async function superSetUserRole(data: {
  userId: string;
  role: UserRole;
}): Promise<PublicUser> {
  const actor = await requirePermission("ROLE_UPDATE", { targetType: "user", targetId: data.userId });
  if (data.userId === actor.id && data.role !== "superadmin") {
    throw new Error("Cannot demote your own superadmin account");
  }

  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const target = rows[0];
  if (!target) throw new Error("User not found");

  await db.update(users).set({ role: data.role }).where(eq(users.id, data.userId));

  // Immediate privilege revocation: destroy active sessions so demotion takes effect instantly
  const terminatedSessionsCount = await destroyUserSessions(data.userId);

  await writeAuditLog({
    actor,
    action: "super.role_change",
    summary: `Changed @${target.username} role ${target.role} → ${data.role} (${terminatedSessionsCount} session(s) terminated)`,
    targetType: "user",
    targetId: target.id,
    meta: { from: target.role, to: data.role, terminatedSessionsCount },
  });

  const next = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  return toPublicUser(next[0]!);
}

export async function superCreateUser(data: {
  email?: string;
  username: string;
  password: string;
  balance?: number;
  role: UserRole;
  displayName?: string;
  parentAgentId?: string;
  publicUserId?: string;
}): Promise<PublicUser> {
  const actor = await requireSuperadmin();
  const db = getDb();
  const id = newId();
  const email = data.email?.trim().toLowerCase() || null;
  const username = data.username.trim().toLowerCase();
  const publicUserId = (data.publicUserId?.trim() || username).toLowerCase();
  if (publicUserId.length < 3) throw new Error("User ID must be at least 3 characters");
  if (!/^[a-z0-9_]+$/.test(publicUserId)) throw new Error("User ID must be letters, numbers, or _");

  let parentAgentId: string | null = null;
  if (data.parentAgentId) {
    const [upline] = await db.select().from(users).where(eq(users.id, data.parentAgentId)).limit(1);
    if (!upline) throw new Error("Selected upline account not found");
    if (upline.role !== "master_agent" && upline.role !== "superadmin") {
      throw new Error("Upline must be a Master Agent");
    }
    parentAgentId = upline.id;
  }

  const [existingUsername] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existingUsername) throw new Error("Username already exists");
  const [existingPublicId] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.publicUserId, publicUserId))
    .limit(1);
  if (existingPublicId) throw new Error("User ID already exists");

  try {
    await db.insert(users).values({
      id,
      publicUserId,
      email,
      username,
      passwordHash: await hash(data.password, 10),
      balance: money(data.balance ?? 0),
      role: data.role,
      displayName: data.displayName?.trim() || null,
      parentAgentId,
    });
  } catch {
    throw new Error("Username or User ID already exists");
  }

  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const created = toPublicUser(rows[0]!);
  await writeAuditLog({
    actor,
    action: "super.user_create",
    summary: `Created ${created.role} @${created.username}`,
    targetType: "user",
    targetId: created.id,
    meta: { role: created.role, email: created.email, parentAgentId, publicUserId },
  });
  return created;
}

export async function superUpdateUser(data: {
  userId: string;
  username?: string;
  email?: string | null;
  displayName?: string | null;
  password?: string;
}): Promise<PublicUser> {
  const actor = await requireSuperadmin();
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const target = rows[0];
  if (!target) throw new Error("User not found");

  const patch: Partial<{
    username: string;
    email: string | null;
    displayName: string | null;
    passwordHash: string;
  }> = {};
  const changes: string[] = [];

  if (data.username !== undefined) {
    const username = data.username.trim().toLowerCase();
    if (username.length < 3) throw new Error("Username too short");
    if (!/^[a-z0-9_]+$/.test(username)) throw new Error("Username must be letters, numbers, or _");
    if (username !== target.username) {
      patch.username = username;
      changes.push(`username → @${username}`);
    }
  }

  if (data.email !== undefined) {
    const email = data.email === null || data.email.trim() === "" ? null : data.email.trim().toLowerCase();
    if (email !== target.email) {
      patch.email = email;
      changes.push(email ? `email → ${email}` : "email cleared");
    }
  }

  if (data.displayName !== undefined) {
    const displayName = data.displayName === null || data.displayName.trim() === "" ? null : data.displayName.trim();
    if (displayName !== target.displayName) {
      patch.displayName = displayName;
      changes.push("display name updated");
    }
  }

  if (data.password !== undefined && data.password.length > 0) {
    if (data.password.length < 6) throw new Error("Password must be at least 6 characters");
    patch.passwordHash = await hash(data.password, 10);
    changes.push("password reset");
  }

  if (Object.keys(patch).length === 0) {
    return toPublicUser(target);
  }

  try {
    await db.update(users).set(patch).where(eq(users.id, data.userId));
  } catch {
    throw new Error("Username or email already exists");
  }

  await writeAuditLog({
    actor,
    action: "super.user_update",
    summary: `Updated @${target.username}: ${changes.join(", ")}`,
    targetType: "user",
    targetId: target.id,
    meta: { changes },
  });

  const next = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  return toPublicUser(next[0]!);
}

export async function superAdjustBalance(data: {
  userId: string;
  delta: number;
  note?: string;
  confirmPassword?: string;
}): Promise<PublicUser> {
  const actor = await requireSuperadmin();
  if (!Number.isFinite(data.delta) || data.delta === 0) throw new Error("Invalid amount");

  const db = getDb();

  // Password re-auth for Super Admin chip actions (Task 4)
  await verifySuperadminChipPassword(actor.id, data.confirmPassword);

  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(users).where(eq(users.id, data.userId)).limit(1);
    const user = rows[0];
    if (!user) throw new Error("User not found");

    await assertCanManageChips(
      actor,
      {
        id: user.id,
        role: user.role,
        parentAgentId: user.parentAgentId ?? null,
        username: user.username,
      },
      tx,
    );

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
      game: "Superadmin",
      note: data.note?.trim() || "Superadmin balance adjust",
    });
    return { ...user, balance: money(next), previous: current };
  });

  const timestamp = new Date().toISOString();
  await writeAuditLog({
    actor,
    action: "super.balance_adjust",
    summary: `Adjusted @${result.username} by ${data.delta > 0 ? "+" : ""}${data.delta.toFixed(2)}`,
    targetType: "user",
    targetId: result.id,
    meta: {
      actorId: actor.id,
      targetId: result.id,
      amount: Math.abs(data.delta),
      delta: data.delta,
      timestamp,
      role: actor.role,
      previous: result.previous,
      next: Number(result.balance),
    },
  });
  return toPublicUser(result);
}

export async function listSuperGames(): Promise<SuperGameRow[]> {
  await requireSuperadmin();
  const db = getDb();
  const controls = await db.select().from(gameControls).orderBy(asc(gameControls.sortOrder));
  const byId = new Map(controls.map((c) => [c.gameId, c]));

  // Catalog is the source of truth — dropped titles leave the list even if
  // stale game_controls rows remain in MySQL.
  const rows: SuperGameRow[] = [];
  for (const catalog of slotGames) {
    const id = catalog.id;
    const c = byId.get(id);
    rows.push({
      gameId: id,
      name: catalog.name,
      category: catalog.category ?? "slot",
      thumb: catalog.thumb ?? "/games/candy-peak.png",
      enabled: (c?.enabled ?? "yes") === "yes",
      featured: (c?.featured ?? "no") === "yes",
      sortOrder: Number(c?.sortOrder ?? 0),
      tag: c?.tag ?? catalog.tag ?? null,
      rtp: c?.rtp ?? catalog.rtp ?? null,
      volatility: c?.volatility ?? catalog.volatility ?? null,
      minBet: c?.minBet ?? catalog.minBet ?? null,
      maxBet: c?.maxBet ?? catalog.maxBet ?? null,
      notes: c?.notes ?? null,
      updatedAt: c?.updatedAt?.toISOString?.() ?? null,
    });
  }
  return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function superUpdateGame(data: {
  gameId: string;
  enabled?: boolean;
  featured?: boolean;
  tag?: string | null;
  rtp?: string | null;
  volatility?: string | null;
  minBet?: string | null;
  maxBet?: string | null;
  notes?: string | null;
  sortOrder?: number;
}): Promise<SuperGameRow> {
  const actor = await requireSuperadmin();
  const db = getDb();
  const catalog = slotGames.find((g) => g.id === data.gameId);
  if (!catalog) throw new Error("Unknown game id");

  const existing = await db.select().from(gameControls).where(eq(gameControls.gameId, data.gameId)).limit(1);
  const patch = {
    enabled: data.enabled === undefined ? undefined : data.enabled ? ("yes" as const) : ("no" as const),
    featured: data.featured === undefined ? undefined : data.featured ? ("yes" as const) : ("no" as const),
    tag: data.tag === undefined ? undefined : data.tag,
    rtp: data.rtp === undefined ? undefined : data.rtp,
    volatility: data.volatility === undefined ? undefined : data.volatility,
    minBet: data.minBet === undefined ? undefined : data.minBet,
    maxBet: data.maxBet === undefined ? undefined : data.maxBet,
    notes: data.notes === undefined ? undefined : data.notes,
    sortOrder: data.sortOrder,
  };

  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: data.gameId,
      enabled: data.enabled === false ? "no" : "yes",
      featured: data.featured ? "yes" : "no",
      sortOrder: data.sortOrder ?? 0,
      tag: data.tag ?? catalog.tag ?? null,
      rtp: data.rtp ?? catalog.rtp,
      volatility: data.volatility ?? catalog.volatility,
      minBet: data.minBet ?? catalog.minBet,
      maxBet: data.maxBet ?? catalog.maxBet,
      notes: data.notes ?? null,
    });
  } else if (Object.keys(clean).length > 0) {
    await db.update(gameControls).set(clean).where(eq(gameControls.gameId, data.gameId));
  }

  await writeAuditLog({
    actor,
    action: "super.game_update",
    summary: `Updated game ${catalog.name} (${data.gameId})`,
    targetType: "game",
    targetId: data.gameId,
    meta: data,
  });

  const all = await listSuperGames();
  return all.find((g) => g.gameId === data.gameId)!;
}

export async function superSetJackpot(amount: number): Promise<{ amount: number }> {
  const actor = await requireSuperadmin();
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid jackpot");
  const db = getDb();
  const rows = await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
  if (rows[0]) {
    await db.update(jackpot).set({ amount: money(amount) }).where(eq(jackpot.id, "mega"));
  } else {
    await db.insert(jackpot).values({
      id: "mega",
      amount: money(amount),
      enabled: "yes",
      displayAmount: money(500_000_000),
    });
  }
  await writeAuditLog({
    actor,
    action: "super.jackpot_set",
    summary: `Set Mega Jackpot to ₱${amount.toFixed(2)}`,
    targetType: "jackpot",
    targetId: "mega",
    meta: { amount },
  });
  return { amount };
}

export async function superSetJackpotEnabled(enabled: boolean): Promise<{ enabled: boolean }> {
  const actor = await requireSuperadmin();
  const db = getDb();
  const rows = await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
  if (rows[0]) {
    await db.update(jackpot).set({ enabled: enabled ? "yes" : "no" }).where(eq(jackpot.id, "mega"));
  } else {
    await db.insert(jackpot).values({
      id: "mega",
      amount: money(0),
      enabled: enabled ? "yes" : "no",
      displayAmount: money(500_000_000),
    });
  }
  await writeAuditLog({
    actor,
    action: "super.jackpot_enabled",
    summary: `Mega Jackpot ${enabled ? "ON" : "OFF"}`,
    targetType: "jackpot",
    targetId: "mega",
    meta: { enabled },
  });
  return { enabled };
}

export async function superSetUltraMegaJackpot(amount: number): Promise<{ amount: number }> {
  const actor = await requireSuperadmin();
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid Ultra Mega Jackpot amount");
  const db = getDb();
  const rows = await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
  if (rows[0]) {
    await db.update(jackpot).set({ displayAmount: money(amount) }).where(eq(jackpot.id, "mega"));
  } else {
    await db.insert(jackpot).values({
      id: "mega",
      amount: money(0),
      enabled: "yes",
      displayAmount: money(amount),
    });
  }
  await writeAuditLog({
    actor,
    action: "super.ultra_mega_jackpot_set",
    summary: `Set Ultra Mega Jackpot display to ₱${amount.toFixed(2)}`,
    targetType: "jackpot",
    targetId: "mega",
    meta: { displayAmount: amount },
  });
  return { amount };
}

/** True when Mega Jackpot wins are allowed (Task 6). */
export async function isMegaJackpotEnabled(): Promise<boolean> {
  const db = getDb();
  const rows = await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
  return (rows[0]?.enabled ?? "yes") === "yes";
}

/**
 * Award the real Mega Jackpot pool to a player (manual assign).
 * Blocked when Mega Jackpot toggle is Off.
 */
export async function assignJackpotToPlayer(data: {
  username: string;
  resetAmount?: number;
}): Promise<{ success: true; amountAwarded: number; playerUsername: string }> {
  const actor = await requireSuperadmin();
  if (!(await isMegaJackpotEnabled())) {
    throw new Error("Forbidden — Mega Jackpot is currently OFF and cannot be won or assigned");
  }

  const db = getDb();
  const username = data.username.trim().toLowerCase();
  const [player] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!player || player.role !== "player") {
    throw new Error("Player not found");
  }

  const result = await db.transaction(async (tx) => {
    const [jp] = await tx.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
    if (!jp || (jp.enabled ?? "yes") !== "yes") {
      throw new Error("Forbidden — Mega Jackpot is currently OFF and cannot be won or assigned");
    }
    const amountAwarded = Number(jp.amount);
    if (amountAwarded <= 0) throw new Error("Mega Jackpot pool is empty");

    const nextBal = +(Number(player.balance) + amountAwarded).toFixed(2);
    await tx.update(users).set({ balance: money(nextBal) }).where(eq(users.id, player.id));
    await tx.insert(transactions).values({
      id: newId(),
      userId: player.id,
      type: "jackpot",
      amount: money(amountAwarded),
      balanceAfter: money(nextBal),
      game: "MegaJackpot",
      note: `Mega Jackpot awarded by @${actor.username}`,
    });

    const reset = data.resetAmount ?? 10000;
    await tx.update(jackpot).set({ amount: money(reset) }).where(eq(jackpot.id, "mega"));

    return { amountAwarded, playerUsername: player.username };
  });

  await writeAuditLog({
    actor,
    action: "super.jackpot_assign",
    summary: `Awarded Mega Jackpot ₱${result.amountAwarded.toFixed(2)} to @${result.playerUsername}`,
    targetType: "user",
    targetId: player.id,
    meta: { amountAwarded: result.amountAwarded, resetAmount: data.resetAmount ?? 10000 },
  });

  return { success: true, ...result };
}

/** Public catalog merge — only enabled games for the casino site. */
export async function listEnabledCatalogGames() {
  const db = getDb();
  let controls: (typeof gameControls.$inferSelect)[] = [];
  try {
    controls = await db.select().from(gameControls);
  } catch {
    // table may not exist yet — fall back to full catalog
    return slotGames;
  }
  const map = new Map(controls.map((c) => [c.gameId, c]));

  type Row = (typeof slotGames)[number] & { _sort: number };
  const rows: Row[] = [];
  for (const g of slotGames) {
    const c = map.get(g.id);
    if (c && c.enabled === "no") continue;
    rows.push({
      ...g,
      tag: c?.tag ?? g.tag,
      rtp: c?.rtp ?? g.rtp,
      volatility: (c?.volatility as typeof g.volatility) ?? g.volatility,
      minBet: c?.minBet ?? g.minBet,
      maxBet: c?.maxBet ?? g.maxBet,
      _sort: Number(c?.sortOrder ?? 0),
    });
  }
  return rows
    .sort((a, b) => a._sort - b._sort || a.name.localeCompare(b.name))
    .map(({ _sort, ...g }) => g);
}

function parseEngineConfigJson(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Public — Candy Peak engine math (defaults if unset). */
export async function getCandyPeakEngineConfig() {
  const {
    CANDY_PEAK_GAME_ID,
    DEFAULT_CANDY_PEAK_CONFIG,
    normalizeCandyPeakConfig,
  } = await import("@/lib/candy-peak-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CANDY_PEAK_GAME_ID))
      .limit(1);
    return normalizeCandyPeakConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CANDY_PEAK_CONFIG);
  }
}

/** Superadmin — save full Candy Peak math config. */
export async function saveCandyPeakEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    CANDY_PEAK_GAME_ID,
    normalizeCandyPeakConfig,
  } = await import("@/lib/candy-peak-config");
  const catalog = slotGames.find((g) => g.id === CANDY_PEAK_GAME_ID);
  if (!catalog) throw new Error("Candy Peak not in catalog");

  const cfg = normalizeCandyPeakConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CANDY_PEAK_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CANDY_PEAK_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: catalog.rtp,
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload })
      .where(eq(gameControls.gameId, CANDY_PEAK_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.candy_peak_config",
    summary: `Updated Candy Peak engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: CANDY_PEAK_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Sugar Surge engine math (defaults if unset). */
export async function getSugarSurgeEngineConfig() {
  const {
    SUGAR_SURGE_GAME_ID,
    DEFAULT_SUGAR_SURGE_CONFIG,
    normalizeSugarSurgeConfig,
  } = await import("@/lib/sugar-surge-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, SUGAR_SURGE_GAME_ID))
      .limit(1);
    return normalizeSugarSurgeConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_SUGAR_SURGE_CONFIG);
  }
}

/** Superadmin — save full Sugar Surge math config. */
export async function saveSugarSurgeEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    SUGAR_SURGE_GAME_ID,
    normalizeSugarSurgeConfig,
  } = await import("@/lib/sugar-surge-config");
  const catalog = slotGames.find((g) => g.id === SUGAR_SURGE_GAME_ID);
  if (!catalog) throw new Error("Sugar Surge not in catalog");

  const cfg = normalizeSugarSurgeConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, SUGAR_SURGE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: SUGAR_SURGE_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: catalog.rtp,
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload })
      .where(eq(gameControls.gameId, SUGAR_SURGE_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.sugar_surge_config",
    summary: `Updated Sugar Surge engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: SUGAR_SURGE_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Godly Gates engine math (defaults if unset). */
export async function getGodlyGatesEngineConfig() {
  const {
    GODLY_GATES_GAME_ID,
    DEFAULT_GODLY_GATES_CONFIG,
    normalizeGodlyGatesConfig,
  } = await import("@/lib/godly-gates-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, GODLY_GATES_GAME_ID))
      .limit(1);
    return normalizeGodlyGatesConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_GODLY_GATES_CONFIG);
  }
}

/** Superadmin — save full Godly Gates math config. */
export async function saveGodlyGatesEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    GODLY_GATES_GAME_ID,
    normalizeGodlyGatesConfig,
  } = await import("@/lib/godly-gates-config");
  const catalog = slotGames.find((g) => g.id === GODLY_GATES_GAME_ID);
  if (!catalog) throw new Error("Godly Gates not in catalog");

  const cfg = normalizeGodlyGatesConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, GODLY_GATES_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: GODLY_GATES_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: catalog.rtp,
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload })
      .where(eq(gameControls.gameId, GODLY_GATES_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.godly_gates_config",
    summary: `Updated Godly Gates engine config (dead spin ${cfg.deadSpinChancePercent}%, buy ${cfg.buyFeatureMult}x)`,
    targetType: "game",
    targetId: GODLY_GATES_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      buyFeatureMult: cfg.buyFeatureMult,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
    },
  });

  return cfg;
}

/** Public — Mahjong Ways engine math (defaults if unset). */
export async function getMahjongWaysEngineConfig() {
  const {
    MAHJONG_WAYS_GAME_ID,
    DEFAULT_MAHJONG_WAYS_CONFIG,
    normalizeMahjongWaysConfig,
  } = await import("@/lib/mahjong-ways-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MAHJONG_WAYS_GAME_ID))
      .limit(1);
    return normalizeMahjongWaysConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_MAHJONG_WAYS_CONFIG);
  }
}

/** Superadmin — save full Mahjong Ways math config. */
export async function saveMahjongWaysEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    MAHJONG_WAYS_GAME_ID,
    normalizeMahjongWaysConfig,
  } = await import("@/lib/mahjong-ways-config");
  const catalog = slotGames.find((g) => g.id === MAHJONG_WAYS_GAME_ID);
  if (!catalog) throw new Error("Mahjong Ways not in catalog");

  const cfg = normalizeMahjongWaysConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, MAHJONG_WAYS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: MAHJONG_WAYS_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: catalog.rtp,
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload })
      .where(eq(gameControls.gameId, MAHJONG_WAYS_GAME_ID));
  }

  try {
    const { clearMahjongWaysEngineCache } = await import("../games/mahjong-ways.server");
    clearMahjongWaysEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.mahjong_ways_config",
    summary: `Updated Mahjong Ways engine (FS ${cfg.freeSpinsBaseCount}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: MAHJONG_WAYS_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      buyFeatureMult: cfg.buyFeatureMult,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
      goldChanceInitial: cfg.goldChanceInitial,
    },
  });

  return cfg;
}

/** Public — Starlight Ace engine math (defaults if unset). */
export async function getStarlightAceEngineConfig() {
  const {
    STARLIGHT_ACE_GAME_ID,
    DEFAULT_STARLIGHT_ACE_CONFIG,
    normalizeStarlightAceConfig,
  } = await import("@/lib/starlight-ace-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, STARLIGHT_ACE_GAME_ID))
      .limit(1);
    return normalizeStarlightAceConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_STARLIGHT_ACE_CONFIG);
  }
}

/** Superadmin — save full Starlight Ace math config. */
export async function saveStarlightAceEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    STARLIGHT_ACE_GAME_ID,
    normalizeStarlightAceConfig,
  } = await import("@/lib/starlight-ace-config");
  const catalog = slotGames.find((g) => g.id === STARLIGHT_ACE_GAME_ID);
  if (!catalog) throw new Error("Starlight Ace not in catalog");

  const cfg = normalizeStarlightAceConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, STARLIGHT_ACE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: STARLIGHT_ACE_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.targetRtp),
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.targetRtp),
      })
      .where(eq(gameControls.gameId, STARLIGHT_ACE_GAME_ID));
  }

  try {
    const { clearStarlightAceEngineCache } = await import("../games/starlight-ace.server");
    clearStarlightAceEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.starlight_ace_config",
    summary: `Updated Starlight Ace engine (FS ${cfg.freeSpinsBaseCount}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: STARLIGHT_ACE_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      buyFeatureMult: cfg.buyFeatureMult,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
      goldChanceInitial: cfg.goldChanceInitial,
      guaranteedGoldenReelIndex: cfg.guaranteedGoldenReelIndex,
    },
  });

  return cfg;
}

/** Public — Super Ace engine math (defaults if unset). */
export async function getSuperAceEngineConfig() {
  const {
    SUPER_ACE_GAME_ID,
    DEFAULT_SUPER_ACE_CONFIG,
    normalizeSuperAceConfig,
  } = await import("@/lib/super-ace-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, SUPER_ACE_GAME_ID))
      .limit(1);
    return normalizeSuperAceConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_SUPER_ACE_CONFIG);
  }
}

/** Superadmin — save full Super Ace math config. */
export async function saveSuperAceEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    SUPER_ACE_GAME_ID,
    normalizeSuperAceConfig,
  } = await import("@/lib/super-ace-config");
  const catalog = slotGames.find((g) => g.id === SUPER_ACE_GAME_ID);
  if (!catalog) throw new Error("Super Ace not in catalog");

  const cfg = normalizeSuperAceConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, SUPER_ACE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: SUPER_ACE_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.targetRtp),
      volatility: cfg.volatility || catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.targetRtp),
        volatility: cfg.volatility || existing[0].volatility || catalog.volatility,
      })
      .where(eq(gameControls.gameId, SUPER_ACE_GAME_ID));
  }

  try {
    const { clearSuperAceEngineCache } = await import("../games/super-ace.server");
    clearSuperAceEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.super_ace_config",
    summary: `Updated Super Ace engine (FS ${cfg.freeSpinsBaseCount}/+${cfg.freeSpinsRetriggerCount}, maxWin ${cfg.maxWinMult}x, RTP ${cfg.activeRtpProfile} ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: SUPER_ACE_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      freeSpinsRetriggerCount: cfg.freeSpinsRetriggerCount,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      buyFeatureMult: cfg.buyFeatureMult,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
      activeRtpProfile: cfg.activeRtpProfile,
      goldChanceInitial: cfg.goldChanceInitial,
      jokerTransformWeights: cfg.jokerTransformWeights,
    },
  });

  return cfg;
}

/** Public — Frontier Gold engine math (defaults if unset). */
export async function getFrontierGoldEngineConfig() {
  const {
    FRONTIER_GOLD_GAME_ID,
    DEFAULT_FRONTIER_GOLD_CONFIG,
    normalizeFrontierGoldConfig,
  } = await import("@/lib/frontier-gold-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, FRONTIER_GOLD_GAME_ID))
      .limit(1);
    return normalizeFrontierGoldConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_FRONTIER_GOLD_CONFIG);
  }
}

/** Superadmin — save full Frontier Gold math config. */
export async function saveFrontierGoldEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    FRONTIER_GOLD_GAME_ID,
    normalizeFrontierGoldConfig,
  } = await import("@/lib/frontier-gold-config");
  const catalog = slotGames.find((g) => g.id === FRONTIER_GOLD_GAME_ID);
  if (!catalog) throw new Error("Frontier Gold not in catalog");

  const cfg = normalizeFrontierGoldConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, FRONTIER_GOLD_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: FRONTIER_GOLD_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.targetRtp),
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload, rtp: String(cfg.targetRtp) })
      .where(eq(gameControls.gameId, FRONTIER_GOLD_GAME_ID));
  }

  try {
    const { clearFrontierGoldEngineCache } = await import("../games/frontier-gold.server");
    clearFrontierGoldEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.frontier_gold_config",
    summary: `Updated Frontier Gold engine (FS ${cfg.freeSpinsBaseCount}, H&W ${cfg.holdWinTriggerCount}+ coins, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: FRONTIER_GOLD_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      holdWinTriggerCount: cfg.holdWinTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}

/** Public — Buffalo Reign engine math. */
export async function getBuffaloReignEngineConfig() {
  const {
    BUFFALO_REIGN_GAME_ID,
    DEFAULT_BUFFALO_REIGN_CONFIG,
    normalizeBuffaloReignConfig,
  } = await import("@/lib/buffalo-reign-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, BUFFALO_REIGN_GAME_ID))
      .limit(1);
    return normalizeBuffaloReignConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_BUFFALO_REIGN_CONFIG);
  }
}

/** Superadmin — save Buffalo Reign math config. */
export async function saveBuffaloReignEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    BUFFALO_REIGN_GAME_ID,
    normalizeBuffaloReignConfig,
  } = await import("@/lib/buffalo-reign-config");
  const catalog = slotGames.find((g) => g.id === BUFFALO_REIGN_GAME_ID);
  if (!catalog) throw new Error("Buffalo Reign not in catalog");

  const cfg = normalizeBuffaloReignConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, BUFFALO_REIGN_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: BUFFALO_REIGN_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.targetRtp),
      volatility: cfg.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload, rtp: String(cfg.targetRtp), volatility: cfg.volatility })
      .where(eq(gameControls.gameId, BUFFALO_REIGN_GAME_ID));
  }

  try {
    const { clearBuffaloReignEngineCache } = await import("../games/buffalo-reign.server");
    clearBuffaloReignEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.buffalo_reign_config",
    summary: `Updated Buffalo Reign (FS ${cfg.freeSpinsBaseCount}, chests ${cfg.chestTriggerCount}+, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: BUFFALO_REIGN_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      chestTriggerCount: cfg.chestTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}

/** Public — Chinese New Year engine math (defaults if unset). */
export async function getChineseNewYearEngineConfig() {
  const {
    CHINESE_NEW_YEAR_GAME_ID,
    DEFAULT_CHINESE_NEW_YEAR_CONFIG,
    normalizeChineseNewYearConfig,
  } = await import("@/lib/chinese-new-year-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CHINESE_NEW_YEAR_GAME_ID))
      .limit(1);
    return normalizeChineseNewYearConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CHINESE_NEW_YEAR_CONFIG);
  }
}

/** Superadmin — save full Chinese New Year math config. */
export async function saveChineseNewYearEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    CHINESE_NEW_YEAR_GAME_ID,
    normalizeChineseNewYearConfig,
  } = await import("@/lib/chinese-new-year-config");
  const catalog = slotGames.find((g) => g.id === CHINESE_NEW_YEAR_GAME_ID);
  if (!catalog) throw new Error("Chinese New Year not in catalog");

  const cfg = normalizeChineseNewYearConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CHINESE_NEW_YEAR_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CHINESE_NEW_YEAR_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: catalog.rtp,
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload })
      .where(eq(gameControls.gameId, CHINESE_NEW_YEAR_GAME_ID));
  }

  try {
    const { clearChineseNewYearEngineCache } = await import("../games/chinese-new-year.server");
    clearChineseNewYearEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.chinese_new_year_config",
    summary: `Updated Chinese New Year engine (FS ${cfg.freeSpinsAward}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: CHINESE_NEW_YEAR_GAME_ID,
    meta: {
      freeSpinsAward: cfg.freeSpinsAward,
      monkeyTriggerMult: cfg.monkeyTriggerMult,
      dragonSuccessChancePercent: cfg.dragonSuccessChancePercent,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
      paylineCount: cfg.paylineCount,
    },
  });

  return cfg;
}

/** Public — Fire Spike engine math (defaults if unset). */
export async function getFireSpikeEngineConfig() {
  const {
    FIRE_SPIKE_GAME_ID,
    DEFAULT_FIRE_SPIKE_CONFIG,
    normalizeFireSpikeConfig,
  } = await import("@/lib/fire-spike-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, FIRE_SPIKE_GAME_ID))
      .limit(1);
    return normalizeFireSpikeConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_FIRE_SPIKE_CONFIG);
  }
}

/** Superadmin — save full Fire Spike math config. */
export async function saveFireSpikeEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { FIRE_SPIKE_GAME_ID, normalizeFireSpikeConfig } = await import("@/lib/fire-spike-config");
  const catalog = slotGames.find((g) => g.id === FIRE_SPIKE_GAME_ID);
  if (!catalog) throw new Error("Fire Spike not in catalog");

  const cfg = normalizeFireSpikeConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, FIRE_SPIKE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: FIRE_SPIKE_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.targetRtp),
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload, rtp: String(cfg.targetRtp) })
      .where(eq(gameControls.gameId, FIRE_SPIKE_GAME_ID));
  }

  try {
    const { clearFireSpikeEngineCache } = await import("../games/fire-spike.server");
    clearFireSpikeEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.fire_spike_config",
    summary: `Updated Fire Spike engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, JP ${cfg.grandJackpotMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: FIRE_SPIKE_GAME_ID,
    meta: {
      activeRtpProfile: cfg.activeRtpProfile,
      maxWinMult: cfg.maxWinMult,
      grandJackpotMult: cfg.grandJackpotMult,
      targetRtp: cfg.targetRtp,
      paylineCount: cfg.paylineCount,
      minBet: cfg.minBet,
      maxBet: cfg.maxBet,
    },
  });

  return cfg;
}

/** Public — Fortune Gems engine math (defaults if unset). */
export async function getFortuneGemsEngineConfig() {
  const {
    FORTUNE_GEMS_GAME_ID,
    DEFAULT_FORTUNE_GEMS_CONFIG,
    normalizeFortuneGemsConfig,
  } = await import("@/lib/fortune-gems-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, FORTUNE_GEMS_GAME_ID))
      .limit(1);
    return normalizeFortuneGemsConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_FORTUNE_GEMS_CONFIG);
  }
}

/** Superadmin — save full Fortune Gems math config. */
export async function saveFortuneGemsEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { FORTUNE_GEMS_GAME_ID, normalizeFortuneGemsConfig } = await import(
    "@/lib/fortune-gems-config"
  );
  const catalog = slotGames.find((g) => g.id === FORTUNE_GEMS_GAME_ID);
  if (!catalog) throw new Error("Fortune Gems not in catalog");

  const cfg = normalizeFortuneGemsConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, FORTUNE_GEMS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: FORTUNE_GEMS_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.targetRtp),
      volatility: catalog.volatility,
      minBet: `₱${cfg.minBet.toFixed(2)}`,
      maxBet: `₱${cfg.maxBet.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.targetRtp),
        minBet: `₱${cfg.minBet.toFixed(2)}`,
        maxBet: `₱${cfg.maxBet.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, FORTUNE_GEMS_GAME_ID));
  }

  try {
    const { clearFortuneGemsEngineCache } = await import("../games/fortune-gems.server");
    clearFortuneGemsEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.fortune_gems_config",
    summary: `Updated Fortune Gems engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, EX ${cfg.exBetMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: FORTUNE_GEMS_GAME_ID,
    meta: {
      activeRtpProfile: cfg.activeRtpProfile,
      maxWinMult: cfg.maxWinMult,
      exBetMult: cfg.exBetMult,
      targetRtp: cfg.targetRtp,
      paylineCount: cfg.paylineCount,
      minBet: cfg.minBet,
      maxBet: cfg.maxBet,
    },
  });

  return cfg;
}

/** Public — Pug Den engine math (defaults if unset). */
export async function getPugLifeEngineConfig() {
  const {
    PUG_LIFE_GAME_ID,
    DEFAULT_PUG_LIFE_CONFIG,
    normalizePugLifeConfig,
  } = await import("@/lib/pug-life-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, PUG_LIFE_GAME_ID))
      .limit(1);
    return normalizePugLifeConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_PUG_LIFE_CONFIG);
  }
}

/** Superadmin — save full Pug Den math config. */
export async function savePugLifeEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { PUG_LIFE_GAME_ID, normalizePugLifeConfig } = await import("@/lib/pug-life-config");
  const catalog = slotGames.find((g) => g.id === PUG_LIFE_GAME_ID);
  if (!catalog) throw new Error("Pug Den not in catalog");

  const cfg = normalizePugLifeConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, PUG_LIFE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: PUG_LIFE_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.targetRtp),
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload, rtp: String(cfg.targetRtp) })
      .where(eq(gameControls.gameId, PUG_LIFE_GAME_ID));
  }

  try {
    const { clearPugLifeEngineCache } = await import("../games/pug-life.server");
    clearPugLifeEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.pug_life_config",
    summary: `Updated Pug Den engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: PUG_LIFE_GAME_ID,
    meta: {
      activeRtpProfile: cfg.activeRtpProfile,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
      paylineCount: cfg.paylineCount,
      buyOptions: cfg.buyOptions.map((b) => ({
        id: b.id,
        costMult: b.costMult,
        configStatus: b.configStatus,
      })),
    },
  });

  return cfg;
}

/** Public — Reel Riot engine math (defaults if unset). */
export async function getReelRiotEngineConfig() {
  const {
    REEL_RIOT_GAME_ID,
    DEFAULT_REEL_RIOT_CONFIG,
    normalizeReelRiotConfig,
  } = await import("@/lib/reel-riot-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, REEL_RIOT_GAME_ID))
      .limit(1);
    return normalizeReelRiotConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_REEL_RIOT_CONFIG);
  }
}

/** Superadmin — save full Reel Riot math config. */
export async function saveReelRiotEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { REEL_RIOT_GAME_ID, normalizeReelRiotConfig } = await import("@/lib/reel-riot-config");
  const catalog = slotGames.find((g) => g.id === REEL_RIOT_GAME_ID);
  if (!catalog) throw new Error("Reel Riot not in catalog");

  const cfg = normalizeReelRiotConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, REEL_RIOT_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: REEL_RIOT_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.targetRtp),
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload, rtp: String(cfg.targetRtp) })
      .where(eq(gameControls.gameId, REEL_RIOT_GAME_ID));
  }

  try {
    const { clearReelRiotEngineCache } = await import("../games/reel-riot.server");
    clearReelRiotEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.reel_riot_config",
    summary: `Updated Reel Riot engine (maxBet ${cfg.maxBet}, twoWild ${cfg.twoWildPayMult}x, RTP placeholder ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: REEL_RIOT_GAME_ID,
    meta: {
      maxBet: cfg.maxBet,
      twoWildPayMult: cfg.twoWildPayMult,
      targetRtp: cfg.targetRtp,
      jackpotFloor: cfg.jackpot.floorAmount,
      rtpConfigStatus: cfg.rtpConfigStatus,
    },
  });

  return cfg;
}

/** Public — Piñata Wins engine math (defaults if unset). */
export async function getPinataWinsEngineConfig() {
  const {
    PINATA_WINS_GAME_ID,
    DEFAULT_PINATA_WINS_CONFIG,
    normalizePinataWinsConfig,
  } = await import("@/lib/pinata-wins-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, PINATA_WINS_GAME_ID))
      .limit(1);
    return normalizePinataWinsConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_PINATA_WINS_CONFIG);
  }
}

/** Superadmin — save full Piñata Wins math config. */
export async function savePinataWinsEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { PINATA_WINS_GAME_ID, normalizePinataWinsConfig } = await import(
    "@/lib/pinata-wins-config"
  );
  const catalog = slotGames.find((g) => g.id === PINATA_WINS_GAME_ID);
  if (!catalog) throw new Error("Piñata Wins not in catalog");

  const cfg = normalizePinataWinsConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, PINATA_WINS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: PINATA_WINS_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.targetRtp),
      volatility: catalog.volatility,
      minBet: `₱${cfg.minBet.toFixed(2)}`,
      maxBet: `₱${cfg.maxBet.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.targetRtp),
        minBet: `₱${cfg.minBet.toFixed(2)}`,
        maxBet: `₱${cfg.maxBet.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, PINATA_WINS_GAME_ID));
  }

  try {
    const { clearPinataWinsEngineCache } = await import("../games/pinata-wins.server");
    clearPinataWinsEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.pinata_wins_config",
    summary: `Updated Piñata Wins engine (buy ${cfg.buyFeatureMult}x, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: PINATA_WINS_GAME_ID,
    meta: {
      buyFeatureMult: cfg.buyFeatureMult,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
      paylineCount: cfg.paylineCount,
      goldFrameChanceInitial: cfg.goldFrameChanceInitial,
      minBet: cfg.minBet,
      maxBet: cfg.maxBet,
    },
  });

  return cfg;
}

/** Public — Golden Panther engine math (defaults if unset). */
export async function getGoldenPantherEngineConfig() {
  const {
    GOLDEN_PANTHER_GAME_ID,
    DEFAULT_GOLDEN_PANTHER_CONFIG,
    normalizeGoldenPantherConfig,
  } = await import("@/lib/golden-panther-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, GOLDEN_PANTHER_GAME_ID))
      .limit(1);
    return normalizeGoldenPantherConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_GOLDEN_PANTHER_CONFIG);
  }
}

/** Superadmin — save full Golden Panther math config. */
export async function saveGoldenPantherEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    GOLDEN_PANTHER_GAME_ID,
    normalizeGoldenPantherConfig,
  } = await import("@/lib/golden-panther-config");
  const catalog = slotGames.find((g) => g.id === GOLDEN_PANTHER_GAME_ID);
  if (!catalog) throw new Error("Golden Panther not in catalog");

  const cfg = normalizeGoldenPantherConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, GOLDEN_PANTHER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: GOLDEN_PANTHER_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: catalog.rtp,
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload })
      .where(eq(gameControls.gameId, GOLDEN_PANTHER_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.golden_panther_config",
    summary: `Updated Golden Panther engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: GOLDEN_PANTHER_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

export async function listWalletRequests(opts?: {
  status?: "pending" | "approved" | "rejected" | "all";
  limit?: number;
}): Promise<SuperWalletRequestRow[]> {
  await requireAdmin();
  const db = getDb();
  const status = opts?.status ?? "pending";
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);

  const rows =
    status === "all"
      ? await db
          .select({
            req: walletRequests,
            username: users.username,
            displayName: users.displayName,
            balance: users.balance,
          })
          .from(walletRequests)
          .innerJoin(users, eq(walletRequests.userId, users.id))
          .orderBy(desc(walletRequests.createdAt))
          .limit(limit)
      : await db
          .select({
            req: walletRequests,
            username: users.username,
            displayName: users.displayName,
            balance: users.balance,
          })
          .from(walletRequests)
          .innerJoin(users, eq(walletRequests.userId, users.id))
          .where(eq(walletRequests.status, status))
          .orderBy(desc(walletRequests.createdAt))
          .limit(limit);

  return rows.map((r) => ({
    id: r.req.id,
    userId: r.req.userId,
    username: r.username,
    displayName: r.displayName,
    balance: Number(r.balance),
    type: r.req.type,
    amount: Number(r.req.amount),
    status: r.req.status,
    playerNote: r.req.playerNote,
    staffNote: r.req.staffNote,
    reviewedBy: r.req.reviewedBy,
    createdAt: r.req.createdAt?.toISOString?.() ?? String(r.req.createdAt),
    reviewedAt:
      r.req.reviewedAt?.toISOString?.() ?? (r.req.reviewedAt ? String(r.req.reviewedAt) : null),
  }));
}

export async function reviewWalletRequest(data: {
  id: string;
  decision: "approve" | "reject";
  note?: string;
}): Promise<SuperWalletRequestRow> {
  const actor = await requireAdmin();
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const reqRows = await tx
      .select()
      .from(walletRequests)
      .where(eq(walletRequests.id, data.id))
      .for("update")
      .limit(1);

    const req = reqRows[0];
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    const userRows = await tx.select().from(users).where(eq(users.id, req.userId)).for("update").limit(1);
    const user = userRows[0];
    if (!user) throw new Error("User not found");

    const amount = Number(req.amount);
    const now = new Date();
    const staffNote = data.note?.trim() || null;

    if (data.decision === "reject") {
      const rejected = await tx
        .update(walletRequests)
        .set({
          status: "rejected",
          staffNote,
          reviewedBy: actor.id,
          reviewedAt: now,
        })
        .where(and(eq(walletRequests.id, data.id), eq(walletRequests.status, "pending")));

      if ((rejected[0]?.affectedRows ?? 0) === 0) {
        throw new Error("Request already reviewed");
      }

      return {
        id: req.id,
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        balance: Number(user.balance),
        type: req.type,
        amount,
        status: "rejected" as const,
        playerNote: req.playerNote,
        staffNote,
        reviewedBy: actor.id,
        createdAt: req.createdAt?.toISOString?.() ?? String(req.createdAt),
        reviewedAt: now.toISOString(),
        previousBalance: Number(user.balance),
      };
    }

    // Approve: add chips (deposit) or cash out (withdraw)
    const delta = req.type === "deposit" ? amount : -amount;
    const current = Number(user.balance);
    const next = +(current + delta).toFixed(2);
    if (next < 0) throw new Error("Player balance too low to approve this withdrawal");

    const claimed = await tx
      .update(walletRequests)
      .set({
        status: "approved",
        staffNote,
        reviewedBy: actor.id,
        reviewedAt: now,
      })
      .where(and(eq(walletRequests.id, data.id), eq(walletRequests.status, "pending")));

    if ((claimed[0]?.affectedRows ?? 0) === 0) {
      throw new Error("Request already reviewed");
    }

    await tx.update(users).set({ balance: money(next) }).where(eq(users.id, user.id));
    await tx.insert(transactions).values({
      id: newId(),
      userId: user.id,
      type: req.type,
      amount: money(delta),
      balanceAfter: money(next),
      game: "Wallet",
      note:
        staffNote ||
        (req.type === "deposit"
          ? `Deposit approved · request ${data.id.slice(0, 8)}`
          : `Withdrawal approved · request ${data.id.slice(0, 8)}`),
    });

    return {
      id: req.id,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      balance: next,
      type: req.type,
      amount,
      status: "approved" as const,
      playerNote: req.playerNote,
      staffNote,
      reviewedBy: actor.id,
      createdAt: req.createdAt?.toISOString?.() ?? String(req.createdAt),
      reviewedAt: now.toISOString(),
      previousBalance: current,
    };
  });

  await writeAuditLog({
    actor,
    action: data.decision === "approve" ? "wallet.approve" : "wallet.reject",
    summary:
      data.decision === "approve"
        ? `Approved ${result.type} ₱${result.amount.toFixed(2)} for @${result.username}`
        : `Rejected ${result.type} ₱${result.amount.toFixed(2)} for @${result.username}`,
    targetType: "wallet_request",
    targetId: result.id,
    meta: {
      type: result.type,
      amount: result.amount,
      decision: data.decision,
      userId: result.userId,
      previousBalance: result.previousBalance,
      nextBalance: result.balance,
      actorRole: actor.role,
    },
  });

  const { previousBalance: _, ...publicRow } = result;
  return publicRow;
}

export async function getPlatformSettings(): Promise<PlatformSettingsData> {
  await requireSuperadmin();
  const db = getDb();
  try {
    const rows = await db.select().from(platformSettings).where(eq(platformSettings.id, "default")).limit(1);
    const r = rows[0];
    if (!r) {
      return {
        maintenanceMode: false,
        announcementBanner: "Welcome to MaxHigh Casino! Instant payouts and 24/7 support available.",
        minDeposit: 100,
        maxDeposit: 50000,
        minWithdraw: 200,
        maxWithdraw: 100000,
      };
    }
    return {
      maintenanceMode: r.maintenanceMode === "yes",
      announcementBanner: r.announcementBanner ?? "",
      minDeposit: Number(r.minDeposit),
      maxDeposit: Number(r.maxDeposit),
      minWithdraw: Number(r.minWithdraw),
      maxWithdraw: Number(r.maxWithdraw),
    };
  } catch {
    return {
      maintenanceMode: false,
      announcementBanner: "Welcome to MaxHigh Casino!",
      minDeposit: 100,
      maxDeposit: 50000,
      minWithdraw: 200,
      maxWithdraw: 100000,
    };
  }
}

export async function savePlatformSettings(data: PlatformSettingsData): Promise<PlatformSettingsData> {
  const actor = await requireSuperadmin();
  const db = getDb();
  const rows = await db.select().from(platformSettings).where(eq(platformSettings.id, "default")).limit(1);
  const payload = {
    maintenanceMode: data.maintenanceMode ? ("yes" as const) : ("no" as const),
    announcementBanner: data.announcementBanner,
    minDeposit: money(data.minDeposit),
    maxDeposit: money(data.maxDeposit),
    minWithdraw: money(data.minWithdraw),
    maxWithdraw: money(data.maxWithdraw),
  };

  if (!rows[0]) {
    await db.insert(platformSettings).values({ id: "default", ...payload });
  } else {
    await db.update(platformSettings).set(payload).where(eq(platformSettings.id, "default"));
  }

  await writeAuditLog({
    actor,
    action: "super.platform_settings",
    summary: `Updated platform settings (maintenance: ${data.maintenanceMode ? "ON" : "OFF"})`,
    targetType: "settings",
    targetId: "default",
    meta: data,
  });

  return data;
}

export async function listPromotions(): Promise<PromotionRow[]> {
  await requireSuperadmin();
  const db = getDb();
  try {
    const rows = await db.select().from(promotions).orderBy(desc(promotions.createdAt));
    return rows.map((p) => ({
      id: p.id,
      code: p.code,
      description: p.description,
      bonusPercent: Number(p.bonusPercent),
      maxBonus: Number(p.maxBonus),
      wageringMultiplier: Number(p.wageringMultiplier),
      enabled: p.enabled === "yes",
      createdAt: p.createdAt?.toISOString?.() ?? String(p.createdAt),
    }));
  } catch {
    return [];
  }
}

export async function createPromotion(data: {
  code: string;
  description?: string;
  bonusPercent: number;
  maxBonus: number;
  wageringMultiplier: number;
}): Promise<PromotionRow> {
  const actor = await requireSuperadmin();
  const db = getDb();
  const id = newId();
  const code = data.code.trim().toUpperCase();
  if (!code) throw new Error("Promo code is required");

  await db.insert(promotions).values({
    id,
    code,
    description: data.description?.trim() || null,
    bonusPercent: money(data.bonusPercent),
    maxBonus: money(data.maxBonus),
    wageringMultiplier: money(data.wageringMultiplier),
    enabled: "yes",
  });

  await writeAuditLog({
    actor,
    action: "super.promo_create",
    summary: `Created promo code ${code} (${data.bonusPercent}% match)`,
    targetType: "promotion",
    targetId: id,
    meta: { code, bonusPercent: data.bonusPercent },
  });

  const created = await db.select().from(promotions).where(eq(promotions.id, id)).limit(1);
  const p = created[0]!;
  return {
    id: p.id,
    code: p.code,
    description: p.description,
    bonusPercent: Number(p.bonusPercent),
    maxBonus: Number(p.maxBonus),
    wageringMultiplier: Number(p.wageringMultiplier),
    enabled: p.enabled === "yes",
    createdAt: p.createdAt?.toISOString?.() ?? String(p.createdAt),
  };
}

export async function togglePromotion(id: string, enabled: boolean): Promise<boolean> {
  const actor = await requireSuperadmin();
  const db = getDb();
  await db.update(promotions).set({ enabled: enabled ? "yes" : "no" }).where(eq(promotions.id, id));
  await writeAuditLog({
    actor,
    action: "super.promo_toggle",
    summary: `Toggled promo ${id} -> ${enabled ? "enabled" : "disabled"}`,
    targetType: "promotion",
    targetId: id,
    meta: { enabled },
  });
  return enabled;
}

export async function getRiskControls(): Promise<RiskControlData> {
  await requireSuperadmin();
  const db = getDb();
  try {
    const rows = await db.select().from(riskControls).where(eq(riskControls.id, "default")).limit(1);
    const r = rows[0];
    if (!r) {
      return {
        maxSingleBet: 10000,
        maxDailyPayout: 500000,
        autoFlagLargeWins: true,
        largeWinThreshold: 50000,
      };
    }
    return {
      maxSingleBet: Number(r.maxSingleBet),
      maxDailyPayout: Number(r.maxDailyPayout),
      maxWeeklyLimit: Number(r.maxWeeklyLimit ?? 20000),
      autoFlagLargeWins: r.autoFlagLargeWins === "yes",
      largeWinThreshold: Number(r.largeWinThreshold),
    };
  } catch {
    return {
      maxSingleBet: 10000,
      maxDailyPayout: 500000,
      maxWeeklyLimit: 20000,
      autoFlagLargeWins: true,
      largeWinThreshold: 50000,
    };
  }
}

export async function saveRiskControls(data: RiskControlData): Promise<RiskControlData> {
  const actor = await requireSuperadmin();
  const db = getDb();
  const rows = await db.select().from(riskControls).where(eq(riskControls.id, "default")).limit(1);
  const payload = {
    maxSingleBet: money(data.maxSingleBet),
    maxDailyPayout: money(data.maxDailyPayout),
    maxWeeklyLimit: money(data.maxWeeklyLimit ?? 20000),
    autoFlagLargeWins: data.autoFlagLargeWins ? ("yes" as const) : ("no" as const),
    largeWinThreshold: money(data.largeWinThreshold),
  };

  if (!rows[0]) {
    await db.insert(riskControls).values({ id: "default", ...payload });
  } else {
    await db.update(riskControls).set(payload).where(eq(riskControls.id, "default"));
  }

  await writeAuditLog({
    actor,
    action: "super.risk_controls",
    summary: `Updated risk control parameters (max single bet: ₱${data.maxSingleBet})`,
    targetType: "risk",
    targetId: "default",
    meta: data,
  });

  return data;
}

export async function superGetUserSecurityDetails(userId: string) {
  await requireSuperadmin();
  const db = getDb();

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) throw new Error("User not found");

  const userTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  let totalBets = 0;
  let totalWins = 0;
  let largeWinCount = 0;

  for (const tx of userTx) {
    const amt = Math.abs(Number(tx.amount));
    if (tx.type === "bet") totalBets += amt;
    if (tx.type === "win" || tx.type === "jackpot") {
      totalWins += amt;
      if (amt >= 10000) largeWinCount++;
    }
  }

  const netPnL = totalWins - totalBets;
  const isSuspicious = largeWinCount > 2 || (user.failedAttempts ?? 0) >= 3 || user.isLocked === "yes";

  const userAudit = await db
    .select()
    .from(auditLogs)
    .where(or(eq(auditLogs.actorId, userId), eq(auditLogs.targetId, userId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(20);

  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.lastSeenAt))
    .limit(1);
  const lastSeenAt = sessionRows[0]?.lastSeenAt?.toISOString() ?? user.createdAt.toISOString();

  return {
    securityCode: user.id.slice(0, 6).toUpperCase(),
    totalBets,
    totalWins,
    netPnL,
    totalTransactions: userTx.length,
    largeWinCount,
    lastSeenAt,
    statusText: isSuspicious ? "Elevated Risk — Flagged for inspection" : "Normal Posture",
    isSuspicious,
    recentLogs: userAudit.map((l) => ({
      id: l.id,
      action: l.action,
      summary: l.summary,
      timestamp: l.createdAt?.toISOString?.() ?? String(l.createdAt),
    })),
  };
}

export type EarningsPoint = {
  label: string;
  bets: number;
  wins: number;
  netEarnings: number;
};

export type EarningsGraphData = {
  todayNet: number;
  thisWeekNet: number;
  thisMonthNet: number;
  allTimeNet: number;
  points: EarningsPoint[];
};

export async function fetchPlatformEarningsGraph(opts?: {
  period?: "day" | "week" | "month";
  gameId?: string;
}): Promise<EarningsGraphData> {
  const actor = await requirePermission("REPORTS_VIEW");
  const db = getDb();
  const period = opts?.period ?? "week";
  const game = opts?.gameId?.trim();
  const networkIds = await scopeToDownline(actor, { playersOnly: true });

  if (networkIds !== null && networkIds.length === 0) {
    return { todayNet: 0, thisWeekNet: 0, thisMonthNet: 0, allTimeNet: 0, points: [] };
  }

  // Overall KPI aggregations
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
  const startOfWeek = new Date(startOfDay.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filterGame = game ? like(transactions.game, `%${game}%`) : undefined;
  const filterNetwork = networkIds !== null ? inArray(transactions.userId, networkIds) : undefined;
  const baseWhere = and(filterGame, filterNetwork);

  // 1. Calculate Summary Net Totals directly from immutable transactions ledger table
  const [summaryRow] = await db
    .select({
      todayBets: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' and ${transactions.createdAt} >= ${startOfDay} then abs(${transactions.amount}) else 0 end), 0)`,
      todayWins: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') and ${transactions.createdAt} >= ${startOfDay} then abs(${transactions.amount}) else 0 end), 0)`,

      weekBets: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' and ${transactions.createdAt} >= ${startOfWeek} then abs(${transactions.amount}) else 0 end), 0)`,
      weekWins: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') and ${transactions.createdAt} >= ${startOfWeek} then abs(${transactions.amount}) else 0 end), 0)`,

      monthBets: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' and ${transactions.createdAt} >= ${startOfMonth} then abs(${transactions.amount}) else 0 end), 0)`,
      monthWins: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') and ${transactions.createdAt} >= ${startOfMonth} then abs(${transactions.amount}) else 0 end), 0)`,

      allBets: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
      allWins: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') and ${transactions.createdAt} >= ${startOfMonth} then abs(${transactions.amount}) else 0 end), 0)`,
    })
    .from(transactions)
    .where(baseWhere);

  const todayNet = +(Number(summaryRow?.todayBets ?? 0) - Number(summaryRow?.todayWins ?? 0)).toFixed(2);
  const thisWeekNet = +(Number(summaryRow?.weekBets ?? 0) - Number(summaryRow?.weekWins ?? 0)).toFixed(2);
  const thisMonthNet = +(Number(summaryRow?.monthBets ?? 0) - Number(summaryRow?.monthWins ?? 0)).toFixed(2);
  const allTimeNet = +(Number(summaryRow?.allBets ?? 0) - Number(summaryRow?.allWins ?? 0)).toFixed(2);

  // 2. Generate Time Bucket Points based on period
  let points: EarningsPoint[] = [];

  if (period === "day") {
    // 24 Hourly Buckets for Today
    const hours = Array.from({ length: 24 }, (_, i) => i);
    for (const h of hours) {
      const hStart = new Date(startOfDay.getTime() + h * 60 * 60 * 1000);
      const hEnd = new Date(hStart.getTime() + 60 * 60 * 1000);

      const [hRow] = await db
        .select({
          bets: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
          wins: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then abs(${transactions.amount}) else 0 end), 0)`,
        })
        .from(transactions)
        .where(
          and(
            sql`${transactions.createdAt} >= ${hStart}`,
            sql`${transactions.createdAt} < ${hEnd}`,
            filterGame,
            filterNetwork,
          ),
        );

      const bets = Number(hRow?.bets ?? 0);
      const wins = Number(hRow?.wins ?? 0);
      const netEarnings = +(bets - wins).toFixed(2);
      const label = `${String(h).padStart(2, "0")}:00`;

      points.push({ label, bets, wins, netEarnings });
    }
  } else if (period === "week") {
    // 7 Daily Buckets (Mon to Sun)
    const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const dStart = new Date(startOfWeek.getTime() + i * 24 * 60 * 60 * 1000);
      const dEnd = new Date(dStart.getTime() + 24 * 60 * 60 * 1000);

      const [dRow] = await db
        .select({
          bets: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
          wins: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then abs(${transactions.amount}) else 0 end), 0)`,
        })
        .from(transactions)
        .where(
          and(
            sql`${transactions.createdAt} >= ${dStart}`,
            sql`${transactions.createdAt} < ${dEnd}`,
            filterGame,
            filterNetwork,
          ),
        );

      const bets = Number(dRow?.bets ?? 0);
      const wins = Number(dRow?.wins ?? 0);
      const netEarnings = +(bets - wins).toFixed(2);
      points.push({ label: weekLabels[i]!, bets, wins, netEarnings });
    }
  } else {
    // 12 Monthly Buckets for past year
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = now.getFullYear();
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(currentYear, m, 1);
      const mEnd = new Date(currentYear, m + 1, 1);

      const [mRow] = await db
        .select({
          bets: sql<number>`coalesce(sum(case when ${transactions.type} = 'bet' then abs(${transactions.amount}) else 0 end), 0)`,
          wins: sql<number>`coalesce(sum(case when ${transactions.type} in ('win','jackpot') then abs(${transactions.amount}) else 0 end), 0)`,
        })
        .from(transactions)
        .where(
          and(
            sql`${transactions.createdAt} >= ${mStart}`,
            sql`${transactions.createdAt} < ${mEnd}`,
            filterGame,
            filterNetwork,
          ),
        );

      const bets = Number(mRow?.bets ?? 0);
      const wins = Number(mRow?.wins ?? 0);
      const netEarnings = +(bets - wins).toFixed(2);
      points.push({ label: monthLabels[m]!, bets, wins, netEarnings });
    }
  }

  return {
    todayNet,
    thisWeekNet,
    thisMonthNet,
    allTimeNet,
    points,
  };
}

