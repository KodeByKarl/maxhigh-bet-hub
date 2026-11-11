#!/bin/sh
# Run as root: returns maxhigh-uat2 (uat.maxhigh.online) to the release it ran before the newest upgrade-uat2.sh run.
# Uses the newest /root/maxhigh-uat-predeploy-* backup. Does not touch the database, Caddy or the apex app.
set -eu
[ "$(id -u)" = 0 ]
B=$(ls -1dt /root/maxhigh-uat-predeploy-* | head -1)
PREV=$(cat "$B/previous-release.txt")
cp -a "$B/uat2-run.mjs" /var/www/maxhigh/staging/uat2-run.mjs
systemctl restart maxhigh-uat2
for i in $(seq 1 45); do curl -fsS http://127.0.0.1:18082/api/health | grep -q "$PREV" && break; sleep 2; done
curl -fsS http://127.0.0.1:18082/api/health; echo
echo "rolled back to $PREV from $B (database untouched; ledger rows are append-only and are not reversed)"
echo "DB dump for emergencies only: $B/maxhigh_staging.sql.gz (restore only with explicit approval)"
