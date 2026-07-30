import { eq, desc, sql, and, gt, gte } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { getDb } from "./db/client";
import { jackpot, liveWins, sessions, transactions, users, walletRequests, auditLogs, supportTickets, supportMessages } from "./db/schema";
import type { PublicUser } from "@/lib/user";
import { isStaffRole } from "@/lib/user";
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

  // Check if account is locked
  const isCurrentlyLocked =
    user.isLocked === "yes" ||
    (user.failedAttempts ?? 0) >= 3 ||
    (user.lockedUntil && new Date() < new Date(user.lockedUntil));

  if (isCurrentlyLocked) {
    throw new Error("Account locked — contact support");
  }

  const ok = await compare(password, user.passwordHash);

  if (!ok) {
    const currentAttempts = user.failedAttempts ?? 0;
    const nextAttempts = currentAttempts + 1;
    const willBeLocked = nextAttempts >= 3;

    await db
      .update(users)
      .set({
        failedAttempts: nextAttempts,
        isLocked: willBeLocked ? "yes" : "no",
        lockedUntil: willBeLocked ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
      })
      .where(eq(users.id, user.id));

    // Log every failed attempt with timestamp for audit purposes
    await db.insert(auditLogs).values({
      id: newId(),
      actorId: user.id,
      actorUsername: user.username,
      action: willBeLocked ? "login_lockout" : "login_failed",
      targetType: "user",
      targetId: user.id,
      summary: willBeLocked
        ? `Account locked after ${nextAttempts} failed login attempts.`
        : `Failed login attempt (${nextAttempts}/3).`,
      meta: JSON.stringify({
        failedAttempts: nextAttempts,
        timestamp: new Date().toISOString(),
        isLocked: willBeLocked,
      }),
    });

    if (willBeLocked) {
      throw new Error("Account locked — contact support");
    } else {
      throw new Error(`Invalid username or password (${nextAttempts}/3 attempts)`);
    }
  }

  // On successful login, reset failedAttempts to 0 and unlock if needed
  if ((user.failedAttempts ?? 0) > 0 || user.isLocked === "yes") {
    await db
      .update(users)
      .set({ failedAttempts: 0, isLocked: "no", lockedUntil: null })
      .where(eq(users.id, user.id));
  }

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

export async function changePassword(data: {
  oldPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  const session = await requireUser();
  const db = getDb();

  const rows = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  const user = rows[0];
  if (!user) throw new Error("User not found");

  const ok = await compare(data.oldPassword, user.passwordHash);
  if (!ok) throw new Error("Incorrect current password");

  const passwordHash = await hash(data.newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, session.id));

  return { ok: true };
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

export async function fetchOrCreatePlayerTicket() {
  const session = await requireUser();
  const db = getDb();

  // Find open ticket for user
  const tickets = await db
    .select()
    .from(supportTickets)
    .where(and(eq(supportTickets.userId, session.id), eq(supportTickets.status, "open")))
    .limit(1);

  let ticket = tickets[0];
  if (!ticket) {
    return { ticket: null, messages: [] };
  }

  // Load messages
  const msgs = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.ticketId, ticket.id))
    .orderBy(supportMessages.createdAt);

  return {
    ticket: {
      id: ticket.id,
      userId: ticket.userId,
      username: ticket.username,
      playerName: ticket.playerName,
      concern: ticket.concern,
      agentName: ticket.agentName,
      status: ticket.status,
      createdAt: ticket.createdAt?.toISOString?.() ?? String(ticket.createdAt),
    },
    messages: msgs.map((m) => ({
      id: m.id,
      ticketId: m.ticketId,
      sender: m.sender,
      text: m.text,
      createdAt: m.createdAt?.toISOString?.() ?? String(m.createdAt),
    })),
  };
}

export async function addPlayerSupportMessage(text: string, lang: "en" | "tl") {
  const session = await requireUser();
  const db = getDb();

  const { ticket } = await fetchOrCreatePlayerTicket();
  if (!ticket) throw new Error("No active support ticket found");

  await db.insert(supportMessages).values({
    id: newId(),
    ticketId: ticket.id,
    sender: "user",
    text,
  });

  // Update updated_at of the ticket to bring it to the top of list
  await db
    .update(supportTickets)
    .set({ updatedAt: new Date() })
    .where(eq(supportTickets.id, ticket.id));

  // Determine automated reply
  const query = text.toLowerCase();
  let replyText = "";

  if (lang === "tl") {
    if (query.includes("deposit") || query.includes("deposito") || query.includes("pasok ng pera")) {
      replyText = "Para mag-deposit, i-click lamang ang kulay lilang 'Mag-deposit' button sa kanang itaas ng screen. Pwede kang pumili ng GCash o PayMaya para magpadala. Agad itong papasok sa iyong account!";
    } else if (query.includes("withdraw") || query.includes("labas ng pera") || query.includes("cashout")) {
      replyText = "Ang withdraw ay napakabilis! I-click ang iyong wallet button sa itaas, piliin ang 'Mag-withdraw', at ilagay ang halaga at iyong GCash account. Pinoproseso ito sa loob ng 2-5 minuto.";
    } else if (query.includes("laro") || query.includes("game") || query.includes("slot")) {
      replyText = "Marami kaming sikat na laro ngayon tulad ng Candy Peak, Sugar Surge, at Godly Gates! Subukan mong maglaro ngayon gamit ang tab na 'Slots' sa lobby.";
    } else if (query.includes("bonus") || query.includes("libre") || query.includes("free")) {
      replyText = "Mayroon kaming daily at weekly races na may malalaking premyo! Abangan din ang mga promo banner sa ating lobby para sa karagdagang bonus.";
    } else if (query.includes("salamat") || query.includes("ok") || query.includes("thanks")) {
      replyText = "Walang anuman! Lagi akong nandito para tumulong. Good luck sa iyong paglalaro!";
    } else {
      replyText = "Salamat sa iyong mensahe. Ipinapasa ko na ito sa aming team ng mga live agents. May maitutulong pa ba ako tungkol sa deposit, withdraw, o slots?";
    }
  } else {
    if (query.includes("deposit") || query.includes("add money")) {
      replyText = "To make a deposit, click the purple 'Deposit' button at the top right of the page. You can use GCash or PayMaya to transfer. Funds will be credited instantly!";
    } else if (query.includes("withdraw") || query.includes("cash out")) {
      replyText = "Withdrawals are processed instantly! Click on the wallet button at the top, select 'Withdraw', enter the amount and your GCash details. It takes 2-5 minutes to complete.";
    } else if (query.includes("game") || query.includes("slot") || query.includes("play")) {
      replyText = "We have hot featured slots like Candy Peak, Sugar Surge, and Godly Gates! Head over to the 'Slots' tab in the lobby to start playing.";
    } else if (query.includes("bonus") || query.includes("free") || query.includes("promo")) {
      replyText = "Check out our lobby promotions for weekly race awards! Active players can win massive peso pools daily.";
    } else if (query.includes("thanks") || query.includes("thank you") || query.includes("ok")) {
      replyText = "You're very welcome! If you need anything else, feel free to ask. Good luck at MaxHigh!";
    } else {
      replyText = "Thank you for your message. I am forwarding this details to our live support team. Is there anything else about deposits, withdrawals, or games I can help with?";
    }
  }

  // Delay automated reply slightly to show typing status on client
  await new Promise((resolve) => setTimeout(resolve, 800));
  await db.insert(supportMessages).values({
    id: newId(),
    ticketId: ticket.id,
    sender: "agent",
    text: replyText,
  });

  return { ok: true };
}

export async function addAgentSupportMessage(ticketId: string, text: string) {
  const session = await requireUser();
  if (!isStaffRole(session.role)) {
    throw new Error("Unauthorized");
  }
  const db = getDb();

  await db.insert(supportMessages).values({
    id: newId(),
    ticketId: ticketId,
    sender: "agent",
    text,
  });

  return { ok: true };
}

export async function fetchAdminTickets() {
  const session = await requireUser();
  if (!isStaffRole(session.role)) {
    throw new Error("Unauthorized");
  }
  const db = getDb();

  const tickets = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.status, "open"))
    .orderBy(desc(supportTickets.updatedAt));

  return tickets.map((t) => ({
    id: t.id,
    userId: t.userId,
    username: t.username,
    playerName: t.playerName,
    concern: t.concern,
    agentName: t.agentName,
    status: t.status,
    createdAt: t.createdAt?.toISOString?.() ?? String(t.createdAt),
  }));
}

export async function createPlayerTicket(playerName: string, concern: string) {
  const session = await requireUser();
  const db = getDb();

  // Find existing open ticket
  const existing = await db
    .select()
    .from(supportTickets)
    .where(and(eq(supportTickets.userId, session.id), eq(supportTickets.status, "open")))
    .limit(1);

  if (existing.length > 0) {
    return { ok: true, ticketId: existing[0].id };
  }

  const ticketId = newId();
  await db.insert(supportTickets).values({
    id: ticketId,
    userId: session.id,
    username: session.username,
    playerName,
    concern,
    status: "open",
  });

  // Post concern as the user's first message
  await db.insert(supportMessages).values({
    id: newId(),
    ticketId: ticketId,
    sender: "user",
    text: concern,
  });

  // Post welcome message from Chloe
  await db.insert(supportMessages).values({
    id: newId(),
    ticketId: ticketId,
    sender: "agent",
    text: "Hello! I am Chloe, your MaxHigh Support Assistant. How can I help you today? Ask me about deposits, withdrawals, or games!",
  });

  return { ok: true, ticketId };
}

export async function assignAgentToTicket(ticketId: string) {
  const session = await requireUser();
  if (!isStaffRole(session.role)) {
    throw new Error("Unauthorized");
  }
  const db = getDb();

  const tickets = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  const ticket = tickets[0];
  if (!ticket) throw new Error("Ticket not found");

  if (!ticket.agentName) {
    const name = session.displayName || session.username;
    await db
      .update(supportTickets)
      .set({ agentName: name })
      .where(eq(supportTickets.id, ticketId));
  }

  return { ok: true };
}

export async function fetchAdminTicketMessages(ticketId: string) {
  const session = await requireUser();
  if (!isStaffRole(session.role)) {
    throw new Error("Unauthorized");
  }
  const db = getDb();

  const msgs = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.ticketId, ticketId))
    .orderBy(supportMessages.createdAt);

  return msgs.map((m) => ({
    id: m.id,
    ticketId: m.ticketId,
    sender: m.sender,
    text: m.text,
    createdAt: m.createdAt?.toISOString?.() ?? String(m.createdAt),
  }));
}

export async function resolveSupportTicket(ticketId: string) {
  const session = await requireUser();
  if (!isStaffRole(session.role)) {
    throw new Error("Unauthorized");
  }
  const db = getDb();

  const tickets = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  const ticket = tickets[0];
  if (!ticket) return { ok: false };

  await db.insert(auditLogs).values({
    id: newId(),
    actorId: session.id,
    actorUsername: session.username,
    action: "resolve_ticket",
    targetType: "support_ticket",
    targetId: ticketId,
    summary: `Resolved support ticket for player ${ticket.username}`,
  });

  await db.delete(supportTickets).where(eq(supportTickets.id, ticketId));

  return { ok: true, userId: ticket.userId };
}
