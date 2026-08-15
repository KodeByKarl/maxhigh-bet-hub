-- MaxHigh MariaDB / MySQL schema
-- Source of truth for app shape: src/server/db/schema.ts
-- New installs: mysql … < scripts/schema.sql  OR  npm run db:push && npm run db:seed
-- Existing DBs: npm run db:push  (preferred) or npm run db:sync for additive column/table ensures
-- Versioned SQL snapshots: drizzle/ (drizzle-kit generate)

CREATE DATABASE IF NOT EXISTS maxhigh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE maxhigh;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  public_user_id VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) NULL UNIQUE,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  role ENUM('player','admin','agent','master_agent','superadmin') NOT NULL DEFAULT 'player',
  is_locked ENUM('yes','no') NOT NULL DEFAULT 'no',
  failed_attempts BIGINT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  locked_at TIMESTAMP NULL,
  locked_by VARCHAR(36) NULL,
  lock_reason TEXT NULL,
  unlocked_at TIMESTAMP NULL,
  unlocked_by VARCHAR(36) NULL,
  display_name VARCHAR(128) NULL,
  avatar_url VARCHAR(512) NULL,
  upline_id VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX users_email_idx (email),
  INDEX users_username_idx (username),
  INDEX users_public_user_id_idx (public_user_id),
  INDEX users_upline_idx (upline_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX sessions_token_idx (token),
  INDEX sessions_user_idx (user_id),
  INDEX sessions_last_seen_idx (last_seen_at),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jackpot (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'mega',
  amount DECIMAL(16,2) NOT NULL DEFAULT 0.00,
  enabled ENUM('yes','no') NOT NULL DEFAULT 'yes',
  display_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('deposit','withdraw','bet','win','adjust','jackpot') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  balance_after DECIMAL(14,2) NOT NULL,
  game VARCHAR(64) NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX tx_user_idx (user_id),
  INDEX tx_created_idx (created_at),
  INDEX tx_type_idx (type),
  INDEX tx_game_idx (game),
  CONSTRAINT tx_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS live_wins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  username VARCHAR(64) NOT NULL,
  game VARCHAR(64) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX live_wins_created_idx (created_at),
  CONSTRAINT live_wins_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallet_requests (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('deposit','withdraw') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  player_note TEXT NULL,
  staff_note TEXT NULL,
  reviewed_by VARCHAR(36) NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX wr_status_idx (status),
  INDEX wr_user_idx (user_id),
  INDEX wr_created_idx (created_at),
  CONSTRAINT wr_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT wr_reviewer_fk FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  actor_id VARCHAR(36) NULL,
  actor_username VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64) NULL,
  target_id VARCHAR(64) NULL,
  summary VARCHAR(512) NOT NULL,
  meta TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX audit_created_idx (created_at),
  INDEX audit_actor_idx (actor_id),
  INDEX audit_action_idx (action),
  CONSTRAINT audit_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
  engine_config LONGTEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX game_controls_enabled_idx (enabled)
) ENGINE=InnoDB;

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
  INDEX gsl_actor_idx (actor_id),
  CONSTRAINT gsl_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS play_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  game_id VARCHAR(64) NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  bet DECIMAL(14,2) NOT NULL,
  ante ENUM('yes','no') NOT NULL DEFAULT 'no',
  free_spins_left BIGINT NOT NULL DEFAULT 0,
  fs_session_win DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  fs_bomb_acc DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  fs_spins_played BIGINT NOT NULL DEFAULT 0,
  feature_state LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX play_sessions_user_idx (user_id),
  INDEX play_sessions_status_idx (status),
  INDEX play_sessions_user_game_status_idx (user_id, game_id, status),
  INDEX play_sessions_status_updated_idx (status, updated_at),
  CONSTRAINT play_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS platform_settings (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
  maintenance_mode ENUM('yes','no') NOT NULL DEFAULT 'no',
  announcement_banner TEXT NULL,
  min_deposit DECIMAL(14,2) NOT NULL DEFAULT 100.00,
  max_deposit DECIMAL(14,2) NOT NULL DEFAULT 50000.00,
  min_withdraw DECIMAL(14,2) NOT NULL DEFAULT 200.00,
  max_withdraw DECIMAL(14,2) NOT NULL DEFAULT 100000.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carousel_slides (
  id VARCHAR(36) PRIMARY KEY,
  badge VARCHAR(64) NOT NULL DEFAULT 'Promo',
  title VARCHAR(128) NOT NULL,
  headline VARCHAR(128) NOT NULL,
  sub VARCHAR(255) NULL,
  cta VARCHAR(64) NOT NULL DEFAULT 'Claim Now',
  link_url VARCHAR(512) NULL,
  image_url VARCHAR(512) NOT NULL,
  sort_order BIGINT NOT NULL DEFAULT 0,
  enabled ENUM('yes','no') NOT NULL DEFAULT 'yes',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promotions (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  description TEXT NULL,
  bonus_percent DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  max_bonus DECIMAL(14,2) NOT NULL DEFAULT 1000.00,
  wagering_multiplier DECIMAL(6,2) NOT NULL DEFAULT 15.00,
  enabled ENUM('yes','no') NOT NULL DEFAULT 'yes',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS risk_controls (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
  max_single_bet DECIMAL(14,2) NOT NULL DEFAULT 10000.00,
  max_daily_payout DECIMAL(14,2) NOT NULL DEFAULT 500000.00,
  max_weekly_limit DECIMAL(14,2) NOT NULL DEFAULT 20000.00,
  auto_flag_large_wins ENUM('yes','no') NOT NULL DEFAULT 'yes',
  large_win_threshold DECIMAL(14,2) NOT NULL DEFAULT 50000.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  username VARCHAR(64) NOT NULL,
  player_name VARCHAR(128) NULL,
  concern TEXT NULL,
  agent_name VARCHAR(128) NULL,
  status ENUM('open','resolved') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX st_user_idx (user_id),
  INDEX st_status_idx (status),
  CONSTRAINT st_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_messages (
  id VARCHAR(36) PRIMARY KEY,
  ticket_id VARCHAR(36) NOT NULL,
  sender ENUM('user','agent') NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX sm_ticket_idx (ticket_id),
  INDEX sm_created_idx (created_at),
  CONSTRAINT sm_ticket_fk FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS provably_fair_seeds (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  server_seed VARCHAR(128) NOT NULL,
  server_seed_hash VARCHAR(128) NOT NULL,
  client_seed VARCHAR(128) NOT NULL,
  nonce BIGINT NOT NULL DEFAULT 0,
  status ENUM('active','revealed') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX pfs_user_idx (user_id),
  INDEX pfs_status_idx (status),
  CONSTRAINT pfs_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO jackpot (id, amount, enabled, display_amount)
VALUES ('mega', 10000.00, 'yes', 0.00)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO platform_settings (id, maintenance_mode)
VALUES ('default', 'no')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO risk_controls (id, max_single_bet, max_daily_payout, max_weekly_limit, auto_flag_large_wins, large_win_threshold)
VALUES ('default', 10000.00, 500000.00, 20000.00, 'yes', 50000.00)
ON DUPLICATE KEY UPDATE id = id;
