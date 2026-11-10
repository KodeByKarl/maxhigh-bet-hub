-- MaxHigh UAT: create the missing singleton risk_controls row. NOT EXECUTED YET.
-- No limit values live in this file. The operator supplies the APPROVED values as session variables:
--   SET @target_db='maxhigh_staging';
--   SET @max_single_bet=...; SET @max_daily_payout=...; SET @max_weekly_limit=...;
--   SET @auto_flag='yes' or 'no'; SET @large_win_threshold=...;
-- This file ends WITHOUT COMMIT/ROLLBACK. The operator appends exactly one of them on stdin.
-- If neither arrives (client dies, pipe breaks) MariaDB rolls the transaction back.
-- Touches ONLY risk_controls. Never updates an existing row. No DDL, no other table is written.

SET autocommit = 0;
START TRANSACTION;

-- Snapshot of everything that must NOT change.
SELECT COUNT(*) INTO @b_users        FROM users;
SELECT COUNT(*) INTO @b_transactions FROM transactions;
SELECT COUNT(*) INTO @b_audit        FROM audit_logs;
SELECT COALESCE(SUM(balance),0) INTO @b_balance FROM users;
SELECT COUNT(*) INTO @b_risk         FROM risk_controls;

-- Guard: right database, and every approved value present, positive, 2-decimal, within DECIMAL(14,2).
SET @ok = (DATABASE() = @target_db
  AND @max_single_bet      IS NOT NULL AND @max_single_bet      > 0 AND @max_single_bet      <= 999999999999.99 AND @max_single_bet      = ROUND(@max_single_bet, 2)
  AND @max_daily_payout    IS NOT NULL AND @max_daily_payout    > 0 AND @max_daily_payout    <= 999999999999.99 AND @max_daily_payout    = ROUND(@max_daily_payout, 2)
  AND @max_weekly_limit    IS NOT NULL AND @max_weekly_limit    > 0 AND @max_weekly_limit    <= 999999999999.99 AND @max_weekly_limit    = ROUND(@max_weekly_limit, 2)
  AND @large_win_threshold IS NOT NULL AND @large_win_threshold > 0 AND @large_win_threshold <= 999999999999.99 AND @large_win_threshold = ROUND(@large_win_threshold, 2)
  AND @auto_flag IN ('yes','no'));
SELECT DATABASE() AS connected_database, @target_db AS expected_database, COALESCE(@ok,0) AS inputs_valid, @b_risk AS existing_risk_rows;

INSERT INTO risk_controls
  (id, max_single_bet, max_daily_payout, max_weekly_limit, auto_flag_large_wins, large_win_threshold)
SELECT 'default', @max_single_bet, @max_daily_payout, @max_weekly_limit, @auto_flag, @large_win_threshold
FROM DUAL
WHERE COALESCE(@ok,0) = 1
  AND NOT EXISTS (SELECT 1 FROM risk_controls WHERE id = 'default');
SELECT ROW_COUNT() AS rows_inserted_expect_1;

-- Proof nothing else moved, and the row to eyeball against the approved values.
SELECT (SELECT COUNT(*) FROM users)        = @b_users        AS users_unchanged,
       (SELECT COUNT(*) FROM transactions) = @b_transactions AS transactions_unchanged,
       (SELECT COUNT(*) FROM audit_logs)   = @b_audit        AS audit_logs_unchanged,
       (SELECT COALESCE(SUM(balance),0) FROM users) = @b_balance AS total_balance_unchanged,
       (SELECT COUNT(*) FROM risk_controls) AS risk_rows_now;
SELECT * FROM risk_controls;
-- >>> operator now sends COMMIT; or ROLLBACK; on stdin <<<
