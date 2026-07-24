import "dotenv/config";
import mysql from "mysql2/promise";
import { slotGames } from "../src/lib/games";

async function main() {
  const c = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "maxhigh",
    multipleStatements: true,
  });

  await c.query(`
    CREATE TABLE IF NOT EXISTS game_controls (
      game_id VARCHAR(64) PRIMARY KEY,
      enabled ENUM('yes','no') NOT NULL DEFAULT 'yes',
      featured ENUM('yes','no') NOT NULL DEFAULT 'no',
      sort_order BIGINT NOT NULL DEFAULT 0,
      tag VARCHAR(32) NULL,
      rtp VARCHAR(32) NULL,
      volatility VARCHAR(32) NULL,
      min_bet VARCHAR(32) NULL,
      max_bet VARCHAR(32) NULL,
      notes TEXT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX game_controls_enabled_idx (enabled)
    ) ENGINE=InnoDB;
  `);

  let order = 0;
  for (const g of slotGames) {
    await c.query(
      `INSERT INTO game_controls (game_id, enabled, featured, sort_order, tag, rtp, volatility, min_bet, max_bet)
       VALUES (?, 'yes', ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tag = COALESCE(tag, VALUES(tag)),
         rtp = COALESCE(rtp, VALUES(rtp)),
         volatility = COALESCE(volatility, VALUES(volatility)),
         min_bet = COALESCE(min_bet, VALUES(min_bet)),
         max_bet = COALESCE(max_bet, VALUES(max_bet))`,
      [
        g.id,
        g.tag === "Hot" || g.tag === "New" ? "yes" : "no",
        order++,
        g.tag ?? null,
        g.rtp,
        g.volatility,
        g.minBet,
        g.maxBet,
      ],
    );
  }

  // Ensure a superadmin exists
  const [rows] = await c.query<any[]>(
    `SELECT id FROM users WHERE email = ? OR role = 'superadmin' LIMIT 1`,
    ["superadmin@maxhigh.gg"],
  );
  if (!rows.length) {
    const { hash } = await import("bcryptjs");
    const { randomUUID } = await import("node:crypto");
    const passwordHash = await hash(process.env.SEED_SUPERADMIN_PASSWORD || "super123", 10);
    await c.query(
      `INSERT INTO users (id, email, username, password_hash, balance, role, display_name)
       VALUES (?, ?, ?, ?, '0.00', 'superadmin', ?)`,
      [
        randomUUID(),
        process.env.SEED_SUPERADMIN_EMAIL || "superadmin@maxhigh.gg",
        "superadmin",
        passwordHash,
        "MaxHigh Superadmin",
      ],
    );
    console.log("Created superadmin@maxhigh.gg / super123");
  } else {
    console.log("Superadmin already present");
  }

  console.log(`Synced ${slotGames.length} game controls`);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
