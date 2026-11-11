-- MaxHigh READ-ONLY production diagnostics. Run with a SELECT-only account.
-- Every statement is SELECT/SHOW. Nothing here creates, changes or deletes data.
-- Usage (on the VPS):  mariadb --defaults-extra-file=<private cnf> <database> < readonly-db-diagnostics.sql
SET SESSION TRANSACTION READ ONLY;

SELECT '01 identity' AS section, CURRENT_USER() AS db_user, DATABASE() AS db_name, VERSION() AS server_version, @@global.time_zone AS tz;

SELECT '01b schema/column character sets (must be utf8mb4 - latin1 cannot store the peso sign and breaks wagers)' AS section;
SELECT DEFAULT_CHARACTER_SET_NAME AS schema_charset, DEFAULT_COLLATION_NAME AS schema_collation FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = DATABASE();
SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND CHARACTER_SET_NAME IS NOT NULL AND CHARACTER_SET_NAME <> 'utf8mb4' LIMIT 50;

SELECT '02 risk_controls row (the spin blocker)' AS section;
SELECT COUNT(*) AS default_rows FROM risk_controls WHERE id = 'default';
SELECT * FROM risk_controls;                       -- every row - shows configured values if present
SELECT '02b risk-limit scale guard (UAT-scale values must never be present in a real-money database)' AS section,
       CASE WHEN COUNT(*) = 0 THEN 'row missing (spins fail closed)'
            WHEN MAX(max_single_bet) >= 100000 OR MAX(max_daily_payout) >= 10000000 OR MAX(max_weekly_limit) >= 100000000
              THEN 'UAT-SCALE VALUES PRESENT - NOT SAFE FOR REAL MONEY'
            ELSE 'below UAT scale' END AS verdict
FROM risk_controls;

SELECT '03 migration ledger present?' AS section,
       (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_maxhigh_migrations') AS ledger_table_exists;
-- If the line above is 0, skip the next statement (it errors harmlessly: table missing).
SELECT version, checksum, applied_at FROM _maxhigh_migrations ORDER BY version;

SELECT '04 which migration objects already exist' AS section;
SELECT 'financial_operations table'  AS object, COUNT(*) AS present FROM INFORMATION_SCHEMA.TABLES  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='financial_operations'
UNION ALL SELECT 'fishing_rooms table',        COUNT(*) FROM INFORMATION_SCHEMA.TABLES  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fishing_rooms'
UNION ALL SELECT 'reward_entitlements table',  COUNT(*) FROM INFORMATION_SCHEMA.TABLES  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reward_entitlements'
UNION ALL SELECT 'transactions.seq',           COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='transactions' AND COLUMN_NAME='seq'
UNION ALL SELECT 'play_sessions.base_credited',COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='play_sessions' AND COLUMN_NAME='base_credited'
UNION ALL SELECT 'play_sessions.open_game_key',COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='play_sessions' AND COLUMN_NAME='open_game_key'
UNION ALL SELECT 'provably_fair_seeds.active_user_key',COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='provably_fair_seeds' AND COLUMN_NAME='active_user_key'
UNION ALL SELECT 'users_balance_nonnegative CHECK (CHECK_CONSTRAINTS)',COUNT(*) FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='users_balance_nonnegative'
UNION ALL SELECT 'users_upline_not_self CHECK (CHECK_CONSTRAINTS)',COUNT(*) FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='users_upline_not_self';
-- NOTE: on MariaDB 10.11 a SELECT-only account sees NO rows in TABLE_CONSTRAINTS / REFERENTIAL_CONSTRAINTS (any extra
-- privilege such as SHOW VIEW makes them visible). CHECK_CONSTRAINTS, STATISTICS and COLUMNS are visible to SELECT-only accounts.
SELECT '04b constraint-metadata visibility (0 constraints with >0 indexes = this account is BLIND to constraints)' AS section,
       (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()) AS visible_table_constraints,
       (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE()) AS visible_index_columns;
SELECT TABLE_NAME, CONSTRAINT_NAME, CHECK_CLAUSE FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE();

SELECT '05 foreign key delete rules via SHOW CREATE TABLE (visible to SELECT-only accounts - look for ON DELETE RESTRICT / CHECK lines)' AS section;
SHOW CREATE TABLE transactions;
SHOW CREATE TABLE users;
SHOW CREATE TABLE financial_operations;
SHOW CREATE TABLE reward_entitlements;

SELECT '06 preflight: 0001 orphan transactions (must be 0)' AS section;
SELECT COUNT(*) AS orphan_transactions FROM transactions t LEFT JOIN users u ON u.id=t.user_id WHERE u.id IS NULL;

SELECT '07 preflight: legacy checks run by migrate.mjs (must be 0)' AS section;
SELECT COUNT(*) AS negative_balances FROM users WHERE balance < 0;
SELECT COUNT(*) AS orphan_uplines FROM users c LEFT JOIN users p ON p.id=c.upline_id WHERE c.upline_id IS NOT NULL AND p.id IS NULL;
SELECT COUNT(*) AS self_uplines FROM users WHERE upline_id = id;

SELECT '08 preflight: 0003 duplicate open play sessions (must be 0)' AS section;
SELECT COUNT(*) AS duplicate_open_pairs FROM (SELECT 1 FROM play_sessions WHERE status='open' GROUP BY user_id, game_id HAVING COUNT(*)>1) d;
SELECT user_id, game_id, COUNT(*) AS open_sessions FROM play_sessions WHERE status='open' GROUP BY user_id, game_id HAVING COUNT(*)>1 LIMIT 50;

SELECT '09 preflight: 0003 duplicate active seeds (must be 0)' AS section;
SELECT COUNT(*) AS duplicate_active_seed_users FROM (SELECT 1 FROM provably_fair_seeds WHERE status='active' GROUP BY user_id HAVING COUNT(*)>1) d;

SELECT '10 free-spin legacy sessions the runner refuses to upgrade (must be 0 when base_credited absent)' AS section;
SELECT COUNT(*) AS open_sessions_with_free_spins FROM play_sessions WHERE status='open' AND free_spins_left > 0;

SELECT '11 context counts (no row data)' AS section;
SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM transactions) AS transactions,
       (SELECT COUNT(*) FROM audit_logs) AS audit_logs, (SELECT COUNT(*) FROM wallet_requests WHERE status='pending') AS pending_withdraw_requests,
       (SELECT COALESCE(SUM(balance),0) FROM users) AS total_balance;
SELECT '12 platform_settings default row' AS section, COUNT(*) AS default_rows FROM platform_settings WHERE id='default';
