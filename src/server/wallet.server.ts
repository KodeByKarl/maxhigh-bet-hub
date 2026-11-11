import { minorUnits, signedMinorUnits } from "@/lib/money";
import { manilaDayBounds } from "@/lib/business-time";
import { gameControls, jackpot, auditLogs } from "./db/schema";
import { slotGames } from "@/lib/games";
/**
 * Shared wallet helpers — available balance, pending withdraw reserves, ledger writes.
 */
import { and, eq, sql, gte, or } from "drizzle-orm";
import { getDb } from "./db/client";
import {
  liveWins,
  platformSettings,
  riskControls,
  transactions,
  users,
  walletRequests,
} from "./db/schema";
import { money, newId } from "./session";

/** Drizzle tx or db — keep loose to avoid mysql dialect union friction. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbLike = any;

export async function getWeeklyUsageAndLimit(
  db: DbLike = getDb(),
  userId?: string,
): Promise<{ usage: number; limit: number }> {
  {
    const riskRows = await db
      .select()
      .from(riskControls)
      .where(eq(riskControls.id, "default"))
      .limit(1);
    if (!riskRows[0]) throw new Error("Financial risk controls unavailable");
    const limit = Number(riskRows[0].maxWeeklyLimit);
    minorUnits(limit);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const filters = [
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
  }
}

export async function assertWeeklyLimitNotExceeded(db: DbLike, userId: string, delta: number) {
  delta = Math.abs(delta);
  if (delta === 0) return;
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
  const rows = await db
    .select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const balance = Number(rows[0]?.balance ?? 0);
  const pendingWithdraw = await sumPendingWithdrawals(db, userId);
  return { balance, pendingWithdraw, available: availableFrom(balance, pendingWithdraw) };
}

export async function getMaxSingleBet(): Promise<number> {
  const [risk] = await getDb()
    .select()
    .from(riskControls)
    .where(eq(riskControls.id, "default"))
    .limit(1);
  if (!risk) throw new Error("Financial risk controls unavailable");
  const max = Number(risk.maxSingleBet);
  minorUnits(max);
  return max;
}

export async function assertNotInMaintenanceForBets(db: DbLike = getDb()) {
  const [settings] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, "default"))
    .limit(1);
  if (!settings) throw new Error("Platform settings unavailable");
  if (settings.maintenanceMode === "yes")
    throw new Error("Platform is currently under scheduled maintenance. Betting is locked.");
}

export async function assertGameWager(gameId: string, bet: number) {
  minorUnits(bet);
  const game = slotGames.find((g) => g.id === gameId);
  if (!game) throw new Error("Unknown game");
  const [control] = await getDb()
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, gameId))
    .limit(1);
  if (control?.enabled === "no") throw new Error("Game is currently disabled");
  const parse = (value: string) => Number(value.replace(/[^0-9.]/g, ""));
  const min = parse(control?.minBet ?? game.minBet);
  const max = parse(control?.maxBet ?? game.maxBet);
  if (!Number.isFinite(min) || !Number.isFinite(max) || bet < min || bet > max)
    throw new Error(`Bet must be between ${min} and ${max}`);
}

/**
 * Internal ledger write used by game settle + staff adjust paths.
 * MUST be called inside an open DB transaction. Locks the user row (FOR UPDATE)
 * so concurrent bets cannot race/overdraft; balance update + transactions insert
 * share that same transaction boundary.
 *
 * Jackpot contributions are written on this transaction and roll back with it.
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

  const deltaUnits = signedMinorUnits(opts.delta);
  if (opts.type === "bet" && deltaUnits >= 0) throw new Error("Wager must debit at least one cent");
  if (opts.type === "bet" && -opts.delta > (await getMaxSingleBet()))
    throw new Error("Wager exceeds max single bet exposure");
  const current = Number(user.balance);
  const next = (signedMinorUnits(current) + deltaUnits) / 100;
  if (deltaUnits < 0 && next < (await sumPendingWithdrawals(tx, opts.userId)))
    throw new Error("Insufficient available balance");
  if (next < 0) throw new Error("Insufficient balance");

  if (opts.type === "withdraw" || opts.type === "win" || opts.type === "jackpot") {
    await assertWeeklyLimitNotExceeded(tx, opts.userId, opts.delta);
  }

  if ((opts.type === "win" || opts.type === "jackpot") && opts.delta > 0) {
    const [risk] = await tx
      .select()
      .from(riskControls)
      .where(eq(riskControls.id, "default"))
      .limit(1);
    if (!risk) throw new Error("Financial risk controls unavailable");
    const { start, end } = manilaDayBounds();
    const [usage] = await tx
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, opts.userId),
          gte(transactions.createdAt, start),
          sql`${transactions.createdAt} < ${end}`,
          or(eq(transactions.type, "win"), eq(transactions.type, "jackpot")),
        ),
      );
    if (Number(usage.total) + opts.delta > Number(risk.maxDailyPayout))
      throw new Error("Daily payout limit exceeded");
    if (risk.autoFlagLargeWins === "yes" && opts.delta >= Number(risk.largeWinThreshold))
      await tx.insert(auditLogs).values({
        id: newId(),
        actorId: user.id,
        actorUsername: user.username,
        action: "risk.large_win",
        summary: "Payout flagged for review",
        targetType: "user",
        targetId: user.id,
        meta: JSON.stringify({ amount: opts.delta, game: opts.game }),
      });
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
    try {
      await tx.insert(liveWins).values({
        userId: opts.userId,
        username: opts.username,
        game: opts.game,
        amount: money(opts.delta),
      });
    } catch (err) {
      // Feed is cosmetic — do not abort a paid win over a ticker insert.
      console.error("[wallet] live_wins insert failed (non-fatal)", err);
    }
    await contributeJackpot(tx, Math.max(0.01, opts.delta * 0.01));
  }

  if (opts.type === "bet" && opts.delta < 0) {
    await contributeJackpot(tx, Math.abs(opts.delta) * 0.01, 10_000);
  }

  return { balance: next };
}

async function contributeJackpot(tx: DbLike, amount: number, floor = 0) {
  const contribution = money(amount);
  if (Number(contribution) <= 0) return;
  await tx.execute(
    sql`INSERT INTO jackpot (id, amount, enabled, display_amount) VALUES ('mega', ${money(Math.max(amount, floor))}, 'yes', ${money(500_000_000)}) ON DUPLICATE KEY UPDATE amount = ROUND(amount + ${contribution}, 2)`,
  );
}
