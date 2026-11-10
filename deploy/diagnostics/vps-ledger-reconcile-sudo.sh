#!/usr/bin/env bash
# READ-ONLY wallet/ledger reconciliation of the UAT database. SELECT only. Run by the OWNER (sudo):
#   sudo bash ~/vps-ledger-reconcile-sudo.sh 2>&1 | tee ~/ledger-reconcile-$(date -u +%Y%m%dT%H%M%SZ).txt
set -u
DB="${DB:-maxhigh_staging}"
SQL() { mariadb --batch --raw "$@"; }
echo "== time"; date -u +%FT%TZ
echo "== totals"; SQL -N -e "SELECT 'users', COUNT(*), SUM(balance) FROM \`$DB\`.users UNION ALL SELECT 'transactions', COUNT(*), SUM(amount) FROM \`$DB\`.transactions UNION ALL SELECT 'audit_logs', COUNT(*), 0 FROM \`$DB\`.audit_logs;"
echo "== per user: balance, ledger sum, implied opening balance (balance - ledger sum), row count"
SQL -e "SELECT u.username, u.role, u.balance, COALESCE(SUM(t.amount),0) AS ledger_sum, ROUND(u.balance-COALESCE(SUM(t.amount),0),2) AS implied_opening, COUNT(t.id) AS rows_n FROM \`$DB\`.users u LEFT JOIN \`$DB\`.transactions t ON t.user_id=u.id GROUP BY u.id ORDER BY u.username;"
echo "== balance_after chain breaks per user (must be 0)"
SQL -N -e "SELECT COUNT(*) FROM (SELECT user_id, amount, balance_after, LAG(balance_after) OVER (PARTITION BY user_id ORDER BY seq) prev FROM \`$DB\`.transactions) x WHERE prev IS NOT NULL AND ROUND(prev+amount-balance_after,2)<>0;"
echo "== negative balances (must be 0)"; SQL -N -e "SELECT COUNT(*) FROM \`$DB\`.users WHERE balance<0;"
echo "== orphan transactions (no user) (must be 0)"; SQL -N -e "SELECT COUNT(*) FROM \`$DB\`.transactions t LEFT JOIN \`$DB\`.users u ON u.id=t.user_id WHERE u.id IS NULL;"
echo "== transaction types"; SQL -e "SELECT type, COUNT(*) n, ROUND(SUM(amount),2) total FROM \`$DB\`.transactions GROUP BY type ORDER BY type;"
echo "== open play sessions (fishing rooms stay open by design; free-spin/feature sessions should be 0 left)"; SQL -e "SELECT game_id, COUNT(*) n, SUM(free_spins_left) fs_left FROM \`$DB\`.play_sessions WHERE status='open' GROUP BY game_id ORDER BY game_id;"
echo "== large-win audit flags"; SQL -N -e "SELECT COUNT(*) FROM \`$DB\`.audit_logs WHERE action LIKE 'risk.%';"
echo "== 0005 objects (expected absent on the deployed 2294d79)"; SQL -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB' AND TABLE_NAME='users' AND COLUMN_NAME='account_class';"
echo "== done (read-only)"
