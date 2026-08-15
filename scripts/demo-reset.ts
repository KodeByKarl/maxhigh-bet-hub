import "dotenv/config";
import { sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { getDb } from "../src/server/db/client";

/** Keep only this Superadmin account after wipe. */
const KEEP_USERNAME = "superadmin1";
const KEEP_PASSWORD = "super123";

async function main() {
  const db = getDb();

  const before = await db.execute(sql`
    SELECT username, role, balance FROM users ORDER BY username
  `);
  console.log("Before wipe:", before[0]);

  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

  const truncateTables = [
    "support_messages",
    "support_tickets",
    "play_sessions",
    "provably_fair_seeds",
    "wallet_requests",
    "transactions",
    "sessions",
    "live_wins",
    "audit_logs",
    "game_settings_logs",
  ];

  for (const table of truncateTables) {
    await db.execute(sql.raw(`TRUNCATE TABLE \`${table}\``));
    console.log(`Cleared ${table}`);
  }

  // Wipe all users, then ensure KEEP account exists
  await db.execute(sql`DELETE FROM users`);
  console.log("Deleted all users");

  const passwordHash = await hash(KEEP_PASSWORD, 10);
  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO users (
      id, public_user_id, email, username, password_hash, balance, role, display_name, upline_id
    ) VALUES (
      ${id},
      ${KEEP_USERNAME},
      ${`${KEEP_USERNAME}@maxhigh.gg`},
      ${KEEP_USERNAME},
      ${passwordHash},
      '0.00',
      'superadmin',
      'MaxHigh Superadmin',
      NULL
    )
  `);
  console.log(`Ensured Superadmin @${KEEP_USERNAME}`);

  await db.execute(sql`
    UPDATE jackpot
    SET amount = '0.00', display_amount = '0.00'
  `);

  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

  const afterUsers = await db.execute(sql`
    SELECT id, username, role, balance, public_user_id
    FROM users
    ORDER BY username
  `);
  const afterCounts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM transactions) AS transactions,
      (SELECT COUNT(*) FROM sessions) AS sessions,
      (SELECT COUNT(*) FROM live_wins) AS live_wins,
      (SELECT COUNT(*) FROM play_sessions) AS play_sessions,
      (SELECT COUNT(*) FROM wallet_requests) AS wallet_requests,
      (SELECT COUNT(*) FROM audit_logs) AS audit_logs,
      (SELECT amount FROM jackpot WHERE id = 'mega' LIMIT 1) AS jackpot
  `);

  console.log("Remaining users:", afterUsers[0]);
  console.log("After wipe:", afterCounts[0]);
  console.log(`Login: ${KEEP_USERNAME} / ${KEEP_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
