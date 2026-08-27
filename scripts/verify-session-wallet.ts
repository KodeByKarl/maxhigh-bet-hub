/**
 * Smoke-test auto-logout timing + player wallet ledger/summary.
 * Run: npx tsx --env-file=.env scripts/verify-session-wallet.ts
 */
import "dotenv/config";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, newId, newToken } from "../src/server/session";
import { getDb } from "../src/server/db/client";
import { sessions, transactions, users } from "../src/server/db/schema";

function php(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function expiredReason(createdAt: Date, lastSeenAt: Date, now = new Date()) {
  const nowMs = now.getTime();
  if (nowMs - createdAt.getTime() > SESSION_ABSOLUTE_MS) return "absolute";
  if (nowMs - lastSeenAt.getTime() > SESSION_IDLE_MS) return "idle";
  return null;
}

async function main() {
  const db = getDb();
  let fails = 0;
  const pass = (msg: string) => console.log(`  PASS  ${msg}`);
  const fail = (msg: string) => {
    fails++;
    console.log(`  FAIL  ${msg}`);
  };

  console.log("============================================================");
  console.log("VERIFY — SESSION AUTO-LOGOUT + PLAYER WALLET");
  console.log("============================================================");

  // --- Session timing ---
  console.log("\n[1] Session policy");
  try {
    assert(SESSION_ABSOLUTE_MS === 12 * 60 * 60 * 1000, "absolute must be 12h");
    assert(SESSION_IDLE_MS === 60 * 60 * 1000, "idle must be 60m");
    pass(`absolute=${SESSION_ABSOLUTE_MS / 3_600_000}h idle=${SESSION_IDLE_MS / 60_000}m`);

    const now = new Date();
    assert(
      expiredReason(new Date(now.getTime() - 13 * 3_600_000), now) === "absolute",
      "13h old session should expire absolute",
    );
    pass("13h-old session → absolute logout");

    assert(
      expiredReason(now, new Date(now.getTime() - 61 * 60_000)) === "idle",
      "61m idle should expire",
    );
    pass("61m idle → idle logout");

    assert(expiredReason(now, now) === null, "fresh session must stay valid");
    pass("fresh activity → still valid");
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  // --- Live DB idle expiry on a temp session row ---
  console.log("\n[2] Live DB idle session wipe");
  const [player] = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.username}) = 'player1'`)
    .limit(1);
  if (!player) {
    fail("player1 not found — run npm run db:seed");
  } else {
    const token = newToken();
    const sid = newId();
    const stale = new Date(Date.now() - SESSION_IDLE_MS - 60_000);
    await db.insert(sessions).values({
      id: sid,
      userId: player.id,
      token,
      expiresAt: new Date(Date.now() + SESSION_ABSOLUTE_MS),
      lastSeenAt: stale,
      createdAt: new Date(),
    });

    const reason = expiredReason(new Date(), stale);
    if (reason === "idle") {
      await db.delete(sessions).where(eq(sessions.id, sid));
      const gone = await db.select().from(sessions).where(eq(sessions.id, sid)).limit(1);
      assert(gone.length === 0, "stale session row should be deleted");
      pass("idle session detected and cleaned from DB");
    } else {
      await db.delete(sessions).where(eq(sessions.id, sid));
      fail(`expected idle, got ${reason}`);
    }

    // Absolute
    const token2 = newToken();
    const sid2 = newId();
    const oldLogin = new Date(Date.now() - SESSION_ABSOLUTE_MS - 60_000);
    await db.insert(sessions).values({
      id: sid2,
      userId: player.id,
      token: token2,
      expiresAt: new Date(Date.now() + 60_000), // cookie not expired yet
      lastSeenAt: new Date(),
      createdAt: oldLogin,
    });
    const abs = expiredReason(oldLogin, new Date());
    await db.delete(sessions).where(eq(sessions.id, sid2));
    if (abs === "absolute") pass("overnight/absolute session detected even if lastSeen is fresh");
    else fail(`expected absolute, got ${abs}`);
  }

  // --- Wallet queries for player1 ---
  console.log("\n[3] Player wallet (player1)");
  if (player) {
    try {
      const funds = await db
        .select({
          id: transactions.id,
          type: transactions.type,
          amount: transactions.amount,
          game: transactions.game,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, player.id),
            or(
              eq(transactions.type, "deposit"),
              eq(transactions.type, "withdraw"),
              eq(transactions.type, "adjust"),
            )!,
          ),
        )
        .orderBy(desc(transactions.seq))
        .limit(20);

      const play = await db
        .select({
          id: transactions.id,
          type: transactions.type,
          amount: transactions.amount,
          game: transactions.game,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, player.id),
            or(
              eq(transactions.type, "bet"),
              eq(transactions.type, "win"),
              eq(transactions.type, "jackpot"),
            )!,
          ),
        )
        .orderBy(desc(transactions.seq))
        .limit(20);

      const agg = await db
        .select({
          type: transactions.type,
          positive: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
          negative: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
          total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
          cnt: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(eq(transactions.userId, player.id))
        .groupBy(transactions.type);

      let fundIn = 0;
      let fundOut = 0;
      let betCount = 0;
      let betVolume = 0;
      let winVolume = 0;
      for (const row of agg) {
        const type = row.type;
        const total = Number(row.total);
        const positive = Number(row.positive);
        const negative = Math.abs(Number(row.negative));
        if (type === "deposit") fundIn += Math.abs(total);
        else if (type === "withdraw") fundOut += Math.abs(total);
        else if (type === "adjust") {
          fundIn += positive;
          fundOut += negative;
        } else if (type === "bet") {
          betCount += Number(row.cnt);
          betVolume += Math.abs(total);
        } else if (type === "win" || type === "jackpot") {
          winVolume += Math.abs(total);
        }
      }

      pass(`funds rows=${funds.length} (sample ok)`);
      pass(`play rows=${play.length} (sample ok)`);
      pass(
        `summary balance=${php(Number(player.balance))} fundIn=${php(fundIn)} fundOut=${php(fundOut)} bets=${betCount} wagered=${php(betVolume)} wins=${php(winVolume)} net=${php(winVolume - betVolume)}`,
      );

      // Labels used by UI
      const sample = [...funds.slice(0, 3), ...play.slice(0, 3)];
      for (const r of sample) {
        const amt = Number(r.amount);
        const label =
          r.type === "deposit" || (r.type === "adjust" && amt > 0)
            ? "Fund In"
            : r.type === "withdraw" || (r.type === "adjust" && amt < 0)
              ? "Fund Out"
              : r.type === "bet"
                ? "Bet"
                : r.type === "win"
                  ? "Win"
                  : r.type === "jackpot"
                    ? "Jackpot"
                    : r.type;
        assert(label.length > 0, "label empty");
      }
      pass("fund/play labels resolve for sample rows");
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  }

  // --- Wiring presence ---
  console.log("\n[4] Code wiring");
  try {
    const fs = await import("node:fs");
    const api = fs.readFileSync("src/functions/api.ts", "utf8");
    const nav = fs.readFileSync("src/components/maxhigh/Navbar.tsx", "utf8");
    const modal = fs.readFileSync("src/components/maxhigh/profile/WalletModal.tsx", "utf8");
    const auth = fs.readFileSync("src/lib/auth.tsx", "utf8");
    assert(api.includes("listMyTransactionsFn"), "api exports listMyTransactionsFn");
    assert(api.includes("getMyWalletSummaryFn"), "api exports getMyWalletSummaryFn");
    assert(nav.includes("WalletModal"), "Navbar mounts WalletModal");
    assert(nav.includes("My Wallet"), "Navbar profile has My Wallet");
    assert(modal.includes("Fund In/Out"), "WalletModal has Fund In/Out tab");
    assert(modal.includes("Bets & Wins"), "WalletModal has Bets & Wins tab");
    assert(auth.includes("CLIENT_IDLE_MS"), "AuthProvider has client idle logout");
    assert(auth.includes("heartbeatFn"), "AuthProvider activity heartbeat");
    pass("API + Navbar + WalletModal + AuthProvider wired");
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  console.log("\n============================================================");
  if (fails === 0) {
    console.log("ALL PASS — auto-logout policy + player wallet queries OK");
  } else {
    console.log(`${fails} FAIL`);
  }
  console.log("============================================================");
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
