-- MaxHigh MariaDB / MySQL schema
-- Run: mysql -u root -p < scripts/schema.sql
-- Or: CREATE DATABASE then npm run db:push

CREATE DATABASE IF NOT EXISTS maxhigh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE maxhigh;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NULL UNIQUE,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  role ENUM('player','admin','superadmin') NOT NULL DEFAULT 'player',
  display_name VARCHAR(128) NULL,
  avatar_url VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX users_email_idx (email),
  INDEX users_username_idx (username)
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
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX play_sessions_user_idx (user_id),
  INDEX play_sessions_status_idx (status),
  INDEX play_sessions_user_game_status_idx (user_id, game_id, status),
  CONSTRAINT play_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO jackpot (id, amount)
VALUES ('mega', 10000.00)
ON DUPLICATE KEY UPDATE id = id;

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
  auto_flag_large_wins ENUM('yes','no') NOT NULL DEFAULT 'yes',
  large_win_threshold DECIMAL(14,2) NOT NULL DEFAULT 50000.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO platform_settings (id, maintenance_mode)
VALUES ('default', 'no')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO risk_controls (id, max_single_bet, max_daily_payout, auto_flag_large_wins, large_win_threshold)
VALUES ('default', 10000.00, 500000.00, 'yes', 50000.00)
ON DUPLICATE KEY UPDATE id = id;
