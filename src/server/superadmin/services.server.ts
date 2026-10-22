/**
 * Domain 3 — Superadmin server logic.
 * Full control: users, admins, games, jackpot.
 */
import { eq, desc, sql, like, or, and, asc, inArray } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { getDb } from "../db/client";
import {
  auditLogs,
  gameControls,
  jackpot,
  platformSettings,
  promotions,
  riskControls,
  sessions,
  transactions,
  users,
  walletRequests,
} from "../db/schema";
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
import {
  destroyUserSessions,
  money,
  newId,
  requireAdmin,
  requireSuperadmin,
  toPublicUser,
} from "../session";
import { writeAuditLog } from "../admin/audit.server";
import {
  isAdminListedGame,
  isLobbyVisibleGame,
  isThumbnailOnlyGame,
  THUMBNAIL_ONLY_GAME_IDS,
} from "@/lib/playable-games";
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
      or(
        like(users.email, `%${q}%`),
        like(users.username, `%${q}%`),
        like(users.displayName, `%${q}%`),
      ),
    );
  }

  const base = db.select().from(users);
  const rows =
    filters.length > 0
      ? await base
          .where(and(...filters))
          .orderBy(desc(users.createdAt))
          .limit(limit)
      : await base.orderBy(desc(users.createdAt)).limit(limit);

  const uplineIds = Array.from(
    new Set(rows.map((u) => u.parentAgentId).filter(Boolean)),
  ) as string[];
  const agentMap = new Map<string, string>();

  if (uplineIds.length > 0) {
    const agents = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(
        sql`${users.id} in (${sql.join(
          uplineIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
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
    isLocked:
      u.isLocked === "yes" ||
      (u.failedAttempts ?? 0) >= 3 ||
      Boolean(u.lockedUntil && new Date() < new Date(u.lockedUntil))
        ? "yes"
        : "no",
    failedAttempts: u.failedAttempts ?? 0,
    parentAgentId: u.parentAgentId ?? null,
    parentAgentUsername: u.parentAgentId
      ? (agentMap.get(u.parentAgentId) ?? "System / Direct")
      : "System / Direct",
    createdAt: u.createdAt?.toISOString?.() ?? String(u.createdAt),
  }));
}

export async function superSetUserRole(data: {
  userId: string;
  role: UserRole;
}): Promise<PublicUser> {
  const actor = await requirePermission("ROLE_UPDATE", {
    targetType: "user",
    targetId: data.userId,
  });
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

  const [existingUsername] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
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
    const email =
      data.email === null || data.email.trim() === "" ? null : data.email.trim().toLowerCase();
    if (email !== target.email) {
      patch.email = email;
      changes.push(email ? `email → ${email}` : "email cleared");
    }
  }

  if (data.displayName !== undefined) {
    const displayName =
      data.displayName === null || data.displayName.trim() === "" ? null : data.displayName.trim();
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
    await tx
      .update(users)
      .set({ balance: money(next) })
      .where(eq(users.id, user.id));
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
  // Soft-launch: hide thumbnail-only (Coming Soon) titles from the admin grid;
  // families still hidden from players stay listed so they can be configured.
  const rows: SuperGameRow[] = [];
  for (const catalog of slotGames) {
    const id = catalog.id;
    if (!isAdminListedGame(id) || isThumbnailOnlyGame(id)) continue;
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
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, data.gameId))
    .limit(1);
  const patch = {
    enabled: forceDisabled
      ? ("no" as const)
      : data.enabled === undefined
        ? undefined
        : data.enabled
          ? ("yes" as const)
          : ("no" as const),
    featured:
      data.featured === undefined ? undefined : data.featured ? ("yes" as const) : ("no" as const),
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
      notes:
        data.notes ??
        (forceDisabled ? "Soft-launch: thumbnail only — engine not mounted yet" : null),
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
    await db
      .update(jackpot)
      .set({ amount: money(amount) })
      .where(eq(jackpot.id, "mega"));
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
    await db
      .update(jackpot)
      .set({ enabled: enabled ? "yes" : "no" })
      .where(eq(jackpot.id, "mega"));
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
    await db
      .update(jackpot)
      .set({ displayAmount: money(amount) })
      .where(eq(jackpot.id, "mega"));
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
    await tx
      .update(users)
      .set({ balance: money(nextBal) })
      .where(eq(users.id, player.id));
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
    await tx
      .update(jackpot)
      .set({ amount: money(reset) })
      .where(eq(jackpot.id, "mega"));

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
    return slotGames.filter((g) => isLobbyVisibleGame(g.id) && !isThumbnailOnlyGame(g.id));
  }
  const map = new Map(controls.map((c) => [c.gameId, c]));

  type Row = (typeof slotGames)[number] & { _sort: number };
  const rows: Row[] = [];
  for (const g of slotGames) {
    // Soft-launch: lobby shows the Golden Panther family only.
    if (!isLobbyVisibleGame(g.id) || isThumbnailOnlyGame(g.id)) continue;
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

/** Public — Godly Gates engine math (defaults if unset). */
export async function getGodlyGatesEngineConfig() {
  const { GODLY_GATES_GAME_ID, DEFAULT_GODLY_GATES_CONFIG, normalizeGodlyGatesConfig } =
    await import("@/lib/godly-gates-config");
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
  const { GODLY_GATES_GAME_ID, normalizeGodlyGatesConfig } =
    await import("@/lib/godly-gates-config");
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
  const { OLYMPUS_WRATH_GAME_ID, DEFAULT_OLYMPUS_WRATH_CONFIG, normalizeOlympusWrathConfig } =
    await import("@/lib/olympus-wrath-config");
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
  const { OLYMPUS_WRATH_GAME_ID, normalizeOlympusWrathConfig } =
    await import("@/lib/olympus-wrath-config");
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
  const { ENCHANTED_GROVE_GAME_ID, DEFAULT_ENCHANTED_GROVE_CONFIG, normalizeEnchantedGroveConfig } =
    await import("@/lib/enchanted-grove-config");
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
  const { ENCHANTED_GROVE_GAME_ID, normalizeEnchantedGroveConfig } =
    await import("@/lib/enchanted-grove-config");
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

/** Public — Buffalo Reign engine math. */
export async function getBuffaloReignEngineConfig() {
  const { BUFFALO_REIGN_GAME_ID, DEFAULT_BUFFALO_REIGN_CONFIG, normalizeBuffaloReignConfig } =
    await import("@/lib/buffalo-reign-config");
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
  const { BUFFALO_REIGN_GAME_ID, normalizeBuffaloReignConfig } =
    await import("@/lib/buffalo-reign-config");
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
      .where(eq(gameControls.gameId, BUFFALO_REIGN_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.buffalo_reign_config",
    summary: `Updated Buffalo Reign engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: BUFFALO_REIGN_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Fire Spike engine math (defaults if unset). */
export async function getFireSpikeEngineConfig() {
  const { FIRE_SPIKE_GAME_ID, DEFAULT_FIRE_SPIKE_CONFIG, normalizeFireSpikeConfig } =
    await import("@/lib/fire-spike-config");
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

/** Public — Fortune Ox engine math (defaults if unset). */
export async function getFortuneOxEngineConfig() {
  const { FORTUNE_OX_GAME_ID, DEFAULT_FORTUNE_OX_CONFIG, normalizeFortuneOxConfig } =
    await import("@/lib/fortune-ox-config");
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
  const { FORTUNE_OX_GAME_ID, normalizeFortuneOxConfig } = await import("@/lib/fortune-ox-config");
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
      .where(eq(gameControls.gameId, FORTUNE_OX_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.fortune_ox_config",
    summary: `Updated Fortune Ox engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: FORTUNE_OX_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Fortune Tiger engine math (defaults if unset). */
export async function getFortuneTigerEngineConfig() {
  const { FORTUNE_TIGER_GAME_ID, DEFAULT_FORTUNE_TIGER_CONFIG, normalizeFortuneTigerConfig } =
    await import("@/lib/fortune-tiger-config");
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
  const { FORTUNE_TIGER_GAME_ID, normalizeFortuneTigerConfig } =
    await import("@/lib/fortune-tiger-config");
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
      .where(eq(gameControls.gameId, FORTUNE_TIGER_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.fortune_tiger_config",
    summary: `Updated Fortune Tiger engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: FORTUNE_TIGER_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Fortune Rabbit engine math (defaults if unset). */
export async function getFortuneRabbitEngineConfig() {
  const { FORTUNE_RABBIT_GAME_ID, DEFAULT_FORTUNE_RABBIT_CONFIG, normalizeFortuneRabbitConfig } =
    await import("@/lib/fortune-rabbit-config");
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
  const { FORTUNE_RABBIT_GAME_ID, normalizeFortuneRabbitConfig } =
    await import("@/lib/fortune-rabbit-config");
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
      .where(eq(gameControls.gameId, FORTUNE_RABBIT_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.fortune_rabbit_config",
    summary: `Updated Fortune Rabbit engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: FORTUNE_RABBIT_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Cleopatra Gold engine math. */
export async function getCleopatraGoldEngineConfig() {
  const { CLEOPATRA_GOLD_GAME_ID, DEFAULT_CLEOPATRA_GOLD_CONFIG, normalizeCleopatraGoldConfig } =
    await import("@/lib/cleopatra-gold-config");
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
  const { CLEOPATRA_GOLD_GAME_ID, normalizeCleopatraGoldConfig } =
    await import("@/lib/cleopatra-gold-config");
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
      .where(eq(gameControls.gameId, CLEOPATRA_GOLD_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.cleopatra_gold_config",
    summary: `Updated Cleopatra Gold engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: CLEOPATRA_GOLD_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Baccarat engine math (defaults if unset). */
export async function getBaccaratEngineConfig() {
  const { BACCARAT_GAME_ID, DEFAULT_BACCARAT_CONFIG, normalizeBaccaratConfig } =
    await import("@/lib/baccarat-config");
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
  const { DEEP_BASS_GAME_ID, DEFAULT_DEEP_BASS_CONFIG, normalizeDeepBassConfig } =
    await import("@/lib/deep-bass-config");
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
  const { DEEP_BASS_GAME_ID, normalizeDeepBassConfig } = await import("@/lib/deep-bass-config");
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
  const { DRAGON_FISHER_GAME_ID, DEFAULT_DRAGON_FISHER_CONFIG, normalizeDragonFisherConfig } =
    await import("@/lib/dragon-fisher-config");
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
  const { DRAGON_FISHER_GAME_ID, normalizeDragonFisherConfig } =
    await import("@/lib/dragon-fisher-config");
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
  const { CRAB_CANNON_GAME_ID, DEFAULT_CRAB_CANNON_CONFIG, normalizeCrabCannonConfig } =
    await import("@/lib/crab-cannon-config");
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
  const { CRAB_CANNON_GAME_ID, normalizeCrabCannonConfig } =
    await import("@/lib/crab-cannon-config");
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

/** Public — Shark Hunter engine math (defaults if unset). */
export async function getSharkHunterEngineConfig() {
  const { SHARK_HUNTER_GAME_ID, DEFAULT_SHARK_HUNTER_CONFIG, normalizeSharkHunterConfig } =
    await import("@/lib/shark-hunter-config");
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
  const { SHARK_HUNTER_GAME_ID, normalizeSharkHunterConfig } =
    await import("@/lib/shark-hunter-config");
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
  const { OCTOPUS_ARMADA_GAME_ID, DEFAULT_OCTOPUS_ARMADA_CONFIG, normalizeOctopusArmadaConfig } =
    await import("@/lib/octopus-armada-config");
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
  const { OCTOPUS_ARMADA_GAME_ID, normalizeOctopusArmadaConfig } =
    await import("@/lib/octopus-armada-config");
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
  const { TURTLE_TIDE_GAME_ID, DEFAULT_TURTLE_TIDE_CONFIG, normalizeTurtleTideConfig } =
    await import("@/lib/turtle-tide-config");
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
  const { TURTLE_TIDE_GAME_ID, normalizeTurtleTideConfig } =
    await import("@/lib/turtle-tide-config");
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
  const { WHALE_WAR_GAME_ID, DEFAULT_WHALE_WAR_CONFIG, normalizeWhaleWarConfig } =
    await import("@/lib/whale-war-config");
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
  const { WHALE_WAR_GAME_ID, normalizeWhaleWarConfig } = await import("@/lib/whale-war-config");
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
  const { LUCKY9_GAME_ID, DEFAULT_LUCKY9_CONFIG, normalizeLucky9Config } =
    await import("@/lib/lucky9-config");
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
  const { THREE_CARD_POKER_GAME_ID, normalizeThreeCardPokerConfig } =
    await import("@/lib/threecardpoker-config");
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
  const { COLOR_GAME_GAME_ID, DEFAULT_COLOR_GAME_CONFIG, normalizeColorGameConfig } =
    await import("@/lib/color-game-config");
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
  const { COLOR_GAME_GAME_ID, normalizeColorGameConfig } = await import("@/lib/color-game-config");
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
  const { TONGITS_ARENA_GAME_ID, DEFAULT_TONGITS_ARENA_CONFIG, normalizeTongitsArenaConfig } =
    await import("@/lib/tongits-arena-config");
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
  const { TONGITS_ARENA_GAME_ID, normalizeTongitsArenaConfig } =
    await import("@/lib/tongits-arena-config");
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
  const { LUCKY_DROP_GAME_ID, DEFAULT_LUCKY_DROP_CONFIG, normalizeLuckyDropConfig } =
    await import("@/lib/lucky-drop-config");
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
  const { LUCKY_DROP_GAME_ID, normalizeLuckyDropConfig } = await import("@/lib/lucky-drop-config");
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
    summary: `Updated Royal Climb engine (edge ${cfg.houseEdge}%, ${cfg.maxSteps} rungs, ${cfg.skips} skips, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: LUCKY_DROP_GAME_ID,
    meta: {
      houseEdge: cfg.houseEdge,
      maxSteps: cfg.maxSteps,
      skips: cfg.skips,
      rtpTarget: cfg.rtpTarget,
    },
  });

  return cfg;
}

/** Public — Color Game Pro engine math (defaults if unset). */
export async function getColorGameProEngineConfig() {
  const { COLOR_GAME_PRO_GAME_ID, DEFAULT_COLOR_GAME_PRO_CONFIG, normalizeColorGameProConfig } =
    await import("@/lib/color-game-pro-config");
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
  const { COLOR_GAME_PRO_GAME_ID, normalizeColorGameProConfig } =
    await import("@/lib/color-game-pro-config");
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
  const { LUCKY_NINE_PLUS_GAME_ID, DEFAULT_LUCKY_NINE_PLUS_CONFIG, normalizeLuckyNinePlusConfig } =
    await import("@/lib/lucky-nine-plus-config");
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
  const { LUCKY_NINE_PLUS_GAME_ID, normalizeLuckyNinePlusConfig } =
    await import("@/lib/lucky-nine-plus-config");
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
  const { DROP_DELUXE_GAME_ID, DEFAULT_DROP_DELUXE_CONFIG, normalizeDropDeluxeConfig } =
    await import("@/lib/drop-deluxe-config");
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
  const { DROP_DELUXE_GAME_ID, normalizeDropDeluxeConfig } =
    await import("@/lib/drop-deluxe-config");
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
    summary: `Updated Deluxe Draw engine (royal ${cfg.paytable.royal}×, RTP ${cfg.rtpTarget}%)`,
    targetType: "game",
    targetId: DROP_DELUXE_GAME_ID,
    meta: {
      paytable: cfg.paytable,
      rtpTarget: cfg.rtpTarget,
    },
  });

  return cfg;
}

/** Public — Poker Showdown engine math (defaults if unset). */
export async function getPokerShowdownEngineConfig() {
  const { POKER_SHOWDOWN_GAME_ID, DEFAULT_POKER_SHOWDOWN_CONFIG, normalizePokerShowdownConfig } =
    await import("@/lib/poker-showdown-config");
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
  const { POKER_SHOWDOWN_GAME_ID, normalizePokerShowdownConfig } =
    await import("@/lib/poker-showdown-config");
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
  const { ACE_HIGH_GAME_ID, DEFAULT_ACE_HIGH_CONFIG, normalizeAceHighConfig } =
    await import("@/lib/ace-high-config");
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
  const { GOLDEN_PANTHER_GAME_ID, DEFAULT_GOLDEN_PANTHER_CONFIG, normalizeGoldenPantherConfig } =
    await import("@/lib/golden-panther-config");
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
  const { GOLDEN_PANTHER_GAME_ID, normalizeGoldenPantherConfig } =
    await import("@/lib/golden-panther-config");
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

    const userRows = await tx
      .select()
      .from(users)
      .where(eq(users.id, req.userId))
      .for("update")
      .limit(1);
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

    await tx
      .update(users)
      .set({ balance: money(next) })
      .where(eq(users.id, user.id));
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
    const rows = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.id, "default"))
      .limit(1);
    const r = rows[0];
    if (!r) {
      return {
        maintenanceMode: false,
        announcementBanner:
          "Welcome to MaxHigh Casino! Instant payouts and 24/7 support available.",
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

export async function savePlatformSettings(
  data: PlatformSettingsData,
): Promise<PlatformSettingsData> {
  const actor = await requireSuperadmin();
  const db = getDb();
  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, "default"))
    .limit(1);
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
  await db
    .update(promotions)
    .set({ enabled: enabled ? "yes" : "no" })
    .where(eq(promotions.id, id));
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
    const rows = await db
      .select()
      .from(riskControls)
      .where(eq(riskControls.id, "default"))
      .limit(1);
    const r = rows[0];
    if (!r) {
      return {
        maxSingleBet: 10000,
        maxDailyPayout: 500000,
        maxWeeklyLimit: 20000,
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
    .orderBy(desc(transactions.seq))
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
  const isSuspicious =
    largeWinCount > 2 || (user.failedAttempts ?? 0) >= 3 || user.isLocked === "yes";

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

  const todayNet = +(
    Number(summaryRow?.todayBets ?? 0) - Number(summaryRow?.todayWins ?? 0)
  ).toFixed(2);
  const thisWeekNet = +(
    Number(summaryRow?.weekBets ?? 0) - Number(summaryRow?.weekWins ?? 0)
  ).toFixed(2);
  const thisMonthNet = +(
    Number(summaryRow?.monthBets ?? 0) - Number(summaryRow?.monthWins ?? 0)
  ).toFixed(2);
  const allTimeNet = +(Number(summaryRow?.allBets ?? 0) - Number(summaryRow?.allWins ?? 0)).toFixed(
    2,
  );

  // 2. Generate Time Bucket Points based on period
  const points: EarningsPoint[] = [];

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
    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
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
  const { LUCKY_NEKO_GAME_ID, DEFAULT_LUCKY_NEKO_CONFIG, normalizeLuckyNekoConfig } =
    await import("@/lib/lucky-neko-config");
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
  const { LUCKY_NEKO_GAME_ID, normalizeLuckyNekoConfig } = await import("@/lib/lucky-neko-config");
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
      .where(eq(gameControls.gameId, LUCKY_NEKO_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.lucky_neko_config",
    summary: `Updated Lucky Neko engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: LUCKY_NEKO_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Fortune Mouse engine math (defaults if unset). */
export async function getFortuneMouseEngineConfig() {
  const { FORTUNE_MOUSE_GAME_ID, DEFAULT_FORTUNE_MOUSE_CONFIG, normalizeFortuneMouseConfig } =
    await import("@/lib/fortune-mouse-config");
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
  const { FORTUNE_MOUSE_GAME_ID, normalizeFortuneMouseConfig } =
    await import("@/lib/fortune-mouse-config");
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
      .where(eq(gameControls.gameId, FORTUNE_MOUSE_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.fortune_mouse_config",
    summary: `Updated Fortune Mouse engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: FORTUNE_MOUSE_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Prosperity Lion engine math (defaults if unset). */
export async function getProsperityLionEngineConfig() {
  const { PROSPERITY_LION_GAME_ID, DEFAULT_PROSPERITY_LION_CONFIG, normalizeProsperityLionConfig } =
    await import("@/lib/prosperity-lion-config");
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
  const { PROSPERITY_LION_GAME_ID, normalizeProsperityLionConfig } =
    await import("@/lib/prosperity-lion-config");
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
      .where(eq(gameControls.gameId, PROSPERITY_LION_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.prosperity_lion_config",
    summary: `Updated Prosperity Lion engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: PROSPERITY_LION_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Coin Volcano engine math (defaults if unset). */
export async function getCoinVolcanoEngineConfig() {
  const { COIN_VOLCANO_GAME_ID, DEFAULT_COIN_VOLCANO_CONFIG, normalizeCoinVolcanoConfig } =
    await import("@/lib/coin-volcano-config");
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
  const { COIN_VOLCANO_GAME_ID, normalizeCoinVolcanoConfig } =
    await import("@/lib/coin-volcano-config");
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

/** Public — Zeus Strike engine math (defaults if unset). */
export async function getZeusStrikeEngineConfig() {
  const { ZEUS_STRIKE_GAME_ID, DEFAULT_ZEUS_STRIKE_CONFIG, normalizeZeusStrikeConfig } =
    await import("@/lib/zeus-strike-config");
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
  const { ZEUS_STRIKE_GAME_ID, normalizeZeusStrikeConfig } =
    await import("@/lib/zeus-strike-config");
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
  const { THOR_THUNDER_GAME_ID, DEFAULT_THOR_THUNDER_CONFIG, normalizeThorThunderConfig } =
    await import("@/lib/thor-thunder-config");
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
  const { THOR_THUNDER_GAME_ID, normalizeThorThunderConfig } =
    await import("@/lib/thor-thunder-config");
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
  const { MAYA_GOLD_GAME_ID, DEFAULT_MAYA_GOLD_CONFIG, normalizeMayaGoldConfig } =
    await import("@/lib/maya-gold-config");
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
  const { MAYA_GOLD_GAME_ID, normalizeMayaGoldConfig } = await import("@/lib/maya-gold-config");
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
  const { TEMPLE_RUSH_GAME_ID, DEFAULT_TEMPLE_RUSH_CONFIG, normalizeTempleRushConfig } =
    await import("@/lib/temple-rush-config");
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
  const { TEMPLE_RUSH_GAME_ID, normalizeTempleRushConfig } =
    await import("@/lib/temple-rush-config");
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

/** Public — Safari Gold engine math (defaults if unset). */
export async function getSafariGoldEngineConfig() {
  const { SAFARI_GOLD_GAME_ID, DEFAULT_SAFARI_GOLD_CONFIG, normalizeSafariGoldConfig } =
    await import("@/lib/safari-gold-config");
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
  const { SAFARI_GOLD_GAME_ID, normalizeSafariGoldConfig } =
    await import("@/lib/safari-gold-config");
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
      .where(eq(gameControls.gameId, SAFARI_GOLD_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.safari_gold_config",
    summary: `Updated Safari Gold engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: SAFARI_GOLD_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Pharaoh Fire engine math (defaults if unset). */
export async function getPharaohFireEngineConfig() {
  const { PHARAOH_FIRE_GAME_ID, DEFAULT_PHARAOH_FIRE_CONFIG, normalizePharaohFireConfig } =
    await import("@/lib/pharaoh-fire-config");
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
  const { PHARAOH_FIRE_GAME_ID, normalizePharaohFireConfig } =
    await import("@/lib/pharaoh-fire-config");
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
      .where(eq(gameControls.gameId, PHARAOH_FIRE_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.pharaoh_fire_config",
    summary: `Updated Pharaoh Fire engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: PHARAOH_FIRE_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Desert Riches engine math (defaults if unset). */
export async function getDesertRichesEngineConfig() {
  const { DESERT_RICHES_GAME_ID, DEFAULT_DESERT_RICHES_CONFIG, normalizeDesertRichesConfig } =
    await import("@/lib/desert-riches-config");
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
  const { DESERT_RICHES_GAME_ID, normalizeDesertRichesConfig } =
    await import("@/lib/desert-riches-config");
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
      .where(eq(gameControls.gameId, DESERT_RICHES_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.desert_riches_config",
    summary: `Updated Desert Riches engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: DESERT_RICHES_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Public — Gate of Ra engine math (defaults if unset). */
export async function getGateOfRaEngineConfig() {
  const { GATE_OF_RA_GAME_ID, DEFAULT_GATE_OF_RA_CONFIG, normalizeGateOfRaConfig } =
    await import("@/lib/gate-of-ra-config");
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

/** Public — Wild Panther engine math (defaults if unset). */
export async function getWildPantherEngineConfig() {
  const { WILD_PANTHER_GAME_ID, DEFAULT_WILD_PANTHER_CONFIG, normalizeWildPantherConfig } =
    await import("@/lib/wild-panther-config");
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
  const { WILD_PANTHER_GAME_ID, normalizeWildPantherConfig } =
    await import("@/lib/wild-panther-config");
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

export async function getJadeJaguarEngineConfig() {
  const { JADE_JAGUAR_GAME_ID, DEFAULT_JADE_JAGUAR_CONFIG, normalizeJadeJaguarConfig } =
    await import("@/lib/jade-jaguar-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, JADE_JAGUAR_GAME_ID))
      .limit(1);
    return normalizeJadeJaguarConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_JADE_JAGUAR_CONFIG);
  }
}

export async function saveJadeJaguarEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { JADE_JAGUAR_GAME_ID, normalizeJadeJaguarConfig } =
    await import("@/lib/jade-jaguar-config");
  const catalog = slotGames.find((row) => row.id === JADE_JAGUAR_GAME_ID);
  if (!catalog) throw new Error("Jade Jaguar not in catalog");

  const cfg = normalizeJadeJaguarConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, JADE_JAGUAR_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: JADE_JAGUAR_GAME_ID,
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
      .where(eq(gameControls.gameId, JADE_JAGUAR_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.jade_jaguar_config",
    summary: `Updated Jade Jaguar engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: JADE_JAGUAR_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

export async function getEmberTigerEngineConfig() {
  const { EMBER_TIGER_GAME_ID, DEFAULT_EMBER_TIGER_CONFIG, normalizeEmberTigerConfig } =
    await import("@/lib/ember-tiger-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, EMBER_TIGER_GAME_ID))
      .limit(1);
    return normalizeEmberTigerConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_EMBER_TIGER_CONFIG);
  }
}

export async function saveEmberTigerEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { EMBER_TIGER_GAME_ID, normalizeEmberTigerConfig } =
    await import("@/lib/ember-tiger-config");
  const catalog = slotGames.find((row) => row.id === EMBER_TIGER_GAME_ID);
  if (!catalog) throw new Error("Ember Tiger not in catalog");

  const cfg = normalizeEmberTigerConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, EMBER_TIGER_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: EMBER_TIGER_GAME_ID,
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
      .where(eq(gameControls.gameId, EMBER_TIGER_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.ember_tiger_config",
    summary: `Updated Ember Tiger engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: EMBER_TIGER_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

export async function getLotusLynxEngineConfig() {
  const { LOTUS_LYNX_GAME_ID, DEFAULT_LOTUS_LYNX_CONFIG, normalizeLotusLynxConfig } =
    await import("@/lib/lotus-lynx-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LOTUS_LYNX_GAME_ID))
      .limit(1);
    return normalizeLotusLynxConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_LOTUS_LYNX_CONFIG);
  }
}

export async function saveLotusLynxEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { LOTUS_LYNX_GAME_ID, normalizeLotusLynxConfig } = await import("@/lib/lotus-lynx-config");
  const catalog = slotGames.find((row) => row.id === LOTUS_LYNX_GAME_ID);
  if (!catalog) throw new Error("Lotus Lynx not in catalog");

  const cfg = normalizeLotusLynxConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, LOTUS_LYNX_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: LOTUS_LYNX_GAME_ID,
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
      .where(eq(gameControls.gameId, LOTUS_LYNX_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.lotus_lynx_config",
    summary: `Updated Lotus Lynx engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: LOTUS_LYNX_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

export async function getCoralCobraEngineConfig() {
  const { CORAL_COBRA_GAME_ID, DEFAULT_CORAL_COBRA_CONFIG, normalizeCoralCobraConfig } =
    await import("@/lib/coral-cobra-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, CORAL_COBRA_GAME_ID))
      .limit(1);
    return normalizeCoralCobraConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_CORAL_COBRA_CONFIG);
  }
}

export async function saveCoralCobraEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { CORAL_COBRA_GAME_ID, normalizeCoralCobraConfig } =
    await import("@/lib/coral-cobra-config");
  const catalog = slotGames.find((row) => row.id === CORAL_COBRA_GAME_ID);
  if (!catalog) throw new Error("Coral Cobra not in catalog");

  const cfg = normalizeCoralCobraConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, CORAL_COBRA_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: CORAL_COBRA_GAME_ID,
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
      .where(eq(gameControls.gameId, CORAL_COBRA_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.coral_cobra_config",
    summary: `Updated Coral Cobra engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: CORAL_COBRA_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

export async function getFrostFoxEngineConfig() {
  const { FROST_FOX_GAME_ID, DEFAULT_FROST_FOX_CONFIG, normalizeFrostFoxConfig } =
    await import("@/lib/frost-fox-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, FROST_FOX_GAME_ID))
      .limit(1);
    return normalizeFrostFoxConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_FROST_FOX_CONFIG);
  }
}

export async function saveFrostFoxEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { FROST_FOX_GAME_ID, normalizeFrostFoxConfig } = await import("@/lib/frost-fox-config");
  const catalog = slotGames.find((row) => row.id === FROST_FOX_GAME_ID);
  if (!catalog) throw new Error("Frost Fox not in catalog");

  const cfg = normalizeFrostFoxConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, FROST_FOX_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: FROST_FOX_GAME_ID,
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
      .where(eq(gameControls.gameId, FROST_FOX_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.frost_fox_config",
    summary: `Updated Frost Fox engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: FROST_FOX_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

export async function getSolarSerpentEngineConfig() {
  const { SOLAR_SERPENT_GAME_ID, DEFAULT_SOLAR_SERPENT_CONFIG, normalizeSolarSerpentConfig } =
    await import("@/lib/solar-serpent-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, SOLAR_SERPENT_GAME_ID))
      .limit(1);
    return normalizeSolarSerpentConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_SOLAR_SERPENT_CONFIG);
  }
}

export async function saveSolarSerpentEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { SOLAR_SERPENT_GAME_ID, normalizeSolarSerpentConfig } =
    await import("@/lib/solar-serpent-config");
  const catalog = slotGames.find((row) => row.id === SOLAR_SERPENT_GAME_ID);
  if (!catalog) throw new Error("Solar Serpent not in catalog");

  const cfg = normalizeSolarSerpentConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, SOLAR_SERPENT_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: SOLAR_SERPENT_GAME_ID,
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
      .where(eq(gameControls.gameId, SOLAR_SERPENT_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.solar_serpent_config",
    summary: `Updated Solar Serpent engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: SOLAR_SERPENT_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

export async function getHoneyHiveEngineConfig() {
  const { HONEY_HIVE_GAME_ID, DEFAULT_HONEY_HIVE_CONFIG, normalizeHoneyHiveConfig } =
    await import("@/lib/honey-hive-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, HONEY_HIVE_GAME_ID))
      .limit(1);
    return normalizeHoneyHiveConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_HONEY_HIVE_CONFIG);
  }
}

export async function saveHoneyHiveEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { HONEY_HIVE_GAME_ID, normalizeHoneyHiveConfig } = await import("@/lib/honey-hive-config");
  const catalog = slotGames.find((row) => row.id === HONEY_HIVE_GAME_ID);
  if (!catalog) throw new Error("Honey Hive not in catalog");

  const cfg = normalizeHoneyHiveConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, HONEY_HIVE_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: HONEY_HIVE_GAME_ID,
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
      .where(eq(gameControls.gameId, HONEY_HIVE_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.honey_hive_config",
    summary: `Updated Honey Hive engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: HONEY_HIVE_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

export async function getMidnightOwlEngineConfig() {
  const { MIDNIGHT_OWL_GAME_ID, DEFAULT_MIDNIGHT_OWL_CONFIG, normalizeMidnightOwlConfig } =
    await import("@/lib/midnight-owl-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, MIDNIGHT_OWL_GAME_ID))
      .limit(1);
    return normalizeMidnightOwlConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_MIDNIGHT_OWL_CONFIG);
  }
}

export async function saveMidnightOwlEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { MIDNIGHT_OWL_GAME_ID, normalizeMidnightOwlConfig } =
    await import("@/lib/midnight-owl-config");
  const catalog = slotGames.find((row) => row.id === MIDNIGHT_OWL_GAME_ID);
  if (!catalog) throw new Error("Midnight Owl not in catalog");

  const cfg = normalizeMidnightOwlConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, MIDNIGHT_OWL_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: MIDNIGHT_OWL_GAME_ID,
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
      .where(eq(gameControls.gameId, MIDNIGHT_OWL_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.midnight_owl_config",
    summary: `Updated Midnight Owl engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: MIDNIGHT_OWL_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

export async function getRubyRavenEngineConfig() {
  const { RUBY_RAVEN_GAME_ID, DEFAULT_RUBY_RAVEN_CONFIG, normalizeRubyRavenConfig } =
    await import("@/lib/ruby-raven-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, RUBY_RAVEN_GAME_ID))
      .limit(1);
    return normalizeRubyRavenConfig(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_RUBY_RAVEN_CONFIG);
  }
}

export async function saveRubyRavenEngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const { RUBY_RAVEN_GAME_ID, normalizeRubyRavenConfig } = await import("@/lib/ruby-raven-config");
  const catalog = slotGames.find((row) => row.id === RUBY_RAVEN_GAME_ID);
  if (!catalog) throw new Error("Ruby Raven not in catalog");

  const cfg = normalizeRubyRavenConfig(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, RUBY_RAVEN_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: RUBY_RAVEN_GAME_ID,
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
      .where(eq(gameControls.gameId, RUBY_RAVEN_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.ruby_raven_config",
    summary: `Updated Ruby Raven engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: RUBY_RAVEN_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}

/** Superadmin — save a Realms family title's math config (one handler for all 50). */
export async function saveRealmsEngineConfig(gameId: string, raw: unknown) {
  const actor = await requireSuperadmin();
  const { FAMILY_KEY, getRealmsGame, isRealmsGameId, normalizeRealmsGameConfig } =
    await import("@/lib/realms");
  if (!isRealmsGameId(gameId)) throw new Error("Unknown game");
  const def = getRealmsGame(gameId);
  const catalog = slotGames.find((g) => g.id === gameId);
  if (!catalog) throw new Error(`${def.name} not in catalog`);

  const cfg = normalizeRealmsGameConfig(gameId, raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, gameId))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId,
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
      .where(eq(gameControls.gameId, gameId));
  }

  await writeAuditLog({
    actor,
    action: `super.${FAMILY_KEY}_config`,
    summary: `Updated ${def.name} engine config (dead spin ${cfg.deadSpinChancePercent}%, FS ${cfg.freeSpinsBase})`,
    targetType: "game",
    targetId: gameId,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
      buyFeatureMult: cfg.buyFeatureMult,
      minCluster: cfg.minCluster,
    },
  });

  return cfg;
}
