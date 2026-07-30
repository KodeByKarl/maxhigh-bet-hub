/**
 * Domain 3 — Superadmin server logic.
 * Full control: users, admins, games, jackpot.
 */
import { eq, desc, sql, like, or, and, asc } from "drizzle-orm";
import { hash } from "bcryptjs";
import { getDb } from "../db/client";
import { gameControls, jackpot, platformSettings, promotions, riskControls, transactions, users, walletRequests } from "../db/schema";
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
import { money, newId, requireAdmin, requireSuperadmin, toPublicUser } from "../session";
import { writeAuditLog } from "../admin/audit.server";
import { slotGames } from "@/lib/games";

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
    email: u.email,
    username: u.username,
    balance: Number(u.balance),
    role: u.role as UserRole,
    displayName: u.displayName,
    isLocked: u.isLocked ?? "no",
    parentAgentId: u.parentAgentId ?? null,
    parentAgentUsername: u.parentAgentId ? (agentMap.get(u.parentAgentId) ?? "System / Direct") : "System / Direct",
    createdAt: u.createdAt?.toISOString?.() ?? String(u.createdAt),
  }));
}

export async function superSetUserRole(data: {
  userId: string;
  role: UserRole;
}): Promise<PublicUser> {
  const actor = await requireSuperadmin();
  if (data.userId === actor.id && data.role !== "superadmin") {
    throw new Error("Cannot demote your own superadmin account");
  }

  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const target = rows[0];
  if (!target) throw new Error("User not found");

  await db.update(users).set({ role: data.role }).where(eq(users.id, data.userId));
  await writeAuditLog({
    actor,
    action: "super.role_change",
    summary: `Changed @${target.username} role ${target.role} → ${data.role}`,
    targetType: "user",
    targetId: target.id,
    meta: { from: target.role, to: data.role },
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
}): Promise<PublicUser> {
  const actor = await requireSuperadmin();
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
      role: data.role,
      displayName: data.displayName?.trim() || null,
    });
  } catch {
    throw new Error("Username or email already exists");
  }

  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const created = toPublicUser(rows[0]!);
  await writeAuditLog({
    actor,
    action: "super.user_create",
    summary: `Created ${created.role} @${created.username}`,
    targetType: "user",
    targetId: created.id,
    meta: { role: created.role, email: created.email },
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
}): Promise<PublicUser> {
  const actor = await requireSuperadmin();
  if (!Number.isFinite(data.delta) || data.delta === 0) throw new Error("Invalid amount");

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
      game: "Superadmin",
      note: data.note?.trim() || "Superadmin balance adjust",
    });
    return { ...user, balance: money(next), previous: current };
  });

  await writeAuditLog({
    actor,
    action: "super.balance_adjust",
    summary: `Adjusted @${result.username} by ${data.delta > 0 ? "+" : ""}${data.delta.toFixed(2)}`,
    targetType: "user",
    targetId: result.id,
    meta: { delta: data.delta, previous: result.previous, next: Number(result.balance) },
  });
  return toPublicUser(result);
}

export async function listSuperGames(): Promise<SuperGameRow[]> {
  await requireSuperadmin();
  const db = getDb();
  const controls = await db.select().from(gameControls).orderBy(asc(gameControls.sortOrder));
  const byId = new Map(controls.map((c) => [c.gameId, c]));

  // Ensure every catalog game appears (even if not yet seeded)
  const ids = new Set([...slotGames.map((g) => g.id), ...controls.map((c) => c.gameId)]);
  const rows: SuperGameRow[] = [];
  for (const id of ids) {
    const catalog = slotGames.find((g) => g.id === id);
    const c = byId.get(id);
    rows.push({
      gameId: id,
      name: catalog?.name ?? id,
      category: catalog?.category ?? "slot",
      thumb: catalog?.thumb ?? "/games/candy-peak.png",
      enabled: (c?.enabled ?? "yes") === "yes",
      featured: (c?.featured ?? "no") === "yes",
      sortOrder: Number(c?.sortOrder ?? 0),
      tag: c?.tag ?? catalog?.tag ?? null,
      rtp: c?.rtp ?? catalog?.rtp ?? null,
      volatility: c?.volatility ?? catalog?.volatility ?? null,
      minBet: c?.minBet ?? catalog?.minBet ?? null,
      maxBet: c?.maxBet ?? catalog?.maxBet ?? null,
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
    await db.insert(jackpot).values({ id: "mega", amount: money(amount) });
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
      autoFlagLargeWins: r.autoFlagLargeWins === "yes",
      largeWinThreshold: Number(r.largeWinThreshold),
    };
  } catch {
    return {
      maxSingleBet: 10000,
      maxDailyPayout: 500000,
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

