import { eq, desc, sql, and, gt, gte } from "drizzle-orm";
import { compare } from "bcryptjs";
import { getDb } from "./db/client";
import { jackpot, liveWins, sessions, transactions, users, walletRequests } from "./db/schema";
import type { PublicUser } from "@/lib/user";
import {
  createSession,
  destroySession,
  getSessionUser,
  money,
  newId,
  requireUser,
  toPublicUser,
  touchPresence,
} from "./session";

export async function loginUser(username: string, password: string): Promise<PublicUser> {
  const db = getDb();
  const normalized = username.trim().toLowerCase();
  if (!normalized) throw new Error("Invalid username or password");

  const rows = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.username}) = ${normalized}`)
    .limit(1);
  const user = rows[0];
  if (!user) throw new Error("Invalid username or password");

  const ok = await compare(password, user.passwordHash);
  if (!ok) throw new Error("Invalid username or password");

  await createSession(user.id);
  return toPublicUser(user);
}

export async function logoutUser() {
  await destroySession();
  return { ok: true as const };
}

export async function fetchSession() {
  return getSessionUser();
}

export async function fetchProfile(): Promise<PublicUser> {
  const session = await requireUser();
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  const user = rows[0];
  if (!user) throw new Error("User not found");
  return toPublicUser(user);
}

export async function updateProfile(data: {
  displayName?: string;
  username?: string;
}): Promise<PublicUser | null> {
  const session = await requireUser();
  const db = getDb();
  const patch: Partial<typeof users.$inferInsert> = {};
  if (data.displayName !== undefined) patch.displayName = data.displayName.trim() || null;
  if (data.username !== undefined) patch.username = data.username.trim().toLowerCase();

  if (Object.keys(patch).length === 0) {
    return getSessionUser();
  }

  try {
    await db.update(users).set(patch).where(eq(users.id, session.id));
  } catch {
    throw new Error("Username may already be taken");
  }

  const rows = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  return toPublicUser(rows[0]!);
}

export async function fetchBalance() {
  const session = await requireUser();
  const db = getDb();
  const rows = await db
    .select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);
  return { balance: Number(rows[0]?.balance ?? 0) };
}

/**
 * Player-facing wallet delta.
 * Wins / adjust / jackpot / deposit / withdraw are NOT allowed here —
 * wins must come from server game settle; cash moves via wallet requests + staff.
 */
export async function adjustBalance(data: {
  delta: number;
  type: "deposit" | "withdraw" | "bet" | "win" | "adjust" | "jackpot";
  note?: string;
  game?: string;
  gameId?: string;
}) {
  if (data.type === "deposit" || data.type === "withdraw") {
    throw new Error("Use Deposit / Withdraw requests — staff must approve cash moves");
  }
  if (data.type === "win" || data.type === "adjust" || data.type === "jackpot") {
    throw new Error("Wins must be settled by the game server — client credit blocked");
  }
  if (data.type !== "bet") {
    throw new Error("Invalid transaction type");
  }
  if (!Number.isFinite(data.delta) || data.delta >= 0) {
    throw new Error("Bets must debit a positive stake");
  }

  const session = await requireUser();
  const {
    assertNotInMaintenanceForBets,
    availableFrom,
    getMaxSingleBet,
    sumPendingWithdrawals,
    writeLedgerDelta,
  } = await import("./wallet.server");

  await assertNotInMaintenanceForBets();

  const stake = Math.abs(data.delta);
  const maxBet = await getMaxSingleBet();
  if (stake > maxBet) throw new Error(`Max bet is ₱${maxBet.toFixed(2)}`);

  const db = getDb();
  const gameLabel = data.game?.trim() || null;
  const gameId = data.gameId?.trim() || null;
  const idPrefix = gameId ? `${gameId} · ` : "";
  const autoNote =
    data.note ?? `${idPrefix}${gameLabel ?? "Game"} · wager ₱${stake.toFixed(2)}`;

  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(users).where(eq(users.id, session.id)).limit(1);
    const user = rows[0];
    if (!user) throw new Error("User not found");

    const current = Number(user.balance);
    const pending = await sumPendingWithdrawals(tx, session.id);
    const available = availableFrom(current, pending);
    if (stake > available) {
      throw new Error(
        pending > 0
          ? `Insufficient available balance (₱${pending.toFixed(2)} held for pending withdrawal)`
          : "Insufficient balance",
      );
    }

    return writeLedgerDelta(tx, {
      userId: session.id,
      username: user.username,
      delta: -stake,
      type: "bet",
      game: gameLabel,
      note: autoNote,
    });
  });

  return { balance: result.balance };
}

export async function recordGameSessionOpen(data: { gameId: string; gameName: string }) {
  const session = await requireUser();
  const { writeAuditLog } = await import("./admin/audit.server");
  await writeAuditLog({
    actor: session,
    action: "game.session_open",
    summary: `@${session.username} opened ${data.gameName}`,
    targetType: "game",
    targetId: data.gameId,
    meta: { gameId: data.gameId, gameName: data.gameName },
  });
  return { ok: true as const };
}

export async function fetchJackpot() {
  const db = getDb();
  const rows = await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
  let row = rows[0];
  if (!row) {
    await db.insert(jackpot).values({ id: "mega", amount: "10000.00" });
    row = { id: "mega", amount: "10000.00", updatedAt: new Date() };
  }
  return { amount: Number(row.amount), updatedAt: row.updatedAt?.toISOString?.() ?? null };
}

export async function listLiveWins() {
  const db = getDb();
  // Pull a wider window, then keep only the newest win per username.
  const rows = await db.select().from(liveWins).orderBy(desc(liveWins.createdAt)).limit(80);
  const seen = new Set<string>();
  const unique = [];
  for (const w of rows) {
    const key = w.username.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({
      user: w.username,
      game: w.game,
      amt: `+₱${Number(w.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: "#C6FF3D",
    });
    if (unique.length >= 20) break;
  }
  return unique;
}

/** Active in the last 5 minutes = online. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function heartbeatPresence() {
  const ok = await touchPresence();
  return { ok };
}

export async function fetchPlatformStats() {
  const db = getDb();
  const now = new Date();
  const onlineSince = new Date(now.getTime() - ONLINE_WINDOW_MS);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [betRows, onlineRows, biggestRows, hotRows] = await Promise.all([
    db
      .select({
        count: sql<number>`COUNT(*)`,
        volume: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.type, "bet")),
    db
      .select({
        count: sql<number>`COUNT(DISTINCT ${sessions.userId})`,
      })
      .from(sessions)
      .where(and(gt(sessions.expiresAt, now), gte(sessions.lastSeenAt, onlineSince))),
    db
      .select({
        maxWin: sql<string>`COALESCE(MAX(${liveWins.amount}), 0)`,
      })
      .from(liveWins)
      .where(gte(liveWins.createdAt, dayAgo)),
    db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(liveWins)
      .where(gte(liveWins.createdAt, hourAgo)),
  ]);

  const totalBets = Number(betRows[0]?.count ?? 0);
  const betVolume = Number(betRows[0]?.volume ?? 0);
  const playersOnline = Number(onlineRows[0]?.count ?? 0);
  const biggestWin24h = Number(biggestRows[0]?.maxWin ?? 0);
  const hotStreak = Number(hotRows[0]?.count ?? 0);

  return {
    totalBets,
    betVolume,
    playersOnline,
    biggestWin24h,
    hotStreak,
    /** Formatted for StatsBar */
    totalBetsLabel: totalBets.toLocaleString("en-PH"),
    playersOnlineLabel: playersOnline.toLocaleString("en-PH"),
    biggestWin24hLabel:
      biggestWin24h > 0
        ? `₱${biggestWin24h.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "₱0.00",
    hotStreakLabel: `${hotStreak.toLocaleString("en-PH")} wins`,
  };
}

export type WalletRequestRow = {
  id: string;
  type: "deposit" | "withdraw";
  amount: number;
  status: "pending" | "approved" | "rejected";
  playerNote: string | null;
  staffNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export async function createWalletRequest(data: {
  type: "deposit" | "withdraw";
  amount: number;
  note?: string;
}): Promise<WalletRequestRow> {
  const session = await requireUser();
  if (!Number.isFinite(data.amount) || data.amount < 1) {
    throw new Error("Minimum amount is ₱1.00");
  }
  if (data.amount > 1_000_000) {
    throw new Error("Maximum amount is ₱1,000,000.00");
  }

  const amount = +data.amount.toFixed(2);
  const db = getDb();
  const { availableFrom, sumPendingWithdrawals } = await import("./wallet.server");

  if (data.type === "withdraw") {
    const rows = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1);
    const balance = Number(rows[0]?.balance ?? 0);
    const pending = await sumPendingWithdrawals(db, session.id);
    const available = availableFrom(balance, pending);
    if (amount > available) {
      throw new Error(
        pending > 0
          ? `Insufficient available balance (₱${pending.toFixed(2)} already pending withdrawal)`
          : "Insufficient balance for this withdrawal",
      );
    }
  }

  const id = newId();
  await db.insert(walletRequests).values({
    id,
    userId: session.id,
    type: data.type,
    amount: money(amount),
    status: "pending",
    playerNote: data.note?.trim() || null,
  });

  return {
    id,
    type: data.type,
    amount,
    status: "pending",
    playerNote: data.note?.trim() || null,
    staffNote: null,
    createdAt: new Date().toISOString(),
    reviewedAt: null,
  };
}

export async function listMyWalletRequests(limit = 20): Promise<WalletRequestRow[]> {
  const session = await requireUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(walletRequests)
    .where(eq(walletRequests.userId, session.id))
    .orderBy(desc(walletRequests.createdAt))
    .limit(Math.min(Math.max(limit, 1), 50));

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    status: r.status,
    playerNote: r.playerNote,
    staffNote: r.staffNote,
    createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
    reviewedAt: r.reviewedAt?.toISOString?.() ?? (r.reviewedAt ? String(r.reviewedAt) : null),
  }));
}
