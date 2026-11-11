#!/bin/sh
# Run as root. Applies migrations 0004+0005 via the local root socket, then switches UAT (maxhigh-uat only) to the new release.
# Automatic rollback of the APPLICATION to 2294d79 if the new release is not healthy. Database changes are additive and are kept.
set -eu
umask 077
[ "$(id -u)" = 0 ]
NEW=8066092cc16ee8f990cdbf6d5bced89cd186fb5b
OLD=e89359f0ea26ea71bea4522a2c8eced7911d8fc3
R=/var/www/maxhigh/staging
K=/root/maxhigh-vps-controls
MIG=835675f7c84d90f359d43db37b66d678e99a3ea0af05d460bb1206f5e6367338
install -m 700 -o root -g root /home/maxhigh-ops/migrate-uat-root.sh "$K/uat/migrate-uat-root.sh"
echo "$MIG  $K/uat/migrate-uat-root.sh" | sha256sum --check --strict
q() { mariadb -N -e "$1"; }
base() { q "SELECT 'users',COUNT(*),'tx',(SELECT COUNT(*) FROM maxhigh_staging.transactions),'audit',(SELECT COUNT(*) FROM maxhigh_staging.audit_logs),'balance',(SELECT SUM(balance) FROM maxhigh_staging.users) FROM maxhigh_staging.users"; }

[ -d "$R/releases/$NEW/.output" ] && [ -d "$R/releases/$OLD/.output" ]
curl -fsS http://127.0.0.1:18080/api/health | grep -q "$OLD"
echo "== baseline before"; base | tee /root/maxhigh-evidence/pre-0006-baseline.txt
test -s /root/maxhigh-evidence/R2.pass
cp -p "$R/uat-run.mjs" "$R/uat-run.rollback-$OLD.mjs"
echo "== apply migrations (root socket)"
sh "$K/uat/migrate-uat-root.sh" "$NEW" apply
echo "== baseline after migration"; base
echo "== write-path probe with triggers active (rolled back)"
q "START TRANSACTION; UPDATE maxhigh_staging.users SET balance=balance WHERE id=(SELECT MIN(id) FROM maxhigh_staging.users); ROLLBACK; SELECT 'trigger-write-ok'"
echo "== switch UAT to $NEW"
sed "s/$OLD/$NEW/" "$R/uat-run.mjs" > "$R/uat-run.mjs.new"
grep -q "$NEW" "$R/uat-run.mjs.new"
diff "$K/uat/uat-run.mjs" "$R/uat-run.mjs.new" > /dev/null && echo "uat-run.mjs identical to reviewed kit file" || echo "NOTE: uat-run.mjs differs from kit file (host-specific)"
chown root:root "$R/uat-run.mjs.new"; chmod 644 "$R/uat-run.mjs.new"
mv "$R/uat-run.mjs.new" "$R/uat-run.mjs"
systemctl restart maxhigh-uat
ok=0
for i in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:18080/api/health 2>/dev/null | grep -q "$NEW"; then ok=1; break; fi
  sleep 2
done
if [ "$ok" != 1 ]; then
  echo "NEW RELEASE NOT HEALTHY - rolling the application back to $OLD"
  cp -p "$R/uat-run.rollback-$OLD.mjs" "$R/uat-run.mjs"
  systemctl restart maxhigh-uat
  sleep 8; curl -fsS http://127.0.0.1:18080/api/health || true; echo
  exit 1
fi
curl -fsS http://127.0.0.1:18080/api/health; echo
systemctl is-active maxhigh-uat
echo "== baseline after activation"; base
echo "== recent service log"; journalctl -u maxhigh-uat -n 15 --no-pager 2>&1 | cut -c1-200
echo "RESULT: APPLY+ACTIVATE PASS"
