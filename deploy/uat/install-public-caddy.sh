#!/bin/sh
# Run as root. Appends the public maxhigh.online block to the live Caddyfile; uat block and Basic Auth untouched.
# Backs up first, validates, reloads, and restores the backup on any failure. Usage: sudo sh install-public-caddy.sh
set -eu
umask 022
D=$(cd "$(dirname "$0")" && pwd)
CF=/etc/caddy/Caddyfile
BK=/etc/caddy/Caddyfile.pre-public.$(date +%Y%m%d%H%M%S)
IP=151.242.136.34
[ "$(id -u)" = 0 ]
for h in maxhigh.online www.maxhigh.online; do
  getent hosts "$h" | grep -q "^$IP " || { echo "$h does not resolve to $IP"; exit 1; }
done
grep -q '^uat.maxhigh.online' "$CF" || { echo "Expected UAT block missing"; exit 1; }
! grep -q '^maxhigh.online' "$CF" || { echo "Public block already installed"; exit 1; }
curl -fsS http://127.0.0.1:18080/api/health >/dev/null
install -d -o caddy -g caddy /var/log/caddy
cp -p "$CF" "$BK"; echo "Backup: $BK"
NEW=$(mktemp); cat "$CF" "$D/Caddyfile.public-block" > "$NEW"
caddy validate --config "$NEW" --adapter caddyfile || { rm -f "$NEW"; echo "Validation failed; nothing changed"; exit 1; }
install -m 644 -o root -g root "$NEW" "$CF"; rm -f "$NEW"
if systemctl reload caddy && sleep 8 && systemctl is-active caddy; then
  echo "Public block active. Rollback: sudo cp -p $BK $CF && sudo systemctl reload caddy"
else
  echo "Reload failed; restoring"; cp -p "$BK" "$CF"; systemctl reload caddy || systemctl restart caddy; exit 1
fi
