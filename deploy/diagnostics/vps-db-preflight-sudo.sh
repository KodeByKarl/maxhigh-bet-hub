#!/usr/bin/env bash
# READ-ONLY database preflight for migration 0005. Run by the OWNER (needs sudo for the root socket login). Changes NOTHING:
# only SELECT / SHOW statements, inside a READ ONLY transaction where applicable. No passwords are printed.
#   sudo bash vps-db-preflight-sudo.sh 2>&1 | tee ~/db-preflight-$(date -u +%Y%m%dT%H%M%SZ).txt
# Then give the saved file to the developer; `node scripts/qa/compare-ledger.mjs <file>` checks it against the release checksums.
set -u
DB="${DB:-maxhigh_staging}"
SQL() { mariadb --batch --raw -N "$@"; }
echo "== host/time"; hostname; date -u +%FT%TZ
echo "== VERSION"; SQL -e "SELECT VERSION();"
echo "== VARIABLES (binary logging and trigger creation rules)"
SQL -e "SHOW VARIABLES WHERE Variable_name IN ('log_bin','log_bin_trust_function_creators','binlog_format','sql_mode','character_set_server','collation_server','read_only','event_scheduler','lower_case_table_names','innodb_lock_wait_timeout','transaction_isolation');"
echo "== BINARY LOG STATUS"; SQL -e "SHOW BINARY LOGS;" 2>&1 | head -5
echo "== DATABASE USERS (names only)"; SQL -e "SELECT user, host FROM mysql.user WHERE user NOT IN ('mariadb.sys','root') ORDER BY user;"
echo "== GRANTS (no passwords are shown by SHOW GRANTS; hashes are masked below)"
for u in $(SQL -e "SELECT CONCAT(QUOTE(user),'@',QUOTE(host)) FROM mysql.user WHERE user NOT IN ('mariadb.sys');"); do
  echo "--- $u"; SQL -e "SHOW GRANTS FOR $u;" 2>&1 | sed -E "s/IDENTIFIED BY (PASSWORD )?'[^']*'/IDENTIFIED BY <masked>/g"
done
echo "== EXISTING TRIGGERS in $DB"; SQL -e "SHOW TRIGGERS FROM \`$DB\`;" | cut -f1,2,3,6,9 2>/dev/null
echo "== MIGRATION LEDGER (version <TAB> checksum <TAB> applied_at)"; SQL -e "SELECT version, checksum, applied_at FROM \`$DB\`._maxhigh_migrations ORDER BY version;"
echo "== SCHEMA STATE for 0005 (all three must be EMPTY before migrating)"
SQL -e "SHOW COLUMNS FROM \`$DB\`.users LIKE 'account_class';"
SQL -e "SHOW TABLES FROM \`$DB\` LIKE 'account_limits';"
SQL -e "SHOW TABLES FROM \`$DB\` LIKE 'entitlement_grants';"
echo "== ROW COUNTS (for the before/after comparison)"
SQL -e "SELECT 'users', COUNT(*) FROM \`$DB\`.users UNION ALL SELECT 'transactions', COUNT(*) FROM \`$DB\`.transactions UNION ALL SELECT 'audit_logs', COUNT(*) FROM \`$DB\`.audit_logs UNION ALL SELECT 'risk_controls', COUNT(*) FROM \`$DB\`.risk_controls;"
echo "== ROLES / ACCOUNTS PRESENT"; SQL -e "SELECT username, role FROM \`$DB\`.users ORDER BY username;"
echo "== done (read-only)"
