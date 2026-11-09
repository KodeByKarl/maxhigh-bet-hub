-- Seed the singleton risk_controls row that wallet.server.ts requires (fail-closed when absent).
-- Idempotent: never overwrites values an operator has already configured.
INSERT INTO `risk_controls` (`id`, `max_single_bet`, `max_daily_payout`, `max_weekly_limit`, `auto_flag_large_wins`, `large_win_threshold`)
VALUES ('default', 10000.00, 500000.00, 20000.00, 'yes', 50000.00)
ON DUPLICATE KEY UPDATE `id` = `id`;
