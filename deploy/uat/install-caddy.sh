#!/bin/sh
# Run as root, interactively (it prompts for the UAT password via `caddy hash-password`).
# Usage: sudo sh install-caddy.sh <UAT_USERNAME>
# Backs up /etc/caddy/Caddyfile, installs the UAT site, validates, starts Caddy, and restores
# the backup automatically if validation or startup fails. UFW, DNS and the app are untouched.
set -eu
umask 022
USER_NAME=${1:?username required}
D=$(cd "$(dirname "$0")" && pwd)
IP=151.242.136.34
CF=/etc/caddy/Caddyfile
BK=/etc/caddy/Caddyfile.pre-uat.$(date +%Y%m%d%H%M%S)

[ "$(id -u)" = 0 ]
case "$USER_NAME" in *[!A-Za-z0-9_.-]*|'') echo "bad username"; exit 1;; esac
# Let's Encrypt needs DNS to point here first; avoid burning rate limits.
getent hosts uat.maxhigh.online | grep -q "^$IP " || { echo "uat.maxhigh.online does not resolve to $IP yet"; exit 1; }
curl -fsS http://127.0.0.1:18080/api/health >/dev/null || { echo "UAT app not healthy"; exit 1; }

cp -p "$CF" "$BK"
echo "Backup: $BK"
HASH=$(caddy hash-password)
NEW=$(mktemp)
sed -e "s#UAT_USER PASTE_HASH#$USER_NAME $HASH#" "$D/Caddyfile.uat" > "$NEW"
if ! caddy validate --config "$NEW" --adapter caddyfile; then echo "Validation failed; nothing changed"; rm -f "$NEW"; exit 1; fi
install -m 644 -o root -g root "$NEW" "$CF"; rm -f "$NEW"
# Approval gate: the bootstrap drop-in caddy.service.d/60-maxhigh-awaiting-proxy.conf requires this
# marker. The drop-in is left in place; the marker is created only now, after the validated UAT
# Caddyfile is installed, and removed again on any failure.
MARKER=/etc/caddy/MAXHIGH_PROXY_APPROVED
grep -qs 'ConditionPathExists=/etc/caddy/MAXHIGH_PROXY_APPROVED' /etc/systemd/system/caddy.service.d/60-maxhigh-awaiting-proxy.conf || { echo "Expected approval drop-in missing; restoring"; cp -p "$BK" "$CF"; exit 1; }
printf 'Approved for password-protected uat.maxhigh.online UAT only: %s\n' "$(date -u +%FT%TZ)" > "$MARKER"
chmod 644 "$MARKER"
if systemctl enable --now caddy && sleep 6 && systemctl is-active caddy; then
  echo "Caddy active. Rollback: sudo systemctl disable --now caddy && sudo rm -f $MARKER && sudo cp -p $BK $CF"
else
  echo "Caddy failed; restoring backup and removing marker"
  systemctl stop caddy || true; rm -f "$MARKER"; cp -p "$BK" "$CF"; exit 1
fi
