#!/usr/bin/env bash
# Read-only native measurements. Run only on an approved isolated staging host.
set -euo pipefail
umask 077
[[ "$PWD" == /var/www/maxhigh-staging && "$EUID" -ne 0 ]]
[[ "${CONFIRM_ISOLATED_STAGING_LOAD:-}" == maxhigh_staging ]]
export PM2_HOME=/var/www/maxhigh-staging/.pm2
out="evidence/native-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 -p "$out"
pid=$(pm2 pid maxhigh-app)
[[ "$pid" =~ ^[1-9][0-9]*$ ]]
[[ "$(readlink -f "/proc/$pid/cwd")" == /var/www/maxhigh-staging ]]
command -v pidstat >/dev/null
command -v iostat >/dev/null
vmstat -w 1 61 > "$out/vmstat.txt" & p1=$!
pidstat -r -u -d -p "$pid" 1 60 > "$out/pidstat.txt" & p2=$!
iostat -x -z 1 60 > "$out/iostat.txt" & p3=$!
trap 'kill "$p1" "$p2" "$p3" 2>/dev/null || true' EXIT
wait "$p1" "$p2" "$p3"
trap - EXIT
printf 'Private native measurements: %s\n' "$out"
