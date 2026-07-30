import { getDb } from "../src/server/db/client";
import { sql } from "drizzle-orm";

async function ensureGameTables() {
  console.log("Ensuring game outcome controls, settings logs & provably fair tables exist...");
  const db = getDb();

  const createSettingsLogsStmt = `
    CREATE TABLE IF NOT EXISTS game_settings_logs (
      id VARCHAR(36) PRIMARY KEY,
      actor_id VARCHAR(36) NULL,
      actor_username VARCHAR(64) NOT NULL,
      scope VARCHAR(64) NOT NULL,
      affected_count BIGINT NOT NULL DEFAULT 0,
      dead_spin_pct DECIMAL(5,2) NOT NULL,
      win_chance_pct DECIMAL(5,2) NOT NULL,
      max_multiplier DECIMAL(10,2) NOT NULL,
      rtp DECIMAL(5,2) NOT NULL,
      before_snapshot TEXT NULL,
      after_snapshot TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX gsl_created_idx (created_at),
      INDEX gsl_actor_idx (actor_id)
    );
  `;

  const createProvablyFairStmt = `
    CREATE TABLE IF NOT EXISTS provably_fair_seeds (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      server_seed VARCHAR(128) NOT NULL,
      server_seed_hash VARCHAR(128) NOT NULL,
      client_seed VARCHAR(128) NOT NULL,
      nonce BIGINT NOT NULL DEFAULT 0,
      status ENUM('active', 'revealed') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX pfs_user_idx (user_id),
      INDEX pfs_status_idx (status)
    );
  `;

  await db.execute(sql.raw(createSettingsLogsStmt));
  console.log("✅ game_settings_logs table ready");

  await db.execute(sql.raw(createProvablyFairStmt));
  console.log("✅ provably_fair_seeds table ready");
}

ensureGameTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error creating tables:", err);
    process.exit(1);
  });
