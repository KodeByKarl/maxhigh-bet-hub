/**
 * Seed MaxHigh MariaDB with admin + demo player + mega jackpot.
 *
 * Usage: npm run db:seed
 * Requires .env with MYSQL_* or DATABASE_URL.
 *
 * Sign-in uses username (not email).
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { getDb } from "../src/server/db/client";
import { jackpot, users } from "../src/server/db/schema";

async function upsertByUsername(opts: {
  username: string;
  email: string | null;
  password: string;
  role: "player" | "admin" | "superadmin";
  displayName: string;
  balance: string;
}) {
  const db = getDb();
  const username = opts.username.trim().toLowerCase();
  const existing = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.username}) = ${username}`)
    .limit(1);

  if (!existing[0]) {
    await db.insert(users).values({
      id: randomUUID(),
      email: opts.email,
      username,
      passwordHash: await hash(opts.password, 10),
      balance: opts.balance,
      role: opts.role,
      displayName: opts.displayName,
    });
    console.log(`Created ${opts.role}: ${username} / ${opts.password}`);
    return;
  }

  await db
    .update(users)
    .set({ role: opts.role })
    .where(eq(users.id, existing[0].id));
  console.log(`${opts.role} already exists: ${username}`);
}

async function main() {
  const db = getDb();

  const adminUser = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const superUser = (process.env.SEED_SUPERADMIN_USERNAME ?? "superadmin").toLowerCase();
  const superPass = process.env.SEED_SUPERADMIN_PASSWORD ?? "super123";
  const playerUser = (process.env.SEED_PLAYER_USERNAME ?? "player1").toLowerCase();
  const playerPass = process.env.SEED_PLAYER_PASSWORD ?? "player123";

  await upsertByUsername({
    username: adminUser,
    email: process.env.SEED_ADMIN_EMAIL ?? null,
    password: adminPass,
    role: "admin",
    displayName: "MaxHigh Admin",
    balance: "0.00",
  });

  await upsertByUsername({
    username: superUser,
    email: process.env.SEED_SUPERADMIN_EMAIL ?? null,
    password: superPass,
    role: "superadmin",
    displayName: "MaxHigh Superadmin",
    balance: "0.00",
  });

  await upsertByUsername({
    username: playerUser,
    email: process.env.SEED_PLAYER_EMAIL ?? null,
    password: playerPass,
    role: "player",
    displayName: "Player One",
    balance: "1000.00",
  });

  const jp = await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
  if (!jp[0]) {
    await db.insert(jackpot).values({ id: "mega", amount: "10000.00" });
    console.log("Seeded Mega Jackpot at ₱10,000.00");
  } else {
    console.log(`Mega Jackpot: ₱${jp[0].amount}`);
  }

  console.log("Seed complete. Sign in with username + password.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
