-- Platform settings / promotions / risk controls (used by bets + superadmin)
-- PowerShell: node scripts/run-migrate-platform-tables.mjs

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

-- Hierarchy: globally unique public user id + mega jackpot controls
-- (applied idempotently in run-migrate-platform-tables.mjs)

