import { getDb } from "../src/server/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  console.log("Dropping all tables...");
  try {
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    const tables = [
      "users",
      "sessions",
      "jackpot",
      "transactions",
      "live_wins",
      "wallet_requests",
      "audit_logs",
      "game_controls",
      "play_sessions",
      "platform_settings",
      "promotions",
      "risk_controls",
      "support_tickets",
      "support_messages",
    ];
    for (const table of tables) {
      await db.execute(sql`DROP TABLE IF EXISTS ${sql.raw(table)}`);
      console.log(`Dropped ${table}`);
    }
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    console.log("All tables dropped successfully!");
  } catch (e) {
    console.error("Could not drop tables:", e);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
