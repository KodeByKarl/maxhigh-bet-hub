#!/bin/sh
# Run as root. Deletes ONLY temporary synthetic test users named tmpc_* (and rows that reference them) from maxhigh_staging.
# Usage: sudo sh cleanup-temp-users.sh tmpc_agent_xxxx tmpc_p1_xxxx ...
set -eu
umask 077
A=/root/maxhigh-staging-admin
[ "$(id -u)" = 0 ]
[ "$#" -ge 1 ]
M="mariadb --defaults-extra-file=$A/migrate-client.cnf"
[ "$($M -N -e 'SELECT DATABASE()')" = maxhigh_staging ]
LIST=""
for u in "$@"; do
  case "$u" in tmpc_[a-z0-9_]*) ;; *) echo "refusing non-temp username"; exit 1;; esac
  case "$u" in *[!a-z0-9_]*) echo "bad username"; exit 1;; esac
  LIST="$LIST${LIST:+,}'$u'"
done
IDS="SELECT id FROM (SELECT id FROM users WHERE username IN ($LIST)) t"
echo "Matched users: $($M -N -e "SELECT COUNT(*) FROM users WHERE username IN ($LIST)")"
SQL="START TRANSACTION; UPDATE users SET upline_id=NULL WHERE upline_id IN ($IDS);"
# Delete rows in every table that references users (ledger rows of these synthetic temp users only).
$M -N -e "SELECT table_name, column_name FROM information_schema.key_column_usage WHERE table_schema='maxhigh_staging' AND referenced_table_name='users' AND NOT (table_name='users')" > /tmp/mh-fk.$$
while read -r T C; do
  SQL="$SQL DELETE FROM \`$T\` WHERE \`$C\` IN ($IDS);"
done < /tmp/mh-fk.$$
rm -f /tmp/mh-fk.$$
SQL="$SQL DELETE FROM users WHERE username IN ($LIST); COMMIT; SELECT username, role, balance FROM users ORDER BY username;"
echo "$SQL" | $M
