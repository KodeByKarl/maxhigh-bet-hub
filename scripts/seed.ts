import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { getDb } from "../src/server/db/client";
import { jackpot, users, transactions, auditLogs, sessions } from "../src/server/db/schema";

async function upsertUser(opts: {
  username: string;
  email: string | null;
  password: string;
  role: "player" | "admin" | "agent" | "master_agent" | "superadmin";
  displayName: string;
  balance: string;
  parentAgentId?: string;
}) {
  const db = getDb();
  const username = opts.username.trim().toLowerCase();
  const existing = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.username}) = ${username}`)
    .limit(1);

  if (!existing[0]) {
    const userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email: opts.email,
      username,
      passwordHash: await hash(opts.password, 10),
      balance: opts.balance,
      role: opts.role,
      displayName: opts.displayName,
      parentAgentId: opts.parentAgentId,
    });
    console.log(`Created ${opts.role}: ${username} / ${opts.password}`);
    return userId;
  }

  await db
    .update(users)
    .set({ role: opts.role, balance: opts.balance, parentAgentId: opts.parentAgentId })
    .where(eq(users.id, existing[0].id));
  console.log(`${opts.role} updated: ${username}`);
  return existing[0].id;
}

async function main() {
  const db = getDb();

  // Delete legacy admin account if present
  await db.delete(users).where(sql`LOWER(${users.username}) = 'admin'`);
  console.log("Removed legacy 'admin' account.");

  const superId = await upsertUser({
    username: "superadmin",
    email: "superadmin@maxhigh.gg",
    password: "super123",
    role: "superadmin",
    displayName: "MaxHigh Superadmin",
    balance: "100000.00",
  });

  const masterAgentId = await upsertUser({
    username: "masteragent",
    email: "master@maxhigh.gg",
    password: "master123",
    role: "master_agent",
    displayName: "Master Agent One",
    balance: "100000.00",
  });

  const agentId = await upsertUser({
    username: "agent1",
    email: "agent1@maxhigh.gg",
    password: "agent123",
    role: "agent",
    displayName: "Agent One",
    balance: "50000.00",
    parentAgentId: masterAgentId,
  });

  const players = [
    { username: "player1", email: "player1@maxhigh.gg", pass: "player123", name: "Player One", bal: "15500.00" },
    { username: "highroller88", email: "vip@maxhigh.gg", pass: "player123", name: "VIP High Roller", bal: "88000.00" },
    { username: "slotmaster", email: "slots@maxhigh.gg", pass: "player123", name: "Slot Master Pro", bal: "3400.00" },
    { username: "lucky_ace", email: "ace@maxhigh.gg", pass: "player123", name: "Lucky Ace", bal: "1280.00" },
  ];

  const games = ["Godly Gates of Olympus", "Candy Peak Bonanza", "Sugar Surge Deluxe"];

  for (const p of players) {
    const pId = await upsertUser({
      username: p.username,
      email: p.email,
      password: p.pass,
      role: "player",
      displayName: p.name,
      balance: p.bal,
    });

    // Seed active session
    await db.insert(sessions).values({
      id: randomUUID(),
      userId: pId,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 86400000 * 7),
      lastSeenAt: new Date(),
    });

    // Seed transaction history (bets and wins)
    for (let i = 0; i < 6; i++) {
      const betAmt = Math.floor(Math.random() * 500) + 100;
      const winAmt = Math.random() > 0.4 ? Math.floor(betAmt * (Math.random() * 8 + 1)) : 0;
      const selectedGame = games[i % games.length];

      // Bet transaction
      await db.insert(transactions).values({
        id: randomUUID(),
        userId: pId,
        type: "bet",
        amount: String(betAmt.toFixed(2)),
        balanceAfter: String((Number(p.bal) - betAmt).toFixed(2)),
        game: selectedGame,
        note: `Wager spin on ${selectedGame}`,
      });

      // Win transaction if won
      if (winAmt > 0) {
        await db.insert(transactions).values({
          id: randomUUID(),
          userId: pId,
          type: winAmt > 5000 ? "jackpot" : "win",
          amount: String(winAmt.toFixed(2)),
          balanceAfter: String((Number(p.bal) + winAmt).toFixed(2)),
          game: selectedGame,
          note: winAmt > 5000 ? `MEGA JACKPOT PAYOUT on ${selectedGame}` : `Winning payout on ${selectedGame}`,
        });
      }

      // Seed audit log
      await db.insert(auditLogs).values({
        id: randomUUID(),
        actorUsername: p.username,
        action: winAmt > 5000 ? "game.jackpot_win" : "game.spin",
        summary: `@${p.username} ${winAmt > 0 ? `WON ₱${winAmt.toLocaleString()}` : "placed wager spin"} on ${selectedGame}`,
        targetType: "user",
        targetId: pId,
        meta: JSON.stringify({ game: selectedGame, betAmt, winAmt }),
      });
    }
  }

  // Mega jackpot seed
  const jp = await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
  if (!jp[0]) {
    await db.insert(jackpot).values({ id: "mega", amount: "50000.00" });
    console.log("Seeded Mega Jackpot at ₱50,000.00");
  }

  // Platform settings seed
  await db.execute(sql`
    INSERT INTO platform_settings (id, maintenance_mode, min_deposit, max_deposit, min_withdraw, max_withdraw, master_chip_pool)
    VALUES ('default', 'no', '100.00', '50000.00', '200.00', '100000.00', '1000000.00')
    ON DUPLICATE KEY UPDATE master_chip_pool = master_chip_pool
  `);
  console.log("Seeded platform_settings table.");

  console.log("Full player activities & audit log seed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
