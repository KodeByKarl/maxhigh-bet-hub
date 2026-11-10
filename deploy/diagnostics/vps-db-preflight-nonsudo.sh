#!/usr/bin/env bash
# READ-ONLY, NON-SUDO inspection of the MariaDB host configuration. Changes nothing. Masks anything that looks like a secret.
# Run as the ordinary ops user:  ssh <ops-user>@<vps> 'bash -s' < deploy/diagnostics/vps-db-preflight-nonsudo.sh
set -u
mask() { sed -E 's/((pass|pwd|secret|token)[a-z_]*[[:space:]]*=[[:space:]]*).*/\1<masked>/I'; }
echo "== identity"; id; hostname
echo "== server/client versions"; (mariadbd --version 2>&1 || mysqld --version 2>&1) | head -1; mariadb --version 2>&1 | head -1
echo "== service state"; systemctl is-active mariadb 2>&1; systemctl is-enabled mariadb 2>&1
echo "== effective defaults the server would start with (binary log / trigger-relevant / charset)"
(mariadbd --print-defaults 2>&1 || true) | tr ' ' '\n' | grep -iE 'log[-_]bin|binlog|server[-_]id|trust|sql[-_]mode|character|collation|datadir|bind|^--port|skip' | mask | sort -u
echo "== readable config files"
for f in /etc/mysql/my.cnf /etc/mysql/mariadb.cnf /etc/mysql/conf.d/* /etc/mysql/mariadb.conf.d/*; do
  [ -f "$f" ] && [ -r "$f" ] && { echo "--- $f"; grep -vE '^[[:space:]]*(#|;)|^[[:space:]]*$' "$f" | mask; }
done
echo "== binary log files visible to this user (expected: permission denied if data dir is private)"
ls -ld /var/lib/mysql 2>&1; ls /var/lib/mysql 2>&1 | grep -iE 'bin\.|binlog' | head -5
echo "== can this user open the database without credentials? (expected: access denied)"
mariadb -e 'SELECT 1' 2>&1 | head -2
echo "== any user-level client config? (existence only, contents not shown)"
ls -l ~/.my.cnf ~/.mylogin.cnf 2>&1 | head -3
echo "== app/migration working copy (permissions only)"
ls -ld /var/www/maxhigh /var/www/maxhigh/staging 2>&1
echo "== done (read-only)"
