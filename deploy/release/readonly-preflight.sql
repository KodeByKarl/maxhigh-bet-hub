-- READ-ONLY production pre/post-flight checks. Contains SELECT statements only.
-- Run as an administrator against the LIVE database, e.g.:
--   sudo mysql --database "$(PRODUCTION_DB_NAME)" --table < readonly-preflight.sql > preflight-$(date -u +%Y%m%dT%H%M%SZ).txt
-- Run once BEFORE activation and once AFTER; compare sections 3-5 exactly (they must not change except for
-- legitimate player activity). Never edit this file to add UPDATE/INSERT/DELETE.
SET SESSION TRANSACTION READ ONLY;

-- 1. Games switched off in the database (these override the compiled "no locked games" policy).
--    Any row here is NOT visible/playable on production. Report each with its notes; do not blindly re-enable.
SELECT game_id, enabled, featured, sort_order, notes, updated_at
FROM game_controls
WHERE enabled = 'no'
ORDER BY game_id;

-- 2. Count of control rows vs. disabled (the catalog has 100 games; missing rows default to enabled).
SELECT COUNT(*) AS control_rows, SUM(enabled = 'no') AS disabled_rows, SUM(enabled = 'yes') AS enabled_rows
FROM game_controls;

-- 3. Platform state that blocks wagering for everyone.
SELECT id, maintenance_mode FROM platform_settings;

-- 4. Balances: totals by role and a row count. Must be identical before and after (modulo live play).
SELECT role, COUNT(*) AS accounts, SUM(balance) AS total_balance, MAX(balance) AS max_balance
FROM users GROUP BY role ORDER BY role;

-- 5. Ledger integrity: every player's wallet equals the balance_after of their latest ledger row
--    (rows listed here are mismatches; an empty result is the pass condition).
SELECT u.username, u.balance AS wallet, t.balance_after AS last_ledger_balance
FROM users u
JOIN transactions t ON t.user_id = u.id
JOIN (SELECT user_id, MAX(seq) AS max_seq FROM transactions GROUP BY user_id) m
  ON m.user_id = t.user_id AND m.max_seq = t.seq
WHERE u.balance <> t.balance_after
LIMIT 50;

-- 6. Ledger size and newest entry (post-deploy this must be >= the pre-deploy count; never lower).
SELECT COUNT(*) AS ledger_rows, MAX(seq) AS max_seq, MAX(created_at) AS newest FROM transactions;

-- 7. Accounts created on/after the release and their opening balance (new players must show 0.00
--    unless a staff member explicitly credited them; staff credits appear as 'adjust' ChipTransfer rows).
SELECT u.username, u.role, u.balance, u.created_at
FROM users u
WHERE u.created_at >= NOW() - INTERVAL 1 DAY
ORDER BY u.created_at DESC
LIMIT 50;

-- 8. Any "welcome"/free-chip style ledger rows of exactly 1000.00 (report only; never reverse automatically).
SELECT type, game, note, COUNT(*) AS n, MIN(created_at) AS first_seen, MAX(created_at) AS last_seen
FROM transactions
WHERE amount = 1000.00 AND type = 'adjust'
GROUP BY type, game, note
ORDER BY n DESC
LIMIT 20;
