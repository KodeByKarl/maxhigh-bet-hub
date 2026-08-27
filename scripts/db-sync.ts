/**
 * Idempotent additive sync for existing MaxHigh MySQL DBs.
 * Prefer `npm run db:push` when possible; this script fills gaps without dropping data.
 * Bootstrap snapshot: scripts/schema.sql (kept in sync with src/server/db/schema.ts).
 * Retired one-off SQL lives under scripts/legacy/.
 */
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
      [database, table, column],
    );
    if (!rows || rows.length === 0) {
      console.log(`Adding missing column \`${column}\` to table \`${table}\`...`);
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`Successfully added \`${column}\`.`);
    }
  };

  const addIndexIfNotExists = async (table: string, indexName: string, ddl: string) => {
    const [rows] = await conn.query<any[]>(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      [database, table, indexName],
    );
    if (!rows || rows.length === 0) {
      console.log(`Adding index \`${indexName}\` on \`${table}\`...`);
      await conn.query(ddl);
    }
  };

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`public_user_id\` VARCHAR(64) NULL,
      \`email\` VARCHAR(255) UNIQUE,
      \`username\` VARCHAR(64) NOT NULL UNIQUE,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`balance\` DECIMAL(14,2) NOT NULL DEFAULT '0.00',
      \`role\` ENUM('player', 'admin', 'agent', 'master_agent', 'superadmin') NOT NULL DEFAULT 'player',
      \`is_locked\` ENUM('yes', 'no') NOT NULL DEFAULT 'no',
      \`failed_attempts\` BIGINT NOT NULL DEFAULT 0,
      \`locked_until\` DATETIME NULL,
      \`locked_at\` DATETIME NULL,
      \`locked_by\` VARCHAR(36) NULL,
      \`lock_reason\` TEXT NULL,
      \`unlocked_at\` DATETIME NULL,
      \`unlocked_by\` VARCHAR(36) NULL,
      \`display_name\` VARCHAR(128) NULL,
      \`avatar_url\` VARCHAR(512) NULL,
      \`upline_id\` VARCHAR(36) NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    ALTER TABLE \`users\` MODIFY COLUMN \`role\` ENUM('player', 'admin', 'agent', 'master_agent', 'superadmin') NOT NULL DEFAULT 'player';
  `);

  await addColumnIfNotExists("users", "public_user_id", "VARCHAR(64) NULL");
  await addColumnIfNotExists("users", "is_locked", "ENUM('yes', 'no') NOT NULL DEFAULT 'no'");
  await addColumnIfNotExists("users", "failed_attempts", "BIGINT NOT NULL DEFAULT 0");
  await addColumnIfNotExists("users", "locked_until", "DATETIME NULL");
  await addColumnIfNotExists("users", "locked_at", "DATETIME NULL");
  await addColumnIfNotExists("users", "locked_by", "VARCHAR(36) NULL");
  await addColumnIfNotExists("users", "lock_reason", "TEXT NULL");
  await addColumnIfNotExists("users", "unlocked_at", "DATETIME NULL");
  await addColumnIfNotExists("users", "unlocked_by", "VARCHAR(36) NULL");
  await addColumnIfNotExists("users", "display_name", "VARCHAR(128) NULL");
  await addColumnIfNotExists("users", "avatar_url", "VARCHAR(512) NULL");
  await addColumnIfNotExists("users", "upline_id", "VARCHAR(36) NULL");
  await addColumnIfNotExists("users", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  // Stable ledger ordering — created_at is second-precision so bet/win pairs can tie.
  const [txSeqCol] = await conn.query<any[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'seq'`,
    [database],
  );
  if (!txSeqCol || txSeqCol.length === 0) {
    console.log("Adding transactions.seq (AUTO_INCREMENT) for stable ledger ordering...");
    await conn.query(
      `ALTER TABLE transactions ADD COLUMN seq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE FIRST`,
    );
    await conn.query(`CREATE INDEX tx_seq_idx ON transactions (seq)`);
    console.log("Successfully added transactions.seq.");
  }

  // Re-number seq in true chronological order (bet before win when timestamps tie).
  if (!txSeqCol || txSeqCol.length === 0) {
    console.log("Backfilling transactions.seq in chronological order...");
    await conn.query(`ALTER TABLE transactions MODIFY seq BIGINT UNSIGNED NOT NULL`);
    await conn.query(`UPDATE transactions SET seq = seq + 10000000`);
    await conn.query(`
      UPDATE transactions t
      JOIN (
        SELECT id,
          ROW_NUMBER() OVER (
            ORDER BY created_at ASC,
              (balance_after - amount) ASC,
              CASE type WHEN 'bet' THEN 0 WHEN 'win' THEN 1 WHEN 'jackpot' THEN 2 ELSE 3 END,
              id ASC
          ) AS new_seq
        FROM transactions
      ) x ON t.id = x.id
      SET t.seq = x.new_seq
    `);
    const [maxRow] = await conn.query<any[]>(`SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM transactions`);
    const nextSeq = Number(maxRow?.[0]?.next_seq ?? 1);
    await conn.query(
      `ALTER TABLE transactions MODIFY seq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE, AUTO_INCREMENT = ${nextSeq}`,
    );
    console.log(`transactions.seq backfill complete (next AUTO_INCREMENT=${nextSeq}).`);
  }

  await conn.query(`
    UPDATE users SET public_user_id = username
    WHERE public_user_id IS NULL OR public_user_id = ''
  `);
  try {
    await conn.query(`ALTER TABLE users MODIFY COLUMN public_user_id VARCHAR(64) NOT NULL`);
  } catch (err: any) {
    console.warn("public_user_id NOT NULL:", err?.message ?? err);
  }
  await addIndexIfNotExists(
    "users",
    "users_public_user_id_uq",
    "CREATE UNIQUE INDEX users_public_user_id_uq ON users (public_user_id)",
  );
  await addIndexIfNotExists("users", "users_upline_idx", "CREATE INDEX users_upline_idx ON users (upline_id)");

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

  await addColumnIfNotExists("jackpot", "enabled", "ENUM('yes','no') NOT NULL DEFAULT 'yes'");
  await addColumnIfNotExists("jackpot", "display_amount", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`play_sessions\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`user_id\` VARCHAR(36) NOT NULL,
      \`game_id\` VARCHAR(64) NOT NULL,
      \`status\` ENUM('open','closed') NOT NULL DEFAULT 'open',
      \`bet\` DECIMAL(14,2) NOT NULL,
      \`ante\` ENUM('yes','no') NOT NULL DEFAULT 'no',
      \`free_spins_left\` BIGINT NOT NULL DEFAULT 0,
      \`fs_session_win\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      \`fs_bomb_acc\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      \`fs_spins_played\` BIGINT NOT NULL DEFAULT 0,
      \`feature_state\` LONGTEXT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX play_sessions_user_idx (user_id),
      INDEX play_sessions_status_idx (status),
      INDEX play_sessions_user_game_status_idx (user_id, game_id, status),
      INDEX play_sessions_status_updated_idx (status, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await addColumnIfNotExists("play_sessions", "feature_state", "LONGTEXT NULL");
  await addIndexIfNotExists(
    "play_sessions",
    "play_sessions_status_updated_idx",
    "CREATE INDEX play_sessions_status_updated_idx ON play_sessions (status, updated_at)",
  );

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

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`carousel_slides\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`badge\` VARCHAR(64) NOT NULL DEFAULT 'Promo',
      \`title\` VARCHAR(128) NOT NULL,
      \`headline\` VARCHAR(128) NOT NULL,
      \`sub\` VARCHAR(255) NULL,
      \`cta\` VARCHAR(64) NOT NULL DEFAULT 'Claim Now',
      \`link_url\` VARCHAR(512) NULL,
      \`image_url\` VARCHAR(512) NOT NULL,
      \`sort_order\` BIGINT NOT NULL DEFAULT 0,
      \`enabled\` ENUM('yes','no') NOT NULL DEFAULT 'yes',
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

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

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`game_settings_logs\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`actor_id\` VARCHAR(36) NULL,
      \`actor_username\` VARCHAR(64) NOT NULL,
      \`scope\` VARCHAR(64) NOT NULL,
      \`affected_count\` BIGINT NOT NULL DEFAULT 0,
      \`dead_spin_pct\` DECIMAL(5,2) NOT NULL,
      \`win_chance_pct\` DECIMAL(5,2) NOT NULL,
      \`max_multiplier\` DECIMAL(10,2) NOT NULL,
      \`rtp\` DECIMAL(5,2) NOT NULL,
      \`before_snapshot\` TEXT NULL,
      \`after_snapshot\` TEXT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`support_tickets\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`user_id\` VARCHAR(36) NOT NULL,
      \`username\` VARCHAR(64) NOT NULL,
      \`player_name\` VARCHAR(128) NULL,
      \`concern\` TEXT NULL,
      \`agent_name\` VARCHAR(128) NULL,
      \`status\` ENUM('open','resolved') NOT NULL DEFAULT 'open',
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`support_messages\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`ticket_id\` VARCHAR(36) NOT NULL,
      \`sender\` ENUM('user','agent') NOT NULL,
      \`text\` TEXT NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`provably_fair_seeds\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`user_id\` VARCHAR(36) NOT NULL,
      \`server_seed\` VARCHAR(128) NOT NULL,
      \`server_seed_hash\` VARCHAR(128) NOT NULL,
      \`client_seed\` VARCHAR(128) NOT NULL,
      \`nonce\` BIGINT NOT NULL DEFAULT 0,
      \`status\` ENUM('active','revealed') NOT NULL DEFAULT 'active',
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    INSERT INTO platform_settings (id, maintenance_mode)
    VALUES ('default', 'no')
    ON DUPLICATE KEY UPDATE id = id
  `);
  await conn.query(`
    INSERT INTO risk_controls (id, max_single_bet, max_daily_payout, max_weekly_limit, auto_flag_large_wins, large_win_threshold)
    VALUES ('default', 10000.00, 500000.00, 20000.00, 'yes', 50000.00)
    ON DUPLICATE KEY UPDATE id = id
  `);

  console.log("Database schema synchronization complete!");
  await conn.end();
}

main().catch((err) => {
  console.error("Database sync failed:", err);
  process.exit(1);
});
