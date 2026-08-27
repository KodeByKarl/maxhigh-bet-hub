/**
 * Shared wallet helpers — available balance, pending withdraw reserves, ledger writes.
 */
import { and, eq, sql, gte, or } from "drizzle-orm";
import { getDb } from "./db/client";
import { jackpot, liveWins, platformSettings, riskControls, transactions, users, walletRequests } from "./db/schema";
import { money, newId } from "./session";

/** Drizzle tx or db — keep loose to avoid mysql dialect union friction. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbLike = any;

export async function getWeeklyUsageAndLimit(db: DbLike = getDb(), userId?: string): Promise<{ usage: number; limit: number }> {
  try {
    const riskRows = await db.select().from(riskControls).where(eq(riskControls.id, "default")).limit(1);
    const limit = Number(riskRows[0]?.maxWeeklyLimit ?? 20000);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const filters: any[] = [
      gte(transactions.createdAt, weekAgo),
      or(eq(transactions.type, "withdraw"), eq(transactions.type, "win")),
    ];

    if (userId) {
      filters.push(eq(transactions.userId, userId));
    }

    const usageRows = await db
      .select({
        total: sql<string>`coalesce(sum(abs(${transactions.amount})), 0)`,
      })
      .from(transactions)
      .where(and(...filters));

    const usage = Number(usageRows[0]?.total ?? 0);
    return { usage, limit };
  } catch {
    return { usage: 0, limit: 20000 };
  }
}

export async function assertWeeklyLimitNotExceeded(db: DbLike, userId: string, delta: number) {
  if (delta <= 0) return;
  const { usage, limit } = await getWeeklyUsageAndLimit(db, userId);
  if (usage + delta > limit) {
    throw new Error(
      `Transaction rejected: Exceeds configurable weekly limit (Current 7-day exposure: ₱${usage.toLocaleString(
        "en-PH",
      )} / ₱${limit.toLocaleString("en-PH")} cap reached).`,
    );
  }
}

export async function sumPendingWithdrawals(db: DbLike, userId: string): Promise<number> {
  const rows = await db
    .select({
      total: sql<string>`coalesce(sum(${walletRequests.amount}), 0)`,
    })
    .from(walletRequests)
    .where(
      and(
        eq(walletRequests.userId, userId),
        eq(walletRequests.type, "withdraw"),
        eq(walletRequests.status, "pending"),
      ),
    );
  return Number(rows[0]?.total ?? 0);
}

/** Balance that may be wagered or newly withdrawn (excludes pending cash-out holds). */
export function availableFrom(balance: number, pendingWithdraw: number): number {
  return Math.max(0, +(balance - pendingWithdraw).toFixed(2));
}

export async function getAvailableBalance(userId: string): Promise<{
  balance: number;
  pendingWithdraw: number;
  available: number;
}> {
  const db = getDb();
  const rows = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).limit(1);
  const balance = Number(rows[0]?.balance ?? 0);
  const pendingWithdraw = await sumPendingWithdrawals(db, userId);
  return { balance, pendingWithdraw, available: availableFrom(balance, pendingWithdraw) };
}

export async function getMaxSingleBet(): Promise<number> {
  try {
    const db = getDb();
    const rows = await db.select().from(riskControls).where(eq(riskControls.id, "default")).limit(1);
    return Number(rows[0]?.maxSingleBet ?? 10000);
  } catch {
    // Table not migrated yet — safe default
    return 10000;
  }
}

export async function assertNotInMaintenanceForBets(db: DbLike = getDb()) {
  try {
    const settings = await db.select().from(platformSettings).where(eq(platformSettings.id, "default")).limit(1);
    if (settings[0]?.maintenanceMode === "yes") {
      throw new Error("Platform is currently under scheduled maintenance. Betting is locked.");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("maintenance")) throw err;
    // Missing platform_settings table → treat as not in maintenance
  }
}

/**
 * Internal ledger write used by game settle + staff adjust paths.
 * MUST be called inside an open DB transaction. Locks the user row (FOR UPDATE)
 * so concurrent bets cannot race/overdraft; balance update + transactions insert
 * share that same transaction boundary.
 */
/** Ensures bet/win pairs always get distinct, increasing timestamps. */
let lastLedgerMs = 0;
function nextLedgerTime(): Date {
  const now = Date.now();
  lastLedgerMs = Math.max(now, lastLedgerMs + 1);
  return new Date(lastLedgerMs);
}

export async function writeLedgerDelta(
  tx: DbLike,
  opts: {
    userId: string;
    username: string;
    delta: number;
    type: "bet" | "win" | "adjust" | "deposit" | "withdraw" | "jackpot";
    game?: string | null;
    note?: string | null;
  },
): Promise<{ balance: number }> {
  const rows = await tx
    .select()
    .from(users)
    .where(eq(users.id, opts.userId))
    .for("update")
    .limit(1);
  const user = rows[0];
  if (!user) throw new Error("User not found");

  const current = Number(user.balance);
  const next = +(current + opts.delta).toFixed(2);
  if (next < 0) throw new Error("Insufficient balance");

  if (opts.type === "withdraw") {
    await assertWeeklyLimitNotExceeded(tx, opts.userId, opts.delta);
  }

  const balanceAfter = money(next);
  await tx.update(users).set({ balance: balanceAfter }).where(eq(users.id, opts.userId));
  await tx.insert(transactions).values({
    id: newId(),
    userId: opts.userId,
    type: opts.type,
    amount: money(opts.delta),
    balanceAfter,
    game: opts.game ?? null,
    note: opts.note ?? null,
    createdAt: nextLedgerTime(),
  });

  if (opts.type === "win" && opts.delta > 0 && opts.game) {
    await tx.insert(liveWins).values({
      userId: opts.userId,
      username: opts.username,
      game: opts.game,
      amount: money(opts.delta),
    });
    const jpRows = await tx.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
    const jpAmount = Number(jpRows[0]?.amount ?? 0) + Math.max(0.01, opts.delta * 0.01);
    if (jpRows[0]) {
      await tx.update(jackpot).set({ amount: money(jpAmount) }).where(eq(jackpot.id, "mega"));
    } else {
      await tx.insert(jackpot).values({
        id: "mega",
        amount: money(jpAmount),
        enabled: "yes",
        displayAmount: money(500_000_000),
      });
    }
  }

  if (opts.type === "bet" && opts.delta < 0) {
    const contrib = Math.abs(opts.delta) * 0.01;
    const jpRows = await tx.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
    const jpAmount = Number(jpRows[0]?.amount ?? 0) + contrib;
    if (jpRows[0]) {
      await tx.update(jackpot).set({ amount: money(jpAmount) }).where(eq(jackpot.id, "mega"));
    } else {
      await tx.insert(jackpot).values({
        id: "mega",
        amount: money(Math.max(jpAmount, 10000)),
        enabled: "yes",
        displayAmount: money(500_000_000),
      });
    }
  }

  return { balance: next };
}
