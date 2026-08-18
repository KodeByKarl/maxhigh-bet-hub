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
import { isThumbnailOnlyGame, THUMBNAIL_ONLY_GAME_IDS } from "@/lib/playable-games";
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
    if (upline.role !== "master_agent" && upline.role !== "superadmin" && upline.role !== "agent") {
      throw new Error("Upline must be an Agent or Master Agent");
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

/** Persist enabled=no for thumbnail-only titles so lobby + admin stay in sync. */
async function ensureThumbnailOnlyGamesDisabled() {
  const db = getDb();
  const ids = [...THUMBNAIL_ONLY_GAME_IDS];
  if (ids.length === 0) return;

  const existing = await db
    .select({ gameId: gameControls.gameId, enabled: gameControls.enabled })
    .from(gameControls)
    .where(inArray(gameControls.gameId, ids));
  const byId = new Map(existing.map((r) => [r.gameId, r]));

  for (const gameId of ids) {
    const row = byId.get(gameId);
    if (!row) {
      const catalog = slotGames.find((g) => g.id === gameId);
      await db.insert(gameControls).values({
        gameId,
        enabled: "no",
        featured: "no",
        sortOrder: 0,
        tag: catalog?.tag ?? null,
        rtp: catalog?.rtp ?? null,
        volatility: catalog?.volatility ?? null,
        minBet: catalog?.minBet ?? null,
        maxBet: catalog?.maxBet ?? null,
        notes: "Soft-launch: thumbnail only — engine not mounted yet",
      });
      continue;
    }
    if (row.enabled !== "no") {
      await db
        .update(gameControls)
        .set({
          enabled: "no",
          notes: "Soft-launch: thumbnail only — engine not mounted yet",
        })
        .where(eq(gameControls.gameId, gameId));
    }
  }
}

export async function listSuperGames(): Promise<SuperGameRow[]> {
  await requireSuperadmin();
  const db = getDb();
  try {
    await ensureThumbnailOnlyGamesDisabled();
  } catch {
    // best-effort — still return catalog overlay below
  }
  const controls = await db.select().from(gameControls).orderBy(asc(gameControls.sortOrder));
  const byId = new Map(controls.map((c) => [c.gameId, c]));

  // Catalog is the source of truth — dropped titles leave the list even if
  // stale game_controls rows remain in MySQL.
  // Soft-launch: hide thumbnail-only (Coming Soon) titles from the admin grid.
  const rows: SuperGameRow[] = [];
  for (const catalog of slotGames) {
    const id = catalog.id;
    if (isThumbnailOnlyGame(id)) continue;
    const c = byId.get(id);
    rows.push({
      gameId: id,
      name: catalog.name,
      category: catalog.category ?? "slot",
      thumb: catalog.thumb ?? "/games/candy-peak.webp",
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

  // Soft-launch: thumbnail-only titles stay disabled until engines are mounted.
  if (isThumbnailOnlyGame(data.gameId) && data.enabled === true) {
    throw new Error("This title is thumbnail-only for now — enable after the engine is mounted");
  }
  const forceDisabled = isThumbnailOnlyGame(data.gameId);
  const existing = await db.select().from(gameControls).where(eq(gameControls.gameId, data.gameId)).limit(1);
  const patch = {
    enabled:
      forceDisabled
        ? ("no" as const)
        : data.enabled === undefined
          ? undefined
          : data.enabled
            ? ("yes" as const)
            : ("no" as const),
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
      enabled: forceDisabled || data.enabled === false ? "no" : "yes",
      featured: data.featured ? "yes" : "no",
      sortOrder: data.sortOrder ?? 0,
      tag: data.tag ?? catalog.tag ?? null,
      rtp: data.rtp ?? catalog.rtp,
      volatility: data.volatility ?? catalog.volatility,
      minBet: data.minBet ?? catalog.minBet,
      maxBet: data.maxBet ?? catalog.maxBet,
      notes: data.notes ?? (forceDisabled ? "Soft-launch: thumbnail only — engine not mounted yet" : null),
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
    // table may not exist yet — fall back to playable catalog only
    return slotGames.filter((g) => !isThumbnailOnlyGame(g.id));
  }
  const map = new Map(controls.map((c) => [c.gameId, c]));

  type Row = (typeof slotGames)[number] & { _sort: number };
  const rows: Row[] = [];
  for (const g of slotGames) {
    // Soft-launch: never show thumbnail-only titles (no playable engine yet).
    if (isThumbnailOnlyGame(g.id)) continue;
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
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;
    const o = parsed as Record<string, unknown>;
    if (o.deadSpinChancePercent == null && o.deadSpinPct != null) {
      o.deadSpinChancePercent = o.deadSpinPct;
    }
    if (o.targetRtp == null && typeof o.rtp === "number") {
      o.targetRtp = o.rtp;
    }
    if (o.rtpTarget == null && o.targetRtp != null) {
      o.rtpTarget = o.targetRtp;
    }
    if (o.maxWinMult == null && o.maxMultiplier != null) {
      o.maxWinMult = o.maxMultiplier;
    }
    return o;
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

/** Public — Mermaid Riches engine math (defaults if unset). */
export async function getMermaidRichesEngineConfig() {
  const {
    MERMAID_RICHES_GAME_ID,
    DEFAULT_MERMAID_RICHES_CONFIG,
    normalizeMermaidRichesConfig,
  } = await import("@/lib/mermaid-riches-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MERMAID_RICHES_GAME_ID))
      .limit(1);
    return normalizeMermaidRichesConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_MERMAID_RICHES_CONFIG);
  }
}

/** Superadmin — save full Mermaid Riches math config. */
export async function saveMermaidRichesEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    MERMAID_RICHES_GAME_ID,
    normalizeMermaidRichesConfig,
  } = await import("@/lib/mermaid-riches-config");
  const catalog = slotGames.find((g) => g.id === MERMAID_RICHES_GAME_ID);
  if (!catalog) throw new Error("Mermaid Riches not in catalog");

  const cfg = normalizeMermaidRichesConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, MERMAID_RICHES_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: MERMAID_RICHES_GAME_ID,
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
      .where(eq(gameControls.gameId, MERMAID_RICHES_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.mermaid_riches_config",
    summary: `Updated Mermaid Riches engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: MERMAID_RICHES_GAME_ID,
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

/** Public — Boracay Bounce engine math (defaults if unset). */
export async function getBoracayBounceEngineConfig() {
  const {
    BORACAY_BOUNCE_GAME_ID,
    DEFAULT_BORACAY_BOUNCE_CONFIG,
    normalizeBoracayBounceConfig,
  } = await import("@/lib/boracay-bounce-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, BORACAY_BOUNCE_GAME_ID))
      .limit(1);
    return normalizeBoracayBounceConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_BORACAY_BOUNCE_CONFIG);
  }
}

/** Superadmin — save full Boracay Bounce math config. */
export async function saveBoracayBounceEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    BORACAY_BOUNCE_GAME_ID,
    normalizeBoracayBounceConfig,
  } = await import("@/lib/boracay-bounce-config");
  const catalog = slotGames.find((g) => g.id === BORACAY_BOUNCE_GAME_ID);
  if (!catalog) throw new Error("Boracay Bounce not in catalog");

  const cfg = normalizeBoracayBounceConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, BORACAY_BOUNCE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: BORACAY_BOUNCE_GAME_ID,
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
      .where(eq(gameControls.gameId, BORACAY_BOUNCE_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.boracay_bounce_config",
    summary: `Updated Boracay Bounce engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: BORACAY_BOUNCE_GAME_ID,
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

/** Public — Olympus Wrath engine math (defaults if unset). */
export async function getOlympusWrathEngineConfig() {
  const {
    OLYMPUS_WRATH_GAME_ID,
    DEFAULT_OLYMPUS_WRATH_CONFIG,
    normalizeOlympusWrathConfig,
  } = await import("@/lib/olympus-wrath-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, OLYMPUS_WRATH_GAME_ID))
      .limit(1);
    return normalizeOlympusWrathConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_OLYMPUS_WRATH_CONFIG);
  }
}

/** Superadmin — save full Olympus Wrath math config. */
export async function saveOlympusWrathEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { OLYMPUS_WRATH_GAME_ID, normalizeOlympusWrathConfig } = await import(
    "@/lib/olympus-wrath-config"
  );
  const catalog = slotGames.find((g) => g.id === OLYMPUS_WRATH_GAME_ID);
  if (!catalog) throw new Error("Olympus Wrath not in catalog");

  const cfg = normalizeOlympusWrathConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, OLYMPUS_WRATH_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: OLYMPUS_WRATH_GAME_ID,
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
      .where(eq(gameControls.gameId, OLYMPUS_WRATH_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.olympus_wrath_config",
    summary: `Updated Olympus Wrath engine config (dead spin ${cfg.deadSpinChancePercent}%, buy ${cfg.buyFeatureMult}x)`,
    targetType: "game",
    targetId: OLYMPUS_WRATH_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      buyFeatureMult: cfg.buyFeatureMult,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
    },
  });

  return cfg;
}

/** Public — Enchanted Grove engine math (defaults if unset). */
export async function getEnchantedGroveEngineConfig() {
  const {
    ENCHANTED_GROVE_GAME_ID,
    DEFAULT_ENCHANTED_GROVE_CONFIG,
    normalizeEnchantedGroveConfig,
  } = await import("@/lib/enchanted-grove-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, ENCHANTED_GROVE_GAME_ID))
      .limit(1);
    return normalizeEnchantedGroveConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_ENCHANTED_GROVE_CONFIG);
  }
}

/** Superadmin — save full Enchanted Grove math config. */
export async function saveEnchantedGroveEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { ENCHANTED_GROVE_GAME_ID, normalizeEnchantedGroveConfig } = await import(
    "@/lib/enchanted-grove-config"
  );
  const catalog = slotGames.find((g) => g.id === ENCHANTED_GROVE_GAME_ID);
  if (!catalog) throw new Error("Enchanted Grove not in catalog");

  const cfg = normalizeEnchantedGroveConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, ENCHANTED_GROVE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: ENCHANTED_GROVE_GAME_ID,
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
      .where(eq(gameControls.gameId, ENCHANTED_GROVE_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.enchanted_grove_config",
    summary: `Updated Enchanted Grove engine config (dead spin ${cfg.deadSpinChancePercent}%, buy ${cfg.buyFeatureMult}x)`,
    targetType: "game",
    targetId: ENCHANTED_GROVE_GAME_ID,
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

/** Public — Mahjong Ways 2 engine math (defaults if unset). */
export async function getMahjongWays2EngineConfig() {
  const {
    MAHJONG_WAYS_2_GAME_ID,
    DEFAULT_MAHJONG_WAYS_2_CONFIG,
    normalizeMahjongWays2Config,
  } = await import("@/lib/mahjong-ways-2-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MAHJONG_WAYS_2_GAME_ID))
      .limit(1);
    return normalizeMahjongWays2Config(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_MAHJONG_WAYS_2_CONFIG);
  }
}

/** Superadmin — save full Mahjong Ways 2 math config. */
export async function saveMahjongWays2EngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    MAHJONG_WAYS_2_GAME_ID,
    normalizeMahjongWays2Config,
  } = await import("@/lib/mahjong-ways-2-config");
  const catalog = slotGames.find((g) => g.id === MAHJONG_WAYS_2_GAME_ID);
  if (!catalog) throw new Error("Mahjong Ways 2 not in catalog");

  const cfg = normalizeMahjongWays2Config(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, MAHJONG_WAYS_2_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: MAHJONG_WAYS_2_GAME_ID,
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
      .where(eq(gameControls.gameId, MAHJONG_WAYS_2_GAME_ID));
  }

  try {
    const { clearMahjongWays2EngineCache } = await import("../games/mahjong-ways-2.server");
    clearMahjongWays2EngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.mahjong_ways_2_config",
    summary: `Updated Mahjong Ways 2 engine (FS ${cfg.freeSpinsBaseCount}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: MAHJONG_WAYS_2_GAME_ID,
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

/** Public — Dragon & Phoenix engine math (defaults if unset). */
export async function getDragonPhoenixEngineConfig() {
  const {
    DRAGON_PHOENIX_GAME_ID,
    DEFAULT_DRAGON_PHOENIX_CONFIG,
    normalizeDragonPhoenixConfig,
  } = await import("@/lib/dragon-phoenix-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, DRAGON_PHOENIX_GAME_ID))
      .limit(1);
    return normalizeDragonPhoenixConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_DRAGON_PHOENIX_CONFIG);
  }
}

/** Superadmin — save full Dragon & Phoenix math config. */
export async function saveDragonPhoenixEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    DRAGON_PHOENIX_GAME_ID,
    normalizeDragonPhoenixConfig,
  } = await import("@/lib/dragon-phoenix-config");
  const catalog = slotGames.find((g) => g.id === DRAGON_PHOENIX_GAME_ID);
  if (!catalog) throw new Error("Dragon & Phoenix not in catalog");

  const cfg = normalizeDragonPhoenixConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, DRAGON_PHOENIX_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: DRAGON_PHOENIX_GAME_ID,
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
      .where(eq(gameControls.gameId, DRAGON_PHOENIX_GAME_ID));
  }

  try {
    const { clearDragonPhoenixEngineCache } = await import("../games/dragon-phoenix.server");
    clearDragonPhoenixEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.dragon_phoenix_config",
    summary: `Updated Dragon & Phoenix engine (FS ${cfg.freeSpinsBaseCount}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: DRAGON_PHOENIX_GAME_ID,
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

/** Public — Manila Nights engine math (defaults if unset). */
export async function getManilaNightsEngineConfig() {
  const {
    MANILA_NIGHTS_GAME_ID,
    DEFAULT_MANILA_NIGHTS_CONFIG,
    normalizeManilaNightsConfig,
  } = await import("@/lib/manila-nights-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MANILA_NIGHTS_GAME_ID))
      .limit(1);
    return normalizeManilaNightsConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_MANILA_NIGHTS_CONFIG);
  }
}

/** Superadmin — save full Manila Nights math config. */
export async function saveManilaNightsEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    MANILA_NIGHTS_GAME_ID,
    normalizeManilaNightsConfig,
  } = await import("@/lib/manila-nights-config");
  const catalog = slotGames.find((g) => g.id === MANILA_NIGHTS_GAME_ID);
  if (!catalog) throw new Error("Manila Nights not in catalog");

  const cfg = normalizeManilaNightsConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, MANILA_NIGHTS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: MANILA_NIGHTS_GAME_ID,
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
      .where(eq(gameControls.gameId, MANILA_NIGHTS_GAME_ID));
  }

  try {
    const { clearManilaNightsEngineCache } = await import("../games/manila-nights.server");
    clearManilaNightsEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.manila_nights_config",
    summary: `Updated Manila Nights engine (FS ${cfg.freeSpinsBaseCount}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: MANILA_NIGHTS_GAME_ID,
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

/** Public — Mega Ace engine math (defaults if unset). */
export async function getMegaAceEngineConfig() {
  const {
    MEGA_ACE_GAME_ID,
    DEFAULT_MEGA_ACE_CONFIG,
    normalizeMegaAceConfig,
  } = await import("@/lib/mega-ace-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MEGA_ACE_GAME_ID))
      .limit(1);
    return normalizeMegaAceConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_MEGA_ACE_CONFIG);
  }
}

/** Superadmin — save full Mega Ace math config. */
export async function saveMegaAceEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    MEGA_ACE_GAME_ID,
    normalizeMegaAceConfig,
  } = await import("@/lib/mega-ace-config");
  const catalog = slotGames.find((g) => g.id === MEGA_ACE_GAME_ID);
  if (!catalog) throw new Error("Mega Ace not in catalog");

  const cfg = normalizeMegaAceConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, MEGA_ACE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: MEGA_ACE_GAME_ID,
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
      .where(eq(gameControls.gameId, MEGA_ACE_GAME_ID));
  }

  try {
    const { clearMegaAceEngineCache } = await import("../games/mega-ace.server");
    clearMegaAceEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.mega_ace_config",
    summary: `Updated Mega Ace engine (FS ${cfg.freeSpinsBaseCount}/+${cfg.freeSpinsRetriggerCount}, maxWin ${cfg.maxWinMult}x, RTP ${cfg.activeRtpProfile} ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: MEGA_ACE_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      freeSpinsRetriggerCount: cfg.freeSpinsRetriggerCount,
      maxWinMult: cfg.maxWinMult,
      activeRtpProfile: cfg.activeRtpProfile,
      targetRtp: cfg.targetRtp,
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

/** Public — Fiesta Fireworks engine math (defaults if unset). */
export async function getFiestaFireworksEngineConfig() {
  const {
    FIESTA_FIREWORKS_GAME_ID,
    DEFAULT_FIESTA_FIREWORKS_CONFIG,
    normalizeFiestaFireworksConfig,
  } = await import("@/lib/fiesta-fireworks-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, FIESTA_FIREWORKS_GAME_ID))
      .limit(1);
    return normalizeFiestaFireworksConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_FIESTA_FIREWORKS_CONFIG);
  }
}

/** Superadmin — save full Fiesta Fireworks math config. */
export async function saveFiestaFireworksEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    FIESTA_FIREWORKS_GAME_ID,
    normalizeFiestaFireworksConfig,
  } = await import("@/lib/fiesta-fireworks-config");
  const catalog = slotGames.find((g) => g.id === FIESTA_FIREWORKS_GAME_ID);
  if (!catalog) throw new Error("Fiesta Fireworks not in catalog");

  const cfg = normalizeFiestaFireworksConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, FIESTA_FIREWORKS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: FIESTA_FIREWORKS_GAME_ID,
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
      .where(eq(gameControls.gameId, FIESTA_FIREWORKS_GAME_ID));
  }

  try {
    const { clearFiestaFireworksEngineCache } = await import("../games/fiesta-fireworks.server");
    clearFiestaFireworksEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.fiesta_fireworks_config",
    summary: `Updated Fiesta Fireworks engine (FS ${cfg.freeSpinsAward}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: FIESTA_FIREWORKS_GAME_ID,
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

/** Public — Boxing King engine math (defaults if unset). */
export async function getBoxingKingEngineConfig() {
  const {
    BOXING_KING_GAME_ID,
    DEFAULT_BOXING_KING_CONFIG,
    normalizeBoxingKingConfig,
  } = await import("@/lib/boxing-king-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, BOXING_KING_GAME_ID))
      .limit(1);
    return normalizeBoxingKingConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_BOXING_KING_CONFIG);
  }
}

/** Superadmin — save full Boxing King math config. */
export async function saveBoxingKingEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { BOXING_KING_GAME_ID, normalizeBoxingKingConfig } = await import("@/lib/boxing-king-config");
  const catalog = slotGames.find((g) => g.id === BOXING_KING_GAME_ID);
  if (!catalog) throw new Error("Boxing King not in catalog");

  const cfg = normalizeBoxingKingConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, BOXING_KING_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: BOXING_KING_GAME_ID,
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
      .where(eq(gameControls.gameId, BOXING_KING_GAME_ID));
  }

  try {
    const { clearBoxingKingEngineCache } = await import("../games/boxing-king.server");
    clearBoxingKingEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.boxing_king_config",
    summary: `Updated Boxing King engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, JP ${cfg.grandJackpotMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: BOXING_KING_GAME_ID,
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

/** Public — Goal Rush engine math (defaults if unset). */
export async function getGoalRushEngineConfig() {
  const {
    GOAL_RUSH_GAME_ID,
    DEFAULT_GOAL_RUSH_CONFIG,
    normalizeGoalRushConfig,
  } = await import("@/lib/goal-rush-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, GOAL_RUSH_GAME_ID))
      .limit(1);
    return normalizeGoalRushConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_GOAL_RUSH_CONFIG);
  }
}

/** Superadmin — save full Goal Rush math config. */
export async function saveGoalRushEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { GOAL_RUSH_GAME_ID, normalizeGoalRushConfig } = await import("@/lib/goal-rush-config");
  const catalog = slotGames.find((g) => g.id === GOAL_RUSH_GAME_ID);
  if (!catalog) throw new Error("Goal Rush not in catalog");

  const cfg = normalizeGoalRushConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, GOAL_RUSH_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: GOAL_RUSH_GAME_ID,
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
      .where(eq(gameControls.gameId, GOAL_RUSH_GAME_ID));
  }

  try {
    const { clearGoalRushEngineCache } = await import("../games/goal-rush.server");
    clearGoalRushEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.goal_rush_config",
    summary: `Updated Goal Rush engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, JP ${cfg.grandJackpotMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: GOAL_RUSH_GAME_ID,
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

/** Public — Money Coming engine math (defaults if unset). */
export async function getMoneyComingEngineConfig() {
  const {
    MONEY_COMING_GAME_ID,
    DEFAULT_MONEY_COMING_CONFIG,
    normalizeMoneyComingConfig,
  } = await import("@/lib/money-coming-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MONEY_COMING_GAME_ID))
      .limit(1);
    return normalizeMoneyComingConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_MONEY_COMING_CONFIG);
  }
}

/** Superadmin — save full Money Coming math config. */
export async function saveMoneyComingEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { MONEY_COMING_GAME_ID, normalizeMoneyComingConfig } = await import(
    "@/lib/money-coming-config"
  );
  const catalog = slotGames.find((g) => g.id === MONEY_COMING_GAME_ID);
  if (!catalog) throw new Error("Money Coming not in catalog");

  const cfg = normalizeMoneyComingConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, MONEY_COMING_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: MONEY_COMING_GAME_ID,
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
      .where(eq(gameControls.gameId, MONEY_COMING_GAME_ID));
  }

  try {
    const { clearMoneyComingEngineCache } = await import("../games/money-coming.server");
    clearMoneyComingEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.money_coming_config",
    summary: `Updated Money Coming engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, JP ${cfg.grandJackpotMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: MONEY_COMING_GAME_ID,
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

/** Public — Fortune Ox engine math (defaults if unset). */
export async function getFortuneOxEngineConfig() {
  const {
    FORTUNE_OX_GAME_ID,
    DEFAULT_FORTUNE_OX_CONFIG,
    normalizeFortuneOxConfig,
  } = await import("@/lib/fortune-ox-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, FORTUNE_OX_GAME_ID))
      .limit(1);
    return normalizeFortuneOxConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_FORTUNE_OX_CONFIG);
  }
}

/** Superadmin — save full Fortune Ox math config. */
export async function saveFortuneOxEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { FORTUNE_OX_GAME_ID, normalizeFortuneOxConfig } = await import(
    "@/lib/fortune-ox-config"
  );
  const catalog = slotGames.find((g) => g.id === FORTUNE_OX_GAME_ID);
  if (!catalog) throw new Error("Fortune Ox not in catalog");

  const cfg = normalizeFortuneOxConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, FORTUNE_OX_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: FORTUNE_OX_GAME_ID,
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
      .where(eq(gameControls.gameId, FORTUNE_OX_GAME_ID));
  }

  try {
    const { clearFortuneOxEngineCache } = await import("../games/fortune-ox.server");
    clearFortuneOxEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.fortune_ox_config",
    summary: `Updated Fortune Ox engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, EX ${cfg.exBetMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: FORTUNE_OX_GAME_ID,
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

/** Public — Fortune Tiger engine math (defaults if unset). */
export async function getFortuneTigerEngineConfig() {
  const {
    FORTUNE_TIGER_GAME_ID,
    DEFAULT_FORTUNE_TIGER_CONFIG,
    normalizeFortuneTigerConfig,
  } = await import("@/lib/fortune-tiger-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, FORTUNE_TIGER_GAME_ID))
      .limit(1);
    return normalizeFortuneTigerConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_FORTUNE_TIGER_CONFIG);
  }
}

/** Superadmin — save full Fortune Tiger math config. */
export async function saveFortuneTigerEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { FORTUNE_TIGER_GAME_ID, normalizeFortuneTigerConfig } = await import(
    "@/lib/fortune-tiger-config"
  );
  const catalog = slotGames.find((g) => g.id === FORTUNE_TIGER_GAME_ID);
  if (!catalog) throw new Error("Fortune Tiger not in catalog");

  const cfg = normalizeFortuneTigerConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, FORTUNE_TIGER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: FORTUNE_TIGER_GAME_ID,
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
      .where(eq(gameControls.gameId, FORTUNE_TIGER_GAME_ID));
  }

  try {
    const { clearFortuneTigerEngineCache } = await import("../games/fortune-tiger.server");
    clearFortuneTigerEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.fortune_tiger_config",
    summary: `Updated Fortune Tiger engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, EX ${cfg.exBetMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: FORTUNE_TIGER_GAME_ID,
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

/** Public — Fortune Rabbit engine math (defaults if unset). */
export async function getFortuneRabbitEngineConfig() {
  const {
    FORTUNE_RABBIT_GAME_ID,
    DEFAULT_FORTUNE_RABBIT_CONFIG,
    normalizeFortuneRabbitConfig,
  } = await import("@/lib/fortune-rabbit-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, FORTUNE_RABBIT_GAME_ID))
      .limit(1);
    return normalizeFortuneRabbitConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_FORTUNE_RABBIT_CONFIG);
  }
}

/** Superadmin — save full Fortune Rabbit math config. */
export async function saveFortuneRabbitEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { FORTUNE_RABBIT_GAME_ID, normalizeFortuneRabbitConfig } = await import(
    "@/lib/fortune-rabbit-config"
  );
  const catalog = slotGames.find((g) => g.id === FORTUNE_RABBIT_GAME_ID);
  if (!catalog) throw new Error("Fortune Rabbit not in catalog");

  const cfg = normalizeFortuneRabbitConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, FORTUNE_RABBIT_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: FORTUNE_RABBIT_GAME_ID,
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
      .where(eq(gameControls.gameId, FORTUNE_RABBIT_GAME_ID));
  }

  try {
    const { clearFortuneRabbitEngineCache } = await import("../games/fortune-rabbit.server");
    clearFortuneRabbitEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.fortune_rabbit_config",
    summary: `Updated Fortune Rabbit engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, EX ${cfg.exBetMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: FORTUNE_RABBIT_GAME_ID,
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

/** Public — Dust & Dollars engine math. */
export async function getDustDollarsEngineConfig() {
  const {
    DUST_DOLLARS_GAME_ID,
    DEFAULT_DUST_DOLLARS_CONFIG,
    normalizeDustDollarsConfig,
  } = await import("@/lib/dust-dollars-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, DUST_DOLLARS_GAME_ID))
      .limit(1);
    return normalizeDustDollarsConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_DUST_DOLLARS_CONFIG);
  }
}

/** Superadmin — save full Dust & Dollars math config. */
export async function saveDustDollarsEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    DUST_DOLLARS_GAME_ID,
    normalizeDustDollarsConfig,
  } = await import("@/lib/dust-dollars-config");
  const catalog = slotGames.find((g) => g.id === DUST_DOLLARS_GAME_ID);
  if (!catalog) throw new Error("Dust & Dollars not in catalog");

  const cfg = normalizeDustDollarsConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, DUST_DOLLARS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: DUST_DOLLARS_GAME_ID,
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
      .where(eq(gameControls.gameId, DUST_DOLLARS_GAME_ID));
  }

  try {
    const { clearDustDollarsEngineCache } = await import("../games/dust-dollars.server");
    clearDustDollarsEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.dust_dollars_config",
    summary: `Updated Dust & Dollars engine (FS ${cfg.freeSpinsBaseCount}, H&W ${cfg.holdWinTriggerCount}+ coins, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: DUST_DOLLARS_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      holdWinTriggerCount: cfg.holdWinTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}

/** Public — Cleopatra Gold engine math. */
export async function getCleopatraGoldEngineConfig() {
  const {
    CLEOPATRA_GOLD_GAME_ID,
    DEFAULT_CLEOPATRA_GOLD_CONFIG,
    normalizeCleopatraGoldConfig,
  } = await import("@/lib/cleopatra-gold-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CLEOPATRA_GOLD_GAME_ID))
      .limit(1);
    return normalizeCleopatraGoldConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CLEOPATRA_GOLD_CONFIG);
  }
}

/** Superadmin — save Cleopatra Gold math config. */
export async function saveCleopatraGoldEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    CLEOPATRA_GOLD_GAME_ID,
    normalizeCleopatraGoldConfig,
  } = await import("@/lib/cleopatra-gold-config");
  const catalog = slotGames.find((g) => g.id === CLEOPATRA_GOLD_GAME_ID);
  if (!catalog) throw new Error("Cleopatra Gold not in catalog");

  const cfg = normalizeCleopatraGoldConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CLEOPATRA_GOLD_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CLEOPATRA_GOLD_GAME_ID,
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
      .where(eq(gameControls.gameId, CLEOPATRA_GOLD_GAME_ID));
  }

  try {
    const { clearCleopatraGoldEngineCache } = await import("../games/cleopatra-gold.server");
    clearCleopatraGoldEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.cleopatra_gold_config",
    summary: `Updated Cleopatra Gold (FS ${cfg.freeSpinsBaseCount}, chests ${cfg.chestTriggerCount}+, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: CLEOPATRA_GOLD_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      chestTriggerCount: cfg.chestTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}

/** Public — Gold Mine Dig engine math. */
export async function getGoldMineEngineConfig() {
  const {
    GOLD_MINE_GAME_ID,
    DEFAULT_GOLD_MINE_CONFIG,
    normalizeGoldMineConfig,
  } = await import("@/lib/gold-mine-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, GOLD_MINE_GAME_ID))
      .limit(1);
    return normalizeGoldMineConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_GOLD_MINE_CONFIG);
  }
}

/** Superadmin — save full Gold Mine Dig math config. */
export async function saveGoldMineEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    GOLD_MINE_GAME_ID,
    normalizeGoldMineConfig,
  } = await import("@/lib/gold-mine-config");
  const catalog = slotGames.find((g) => g.id === GOLD_MINE_GAME_ID);
  if (!catalog) throw new Error("Gold Mine Dig not in catalog");

  const cfg = normalizeGoldMineConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, GOLD_MINE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: GOLD_MINE_GAME_ID,
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
      .where(eq(gameControls.gameId, GOLD_MINE_GAME_ID));
  }

  try {
    const { clearGoldMineEngineCache } = await import("../games/gold-mine.server");
    clearGoldMineEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.gold_mine_config",
    summary: `Updated Gold Mine Dig engine (FS ${cfg.freeSpinsBaseCount}, H&W ${cfg.holdWinTriggerCount}+ coins, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: GOLD_MINE_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      holdWinTriggerCount: cfg.holdWinTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}

/** Public — Jeepney Jackpot engine math. */
export async function getJeepneyJackpotEngineConfig() {
  const {
    JEEPNEY_JACKPOT_GAME_ID,
    DEFAULT_JEEPNEY_JACKPOT_CONFIG,
    normalizeJeepneyJackpotConfig,
  } = await import("@/lib/jeepney-jackpot-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, JEEPNEY_JACKPOT_GAME_ID))
      .limit(1);
    return normalizeJeepneyJackpotConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_JEEPNEY_JACKPOT_CONFIG);
  }
}

/** Superadmin — save full Jeepney Jackpot math config. */
export async function saveJeepneyJackpotEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    JEEPNEY_JACKPOT_GAME_ID,
    normalizeJeepneyJackpotConfig,
  } = await import("@/lib/jeepney-jackpot-config");
  const catalog = slotGames.find((g) => g.id === JEEPNEY_JACKPOT_GAME_ID);
  if (!catalog) throw new Error("Jeepney Jackpot not in catalog");

  const cfg = normalizeJeepneyJackpotConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, JEEPNEY_JACKPOT_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: JEEPNEY_JACKPOT_GAME_ID,
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
      .where(eq(gameControls.gameId, JEEPNEY_JACKPOT_GAME_ID));
  }

  try {
    const { clearJeepneyJackpotEngineCache } = await import("../games/jeepney-jackpot.server");
    clearJeepneyJackpotEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.jeepney_jackpot_config",
    summary: `Updated Jeepney Jackpot engine (FS ${cfg.freeSpinsBaseCount}, H&W ${cfg.holdWinTriggerCount}+ coins, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: JEEPNEY_JACKPOT_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      holdWinTriggerCount: cfg.holdWinTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}

/** Public — Sari-Sari Spin engine math (defaults if unset). */
export async function getSariSariSpinEngineConfig() {
  const {
    SARI_SARI_SPIN_GAME_ID,
    DEFAULT_SARI_SARI_SPIN_CONFIG,
    normalizeSariSariSpinConfig,
  } = await import("@/lib/sari-sari-spin-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, SARI_SARI_SPIN_GAME_ID))
      .limit(1);
    return normalizeSariSariSpinConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_SARI_SARI_SPIN_CONFIG);
  }
}

/** Superadmin — save full Sari-Sari Spin math config. */
export async function saveSariSariSpinEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { SARI_SARI_SPIN_GAME_ID, normalizeSariSariSpinConfig } = await import(
    "@/lib/sari-sari-spin-config"
  );
  const catalog = slotGames.find((g) => g.id === SARI_SARI_SPIN_GAME_ID);
  if (!catalog) throw new Error("Sari-Sari Spin not in catalog");

  const cfg = normalizeSariSariSpinConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, SARI_SARI_SPIN_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: SARI_SARI_SPIN_GAME_ID,
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
      .where(eq(gameControls.gameId, SARI_SARI_SPIN_GAME_ID));
  }

  try {
    const { clearSariSariSpinEngineCache } = await import("../games/sari-sari-spin.server");
    clearSariSariSpinEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.sari_sari_spin_config",
    summary: `Updated Sari-Sari Spin engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, EX ${cfg.exBetMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: SARI_SARI_SPIN_GAME_ID,
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

/** Public — Carabao Charge engine math. */
export async function getCarabaoChargeEngineConfig() {
  const {
    CARABAO_CHARGE_GAME_ID,
    DEFAULT_CARABAO_CHARGE_CONFIG,
    normalizeCarabaoChargeConfig,
  } = await import("@/lib/carabao-charge-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CARABAO_CHARGE_GAME_ID))
      .limit(1);
    return normalizeCarabaoChargeConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CARABAO_CHARGE_CONFIG);
  }
}

/** Superadmin — save Carabao Charge math config. */
export async function saveCarabaoChargeEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    CARABAO_CHARGE_GAME_ID,
    normalizeCarabaoChargeConfig,
  } = await import("@/lib/carabao-charge-config");
  const catalog = slotGames.find((g) => g.id === CARABAO_CHARGE_GAME_ID);
  if (!catalog) throw new Error("Carabao Charge not in catalog");

  const cfg = normalizeCarabaoChargeConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CARABAO_CHARGE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CARABAO_CHARGE_GAME_ID,
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
      .where(eq(gameControls.gameId, CARABAO_CHARGE_GAME_ID));
  }

  try {
    const { clearCarabaoChargeEngineCache } = await import("../games/carabao-charge.server");
    clearCarabaoChargeEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.carabao_charge_config",
    summary: `Updated Carabao Charge (FS ${cfg.freeSpinsBaseCount}, chests ${cfg.chestTriggerCount}+, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: CARABAO_CHARGE_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      chestTriggerCount: cfg.chestTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
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

/** Public — Crazy Sevens engine math (defaults if unset). */
export async function getCrazySevensEngineConfig() {
  const {
    CRAZY_SEVENS_GAME_ID,
    DEFAULT_CRAZY_SEVENS_CONFIG,
    normalizeCrazySevensConfig,
  } = await import("@/lib/crazy-sevens-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CRAZY_SEVENS_GAME_ID))
      .limit(1);
    return normalizeCrazySevensConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CRAZY_SEVENS_CONFIG);
  }
}

/** Superadmin — save full Crazy Sevens math config. */
export async function saveCrazySevensEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { CRAZY_SEVENS_GAME_ID, normalizeCrazySevensConfig } = await import(
    "@/lib/crazy-sevens-config"
  );
  const catalog = slotGames.find((g) => g.id === CRAZY_SEVENS_GAME_ID);
  if (!catalog) throw new Error("Crazy Sevens not in catalog");

  const cfg = normalizeCrazySevensConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CRAZY_SEVENS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CRAZY_SEVENS_GAME_ID,
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
      .where(eq(gameControls.gameId, CRAZY_SEVENS_GAME_ID));
  }

  try {
    const { clearCrazySevensEngineCache } = await import("../games/crazy-sevens.server");
    clearCrazySevensEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.crazy_sevens_config",
    summary: `Updated Crazy Sevens engine (maxBet ${cfg.maxBet}, twoWild ${cfg.twoWildPayMult}x, RTP placeholder ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: CRAZY_SEVENS_GAME_ID,
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

/** Public — Baccarat engine math (defaults if unset). */
export async function getBaccaratEngineConfig() {
  const {
    BACCARAT_GAME_ID,
    DEFAULT_BACCARAT_CONFIG,
    normalizeBaccaratConfig,
  } = await import("@/lib/baccarat-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, BACCARAT_GAME_ID))
      .limit(1);
    return normalizeBaccaratConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_BACCARAT_CONFIG);
  }
}

/** Superadmin — save full Baccarat math config. */
export async function saveBaccaratEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { BACCARAT_GAME_ID, normalizeBaccaratConfig } = await import("@/lib/baccarat-config");
  const catalog = slotGames.find((g) => g.id === BACCARAT_GAME_ID);
  if (!catalog) throw new Error("Baccarat not in catalog");

  const cfg = normalizeBaccaratConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, BACCARAT_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = Math.min(cfg.minPlayerBet, cfg.minBankerBet);
  const maxMain = Math.max(cfg.maxPlayerBet, cfg.maxBankerBet);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: BACCARAT_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, BACCARAT_GAME_ID));
  }

  try {
    const { clearBaccaratEngineCache } = await import("../games/baccarat.server");
    clearBaccaratEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.baccarat_config",
    summary: `Updated Baccarat engine (banker ${cfg.bankerPayout}x, commission ${cfg.bankerCommission}, tie ${cfg.tiePayout}:1, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: BACCARAT_GAME_ID,
    meta: {
      playerPayout: cfg.playerPayout,
      bankerPayout: cfg.bankerPayout,
      bankerCommission: cfg.bankerCommission,
      tiePayout: cfg.tiePayout,
      playerPairPayout: cfg.playerPairPayout,
      bankerPairPayout: cfg.bankerPairPayout,
      deckCount: cfg.deckCount,
      rtpTarget: cfg.rtpTarget,
    },
  });

  return cfg;
}

/** Public — Deep Bass engine math (defaults if unset). */
export async function getDeepBassEngineConfig() {
  const {
    DEEP_BASS_GAME_ID,
    DEFAULT_DEEP_BASS_CONFIG,
    normalizeDeepBassConfig,
  } = await import("@/lib/deep-bass-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, DEEP_BASS_GAME_ID))
      .limit(1);
    return normalizeDeepBassConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_DEEP_BASS_CONFIG);
  }
}

/** Superadmin — save full Deep Bass math config. */
export async function saveDeepBassEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { DEEP_BASS_GAME_ID, normalizeDeepBassConfig } = await import(
    "@/lib/deep-bass-config"
  );
  const catalog = slotGames.find((g) => g.id === DEEP_BASS_GAME_ID);
  if (!catalog) throw new Error("Deep Bass not in catalog");

  const cfg = normalizeDeepBassConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, DEEP_BASS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minBet;
  const maxMain = cfg.maxBet;

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: DEEP_BASS_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, DEEP_BASS_GAME_ID));
  }

  try {
    const { clearDeepBassEngineCache } = await import("../games/deep-bass.server");
    clearDeepBassEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.deep_bass_config",
    summary: `Updated Deep Bass engine (RTP ${cfg.rtpTarget}%, boss finisher ${(cfg.boss.finisherShare * 100).toFixed(0)}%)`,
    targetType: "game",
    targetId: DEEP_BASS_GAME_ID,
    meta: {
      rtpTarget: cfg.rtpTarget,
      maxHitChance: cfg.maxHitChance,
      bossSpawnChance: cfg.boss.spawnChance,
      finisherShare: cfg.boss.finisherShare,
      weaponCount: cfg.weapons.length,
      fishCount: cfg.fishTiers.length,
    },
  });

  return cfg;
}

/** Public — Dragon Fisher engine math (defaults if unset). */
export async function getDragonFisherEngineConfig() {
  const {
    DRAGON_FISHER_GAME_ID,
    DEFAULT_DRAGON_FISHER_CONFIG,
    normalizeDragonFisherConfig,
  } = await import("@/lib/dragon-fisher-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, DRAGON_FISHER_GAME_ID))
      .limit(1);
    return normalizeDragonFisherConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_DRAGON_FISHER_CONFIG);
  }
}

/** Superadmin — save full Dragon Fisher math config. */
export async function saveDragonFisherEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { DRAGON_FISHER_GAME_ID, normalizeDragonFisherConfig } = await import(
    "@/lib/dragon-fisher-config"
  );
  const catalog = slotGames.find((g) => g.id === DRAGON_FISHER_GAME_ID);
  if (!catalog) throw new Error("Dragon Fisher not in catalog");

  const cfg = normalizeDragonFisherConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, DRAGON_FISHER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minBet;
  const maxMain = cfg.maxBet;

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: DRAGON_FISHER_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, DRAGON_FISHER_GAME_ID));
  }

  try {
    const { clearDragonFisherEngineCache } = await import("../games/dragon-fisher.server");
    clearDragonFisherEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.dragon_fisher_config",
    summary: `Updated Dragon Fisher engine (RTP ${cfg.rtpTarget}%, boss finisher ${(cfg.boss.finisherShare * 100).toFixed(0)}%)`,
    targetType: "game",
    targetId: DRAGON_FISHER_GAME_ID,
    meta: {
      rtpTarget: cfg.rtpTarget,
      maxHitChance: cfg.maxHitChance,
      bossSpawnChance: cfg.boss.spawnChance,
      finisherShare: cfg.boss.finisherShare,
      weaponCount: cfg.weapons.length,
      fishCount: cfg.fishTiers.length,
    },
  });

  return cfg;
}

/** Public — Crab Cannon engine math (defaults if unset). */
export async function getCrabCannonEngineConfig() {
  const {
    CRAB_CANNON_GAME_ID,
    DEFAULT_CRAB_CANNON_CONFIG,
    normalizeCrabCannonConfig,
  } = await import("@/lib/crab-cannon-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CRAB_CANNON_GAME_ID))
      .limit(1);
    return normalizeCrabCannonConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CRAB_CANNON_CONFIG);
  }
}

/** Superadmin — save full Crab Cannon math config. */
export async function saveCrabCannonEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { CRAB_CANNON_GAME_ID, normalizeCrabCannonConfig } = await import(
    "@/lib/crab-cannon-config"
  );
  const catalog = slotGames.find((g) => g.id === CRAB_CANNON_GAME_ID);
  if (!catalog) throw new Error("Crab Cannon not in catalog");

  const cfg = normalizeCrabCannonConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CRAB_CANNON_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minBet;
  const maxMain = cfg.maxBet;

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CRAB_CANNON_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, CRAB_CANNON_GAME_ID));
  }

  try {
    const { clearCrabCannonEngineCache } = await import("../games/crab-cannon.server");
    clearCrabCannonEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.crab_cannon_config",
    summary: `Updated Crab Cannon engine (RTP ${cfg.rtpTarget}%, boss finisher ${(cfg.boss.finisherShare * 100).toFixed(0)}%)`,
    targetType: "game",
    targetId: CRAB_CANNON_GAME_ID,
    meta: {
      rtpTarget: cfg.rtpTarget,
      maxHitChance: cfg.maxHitChance,
      bossSpawnChance: cfg.boss.spawnChance,
      finisherShare: cfg.boss.finisherShare,
      weaponCount: cfg.weapons.length,
      fishCount: cfg.fishTiers.length,
    },
  });

  return cfg;
}

/** Public — Phoenix Fisher engine math (defaults if unset). */
export async function getPhoenixFisherEngineConfig() {
  const {
    PHOENIX_FISHER_GAME_ID,
    DEFAULT_PHOENIX_FISHER_CONFIG,
    normalizePhoenixFisherConfig,
  } = await import("@/lib/phoenix-fisher-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, PHOENIX_FISHER_GAME_ID))
      .limit(1);
    return normalizePhoenixFisherConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_PHOENIX_FISHER_CONFIG);
  }
}

/** Superadmin — save full Phoenix Fisher math config. */
export async function savePhoenixFisherEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { PHOENIX_FISHER_GAME_ID, normalizePhoenixFisherConfig } = await import(
    "@/lib/phoenix-fisher-config"
  );
  const catalog = slotGames.find((g) => g.id === PHOENIX_FISHER_GAME_ID);
  if (!catalog) throw new Error("Phoenix Fisher not in catalog");

  const cfg = normalizePhoenixFisherConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, PHOENIX_FISHER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minBet;
  const maxMain = cfg.maxBet;

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: PHOENIX_FISHER_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, PHOENIX_FISHER_GAME_ID));
  }

  try {
    const { clearPhoenixFisherEngineCache } = await import("../games/phoenix-fisher.server");
    clearPhoenixFisherEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.phoenix_fisher_config",
    summary: `Updated Phoenix Fisher engine (RTP ${cfg.rtpTarget}%, boss finisher ${(cfg.boss.finisherShare * 100).toFixed(0)}%)`,
    targetType: "game",
    targetId: PHOENIX_FISHER_GAME_ID,
    meta: {
      rtpTarget: cfg.rtpTarget,
      maxHitChance: cfg.maxHitChance,
      bossSpawnChance: cfg.boss.spawnChance,
      finisherShare: cfg.boss.finisherShare,
      weaponCount: cfg.weapons.length,
      fishCount: cfg.fishTiers.length,
    },
  });

  return cfg;
}

/** Public — Shark Hunter engine math (defaults if unset). */
export async function getSharkHunterEngineConfig() {
  const {
    SHARK_HUNTER_GAME_ID,
    DEFAULT_SHARK_HUNTER_CONFIG,
    normalizeSharkHunterConfig,
  } = await import("@/lib/shark-hunter-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, SHARK_HUNTER_GAME_ID))
      .limit(1);
    return normalizeSharkHunterConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_SHARK_HUNTER_CONFIG);
  }
}

/** Superadmin — save full Shark Hunter math config. */
export async function saveSharkHunterEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { SHARK_HUNTER_GAME_ID, normalizeSharkHunterConfig } = await import(
    "@/lib/shark-hunter-config"
  );
  const catalog = slotGames.find((g) => g.id === SHARK_HUNTER_GAME_ID);
  if (!catalog) throw new Error("Shark Hunter not in catalog");

  const cfg = normalizeSharkHunterConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, SHARK_HUNTER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minBet;
  const maxMain = cfg.maxBet;

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: SHARK_HUNTER_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, SHARK_HUNTER_GAME_ID));
  }

  try {
    const { clearSharkHunterEngineCache } = await import("../games/shark-hunter.server");
    clearSharkHunterEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.shark_hunter_config",
    summary: `Updated Shark Hunter engine (RTP ${cfg.rtpTarget}%, boss finisher ${(cfg.boss.finisherShare * 100).toFixed(0)}%)`,
    targetType: "game",
    targetId: SHARK_HUNTER_GAME_ID,
    meta: {
      rtpTarget: cfg.rtpTarget,
      maxHitChance: cfg.maxHitChance,
      bossSpawnChance: cfg.boss.spawnChance,
      finisherShare: cfg.boss.finisherShare,
      weaponCount: cfg.weapons.length,
      fishCount: cfg.fishTiers.length,
    },
  });

  return cfg;
}

/** Public — Octopus Armada engine math (defaults if unset). */
export async function getOctopusArmadaEngineConfig() {
  const {
    OCTOPUS_ARMADA_GAME_ID,
    DEFAULT_OCTOPUS_ARMADA_CONFIG,
    normalizeOctopusArmadaConfig,
  } = await import("@/lib/octopus-armada-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, OCTOPUS_ARMADA_GAME_ID))
      .limit(1);
    return normalizeOctopusArmadaConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_OCTOPUS_ARMADA_CONFIG);
  }
}

/** Superadmin — save full Octopus Armada math config. */
export async function saveOctopusArmadaEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { OCTOPUS_ARMADA_GAME_ID, normalizeOctopusArmadaConfig } = await import(
    "@/lib/octopus-armada-config"
  );
  const catalog = slotGames.find((g) => g.id === OCTOPUS_ARMADA_GAME_ID);
  if (!catalog) throw new Error("Octopus Armada not in catalog");

  const cfg = normalizeOctopusArmadaConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, OCTOPUS_ARMADA_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minBet;
  const maxMain = cfg.maxBet;

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: OCTOPUS_ARMADA_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, OCTOPUS_ARMADA_GAME_ID));
  }

  try {
    const { clearOctopusArmadaEngineCache } = await import("../games/octopus-armada.server");
    clearOctopusArmadaEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.octopus_armada_config",
    summary: `Updated Octopus Armada engine (RTP ${cfg.rtpTarget}%, boss finisher ${(cfg.boss.finisherShare * 100).toFixed(0)}%)`,
    targetType: "game",
    targetId: OCTOPUS_ARMADA_GAME_ID,
    meta: {
      rtpTarget: cfg.rtpTarget,
      maxHitChance: cfg.maxHitChance,
      bossSpawnChance: cfg.boss.spawnChance,
      finisherShare: cfg.boss.finisherShare,
      weaponCount: cfg.weapons.length,
      fishCount: cfg.fishTiers.length,
    },
  });

  return cfg;
}

/** Public — Turtle Tide engine math (defaults if unset). */
export async function getTurtleTideEngineConfig() {
  const {
    TURTLE_TIDE_GAME_ID,
    DEFAULT_TURTLE_TIDE_CONFIG,
    normalizeTurtleTideConfig,
  } = await import("@/lib/turtle-tide-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, TURTLE_TIDE_GAME_ID))
      .limit(1);
    return normalizeTurtleTideConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_TURTLE_TIDE_CONFIG);
  }
}

/** Superadmin — save full Turtle Tide math config. */
export async function saveTurtleTideEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { TURTLE_TIDE_GAME_ID, normalizeTurtleTideConfig } = await import(
    "@/lib/turtle-tide-config"
  );
  const catalog = slotGames.find((g) => g.id === TURTLE_TIDE_GAME_ID);
  if (!catalog) throw new Error("Turtle Tide not in catalog");

  const cfg = normalizeTurtleTideConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, TURTLE_TIDE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minBet;
  const maxMain = cfg.maxBet;

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: TURTLE_TIDE_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, TURTLE_TIDE_GAME_ID));
  }

  try {
    const { clearTurtleTideEngineCache } = await import("../games/turtle-tide.server");
    clearTurtleTideEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.turtle_tide_config",
    summary: `Updated Turtle Tide engine (RTP ${cfg.rtpTarget}%, boss finisher ${(cfg.boss.finisherShare * 100).toFixed(0)}%)`,
    targetType: "game",
    targetId: TURTLE_TIDE_GAME_ID,
    meta: {
      rtpTarget: cfg.rtpTarget,
      maxHitChance: cfg.maxHitChance,
      bossSpawnChance: cfg.boss.spawnChance,
      finisherShare: cfg.boss.finisherShare,
      weaponCount: cfg.weapons.length,
      fishCount: cfg.fishTiers.length,
    },
  });

  return cfg;
}

/** Public — Whale War engine math (defaults if unset). */
export async function getWhaleWarEngineConfig() {
  const {
    WHALE_WAR_GAME_ID,
    DEFAULT_WHALE_WAR_CONFIG,
    normalizeWhaleWarConfig,
  } = await import("@/lib/whale-war-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, WHALE_WAR_GAME_ID))
      .limit(1);
    return normalizeWhaleWarConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_WHALE_WAR_CONFIG);
  }
}

/** Superadmin — save full Whale War math config. */
export async function saveWhaleWarEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { WHALE_WAR_GAME_ID, normalizeWhaleWarConfig } = await import(
    "@/lib/whale-war-config"
  );
  const catalog = slotGames.find((g) => g.id === WHALE_WAR_GAME_ID);
  if (!catalog) throw new Error("Whale War not in catalog");

  const cfg = normalizeWhaleWarConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, WHALE_WAR_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minBet;
  const maxMain = cfg.maxBet;

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: WHALE_WAR_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, WHALE_WAR_GAME_ID));
  }

  try {
    const { clearWhaleWarEngineCache } = await import("../games/whale-war.server");
    clearWhaleWarEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.whale_war_config",
    summary: `Updated Whale War engine (RTP ${cfg.rtpTarget}%, boss finisher ${(cfg.boss.finisherShare * 100).toFixed(0)}%)`,
    targetType: "game",
    targetId: WHALE_WAR_GAME_ID,
    meta: {
      rtpTarget: cfg.rtpTarget,
      maxHitChance: cfg.maxHitChance,
      bossSpawnChance: cfg.boss.spawnChance,
      finisherShare: cfg.boss.finisherShare,
      weaponCount: cfg.weapons.length,
      fishCount: cfg.fishTiers.length,
    },
  });

  return cfg;
}

/** Public — Lucky 9 engine math (defaults if unset). */
export async function getLucky9EngineConfig() {
  const {
    LUCKY9_GAME_ID,
    DEFAULT_LUCKY9_CONFIG,
    normalizeLucky9Config,
  } = await import("@/lib/lucky9-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LUCKY9_GAME_ID))
      .limit(1);
    return normalizeLucky9Config(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_LUCKY9_CONFIG);
  }
}

/** Superadmin — save full Lucky 9 math config. */
export async function saveLucky9EngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { LUCKY9_GAME_ID, normalizeLucky9Config } = await import("@/lib/lucky9-config");
  const catalog = slotGames.find((g) => g.id === LUCKY9_GAME_ID);
  if (!catalog) throw new Error("Lucky 9 not in catalog");

  const cfg = normalizeLucky9Config(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, LUCKY9_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = Math.min(cfg.minPlayerBet, cfg.minDealerBet);
  const maxMain = Math.max(cfg.maxPlayerBet, cfg.maxDealerBet);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: LUCKY9_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, LUCKY9_GAME_ID));
  }

  try {
    const { clearLucky9EngineCache } = await import("../games/lucky9.server");
    clearLucky9EngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.lucky9_config",
    summary: `Updated Lucky 9 engine (dealer ${cfg.dealerPayout}x no commission, tie ${cfg.tiePayout}:1, draw≤${cfg.drawThreshold}, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: LUCKY9_GAME_ID,
    meta: {
      playerPayout: cfg.playerPayout,
      dealerPayout: cfg.dealerPayout,
      tiePayout: cfg.tiePayout,
      drawThreshold: cfg.drawThreshold,
      dealerDrawMode: cfg.dealerDrawMode,
      naturalTotal: cfg.naturalTotal,
      deckCount: cfg.deckCount,
      rtpTarget: cfg.rtpTarget,
    },
  });

  return cfg;
}

/** Public — Three Card Poker engine math (defaults if unset). */
export async function getThreeCardPokerEngineConfig() {
  const {
    THREE_CARD_POKER_GAME_ID,
    DEFAULT_THREE_CARD_POKER_CONFIG,
    normalizeThreeCardPokerConfig,
  } = await import("@/lib/threecardpoker-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, THREE_CARD_POKER_GAME_ID))
      .limit(1);
    return normalizeThreeCardPokerConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_THREE_CARD_POKER_CONFIG);
  }
}

/** Superadmin — save full Three Card Poker math config. */
export async function saveThreeCardPokerEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { THREE_CARD_POKER_GAME_ID, normalizeThreeCardPokerConfig } = await import(
    "@/lib/threecardpoker-config"
  );
  const catalog = slotGames.find((g) => g.id === THREE_CARD_POKER_GAME_ID);
  if (!catalog) throw new Error("Three Card Poker not in catalog");

  const cfg = normalizeThreeCardPokerConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, THREE_CARD_POKER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minAnteBet;
  const maxMain = Math.max(cfg.maxAnteBet, cfg.maxPairPlusBet);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: THREE_CARD_POKER_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, THREE_CARD_POKER_GAME_ID));
  }

  try {
    const { clearThreeCardPokerEngineCache } = await import("../games/threecardpoker.server");
    clearThreeCardPokerEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.threecardpoker_config",
    summary: `Updated Three Card Poker engine (qualify ${cfg.dealerQualifyRank}, PP flush ${cfg.pairPlus.flush}:1 / trips ${cfg.pairPlus.threeOfAKind}:1, ante bonus ${cfg.anteBonusEnabled ? "on" : "off"}, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: THREE_CARD_POKER_GAME_ID,
    meta: {
      dealerQualifyRank: cfg.dealerQualifyRank,
      pairPlus: cfg.pairPlus,
      anteBonusEnabled: cfg.anteBonusEnabled,
      anteBonus: cfg.anteBonus,
      deckCount: cfg.deckCount,
      rtpTarget: cfg.rtpTarget,
    },
  });

  return cfg;
}

/** Public — Color Game engine math (defaults if unset). */
export async function getColorGameEngineConfig() {
  const {
    COLOR_GAME_GAME_ID,
    DEFAULT_COLOR_GAME_CONFIG,
    normalizeColorGameConfig,
  } = await import("@/lib/color-game-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, COLOR_GAME_GAME_ID))
      .limit(1);
    return normalizeColorGameConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_COLOR_GAME_CONFIG);
  }
}

/** Superadmin — save full Color Game math config. */
export async function saveColorGameEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { COLOR_GAME_GAME_ID, normalizeColorGameConfig } = await import(
    "@/lib/color-game-config"
  );
  const catalog = slotGames.find((g) => g.id === COLOR_GAME_GAME_ID);
  if (!catalog) throw new Error("Color Game not in catalog");

  const cfg = normalizeColorGameConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, COLOR_GAME_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: COLOR_GAME_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
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
        rtp: String(cfg.rtpTarget),
        minBet: `₱${cfg.minBet.toFixed(2)}`,
        maxBet: `₱${cfg.maxBet.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, COLOR_GAME_GAME_ID));
  }

  try {
    const { clearColorGameEngineCache } = await import("../games/color-game.server");
    clearColorGameEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.color_game_config",
    summary: `Updated Color Game engine (${cfg.spots.length} spots, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: COLOR_GAME_GAME_ID,
    meta: { spots: cfg.spots, rtpTarget: cfg.rtpTarget },
  });

  return cfg;
}

/** Public — Tongits Arena engine math (defaults if unset). */
export async function getTongitsArenaEngineConfig() {
  const {
    TONGITS_ARENA_GAME_ID,
    DEFAULT_TONGITS_ARENA_CONFIG,
    normalizeTongitsArenaConfig,
  } = await import("@/lib/tongits-arena-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, TONGITS_ARENA_GAME_ID))
      .limit(1);
    return normalizeTongitsArenaConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_TONGITS_ARENA_CONFIG);
  }
}

/** Superadmin — save full Tongits Arena math config. */
export async function saveTongitsArenaEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { TONGITS_ARENA_GAME_ID, normalizeTongitsArenaConfig } = await import(
    "@/lib/tongits-arena-config"
  );
  const catalog = slotGames.find((g) => g.id === TONGITS_ARENA_GAME_ID);
  if (!catalog) throw new Error("Tongits Arena not in catalog");

  const cfg = normalizeTongitsArenaConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, TONGITS_ARENA_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minAnteBet;
  const maxMain = Math.max(cfg.maxAnteBet, cfg.maxPairPlusBet);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: TONGITS_ARENA_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, TONGITS_ARENA_GAME_ID));
  }

  try {
    const { clearTongitsArenaEngineCache } = await import("../games/tongits-arena.server");
    clearTongitsArenaEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.tongits_arena_config",
    summary: `Updated Tongits Arena engine (qualify ${cfg.dealerQualifyRank}, PP flush ${cfg.pairPlus.flush}:1 / trips ${cfg.pairPlus.threeOfAKind}:1, ante bonus ${cfg.anteBonusEnabled ? "on" : "off"}, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: TONGITS_ARENA_GAME_ID,
    meta: {
      dealerQualifyRank: cfg.dealerQualifyRank,
      pairPlus: cfg.pairPlus,
      anteBonusEnabled: cfg.anteBonusEnabled,
      anteBonus: cfg.anteBonus,
      deckCount: cfg.deckCount,
      rtpTarget: cfg.rtpTarget,
    },
  });

  return cfg;
}

/** Public — Lucky Drop engine math (defaults if unset). */
export async function getLuckyDropEngineConfig() {
  const {
    LUCKY_DROP_GAME_ID,
    DEFAULT_LUCKY_DROP_CONFIG,
    normalizeLuckyDropConfig,
  } = await import("@/lib/lucky-drop-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LUCKY_DROP_GAME_ID))
      .limit(1);
    return normalizeLuckyDropConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_LUCKY_DROP_CONFIG);
  }
}

/** Superadmin — save full Lucky Drop math config. */
export async function saveLuckyDropEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { LUCKY_DROP_GAME_ID, normalizeLuckyDropConfig } = await import(
    "@/lib/lucky-drop-config"
  );
  const catalog = slotGames.find((g) => g.id === LUCKY_DROP_GAME_ID);
  if (!catalog) throw new Error("Lucky Drop not in catalog");

  const cfg = normalizeLuckyDropConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, LUCKY_DROP_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: LUCKY_DROP_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
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
        rtp: String(cfg.rtpTarget),
        minBet: `₱${cfg.minBet.toFixed(2)}`,
        maxBet: `₱${cfg.maxBet.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, LUCKY_DROP_GAME_ID));
  }

  try {
    const { clearLuckyDropEngineCache } = await import("../games/lucky-drop.server");
    clearLuckyDropEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.lucky_drop_config",
    summary: `Updated Lucky Drop engine (${cfg.payoutMult}×, maxPicks ${cfg.maxPicks}, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: LUCKY_DROP_GAME_ID,
    meta: {
      payoutMult: cfg.payoutMult,
      maxPicks: cfg.maxPicks,
      rtpTarget: cfg.rtpTarget,
    },
  });

  return cfg;
}

/** Public — Color Game Pro engine math (defaults if unset). */
export async function getColorGameProEngineConfig() {
  const {
    COLOR_GAME_PRO_GAME_ID,
    DEFAULT_COLOR_GAME_PRO_CONFIG,
    normalizeColorGameProConfig,
  } = await import("@/lib/color-game-pro-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, COLOR_GAME_PRO_GAME_ID))
      .limit(1);
    return normalizeColorGameProConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_COLOR_GAME_PRO_CONFIG);
  }
}

/** Superadmin — save full Color Game Pro math config. */
export async function saveColorGameProEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { COLOR_GAME_PRO_GAME_ID, normalizeColorGameProConfig } = await import(
    "@/lib/color-game-pro-config"
  );
  const catalog = slotGames.find((g) => g.id === COLOR_GAME_PRO_GAME_ID);
  if (!catalog) throw new Error("Color Game Pro not in catalog");

  const cfg = normalizeColorGameProConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, COLOR_GAME_PRO_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: COLOR_GAME_PRO_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
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
        rtp: String(cfg.rtpTarget),
        minBet: `₱${cfg.minBet.toFixed(2)}`,
        maxBet: `₱${cfg.maxBet.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, COLOR_GAME_PRO_GAME_ID));
  }

  try {
    const { clearColorGameProEngineCache } = await import("../games/color-game-pro.server");
    clearColorGameProEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.color_game_pro_config",
    summary: `Updated Color Game Pro engine (${cfg.spots.length} spots, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: COLOR_GAME_PRO_GAME_ID,
    meta: { spots: cfg.spots, rtpTarget: cfg.rtpTarget },
  });

  return cfg;
}

/** Public — Lucky Nine Plus engine math (defaults if unset). */
export async function getLuckyNinePlusEngineConfig() {
  const {
    LUCKY_NINE_PLUS_GAME_ID,
    DEFAULT_LUCKY_NINE_PLUS_CONFIG,
    normalizeLuckyNinePlusConfig,
  } = await import("@/lib/lucky-nine-plus-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LUCKY_NINE_PLUS_GAME_ID))
      .limit(1);
    return normalizeLuckyNinePlusConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_LUCKY_NINE_PLUS_CONFIG);
  }
}

/** Superadmin — save full Lucky Nine Plus math config. */
export async function saveLuckyNinePlusEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { LUCKY_NINE_PLUS_GAME_ID, normalizeLuckyNinePlusConfig } = await import(
    "@/lib/lucky-nine-plus-config"
  );
  const catalog = slotGames.find((g) => g.id === LUCKY_NINE_PLUS_GAME_ID);
  if (!catalog) throw new Error("Lucky Nine Plus not in catalog");

  const cfg = normalizeLuckyNinePlusConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, LUCKY_NINE_PLUS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = Math.min(cfg.minPlayerBet, cfg.minDealerBet);
  const maxMain = Math.max(cfg.maxPlayerBet, cfg.maxDealerBet);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: LUCKY_NINE_PLUS_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, LUCKY_NINE_PLUS_GAME_ID));
  }

  try {
    const { clearLuckyNinePlusEngineCache } = await import("../games/lucky-nine-plus.server");
    clearLuckyNinePlusEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.lucky_nine_plus_config",
    summary: `Updated Lucky Nine Plus engine (dealer ${cfg.dealerPayout}x no commission, tie ${cfg.tiePayout}:1, draw≤${cfg.drawThreshold}, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: LUCKY_NINE_PLUS_GAME_ID,
    meta: {
      playerPayout: cfg.playerPayout,
      dealerPayout: cfg.dealerPayout,
      tiePayout: cfg.tiePayout,
      drawThreshold: cfg.drawThreshold,
      dealerDrawMode: cfg.dealerDrawMode,
      naturalTotal: cfg.naturalTotal,
      deckCount: cfg.deckCount,
      rtpTarget: cfg.rtpTarget,
    },
  });

  return cfg;
}

/** Public — Drop Deluxe engine math (defaults if unset). */
export async function getDropDeluxeEngineConfig() {
  const {
    DROP_DELUXE_GAME_ID,
    DEFAULT_DROP_DELUXE_CONFIG,
    normalizeDropDeluxeConfig,
  } = await import("@/lib/drop-deluxe-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, DROP_DELUXE_GAME_ID))
      .limit(1);
    return normalizeDropDeluxeConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_DROP_DELUXE_CONFIG);
  }
}

/** Superadmin — save full Drop Deluxe math config. */
export async function saveDropDeluxeEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { DROP_DELUXE_GAME_ID, normalizeDropDeluxeConfig } = await import(
    "@/lib/drop-deluxe-config"
  );
  const catalog = slotGames.find((g) => g.id === DROP_DELUXE_GAME_ID);
  if (!catalog) throw new Error("Drop Deluxe not in catalog");

  const cfg = normalizeDropDeluxeConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, DROP_DELUXE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: DROP_DELUXE_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
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
        rtp: String(cfg.rtpTarget),
        minBet: `₱${cfg.minBet.toFixed(2)}`,
        maxBet: `₱${cfg.maxBet.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, DROP_DELUXE_GAME_ID));
  }

  try {
    const { clearDropDeluxeEngineCache } = await import("../games/drop-deluxe.server");
    clearDropDeluxeEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.drop_deluxe_config",
    summary: `Updated Drop Deluxe engine (${cfg.payoutMult}×, maxPicks ${cfg.maxPicks}, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: DROP_DELUXE_GAME_ID,
    meta: {
      payoutMult: cfg.payoutMult,
      maxPicks: cfg.maxPicks,
      rtpTarget: cfg.rtpTarget,
    },
  });

  return cfg;
}

/** Public — Poker Showdown engine math (defaults if unset). */
export async function getPokerShowdownEngineConfig() {
  const {
    POKER_SHOWDOWN_GAME_ID,
    DEFAULT_POKER_SHOWDOWN_CONFIG,
    normalizePokerShowdownConfig,
  } = await import("@/lib/poker-showdown-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, POKER_SHOWDOWN_GAME_ID))
      .limit(1);
    return normalizePokerShowdownConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_POKER_SHOWDOWN_CONFIG);
  }
}

/** Superadmin — save full Poker Showdown math config. */
export async function savePokerShowdownEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { POKER_SHOWDOWN_GAME_ID, normalizePokerShowdownConfig } = await import(
    "@/lib/poker-showdown-config"
  );
  const catalog = slotGames.find((g) => g.id === POKER_SHOWDOWN_GAME_ID);
  if (!catalog) throw new Error("Poker Showdown not in catalog");

  const cfg = normalizePokerShowdownConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, POKER_SHOWDOWN_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);
  const minMain = cfg.minAnteBet;
  const maxMain = Math.max(cfg.maxAnteBet, cfg.maxPairPlusBet);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: POKER_SHOWDOWN_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: String(cfg.rtpTarget),
      volatility: catalog.volatility,
      minBet: `₱${minMain.toFixed(2)}`,
      maxBet: `₱${maxMain.toFixed(2)}`,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({
        engineConfig: payload,
        rtp: String(cfg.rtpTarget),
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      })
      .where(eq(gameControls.gameId, POKER_SHOWDOWN_GAME_ID));
  }

  try {
    const { clearPokerShowdownEngineCache } = await import("../games/poker-showdown.server");
    clearPokerShowdownEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.poker_showdown_config",
    summary: `Updated Poker Showdown engine (qualify ${cfg.dealerQualifyRank}, PP flush ${cfg.pairPlus.flush}:1 / trips ${cfg.pairPlus.threeOfAKind}:1, ante bonus ${cfg.anteBonusEnabled ? "on" : "off"}, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: POKER_SHOWDOWN_GAME_ID,
    meta: {
      dealerQualifyRank: cfg.dealerQualifyRank,
      pairPlus: cfg.pairPlus,
      anteBonusEnabled: cfg.anteBonusEnabled,
      anteBonus: cfg.anteBonus,
      deckCount: cfg.deckCount,
      rtpTarget: cfg.rtpTarget,
    },
  });

  return cfg;
}

/** Public — Ace High engine math (defaults if unset). */
export async function getAceHighEngineConfig() {
  const {
    ACE_HIGH_GAME_ID,
    DEFAULT_ACE_HIGH_CONFIG,
    normalizeAceHighConfig,
  } = await import("@/lib/ace-high-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, ACE_HIGH_GAME_ID))
      .limit(1);
    return normalizeAceHighConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_ACE_HIGH_CONFIG);
  }
}

/** Superadmin — save full Ace High math config. */
export async function saveAceHighEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { ACE_HIGH_GAME_ID, normalizeAceHighConfig } = await import("@/lib/ace-high-config");
  const catalog = slotGames.find((g) => g.id === ACE_HIGH_GAME_ID);
  if (!catalog) throw new Error("Ace High not in catalog");

  const cfg = normalizeAceHighConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, ACE_HIGH_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: ACE_HIGH_GAME_ID,
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
      .where(eq(gameControls.gameId, ACE_HIGH_GAME_ID));
  }

  try {
    const { clearAceHighEngineCache } = await import("../games/ace-high.server");
    clearAceHighEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.ace_high_config",
    summary: `Updated Ace High engine (base ${cfg.basePayoutMult}x, tie ${cfg.tieSideBetMult}x, war ${cfg.warMaxDepth}, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: ACE_HIGH_GAME_ID,
    meta: {
      basePayoutMult: cfg.basePayoutMult,
      tieSideBetMult: cfg.tieSideBetMult,
      aceBonus: cfg.aceBonus,
      warBurnCount: cfg.warBurnCount,
      warMaxDepth: cfg.warMaxDepth,
      decksInShoe: cfg.decksInShoe,
      targetRtp: cfg.targetRtp,
      maxWinMult: cfg.maxWinMult,
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

/** Public — Aztec Treasure engine math (defaults if unset). */
export async function getAztecTreasureEngineConfig() {
  const {
    AZTEC_TREASURE_GAME_ID,
    DEFAULT_AZTEC_TREASURE_CONFIG,
    normalizeAztecTreasureConfig,
  } = await import("@/lib/aztec-treasure-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, AZTEC_TREASURE_GAME_ID))
      .limit(1);
    return normalizeAztecTreasureConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_AZTEC_TREASURE_CONFIG);
  }
}

/** Superadmin — save full Aztec Treasure math config. */
export async function saveAztecTreasureEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    AZTEC_TREASURE_GAME_ID,
    normalizeAztecTreasureConfig,
  } = await import("@/lib/aztec-treasure-config");
  const catalog = slotGames.find((g) => g.id === AZTEC_TREASURE_GAME_ID);
  if (!catalog) throw new Error("Aztec Treasure not in catalog");

  const cfg = normalizeAztecTreasureConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, AZTEC_TREASURE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: AZTEC_TREASURE_GAME_ID,
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
      .where(eq(gameControls.gameId, AZTEC_TREASURE_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.aztec_treasure_config",
    summary: `Updated Aztec Treasure engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: AZTEC_TREASURE_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Pirate Plunder engine math (defaults if unset). */
export async function getPiratePlunderEngineConfig() {
  const {
    PIRATE_PLUNDER_GAME_ID,
    DEFAULT_PIRATE_PLUNDER_CONFIG,
    normalizePiratePlunderConfig,
  } = await import("@/lib/pirate-plunder-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, PIRATE_PLUNDER_GAME_ID))
      .limit(1);
    return normalizePiratePlunderConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_PIRATE_PLUNDER_CONFIG);
  }
}

/** Superadmin — save full Pirate Plunder math config. */
export async function savePiratePlunderEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    PIRATE_PLUNDER_GAME_ID,
    normalizePiratePlunderConfig,
  } = await import("@/lib/pirate-plunder-config");
  const catalog = slotGames.find((g) => g.id === PIRATE_PLUNDER_GAME_ID);
  if (!catalog) throw new Error("Pirate Plunder not in catalog");

  const cfg = normalizePiratePlunderConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, PIRATE_PLUNDER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: PIRATE_PLUNDER_GAME_ID,
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
      .where(eq(gameControls.gameId, PIRATE_PLUNDER_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.pirate_plunder_config",
    summary: `Updated Pirate Plunder engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: PIRATE_PLUNDER_GAME_ID,
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

export async function runPlaySessionCleanup(opts?: {
  staleOpenHours?: number;
  purgeClosedDays?: number;
  dryRun?: boolean;
}) {
  const actor = await requireSuperadmin();
  const { cleanupPlaySessions } = await import("../play-sessions-cleanup.server");
  const result = await cleanupPlaySessions(opts);
  await writeAuditLog({
    actor,
    action: "super.play_sessions_cleanup",
    summary: result.dryRun
      ? `Dry-run play_sessions cleanup (would close ${result.dedupedClosed + result.staleClosed}, purge ${result.purged})`
      : `Cleaned play_sessions (dedupe ${result.dedupedClosed}, stale ${result.staleClosed}, purged ${result.purged})`,
    targetType: "play_sessions",
    targetId: "cleanup",
    meta: result,
  });
  return result;
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


/** Public — Lucky Neko engine math (defaults if unset). */
export async function getLuckyNekoEngineConfig() {
  const {
    LUCKY_NEKO_GAME_ID,
    DEFAULT_LUCKY_NEKO_CONFIG,
    normalizeLuckyNekoConfig,
  } = await import("@/lib/lucky-neko-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LUCKY_NEKO_GAME_ID))
      .limit(1);
    return normalizeLuckyNekoConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_LUCKY_NEKO_CONFIG);
  }
}

/** Superadmin — save full Lucky Neko math config. */
export async function saveLuckyNekoEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { LUCKY_NEKO_GAME_ID, normalizeLuckyNekoConfig } = await import(
    "@/lib/lucky-neko-config"
  );
  const catalog = slotGames.find((g) => g.id === LUCKY_NEKO_GAME_ID);
  if (!catalog) throw new Error("Lucky Neko not in catalog");

  const cfg = normalizeLuckyNekoConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, LUCKY_NEKO_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: LUCKY_NEKO_GAME_ID,
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
      .where(eq(gameControls.gameId, LUCKY_NEKO_GAME_ID));
  }

  try {
    const { clearLuckyNekoEngineCache } = await import("../games/lucky-neko.server");
    clearLuckyNekoEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.lucky_neko_config",
    summary: `Updated Lucky Neko engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, EX ${cfg.exBetMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: LUCKY_NEKO_GAME_ID,
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


/** Public — Fortune Mouse engine math (defaults if unset). */
export async function getFortuneMouseEngineConfig() {
  const {
    FORTUNE_MOUSE_GAME_ID,
    DEFAULT_FORTUNE_MOUSE_CONFIG,
    normalizeFortuneMouseConfig,
  } = await import("@/lib/fortune-mouse-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, FORTUNE_MOUSE_GAME_ID))
      .limit(1);
    return normalizeFortuneMouseConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_FORTUNE_MOUSE_CONFIG);
  }
}

/** Superadmin — save full Fortune Mouse math config. */
export async function saveFortuneMouseEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { FORTUNE_MOUSE_GAME_ID, normalizeFortuneMouseConfig } = await import(
    "@/lib/fortune-mouse-config"
  );
  const catalog = slotGames.find((g) => g.id === FORTUNE_MOUSE_GAME_ID);
  if (!catalog) throw new Error("Fortune Mouse not in catalog");

  const cfg = normalizeFortuneMouseConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, FORTUNE_MOUSE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: FORTUNE_MOUSE_GAME_ID,
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
      .where(eq(gameControls.gameId, FORTUNE_MOUSE_GAME_ID));
  }

  try {
    const { clearFortuneMouseEngineCache } = await import("../games/fortune-mouse.server");
    clearFortuneMouseEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.fortune_mouse_config",
    summary: `Updated Fortune Mouse engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, EX ${cfg.exBetMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: FORTUNE_MOUSE_GAME_ID,
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


/** Public — Prosperity Lion engine math (defaults if unset). */
export async function getProsperityLionEngineConfig() {
  const {
    PROSPERITY_LION_GAME_ID,
    DEFAULT_PROSPERITY_LION_CONFIG,
    normalizeProsperityLionConfig,
  } = await import("@/lib/prosperity-lion-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, PROSPERITY_LION_GAME_ID))
      .limit(1);
    return normalizeProsperityLionConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_PROSPERITY_LION_CONFIG);
  }
}

/** Superadmin — save full Prosperity Lion math config. */
export async function saveProsperityLionEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { PROSPERITY_LION_GAME_ID, normalizeProsperityLionConfig } = await import(
    "@/lib/prosperity-lion-config"
  );
  const catalog = slotGames.find((g) => g.id === PROSPERITY_LION_GAME_ID);
  if (!catalog) throw new Error("Prosperity Lion not in catalog");

  const cfg = normalizeProsperityLionConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, PROSPERITY_LION_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: PROSPERITY_LION_GAME_ID,
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
      .where(eq(gameControls.gameId, PROSPERITY_LION_GAME_ID));
  }

  try {
    const { clearProsperityLionEngineCache } = await import("../games/prosperity-lion.server");
    clearProsperityLionEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.prosperity_lion_config",
    summary: `Updated Prosperity Lion engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, EX ${cfg.exBetMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: PROSPERITY_LION_GAME_ID,
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


/** Public — Coin Volcano engine math (defaults if unset). */
export async function getCoinVolcanoEngineConfig() {
  const {
    COIN_VOLCANO_GAME_ID,
    DEFAULT_COIN_VOLCANO_CONFIG,
    normalizeCoinVolcanoConfig,
  } = await import("@/lib/coin-volcano-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, COIN_VOLCANO_GAME_ID))
      .limit(1);
    return normalizeCoinVolcanoConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_COIN_VOLCANO_CONFIG);
  }
}

/** Superadmin — save full Coin Volcano math config. */
export async function saveCoinVolcanoEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { COIN_VOLCANO_GAME_ID, normalizeCoinVolcanoConfig } = await import(
    "@/lib/coin-volcano-config"
  );
  const catalog = slotGames.find((g) => g.id === COIN_VOLCANO_GAME_ID);
  if (!catalog) throw new Error("Coin Volcano not in catalog");

  const cfg = normalizeCoinVolcanoConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, COIN_VOLCANO_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: COIN_VOLCANO_GAME_ID,
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
      .where(eq(gameControls.gameId, COIN_VOLCANO_GAME_ID));
  }

  try {
    const { clearCoinVolcanoEngineCache } = await import("../games/coin-volcano.server");
    clearCoinVolcanoEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.coin_volcano_config",
    summary: `Updated Coin Volcano engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, JP ${cfg.grandJackpotMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: COIN_VOLCANO_GAME_ID,
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


/** Public — Cash Mania engine math (defaults if unset). */
export async function getCashManiaEngineConfig() {
  const {
    CASH_MANIA_GAME_ID,
    DEFAULT_CASH_MANIA_CONFIG,
    normalizeCashManiaConfig,
  } = await import("@/lib/cash-mania-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CASH_MANIA_GAME_ID))
      .limit(1);
    return normalizeCashManiaConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CASH_MANIA_CONFIG);
  }
}

/** Superadmin — save full Cash Mania math config. */
export async function saveCashManiaEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { CASH_MANIA_GAME_ID, normalizeCashManiaConfig } = await import(
    "@/lib/cash-mania-config"
  );
  const catalog = slotGames.find((g) => g.id === CASH_MANIA_GAME_ID);
  if (!catalog) throw new Error("Cash Mania not in catalog");

  const cfg = normalizeCashManiaConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CASH_MANIA_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CASH_MANIA_GAME_ID,
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
      .where(eq(gameControls.gameId, CASH_MANIA_GAME_ID));
  }

  try {
    const { clearCashManiaEngineCache } = await import("../games/cash-mania.server");
    clearCashManiaEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.cash_mania_config",
    summary: `Updated Cash Mania engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, JP ${cfg.grandJackpotMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: CASH_MANIA_GAME_ID,
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


/** Public — Zeus Strike engine math (defaults if unset). */
export async function getZeusStrikeEngineConfig() {
  const {
    ZEUS_STRIKE_GAME_ID,
    DEFAULT_ZEUS_STRIKE_CONFIG,
    normalizeZeusStrikeConfig,
  } = await import("@/lib/zeus-strike-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, ZEUS_STRIKE_GAME_ID))
      .limit(1);
    return normalizeZeusStrikeConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_ZEUS_STRIKE_CONFIG);
  }
}

/** Superadmin — save full Zeus Strike math config. */
export async function saveZeusStrikeEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { ZEUS_STRIKE_GAME_ID, normalizeZeusStrikeConfig } = await import(
    "@/lib/zeus-strike-config"
  );
  const catalog = slotGames.find((g) => g.id === ZEUS_STRIKE_GAME_ID);
  if (!catalog) throw new Error("Zeus Strike not in catalog");

  const cfg = normalizeZeusStrikeConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, ZEUS_STRIKE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: ZEUS_STRIKE_GAME_ID,
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
      .where(eq(gameControls.gameId, ZEUS_STRIKE_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.zeus_strike_config",
    summary: `Updated Zeus Strike engine config (dead spin ${cfg.deadSpinChancePercent}%, buy ${cfg.buyFeatureMult}x)`,
    targetType: "game",
    targetId: ZEUS_STRIKE_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      buyFeatureMult: cfg.buyFeatureMult,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
    },
  });

  return cfg;
}


/** Public — Thor Thunder engine math (defaults if unset). */
export async function getThorThunderEngineConfig() {
  const {
    THOR_THUNDER_GAME_ID,
    DEFAULT_THOR_THUNDER_CONFIG,
    normalizeThorThunderConfig,
  } = await import("@/lib/thor-thunder-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, THOR_THUNDER_GAME_ID))
      .limit(1);
    return normalizeThorThunderConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_THOR_THUNDER_CONFIG);
  }
}

/** Superadmin — save full Thor Thunder math config. */
export async function saveThorThunderEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { THOR_THUNDER_GAME_ID, normalizeThorThunderConfig } = await import(
    "@/lib/thor-thunder-config"
  );
  const catalog = slotGames.find((g) => g.id === THOR_THUNDER_GAME_ID);
  if (!catalog) throw new Error("Thor Thunder not in catalog");

  const cfg = normalizeThorThunderConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, THOR_THUNDER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: THOR_THUNDER_GAME_ID,
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
      .where(eq(gameControls.gameId, THOR_THUNDER_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.thor_thunder_config",
    summary: `Updated Thor Thunder engine config (dead spin ${cfg.deadSpinChancePercent}%, buy ${cfg.buyFeatureMult}x)`,
    targetType: "game",
    targetId: THOR_THUNDER_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      buyFeatureMult: cfg.buyFeatureMult,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
    },
  });

  return cfg;
}


/** Public — Maya Gold engine math (defaults if unset). */
export async function getMayaGoldEngineConfig() {
  const {
    MAYA_GOLD_GAME_ID,
    DEFAULT_MAYA_GOLD_CONFIG,
    normalizeMayaGoldConfig,
  } = await import("@/lib/maya-gold-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MAYA_GOLD_GAME_ID))
      .limit(1);
    return normalizeMayaGoldConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_MAYA_GOLD_CONFIG);
  }
}

/** Superadmin — save full Maya Gold math config. */
export async function saveMayaGoldEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    MAYA_GOLD_GAME_ID,
    normalizeMayaGoldConfig,
  } = await import("@/lib/maya-gold-config");
  const catalog = slotGames.find((g) => g.id === MAYA_GOLD_GAME_ID);
  if (!catalog) throw new Error("Maya Gold not in catalog");

  const cfg = normalizeMayaGoldConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, MAYA_GOLD_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: MAYA_GOLD_GAME_ID,
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
      .where(eq(gameControls.gameId, MAYA_GOLD_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.maya_gold_config",
    summary: `Updated Maya Gold engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: MAYA_GOLD_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}


/** Public — Temple Rush engine math (defaults if unset). */
export async function getTempleRushEngineConfig() {
  const {
    TEMPLE_RUSH_GAME_ID,
    DEFAULT_TEMPLE_RUSH_CONFIG,
    normalizeTempleRushConfig,
  } = await import("@/lib/temple-rush-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, TEMPLE_RUSH_GAME_ID))
      .limit(1);
    return normalizeTempleRushConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_TEMPLE_RUSH_CONFIG);
  }
}

/** Superadmin — save full Temple Rush math config. */
export async function saveTempleRushEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    TEMPLE_RUSH_GAME_ID,
    normalizeTempleRushConfig,
  } = await import("@/lib/temple-rush-config");
  const catalog = slotGames.find((g) => g.id === TEMPLE_RUSH_GAME_ID);
  if (!catalog) throw new Error("Temple Rush not in catalog");

  const cfg = normalizeTempleRushConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, TEMPLE_RUSH_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: TEMPLE_RUSH_GAME_ID,
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
      .where(eq(gameControls.gameId, TEMPLE_RUSH_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.temple_rush_config",
    summary: `Updated Temple Rush engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: TEMPLE_RUSH_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Mahjong Ways 3 engine math (defaults if unset). */
export async function getMahjongWays3EngineConfig() {
  const {
    MAHJONG_WAYS_3_GAME_ID,
    DEFAULT_MAHJONG_WAYS_3_CONFIG,
    normalizeMahjongWays3Config,
  } = await import("@/lib/mahjong-ways-3-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MAHJONG_WAYS_3_GAME_ID))
      .limit(1);
    return normalizeMahjongWays3Config(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_MAHJONG_WAYS_3_CONFIG);
  }
}

/** Superadmin — save full Mahjong Ways 3 math config. */
export async function saveMahjongWays3EngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    MAHJONG_WAYS_3_GAME_ID,
    normalizeMahjongWays3Config,
  } = await import("@/lib/mahjong-ways-3-config");
  const catalog = slotGames.find((g) => g.id === MAHJONG_WAYS_3_GAME_ID);
  if (!catalog) throw new Error("Mahjong Ways 3 not in catalog");

  const cfg = normalizeMahjongWays3Config(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, MAHJONG_WAYS_3_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: MAHJONG_WAYS_3_GAME_ID,
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
      .where(eq(gameControls.gameId, MAHJONG_WAYS_3_GAME_ID));
  }

  try {
    const { clearMahjongWays3EngineCache } = await import("../games/mahjong-ways-3.server");
    clearMahjongWays3EngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.mahjong_ways_3_config",
    summary: `Updated Mahjong Ways 3 engine (FS ${cfg.freeSpinsBaseCount}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: MAHJONG_WAYS_3_GAME_ID,
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


/** Public — Wild Ace engine math (defaults if unset). */
export async function getWildAceEngineConfig() {
  const {
    WILD_ACE_GAME_ID,
    DEFAULT_WILD_ACE_CONFIG,
    normalizeWildAceConfig,
  } = await import("@/lib/wild-ace-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, WILD_ACE_GAME_ID))
      .limit(1);
    return normalizeWildAceConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_WILD_ACE_CONFIG);
  }
}

/** Superadmin — save full Wild Ace math config. */
export async function saveWildAceEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    WILD_ACE_GAME_ID,
    normalizeWildAceConfig,
  } = await import("@/lib/wild-ace-config");
  const catalog = slotGames.find((g) => g.id === WILD_ACE_GAME_ID);
  if (!catalog) throw new Error("Wild Ace not in catalog");

  const cfg = normalizeWildAceConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, WILD_ACE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: WILD_ACE_GAME_ID,
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
      .where(eq(gameControls.gameId, WILD_ACE_GAME_ID));
  }

  try {
    const { clearWildAceEngineCache } = await import("../games/wild-ace.server");
    clearWildAceEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.wild_ace_config",
    summary: `Updated Wild Ace engine (FS ${cfg.freeSpinsBaseCount}/+${cfg.freeSpinsRetriggerCount}, maxWin ${cfg.maxWinMult}x, RTP ${cfg.activeRtpProfile} ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: WILD_ACE_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      freeSpinsRetriggerCount: cfg.freeSpinsRetriggerCount,
      maxWinMult: cfg.maxWinMult,
      activeRtpProfile: cfg.activeRtpProfile,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}


/** Public — Royal Ace engine math (defaults if unset). */
export async function getRoyalAceEngineConfig() {
  const {
    ROYAL_ACE_GAME_ID,
    DEFAULT_ROYAL_ACE_CONFIG,
    normalizeRoyalAceConfig,
  } = await import("@/lib/royal-ace-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, ROYAL_ACE_GAME_ID))
      .limit(1);
    return normalizeRoyalAceConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_ROYAL_ACE_CONFIG);
  }
}

/** Superadmin — save full Royal Ace math config. */
export async function saveRoyalAceEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    ROYAL_ACE_GAME_ID,
    normalizeRoyalAceConfig,
  } = await import("@/lib/royal-ace-config");
  const catalog = slotGames.find((g) => g.id === ROYAL_ACE_GAME_ID);
  if (!catalog) throw new Error("Royal Ace not in catalog");

  const cfg = normalizeRoyalAceConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, ROYAL_ACE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: ROYAL_ACE_GAME_ID,
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
      .where(eq(gameControls.gameId, ROYAL_ACE_GAME_ID));
  }

  try {
    const { clearRoyalAceEngineCache } = await import("../games/royal-ace.server");
    clearRoyalAceEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.royal_ace_config",
    summary: `Updated Royal Ace engine (FS ${cfg.freeSpinsBaseCount}/+${cfg.freeSpinsRetriggerCount}, maxWin ${cfg.maxWinMult}x, RTP ${cfg.activeRtpProfile} ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: ROYAL_ACE_GAME_ID,
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


/** Public — Neon Fruits engine math (defaults if unset). */
export async function getNeonFruitsEngineConfig() {
  const {
    NEON_FRUITS_GAME_ID,
    DEFAULT_NEON_FRUITS_CONFIG,
    normalizeNeonFruitsConfig,
  } = await import("@/lib/neon-fruits-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, NEON_FRUITS_GAME_ID))
      .limit(1);
    return normalizeNeonFruitsConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_NEON_FRUITS_CONFIG);
  }
}

/** Superadmin — save full Neon Fruits math config. */
export async function saveNeonFruitsEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { NEON_FRUITS_GAME_ID, normalizeNeonFruitsConfig } = await import(
    "@/lib/neon-fruits-config"
  );
  const catalog = slotGames.find((g) => g.id === NEON_FRUITS_GAME_ID);
  if (!catalog) throw new Error("Neon Fruits not in catalog");

  const cfg = normalizeNeonFruitsConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, NEON_FRUITS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: NEON_FRUITS_GAME_ID,
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
      .where(eq(gameControls.gameId, NEON_FRUITS_GAME_ID));
  }

  try {
    const { clearNeonFruitsEngineCache } = await import("../games/neon-fruits.server");
    clearNeonFruitsEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.neon_fruits_config",
    summary: `Updated Neon Fruits engine (maxBet ${cfg.maxBet}, twoWild ${cfg.twoWildPayMult}x, RTP placeholder ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: NEON_FRUITS_GAME_ID,
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


/** Public — Lucky Bars engine math (defaults if unset). */
export async function getLuckyBarsEngineConfig() {
  const {
    LUCKY_BARS_GAME_ID,
    DEFAULT_LUCKY_BARS_CONFIG,
    normalizeLuckyBarsConfig,
  } = await import("@/lib/lucky-bars-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LUCKY_BARS_GAME_ID))
      .limit(1);
    return normalizeLuckyBarsConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_LUCKY_BARS_CONFIG);
  }
}

/** Superadmin — save full Lucky Bars math config. */
export async function saveLuckyBarsEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { LUCKY_BARS_GAME_ID, normalizeLuckyBarsConfig } = await import(
    "@/lib/lucky-bars-config"
  );
  const catalog = slotGames.find((g) => g.id === LUCKY_BARS_GAME_ID);
  if (!catalog) throw new Error("Lucky Bars not in catalog");

  const cfg = normalizeLuckyBarsConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, LUCKY_BARS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: LUCKY_BARS_GAME_ID,
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
      .where(eq(gameControls.gameId, LUCKY_BARS_GAME_ID));
  }

  try {
    const { clearLuckyBarsEngineCache } = await import("../games/lucky-bars.server");
    clearLuckyBarsEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.lucky_bars_config",
    summary: `Updated Lucky Bars engine (maxBet ${cfg.maxBet}, twoWild ${cfg.twoWildPayMult}x, RTP placeholder ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: LUCKY_BARS_GAME_ID,
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

/* WAVE_B_SLOT_SERVICES */

/** Public — Knockout King engine math (defaults if unset). */
export async function getKnockoutKingEngineConfig() {
  const {
    KNOCKOUT_KING_GAME_ID,
    DEFAULT_KNOCKOUT_KING_CONFIG,
    normalizeKnockoutKingConfig,
  } = await import("@/lib/knockout-king-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, KNOCKOUT_KING_GAME_ID))
      .limit(1);
    return normalizeKnockoutKingConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_KNOCKOUT_KING_CONFIG);
  }
}

/** Superadmin — save full Knockout King math config. */
export async function saveKnockoutKingEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { KNOCKOUT_KING_GAME_ID, normalizeKnockoutKingConfig } = await import("@/lib/knockout-king-config");
  const catalog = slotGames.find((g) => g.id === KNOCKOUT_KING_GAME_ID);
  if (!catalog) throw new Error("Knockout King not in catalog");

  const cfg = normalizeKnockoutKingConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, KNOCKOUT_KING_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: KNOCKOUT_KING_GAME_ID,
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
      .where(eq(gameControls.gameId, KNOCKOUT_KING_GAME_ID));
  }

  try {
    const { clearKnockoutKingEngineCache } = await import("../games/knockout-king.server");
    clearKnockoutKingEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.knockout_king_config",
    summary: `Updated Knockout King engine (RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: KNOCKOUT_KING_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Arena Champ engine math (defaults if unset). */
export async function getArenaChampEngineConfig() {
  const {
    ARENA_CHAMP_GAME_ID,
    DEFAULT_ARENA_CHAMP_CONFIG,
    normalizeArenaChampConfig,
  } = await import("@/lib/arena-champ-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, ARENA_CHAMP_GAME_ID))
      .limit(1);
    return normalizeArenaChampConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_ARENA_CHAMP_CONFIG);
  }
}

/** Superadmin — save full Arena Champ math config. */
export async function saveArenaChampEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { ARENA_CHAMP_GAME_ID, normalizeArenaChampConfig } = await import("@/lib/arena-champ-config");
  const catalog = slotGames.find((g) => g.id === ARENA_CHAMP_GAME_ID);
  if (!catalog) throw new Error("Arena Champ not in catalog");

  const cfg = normalizeArenaChampConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, ARENA_CHAMP_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: ARENA_CHAMP_GAME_ID,
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
      .where(eq(gameControls.gameId, ARENA_CHAMP_GAME_ID));
  }

  try {
    const { clearArenaChampEngineCache } = await import("../games/arena-champ.server");
    clearArenaChampEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.arena_champ_config",
    summary: `Updated Arena Champ engine (RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: ARENA_CHAMP_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Safari Gold engine math (defaults if unset). */
export async function getSafariGoldEngineConfig() {
  const {
    SAFARI_GOLD_GAME_ID,
    DEFAULT_SAFARI_GOLD_CONFIG,
    normalizeSafariGoldConfig,
  } = await import("@/lib/safari-gold-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, SAFARI_GOLD_GAME_ID))
      .limit(1);
    return normalizeSafariGoldConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_SAFARI_GOLD_CONFIG);
  }
}

/** Superadmin — save full Safari Gold math config. */
export async function saveSafariGoldEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { SAFARI_GOLD_GAME_ID, normalizeSafariGoldConfig } = await import("@/lib/safari-gold-config");
  const catalog = slotGames.find((g) => g.id === SAFARI_GOLD_GAME_ID);
  if (!catalog) throw new Error("Safari Gold not in catalog");

  const cfg = normalizeSafariGoldConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, SAFARI_GOLD_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: SAFARI_GOLD_GAME_ID,
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
      .where(eq(gameControls.gameId, SAFARI_GOLD_GAME_ID));
  }

  try {
    const { clearSafariGoldEngineCache } = await import("../games/safari-gold.server");
    clearSafariGoldEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.safari_gold_config",
    summary: `Updated Safari Gold engine (RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: SAFARI_GOLD_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Pharaoh Fire engine math (defaults if unset). */
export async function getPharaohFireEngineConfig() {
  const {
    PHARAOH_FIRE_GAME_ID,
    DEFAULT_PHARAOH_FIRE_CONFIG,
    normalizePharaohFireConfig,
  } = await import("@/lib/pharaoh-fire-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, PHARAOH_FIRE_GAME_ID))
      .limit(1);
    return normalizePharaohFireConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_PHARAOH_FIRE_CONFIG);
  }
}

/** Superadmin — save full Pharaoh Fire math config. */
export async function savePharaohFireEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { PHARAOH_FIRE_GAME_ID, normalizePharaohFireConfig } = await import("@/lib/pharaoh-fire-config");
  const catalog = slotGames.find((g) => g.id === PHARAOH_FIRE_GAME_ID);
  if (!catalog) throw new Error("Pharaoh Fire not in catalog");

  const cfg = normalizePharaohFireConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, PHARAOH_FIRE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: PHARAOH_FIRE_GAME_ID,
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
      .where(eq(gameControls.gameId, PHARAOH_FIRE_GAME_ID));
  }

  try {
    const { clearPharaohFireEngineCache } = await import("../games/pharaoh-fire.server");
    clearPharaohFireEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.pharaoh_fire_config",
    summary: `Updated Pharaoh Fire engine (RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: PHARAOH_FIRE_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Desert Riches engine math (defaults if unset). */
export async function getDesertRichesEngineConfig() {
  const {
    DESERT_RICHES_GAME_ID,
    DEFAULT_DESERT_RICHES_CONFIG,
    normalizeDesertRichesConfig,
  } = await import("@/lib/desert-riches-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, DESERT_RICHES_GAME_ID))
      .limit(1);
    return normalizeDesertRichesConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_DESERT_RICHES_CONFIG);
  }
}

/** Superadmin — save full Desert Riches math config. */
export async function saveDesertRichesEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { DESERT_RICHES_GAME_ID, normalizeDesertRichesConfig } = await import("@/lib/desert-riches-config");
  const catalog = slotGames.find((g) => g.id === DESERT_RICHES_GAME_ID);
  if (!catalog) throw new Error("Desert Riches not in catalog");

  const cfg = normalizeDesertRichesConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, DESERT_RICHES_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: DESERT_RICHES_GAME_ID,
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
      .where(eq(gameControls.gameId, DESERT_RICHES_GAME_ID));
  }

  try {
    const { clearDesertRichesEngineCache } = await import("../games/desert-riches.server");
    clearDesertRichesEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.desert_riches_config",
    summary: `Updated Desert Riches engine (RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: DESERT_RICHES_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Outlaw Coins engine math (defaults if unset). */
export async function getOutlawCoinsEngineConfig() {
  const {
    OUTLAW_COINS_GAME_ID,
    DEFAULT_OUTLAW_COINS_CONFIG,
    normalizeOutlawCoinsConfig,
  } = await import("@/lib/outlaw-coins-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, OUTLAW_COINS_GAME_ID))
      .limit(1);
    return normalizeOutlawCoinsConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_OUTLAW_COINS_CONFIG);
  }
}

/** Superadmin — save full Outlaw Coins math config. */
export async function saveOutlawCoinsEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { OUTLAW_COINS_GAME_ID, normalizeOutlawCoinsConfig } = await import("@/lib/outlaw-coins-config");
  const catalog = slotGames.find((g) => g.id === OUTLAW_COINS_GAME_ID);
  if (!catalog) throw new Error("Outlaw Coins not in catalog");

  const cfg = normalizeOutlawCoinsConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, OUTLAW_COINS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: OUTLAW_COINS_GAME_ID,
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
      .where(eq(gameControls.gameId, OUTLAW_COINS_GAME_ID));
  }

  try {
    const { clearOutlawCoinsEngineCache } = await import("../games/outlaw-coins.server");
    clearOutlawCoinsEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.outlaw_coins_config",
    summary: `Updated Outlaw Coins engine (RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: OUTLAW_COINS_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Crystal Cave engine math (defaults if unset). */
export async function getCrystalCaveEngineConfig() {
  const {
    CRYSTAL_CAVE_GAME_ID,
    DEFAULT_CRYSTAL_CAVE_CONFIG,
    normalizeCrystalCaveConfig,
  } = await import("@/lib/crystal-cave-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CRYSTAL_CAVE_GAME_ID))
      .limit(1);
    return normalizeCrystalCaveConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CRYSTAL_CAVE_CONFIG);
  }
}

/** Superadmin — save full Crystal Cave math config. */
export async function saveCrystalCaveEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { CRYSTAL_CAVE_GAME_ID, normalizeCrystalCaveConfig } = await import("@/lib/crystal-cave-config");
  const catalog = slotGames.find((g) => g.id === CRYSTAL_CAVE_GAME_ID);
  if (!catalog) throw new Error("Crystal Cave not in catalog");

  const cfg = normalizeCrystalCaveConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CRYSTAL_CAVE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CRYSTAL_CAVE_GAME_ID,
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
      .where(eq(gameControls.gameId, CRYSTAL_CAVE_GAME_ID));
  }

  try {
    const { clearCrystalCaveEngineCache } = await import("../games/crystal-cave.server");
    clearCrystalCaveEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.crystal_cave_config",
    summary: `Updated Crystal Cave engine (RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: CRYSTAL_CAVE_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Diamond Dig engine math (defaults if unset). */
export async function getDiamondDigEngineConfig() {
  const {
    DIAMOND_DIG_GAME_ID,
    DEFAULT_DIAMOND_DIG_CONFIG,
    normalizeDiamondDigConfig,
  } = await import("@/lib/diamond-dig-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, DIAMOND_DIG_GAME_ID))
      .limit(1);
    return normalizeDiamondDigConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_DIAMOND_DIG_CONFIG);
  }
}

/** Superadmin — save full Diamond Dig math config. */
export async function saveDiamondDigEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { DIAMOND_DIG_GAME_ID, normalizeDiamondDigConfig } = await import("@/lib/diamond-dig-config");
  const catalog = slotGames.find((g) => g.id === DIAMOND_DIG_GAME_ID);
  if (!catalog) throw new Error("Diamond Dig not in catalog");

  const cfg = normalizeDiamondDigConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, DIAMOND_DIG_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: DIAMOND_DIG_GAME_ID,
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
      .where(eq(gameControls.gameId, DIAMOND_DIG_GAME_ID));
  }

  try {
    const { clearDiamondDigEngineCache } = await import("../games/diamond-dig.server");
    clearDiamondDigEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.diamond_dig_config",
    summary: `Updated Diamond Dig engine (RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: DIAMOND_DIG_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Candy Blast engine math (defaults if unset). */
export async function getCandyBlastEngineConfig() {
  const {
    CANDY_BLAST_GAME_ID,
    DEFAULT_CANDY_BLAST_CONFIG,
    normalizeCandyBlastConfig,
  } = await import("@/lib/candy-blast-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CANDY_BLAST_GAME_ID))
      .limit(1);
    return normalizeCandyBlastConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CANDY_BLAST_CONFIG);
  }
}

/** Superadmin — save full Candy Blast math config. */
export async function saveCandyBlastEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { CANDY_BLAST_GAME_ID, normalizeCandyBlastConfig } = await import("@/lib/candy-blast-config");
  const catalog = slotGames.find((g) => g.id === CANDY_BLAST_GAME_ID);
  if (!catalog) throw new Error("Candy Blast not in catalog");

  const cfg = normalizeCandyBlastConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CANDY_BLAST_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CANDY_BLAST_GAME_ID,
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
      .where(eq(gameControls.gameId, CANDY_BLAST_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.candy_blast_config",
    summary: `Updated Candy Blast engine config`,
    targetType: "game",
    targetId: CANDY_BLAST_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Sweet Rush engine math (defaults if unset). */
export async function getSweetRushEngineConfig() {
  const {
    SWEET_RUSH_GAME_ID,
    DEFAULT_SWEET_RUSH_CONFIG,
    normalizeSweetRushConfig,
  } = await import("@/lib/sweet-rush-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, SWEET_RUSH_GAME_ID))
      .limit(1);
    return normalizeSweetRushConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_SWEET_RUSH_CONFIG);
  }
}

/** Superadmin — save full Sweet Rush math config. */
export async function saveSweetRushEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { SWEET_RUSH_GAME_ID, normalizeSweetRushConfig } = await import("@/lib/sweet-rush-config");
  const catalog = slotGames.find((g) => g.id === SWEET_RUSH_GAME_ID);
  if (!catalog) throw new Error("Sweet Rush not in catalog");

  const cfg = normalizeSweetRushConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, SWEET_RUSH_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: SWEET_RUSH_GAME_ID,
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
      .where(eq(gameControls.gameId, SWEET_RUSH_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.sweet_rush_config",
    summary: `Updated Sweet Rush engine config`,
    targetType: "game",
    targetId: SWEET_RUSH_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Starlight Ways engine math (defaults if unset). */
export async function getStarlightWaysEngineConfig() {
  const {
    STARLIGHT_WAYS_GAME_ID,
    DEFAULT_STARLIGHT_WAYS_CONFIG,
    normalizeStarlightWaysConfig,
  } = await import("@/lib/starlight-ways-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, STARLIGHT_WAYS_GAME_ID))
      .limit(1);
    return normalizeStarlightWaysConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_STARLIGHT_WAYS_CONFIG);
  }
}

/** Superadmin — save full Starlight Ways math config. */
export async function saveStarlightWaysEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { STARLIGHT_WAYS_GAME_ID, normalizeStarlightWaysConfig } = await import("@/lib/starlight-ways-config");
  const catalog = slotGames.find((g) => g.id === STARLIGHT_WAYS_GAME_ID);
  if (!catalog) throw new Error("Starlight Ways not in catalog");

  const cfg = normalizeStarlightWaysConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, STARLIGHT_WAYS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: STARLIGHT_WAYS_GAME_ID,
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
      .where(eq(gameControls.gameId, STARLIGHT_WAYS_GAME_ID));
  }

  try {
    const { clearStarlightWaysEngineCache } = await import("../games/starlight-ways.server");
    clearStarlightWaysEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.starlight_ways_config",
    summary: `Updated Starlight Ways engine (RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: STARLIGHT_WAYS_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Galaxy Ace engine math (defaults if unset). */
export async function getGalaxyAceEngineConfig() {
  const {
    GALAXY_ACE_GAME_ID,
    DEFAULT_GALAXY_ACE_CONFIG,
    normalizeGalaxyAceConfig,
  } = await import("@/lib/galaxy-ace-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, GALAXY_ACE_GAME_ID))
      .limit(1);
    return normalizeGalaxyAceConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_GALAXY_ACE_CONFIG);
  }
}

/** Superadmin — save full Galaxy Ace math config. */
export async function saveGalaxyAceEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { GALAXY_ACE_GAME_ID, normalizeGalaxyAceConfig } = await import("@/lib/galaxy-ace-config");
  const catalog = slotGames.find((g) => g.id === GALAXY_ACE_GAME_ID);
  if (!catalog) throw new Error("Galaxy Ace not in catalog");

  const cfg = normalizeGalaxyAceConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, GALAXY_ACE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: GALAXY_ACE_GAME_ID,
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
      .where(eq(gameControls.gameId, GALAXY_ACE_GAME_ID));
  }

  try {
    const { clearGalaxyAceEngineCache } = await import("../games/galaxy-ace.server");
    clearGalaxyAceEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.galaxy_ace_config",
    summary: `Updated Galaxy Ace engine (RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: GALAXY_ACE_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Gate of Ra engine math (defaults if unset). */
export async function getGateOfRaEngineConfig() {
  const {
    GATE_OF_RA_GAME_ID,
    DEFAULT_GATE_OF_RA_CONFIG,
    normalizeGateOfRaConfig,
  } = await import("@/lib/gate-of-ra-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, GATE_OF_RA_GAME_ID))
      .limit(1);
    return normalizeGateOfRaConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_GATE_OF_RA_CONFIG);
  }
}

/** Superadmin — save full Gate of Ra math config. */
export async function saveGateOfRaEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { GATE_OF_RA_GAME_ID, normalizeGateOfRaConfig } = await import("@/lib/gate-of-ra-config");
  const catalog = slotGames.find((g) => g.id === GATE_OF_RA_GAME_ID);
  if (!catalog) throw new Error("Gate of Ra not in catalog");

  const cfg = normalizeGateOfRaConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, GATE_OF_RA_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: GATE_OF_RA_GAME_ID,
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
      .where(eq(gameControls.gameId, GATE_OF_RA_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.gate_of_ra_config",
    summary: `Updated Gate of Ra engine config`,
    targetType: "game",
    targetId: GATE_OF_RA_GAME_ID,
    meta: {},
  });

  return cfg;
}


/** Public — Mystic Runes engine math (defaults if unset). */
export async function getMysticRunesEngineConfig() {
  const {
    MYSTIC_RUNES_GAME_ID,
    DEFAULT_MYSTIC_RUNES_CONFIG,
    normalizeMysticRunesConfig,
  } = await import("@/lib/mystic-runes-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MYSTIC_RUNES_GAME_ID))
      .limit(1);
    return normalizeMysticRunesConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_MYSTIC_RUNES_CONFIG);
  }
}

/** Superadmin — save full Mystic Runes math config. */
export async function saveMysticRunesEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { MYSTIC_RUNES_GAME_ID, normalizeMysticRunesConfig } = await import("@/lib/mystic-runes-config");
  const catalog = slotGames.find((g) => g.id === MYSTIC_RUNES_GAME_ID);
  if (!catalog) throw new Error("Mystic Runes not in catalog");

  const cfg = normalizeMysticRunesConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, MYSTIC_RUNES_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: MYSTIC_RUNES_GAME_ID,
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
      .where(eq(gameControls.gameId, MYSTIC_RUNES_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.mystic_runes_config",
    summary: `Updated Mystic Runes engine config`,
    targetType: "game",
    targetId: MYSTIC_RUNES_GAME_ID,
    meta: {},
  });

  return cfg;
}

// Wave C clones

/** Public — Halo-Halo Hits engine math (defaults if unset). */
export async function getHaloHaloHitsEngineConfig() {
  const {
    HALO_HALO_HITS_GAME_ID,
    DEFAULT_HALO_HALO_HITS_CONFIG,
    normalizeHaloHaloHitsConfig,
  } = await import("@/lib/halo-halo-hits-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, HALO_HALO_HITS_GAME_ID))
      .limit(1);
    return normalizeHaloHaloHitsConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_HALO_HALO_HITS_CONFIG);
  }
}

/** Superadmin — save full Halo-Halo Hits math config. */
export async function saveHaloHaloHitsEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { HALO_HALO_HITS_GAME_ID, normalizeHaloHaloHitsConfig } = await import("@/lib/halo-halo-hits-config");
  const catalog = slotGames.find((g) => g.id === HALO_HALO_HITS_GAME_ID);
  if (!catalog) throw new Error("Halo-Halo Hits not in catalog");

  const cfg = normalizeHaloHaloHitsConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, HALO_HALO_HITS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: HALO_HALO_HITS_GAME_ID,
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
      .where(eq(gameControls.gameId, HALO_HALO_HITS_GAME_ID));
  }

  try {
    const { clearHaloHaloHitsEngineCache } = await import("../games/halo-halo-hits.server");
    clearHaloHaloHitsEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.halo_halo_hits_config",
    summary: `Updated Halo-Halo Hits engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, EX ${cfg.exBetMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: HALO_HALO_HITS_GAME_ID,
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


/** Public — Balut Bonus engine math (defaults if unset). */
export async function getBalutBonusEngineConfig() {
  const {
    BALUT_BONUS_GAME_ID,
    DEFAULT_BALUT_BONUS_CONFIG,
    normalizeBalutBonusConfig,
  } = await import("@/lib/balut-bonus-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, BALUT_BONUS_GAME_ID))
      .limit(1);
    return normalizeBalutBonusConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_BALUT_BONUS_CONFIG);
  }
}

/** Superadmin — save full Balut Bonus math config. */
export async function saveBalutBonusEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { BALUT_BONUS_GAME_ID, normalizeBalutBonusConfig } = await import("@/lib/balut-bonus-config");
  const catalog = slotGames.find((g) => g.id === BALUT_BONUS_GAME_ID);
  if (!catalog) throw new Error("Balut Bonus not in catalog");

  const cfg = normalizeBalutBonusConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, BALUT_BONUS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: BALUT_BONUS_GAME_ID,
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
      .where(eq(gameControls.gameId, BALUT_BONUS_GAME_ID));
  }

  try {
    const { clearBalutBonusEngineCache } = await import("../games/balut-bonus.server");
    clearBalutBonusEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.balut_bonus_config",
    summary: `Updated Balut Bonus engine (profile ${cfg.activeRtpProfile}, maxWin ${cfg.maxWinMult}x, EX ${cfg.exBetMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: BALUT_BONUS_GAME_ID,
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


/** Public — Sinigang Spin engine math (defaults if unset). */
export async function getSinigangSpinEngineConfig() {
  const {
    SINIGANG_SPIN_GAME_ID,
    DEFAULT_SINIGANG_SPIN_CONFIG,
    normalizeSinigangSpinConfig,
  } = await import("@/lib/sinigang-spin-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, SINIGANG_SPIN_GAME_ID))
      .limit(1);
    return normalizeSinigangSpinConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_SINIGANG_SPIN_CONFIG);
  }
}

/** Superadmin — save full Sinigang Spin math config. */
export async function saveSinigangSpinEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    SINIGANG_SPIN_GAME_ID,
    normalizeSinigangSpinConfig,
  } = await import("@/lib/sinigang-spin-config");
  const catalog = slotGames.find((g) => g.id === SINIGANG_SPIN_GAME_ID);
  if (!catalog) throw new Error("Sinigang Spin not in catalog");

  const cfg = normalizeSinigangSpinConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, SINIGANG_SPIN_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: SINIGANG_SPIN_GAME_ID,
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
      .where(eq(gameControls.gameId, SINIGANG_SPIN_GAME_ID));
  }

  try {
    const { clearSinigangSpinEngineCache } = await import("../games/sinigang-spin.server");
    clearSinigangSpinEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.sinigang_spin_config",
    summary: `Updated Sinigang Spin engine (FS ${cfg.freeSpinsAward}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: SINIGANG_SPIN_GAME_ID,
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


/** Public — Lechon Luck engine math (defaults if unset). */
export async function getLechonLuckEngineConfig() {
  const {
    LECHON_LUCK_GAME_ID,
    DEFAULT_LECHON_LUCK_CONFIG,
    normalizeLechonLuckConfig,
  } = await import("@/lib/lechon-luck-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LECHON_LUCK_GAME_ID))
      .limit(1);
    return normalizeLechonLuckConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_LECHON_LUCK_CONFIG);
  }
}

/** Superadmin — save full Lechon Luck math config. */
export async function saveLechonLuckEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    LECHON_LUCK_GAME_ID,
    normalizeLechonLuckConfig,
  } = await import("@/lib/lechon-luck-config");
  const catalog = slotGames.find((g) => g.id === LECHON_LUCK_GAME_ID);
  if (!catalog) throw new Error("Lechon Luck not in catalog");

  const cfg = normalizeLechonLuckConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, LECHON_LUCK_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: LECHON_LUCK_GAME_ID,
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
      .where(eq(gameControls.gameId, LECHON_LUCK_GAME_ID));
  }

  try {
    const { clearLechonLuckEngineCache } = await import("../games/lechon-luck.server");
    clearLechonLuckEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.lechon_luck_config",
    summary: `Updated Lechon Luck engine (FS ${cfg.freeSpinsAward}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: LECHON_LUCK_GAME_ID,
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


/** Public — Lantern Luck engine math (defaults if unset). */
export async function getLanternLuckEngineConfig() {
  const {
    LANTERN_LUCK_GAME_ID,
    DEFAULT_LANTERN_LUCK_CONFIG,
    normalizeLanternLuckConfig,
  } = await import("@/lib/lantern-luck-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LANTERN_LUCK_GAME_ID))
      .limit(1);
    return normalizeLanternLuckConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_LANTERN_LUCK_CONFIG);
  }
}

/** Superadmin — save full Lantern Luck math config. */
export async function saveLanternLuckEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    LANTERN_LUCK_GAME_ID,
    normalizeLanternLuckConfig,
  } = await import("@/lib/lantern-luck-config");
  const catalog = slotGames.find((g) => g.id === LANTERN_LUCK_GAME_ID);
  if (!catalog) throw new Error("Lantern Luck not in catalog");

  const cfg = normalizeLanternLuckConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, LANTERN_LUCK_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: LANTERN_LUCK_GAME_ID,
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
      .where(eq(gameControls.gameId, LANTERN_LUCK_GAME_ID));
  }

  try {
    const { clearLanternLuckEngineCache } = await import("../games/lantern-luck.server");
    clearLanternLuckEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.lantern_luck_config",
    summary: `Updated Lantern Luck engine (FS ${cfg.freeSpinsAward}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: LANTERN_LUCK_GAME_ID,
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


/** Public — Palengke Pays engine math (defaults if unset). */
export async function getPalengkePaysEngineConfig() {
  const {
    PALENGKE_PAYS_GAME_ID,
    DEFAULT_PALENGKE_PAYS_CONFIG,
    normalizePalengkePaysConfig,
  } = await import("@/lib/palengke-pays-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, PALENGKE_PAYS_GAME_ID))
      .limit(1);
    return normalizePalengkePaysConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_PALENGKE_PAYS_CONFIG);
  }
}

/** Superadmin — save full Palengke Pays math config. */
export async function savePalengkePaysEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    PALENGKE_PAYS_GAME_ID,
    normalizePalengkePaysConfig,
  } = await import("@/lib/palengke-pays-config");
  const catalog = slotGames.find((g) => g.id === PALENGKE_PAYS_GAME_ID);
  if (!catalog) throw new Error("Palengke Pays not in catalog");

  const cfg = normalizePalengkePaysConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, PALENGKE_PAYS_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: PALENGKE_PAYS_GAME_ID,
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
      .where(eq(gameControls.gameId, PALENGKE_PAYS_GAME_ID));
  }

  try {
    const { clearPalengkePaysEngineCache } = await import("../games/palengke-pays.server");
    clearPalengkePaysEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.palengke_pays_config",
    summary: `Updated Palengke Pays engine (FS ${cfg.freeSpinsBaseCount}, H&W ${cfg.holdWinTriggerCount}+ coins, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: PALENGKE_PAYS_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      holdWinTriggerCount: cfg.holdWinTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}


/** Public — Tricycle Treasure engine math (defaults if unset). */
export async function getTricycleTreasureEngineConfig() {
  const {
    TRICYCLE_TREASURE_GAME_ID,
    DEFAULT_TRICYCLE_TREASURE_CONFIG,
    normalizeTricycleTreasureConfig,
  } = await import("@/lib/tricycle-treasure-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, TRICYCLE_TREASURE_GAME_ID))
      .limit(1);
    return normalizeTricycleTreasureConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_TRICYCLE_TREASURE_CONFIG);
  }
}

/** Superadmin — save full Tricycle Treasure math config. */
export async function saveTricycleTreasureEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    TRICYCLE_TREASURE_GAME_ID,
    normalizeTricycleTreasureConfig,
  } = await import("@/lib/tricycle-treasure-config");
  const catalog = slotGames.find((g) => g.id === TRICYCLE_TREASURE_GAME_ID);
  if (!catalog) throw new Error("Tricycle Treasure not in catalog");

  const cfg = normalizeTricycleTreasureConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, TRICYCLE_TREASURE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: TRICYCLE_TREASURE_GAME_ID,
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
      .where(eq(gameControls.gameId, TRICYCLE_TREASURE_GAME_ID));
  }

  try {
    const { clearTricycleTreasureEngineCache } = await import("../games/tricycle-treasure.server");
    clearTricycleTreasureEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.tricycle_treasure_config",
    summary: `Updated Tricycle Treasure engine (FS ${cfg.freeSpinsBaseCount}, H&W ${cfg.holdWinTriggerCount}+ coins, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: TRICYCLE_TREASURE_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      holdWinTriggerCount: cfg.holdWinTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}


/** Public — Beach Bonanza engine math (defaults if unset). */
export async function getBeachBonanzaEngineConfig() {
  const {
    BEACH_BONANZA_GAME_ID,
    DEFAULT_BEACH_BONANZA_CONFIG,
    normalizeBeachBonanzaConfig,
  } = await import("@/lib/beach-bonanza-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, BEACH_BONANZA_GAME_ID))
      .limit(1);
    return normalizeBeachBonanzaConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_BEACH_BONANZA_CONFIG);
  }
}

/** Superadmin — save full Beach Bonanza math config. */
export async function saveBeachBonanzaEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    BEACH_BONANZA_GAME_ID,
    normalizeBeachBonanzaConfig,
  } = await import("@/lib/beach-bonanza-config");
  const catalog = slotGames.find((g) => g.id === BEACH_BONANZA_GAME_ID);
  if (!catalog) throw new Error("Beach Bonanza not in catalog");

  const cfg = normalizeBeachBonanzaConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, BEACH_BONANZA_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: BEACH_BONANZA_GAME_ID,
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
      .where(eq(gameControls.gameId, BEACH_BONANZA_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.beach_bonanza_config",
    summary: `Updated Beach Bonanza engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: BEACH_BONANZA_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}


/** Public — Island Fever engine math (defaults if unset). */
export async function getIslandFeverEngineConfig() {
  const {
    ISLAND_FEVER_GAME_ID,
    DEFAULT_ISLAND_FEVER_CONFIG,
    normalizeIslandFeverConfig,
  } = await import("@/lib/island-fever-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, ISLAND_FEVER_GAME_ID))
      .limit(1);
    return normalizeIslandFeverConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_ISLAND_FEVER_CONFIG);
  }
}

/** Superadmin — save full Island Fever math config. */
export async function saveIslandFeverEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    ISLAND_FEVER_GAME_ID,
    normalizeIslandFeverConfig,
  } = await import("@/lib/island-fever-config");
  const catalog = slotGames.find((g) => g.id === ISLAND_FEVER_GAME_ID);
  if (!catalog) throw new Error("Island Fever not in catalog");

  const cfg = normalizeIslandFeverConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, ISLAND_FEVER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: ISLAND_FEVER_GAME_ID,
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
      .where(eq(gameControls.gameId, ISLAND_FEVER_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.island_fever_config",
    summary: `Updated Island Fever engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: ISLAND_FEVER_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}


/** Public — Neon Makati engine math (defaults if unset). */
export async function getNeonMakatiEngineConfig() {
  const {
    NEON_MAKATI_GAME_ID,
    DEFAULT_NEON_MAKATI_CONFIG,
    normalizeNeonMakatiConfig,
  } = await import("@/lib/neon-makati-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, NEON_MAKATI_GAME_ID))
      .limit(1);
    return normalizeNeonMakatiConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_NEON_MAKATI_CONFIG);
  }
}

/** Superadmin — save full Neon Makati math config. */
export async function saveNeonMakatiEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    NEON_MAKATI_GAME_ID,
    normalizeNeonMakatiConfig,
  } = await import("@/lib/neon-makati-config");
  const catalog = slotGames.find((g) => g.id === NEON_MAKATI_GAME_ID);
  if (!catalog) throw new Error("Neon Makati not in catalog");

  const cfg = normalizeNeonMakatiConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, NEON_MAKATI_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: NEON_MAKATI_GAME_ID,
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
      .where(eq(gameControls.gameId, NEON_MAKATI_GAME_ID));
  }

  try {
    const { clearNeonMakatiEngineCache } = await import("../games/neon-makati.server");
    clearNeonMakatiEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.neon_makati_config",
    summary: `Updated Neon Makati engine (FS ${cfg.freeSpinsBaseCount}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: NEON_MAKATI_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}


/** Public — Quezon Quest engine math (defaults if unset). */
export async function getQuezonQuestEngineConfig() {
  const {
    QUEZON_QUEST_GAME_ID,
    DEFAULT_QUEZON_QUEST_CONFIG,
    normalizeQuezonQuestConfig,
  } = await import("@/lib/quezon-quest-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, QUEZON_QUEST_GAME_ID))
      .limit(1);
    return normalizeQuezonQuestConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_QUEZON_QUEST_CONFIG);
  }
}

/** Superadmin — save full Quezon Quest math config. */
export async function saveQuezonQuestEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    QUEZON_QUEST_GAME_ID,
    normalizeQuezonQuestConfig,
  } = await import("@/lib/quezon-quest-config");
  const catalog = slotGames.find((g) => g.id === QUEZON_QUEST_GAME_ID);
  if (!catalog) throw new Error("Quezon Quest not in catalog");

  const cfg = normalizeQuezonQuestConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, QUEZON_QUEST_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: QUEZON_QUEST_GAME_ID,
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
      .where(eq(gameControls.gameId, QUEZON_QUEST_GAME_ID));
  }

  try {
    const { clearQuezonQuestEngineCache } = await import("../games/quezon-quest.server");
    clearQuezonQuestEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.quezon_quest_config",
    summary: `Updated Quezon Quest engine (FS ${cfg.freeSpinsBaseCount}, maxWin ${cfg.maxWinMult}x, target RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: QUEZON_QUEST_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}


/** Public — Carabao Cash engine math (defaults if unset). */
export async function getCarabaoCashEngineConfig() {
  const {
    CARABAO_CASH_GAME_ID,
    DEFAULT_CARABAO_CASH_CONFIG,
    normalizeCarabaoCashConfig,
  } = await import("@/lib/carabao-cash-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CARABAO_CASH_GAME_ID))
      .limit(1);
    return normalizeCarabaoCashConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CARABAO_CASH_CONFIG);
  }
}

/** Superadmin — save Carabao Cash math config. */
export async function saveCarabaoCashEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    CARABAO_CASH_GAME_ID,
    normalizeCarabaoCashConfig,
  } = await import("@/lib/carabao-cash-config");
  const catalog = slotGames.find((g) => g.id === CARABAO_CASH_GAME_ID);
  if (!catalog) throw new Error("Carabao Cash not in catalog");

  const cfg = normalizeCarabaoCashConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CARABAO_CASH_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CARABAO_CASH_GAME_ID,
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
      .where(eq(gameControls.gameId, CARABAO_CASH_GAME_ID));
  }

  try {
    const { clearCarabaoCashEngineCache } = await import("../games/carabao-cash.server");
    clearCarabaoCashEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.carabao_cash_config",
    summary: `Updated Carabao Cash (FS ${cfg.freeSpinsBaseCount}, chests ${cfg.chestTriggerCount}+, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: CARABAO_CASH_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      chestTriggerCount: cfg.chestTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}


/** Public — Rice Field Riches engine math (defaults if unset). */
export async function getRiceFieldRichesEngineConfig() {
  const {
    RICE_FIELD_RICHES_GAME_ID,
    DEFAULT_RICE_FIELD_RICHES_CONFIG,
    normalizeRiceFieldRichesConfig,
  } = await import("@/lib/rice-field-riches-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, RICE_FIELD_RICHES_GAME_ID))
      .limit(1);
    return normalizeRiceFieldRichesConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_RICE_FIELD_RICHES_CONFIG);
  }
}

/** Superadmin — save Rice Field Riches math config. */
export async function saveRiceFieldRichesEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    RICE_FIELD_RICHES_GAME_ID,
    normalizeRiceFieldRichesConfig,
  } = await import("@/lib/rice-field-riches-config");
  const catalog = slotGames.find((g) => g.id === RICE_FIELD_RICHES_GAME_ID);
  if (!catalog) throw new Error("Rice Field Riches not in catalog");

  const cfg = normalizeRiceFieldRichesConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, RICE_FIELD_RICHES_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: RICE_FIELD_RICHES_GAME_ID,
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
      .where(eq(gameControls.gameId, RICE_FIELD_RICHES_GAME_ID));
  }

  try {
    const { clearRiceFieldRichesEngineCache } = await import("../games/rice-field-riches.server");
    clearRiceFieldRichesEngineCache();
  } catch {
    /* ignore */
  }

  await writeAuditLog({
    actor,
    action: "super.rice_field_riches_config",
    summary: `Updated Rice Field Riches (FS ${cfg.freeSpinsBaseCount}, chests ${cfg.chestTriggerCount}+, maxWin ${cfg.maxWinMult}x, RTP ${cfg.targetRtp}%)`,
    targetType: "game",
    targetId: RICE_FIELD_RICHES_GAME_ID,
    meta: {
      freeSpinsBaseCount: cfg.freeSpinsBaseCount,
      chestTriggerCount: cfg.chestTriggerCount,
      maxWinMult: cfg.maxWinMult,
      targetRtp: cfg.targetRtp,
    },
  });

  return cfg;
}


/** Public — Wild Panther engine math (defaults if unset). */
export async function getWildPantherEngineConfig() {
  const {
    WILD_PANTHER_GAME_ID,
    DEFAULT_WILD_PANTHER_CONFIG,
    normalizeWildPantherConfig,
  } = await import("@/lib/wild-panther-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, WILD_PANTHER_GAME_ID))
      .limit(1);
    return normalizeWildPantherConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_WILD_PANTHER_CONFIG);
  }
}

/** Superadmin — save full Wild Panther math config. */
export async function saveWildPantherEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    WILD_PANTHER_GAME_ID,
    normalizeWildPantherConfig,
  } = await import("@/lib/wild-panther-config");
  const catalog = slotGames.find((g) => g.id === WILD_PANTHER_GAME_ID);
  if (!catalog) throw new Error("Wild Panther not in catalog");

  const cfg = normalizeWildPantherConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, WILD_PANTHER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: WILD_PANTHER_GAME_ID,
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
      .where(eq(gameControls.gameId, WILD_PANTHER_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.wild_panther_config",
    summary: `Updated Wild Panther engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: WILD_PANTHER_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

