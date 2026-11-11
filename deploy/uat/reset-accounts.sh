#!/bin/sh
# Run as root. Reduces staging users to uat_owner + uat_player. Staging schema only; guarded.
# Usage: sudo sh reset-accounts.sh <sql-file>
set -eu
umask 077
A=/root/maxhigh-staging-admin
SQL=${1:?sql file required}
[ "$(id -u)" = 0 ]
M="mariadb --defaults-extra-file=$A/migrate-client.cnf"
[ "$($M -N -e 'SELECT DATABASE()')" = maxhigh_staging ]
# Refuse if any account exists outside the synthetic seed set.
[ "$($M -N -e "SELECT COUNT(*) FROM users WHERE username NOT IN ('uat_superadmin','uat_admin','uat_master','uat_agent','uat_player1','uat_player2','uat_player3','uat_player4','uat_player5')")" = 0 ]
echo "Transactions touching these users: $($M -N -e 'SELECT COUNT(*) FROM transactions')"
$M < "$SQL"
