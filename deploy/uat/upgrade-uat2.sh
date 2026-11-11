#!/bin/sh
# Run as root on the VPS:  sudo sh ~/maxhigh-release-<sha7>/upgrade-uat2.sh <FULL_SHA> <ARCHIVE_SHA256> <MANIFEST_SHA256>
# (the script sits next to release.tgz, SHA256SUMS, safe-extract.py in that directory)
# Upgrades ONLY the UAT backend maxhigh-uat2 (127.0.0.1:18082, serves uat.maxhigh.online) from its current release to <FULL_SHA>.
# Does not touch Caddy, the apex app (maxhigh-uat, 18080), the database schema, .env.uat, accounts or locks. No migrations.
# 1) verified DB backup (+ restore test into a scratch schema it creates and drops)  2) config backup
# 3) extract immutable release  4) switch uat2 to the new release  5) health check, automatic revert on failure.
# Manual rollback: sudo sh ~/maxhigh-release-<sha7>/rollback-uat2.sh
set -eu
umask 077
[ "$(id -u)" = 0 ]
SHA=${1:?full 40-char release sha}
ARCH=${2:?release.tgz sha256}
MAN=${3:?manifest sha256}
printf '%s' "$SHA" | grep -Eq '^[0-9a-f]{40}$'
D=$(cd "$(dirname "$0")" && pwd)
R=/var/www/maxhigh/staging
BK=/root/maxhigh-uat-predeploy-$(printf %.7s "$SHA")-$(date +%Y%m%d-%H%M%S)
DBN=maxhigh_staging
SCR=maxhigh_predeploy_check_$$

echo "== 0. preflight"
(cd "$D" && sha256sum --check SHA256SUMS)
[ -f "$R/.env.uat" ] && [ -f "$R/uat2-run.mjs" ] && [ -f "$R/pm2-uat2.config.cjs" ] && [ -f /etc/systemd/system/maxhigh-uat2.service ]
PREV=$(curl -fsS http://127.0.0.1:18082/api/health | sed -n 's/.*"release":"\([0-9a-f]*\)".*/\1/p')
echo "current uat2 release: $PREV"
[ -n "$PREV" ]
[ "$PREV" != "$SHA" ] || { echo "already on $SHA"; exit 0; }
[ -d "$R/releases/$PREV/.output" ]
curl -fsS http://127.0.0.1:18080/api/health; echo

echo "== 1. backups -> $BK"
mkdir -p "$BK"; chmod 700 "$BK"
cp -a "$R/uat2-run.mjs" "$R/pm2-uat2.config.cjs" /etc/caddy/Caddyfile /etc/systemd/system/maxhigh-uat2.service "$BK/"
echo "$PREV" > "$BK/previous-release.txt"
mariadb -N -e "SELECT 'users',COUNT(*) FROM $DBN.users UNION ALL SELECT 'transactions',COUNT(*) FROM $DBN.transactions UNION ALL SELECT 'audit',COUNT(*) FROM $DBN.audit_log UNION ALL SELECT 'balance',ROUND(SUM(balance),2) FROM $DBN.users" > "$BK/counts-before.txt" 2>"$BK/counts-err.txt" || {
  # fall back to a generic row-count listing if a table/column name differs
  mariadb -N -e "SELECT table_name,table_rows FROM information_schema.tables WHERE table_schema='$DBN' ORDER BY 1" > "$BK/counts-before.txt"; }
cat "$BK/counts-before.txt"
mariadb-dump --single-transaction --triggers --routines --events "$DBN" | gzip -9 > "$BK/$DBN.sql.gz"
gzip -t "$BK/$DBN.sql.gz"
( cd "$BK" && sha256sum "$DBN.sql.gz" > "$DBN.sql.gz.sha256" && cat "$DBN.sql.gz.sha256" )
T=$(zcat "$BK/$DBN.sql.gz" | grep -c '^CREATE TABLE'); I=$(zcat "$BK/$DBN.sql.gz" | grep -c '^INSERT INTO')
LIVE=$(mariadb -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DBN' AND table_type='BASE TABLE'")
echo "dump tables=$T inserts=$I live_tables=$LIVE"
[ "$T" = "$LIVE" ] && [ "$I" -gt 0 ]
echo "-- restore test into scratch schema $SCR (created and dropped by this script)"
[ -z "$(mariadb -N -e "SHOW DATABASES LIKE '$SCR'")" ]
mariadb -e "CREATE DATABASE \`$SCR\`"
zcat "$BK/$DBN.sql.gz" | mariadb "$SCR"
RT=$(mariadb -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$SCR' AND table_type='BASE TABLE'")
RU=$(mariadb -N -e "SELECT COUNT(*) FROM \`$SCR\`.users"); LU=$(mariadb -N -e "SELECT COUNT(*) FROM $DBN.users")
RX=$(mariadb -N -e "SELECT COUNT(*) FROM \`$SCR\`.transactions"); LX=$(mariadb -N -e "SELECT COUNT(*) FROM $DBN.transactions")
mariadb -e "DROP DATABASE \`$SCR\`"
echo "restore test: tables $RT/$LIVE  users $RU/$LU  transactions $RX/$LX"
[ "$RT" = "$LIVE" ] && [ "$RU" = "$LU" ] && [ "$RX" = "$LX" ]
echo "DB backup verified and restorable: $BK/$DBN.sql.gz"

echo "== 2. extract release (immutable, safe extractor)"
if [ ! -d "$R/releases/$SHA/.output" ]; then
  CONFIRM_STAGING_EXTRACT=maxhigh-staging-files-only python3 "$D/safe-extract.py" --archive "$D/release.tgz" --sha256 "$ARCH" --manifest-sha256 "$MAN" --destination "$R/releases"
fi
T="$R/releases/$SHA"
[ -d "$T/.output/server" ]
chgrp -R maxhigh-stage-preview "$T"
find "$T" -type d -exec chmod 0750 {} +
find "$T" -type f -exec chmod 0640 {} +
sudo -u maxhigh-stage-preview test -r "$T/release-validation.json"
sudo -u maxhigh-stage-preview test -r "$T/.output/server/index.mjs"
echo "service user can read $SHA"

echo "== 3. switch maxhigh-uat2 to $SHA"
sed -e "s/^const sha = .*/const sha = '$SHA';/" "$BK/uat2-run.mjs" > "$R/uat2-run.mjs.new"
grep -q "$SHA" "$R/uat2-run.mjs.new"; grep -q 18082 "$R/uat2-run.mjs.new"
chown root:root "$R/uat2-run.mjs.new"; chmod 644 "$R/uat2-run.mjs.new"
mv "$R/uat2-run.mjs.new" "$R/uat2-run.mjs"
systemctl restart maxhigh-uat2
OK=0
for i in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:18082/api/health | grep -q "$SHA"; then OK=1; break; fi; sleep 2
done
if [ "$OK" != 1 ]; then
  echo "new release did not become healthy; reverting to $PREV"
  journalctl -u maxhigh-uat2 -n 30 --no-pager || true
  cp -a "$BK/uat2-run.mjs" "$R/uat2-run.mjs"; systemctl restart maxhigh-uat2
  for i in $(seq 1 45); do curl -fsS http://127.0.0.1:18082/api/health | grep -q "$PREV" && break; sleep 2; done
  curl -fsS http://127.0.0.1:18082/api/health; echo; exit 1
fi
curl -fsS http://127.0.0.1:18082/api/health; echo

echo "== 4. external checks"
U=$(curl -s -o /dev/null -w '%{http_code}' https://uat.maxhigh.online/)
A=$(curl -s -o /dev/null -w '%{http_code}' https://maxhigh.online/)
echo "uat=$U (401 expected, basic auth)  apex=$A (200 expected)"
mariadb -N -e "SELECT COUNT(*) FROM $DBN.users" | sed 's/^/users after: /'
if [ "$U" = 401 ] && [ "$A" = 200 ]; then echo "DONE: uat.maxhigh.online served by $SHA. Rollback: sudo sh $D/rollback-uat2.sh"; exit 0; fi
echo "external checks unexpected; reverting"
cp -a "$BK/uat2-run.mjs" "$R/uat2-run.mjs"; systemctl restart maxhigh-uat2; exit 1
