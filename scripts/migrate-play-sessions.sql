-- Server-authoritative game sessions (Candy Peak free spins, etc.)
USE maxhigh;

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
