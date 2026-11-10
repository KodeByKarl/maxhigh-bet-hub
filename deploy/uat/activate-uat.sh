#!/bin/sh
# Run as root. Starts the writable UAT runtime on 127.0.0.1:18080 with synthetic data.
# Never drops data, never touches Caddy/UFW/DNS. Usage: sudo sh activate-uat.sh <dir containing uat-seed.sql>
set -eu
umask 077
R=/var/www/maxhigh/staging
A=/root/maxhigh-staging-admin
SHA=8066092cc16ee8f990cdbf6d5bced89cd186fb5b
D=$(cd "$(dirname "$0")" && pwd)
SEED=${1:?seed directory required}/uat-seed.sql

[ "$(id -u)" = 0 ]
[ -f "$SEED" ]
[ -d "$R/releases/$SHA/.output" ]
grep -q '"migrationApplied": true' /var/lib/maxhigh-bootstrap/staging-qualification.json
grep -q '"schemaVerified": true' /var/lib/maxhigh-bootstrap/staging-qualification.json

# 1. Staging-only writable DB identity: DML on maxhigh_staging.* only (no DDL, no other schema).
if [ ! -f "$R/.env.uat" ]; then
  P=$(openssl rand -hex 32)
  mariadb -e "CREATE USER IF NOT EXISTS 'maxhigh_uat_app'@'127.0.0.1' IDENTIFIED BY '$P'; GRANT SELECT,INSERT,UPDATE,DELETE ON \`maxhigh_staging\`.* TO 'maxhigh_uat_app'@'127.0.0.1'; ALTER USER 'maxhigh_uat_app'@'127.0.0.1' WITH MAX_USER_CONNECTIONS 10;"
  printf 'MYSQL_HOST=127.0.0.1\nMYSQL_PORT=3306\nMYSQL_DATABASE=maxhigh_staging\nMYSQL_USER=maxhigh_uat_app\nMYSQL_PASSWORD=%s\n' "$P" > "$R/.env.uat"
  chown root:maxhigh-stage-preview "$R/.env.uat"
  chmod 640 "$R/.env.uat"
fi

# 2. Synthetic accounts, only into an empty users table.
if [ "$(mariadb --defaults-extra-file=$A/migrate-client.cnf -N -e 'SELECT COUNT(*) FROM users')" = 0 ]; then
  mariadb --defaults-extra-file=$A/migrate-client.cnf < "$SEED"
fi

# 3. Root-owned runtime files and a systemd unit derived from the reviewed preview unit.
install -m 644 -o root -g root "$D/uat-run.mjs" "$D/pm2-uat.config.cjs" "$R/"
sed -e 's/read-only staging preview/UAT (synthetic data)/' \
    -e "s#releases/$SHA/.output/staging/pm2.config.cjs --only maxhigh-staging-preview#pm2-uat.config.cjs --only maxhigh-uat#" \
    -e 's#^Restart=no#Restart=on-failure\nRestartSec=10#' \
    "$D/vps-setup/templates/maxhigh-staging-preview.service" > /etc/systemd/system/maxhigh-uat.service
systemctl daemon-reload
systemctl start maxhigh-uat
for i in $(seq 1 40); do curl -fsS http://127.0.0.1:18080/api/health && break; sleep 2; done
echo
systemctl is-active maxhigh-uat
