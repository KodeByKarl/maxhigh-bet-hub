import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const host = process.env.MYSQL_HOST ?? "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT ?? 3306);
  const user = process.env.MYSQL_USER ?? "root";
  const password = process.env.MYSQL_PASSWORD ?? "";
  const database = process.env.MYSQL_DATABASE ?? "maxhigh";

  console.log(`Connecting to MySQL database ${database} at ${host}:${port}...`);
  const conn = await mysql.createConnection({ host, port, user, password, database });

  const addColumnIfNotExists = async (table: string, column: string, definition: string) => {
    const [rows] = await conn.query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [database, table, column]
    );
    if (!rows || rows.length === 0) {
      console.log(`Adding missing column \`${column}\` to table \`${table}\`...`);
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`Successfully added \`${column}\`.`);
    }
  };

  // Ensure users table exists & has all columns
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`email\` VARCHAR(255) UNIQUE,
      \`username\` VARCHAR(64) NOT NULL UNIQUE,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`balance\` DECIMAL(14,2) NOT NULL DEFAULT '0.00',
      \`role\` ENUM('player', 'admin', 'agent', 'master_agent', 'superadmin') NOT NULL DEFAULT 'player',
      \`is_locked\` ENUM('yes', 'no') NOT NULL DEFAULT 'no',
      \`failed_attempts\` BIGINT NOT NULL DEFAULT 0,
      \`locked_until\` DATETIME NULL,
      \`display_name\` VARCHAR(128) NULL,
      \`avatar_url\` VARCHAR(512) NULL,
      \`upline_id\` VARCHAR(36) NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    ALTER TABLE \`users\` MODIFY COLUMN \`role\` ENUM('player', 'admin', 'agent', 'master_agent', 'superadmin') NOT NULL DEFAULT 'player';
  `);

  await addColumnIfNotExists("users", "is_locked", "ENUM('yes', 'no') NOT NULL DEFAULT 'no'");
  await addColumnIfNotExists("users", "failed_attempts", "BIGINT NOT NULL DEFAULT 0");
  await addColumnIfNotExists("users", "locked_until", "DATETIME NULL");
  await addColumnIfNotExists("users", "display_name", "VARCHAR(128) NULL");
  await addColumnIfNotExists("users", "avatar_url", "VARCHAR(512) NULL");
  await addColumnIfNotExists("users", "upline_id", "VARCHAR(36) NULL");

  // Ensure sessions table has last_seen_at
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`sessions\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`user_id\` VARCHAR(36) NOT NULL,
      \`token\` VARCHAR(128) NOT NULL UNIQUE,
      \`expires_at\` DATETIME NOT NULL,
      \`last_seen_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await addColumnIfNotExists("sessions", "last_seen_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");

  // Ensure platform_settings table exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`platform_settings\` (
      \`id\` VARCHAR(32) PRIMARY KEY DEFAULT 'default',
      \`maintenance_mode\` ENUM('yes', 'no') NOT NULL DEFAULT 'no',
      \`announcement_banner\` TEXT NULL,
      \`min_deposit\` DECIMAL(14,2) NOT NULL DEFAULT '100.00',
      \`max_deposit\` DECIMAL(14,2) NOT NULL DEFAULT '50000.00',
      \`min_withdraw\` DECIMAL(14,2) NOT NULL DEFAULT '200.00',
      \`max_withdraw\` DECIMAL(14,2) NOT NULL DEFAULT '100000.00',
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Ensure risk_controls table has max_weekly_limit
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`risk_controls\` (
      \`id\` VARCHAR(32) PRIMARY KEY DEFAULT 'default',
      \`max_single_bet\` DECIMAL(14,2) NOT NULL DEFAULT '10000.00',
      \`max_daily_payout\` DECIMAL(14,2) NOT NULL DEFAULT '500000.00',
      \`max_weekly_limit\` DECIMAL(14,2) NOT NULL DEFAULT '20000.00',
      \`auto_flag_large_wins\` ENUM('yes', 'no') NOT NULL DEFAULT 'yes',
      \`large_win_threshold\` DECIMAL(14,2) NOT NULL DEFAULT '50000.00',
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await addColumnIfNotExists("risk_controls", "max_weekly_limit", "DECIMAL(14,2) NOT NULL DEFAULT '20000.00'");

  console.log("Database schema synchronization complete!");
  await conn.end();
}

main().catch((err) => {
  console.error("Database sync failed:", err);
  process.exit(1);
});
