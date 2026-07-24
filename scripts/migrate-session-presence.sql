-- Run once if sessions table already exists without last_seen_at:
ALTER TABLE sessions
  ADD COLUMN last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER expires_at,
  ADD INDEX sessions_last_seen_idx (last_seen_at);
