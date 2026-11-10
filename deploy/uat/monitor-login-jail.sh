#!/bin/bash
# Read-only monitor for the public login jail. Non-root by default; "root" adds fail2ban status.
# Usage: bash monitor-login-jail.sh [root]
L=/var/log/caddy/maxhigh-public-access.log
LOGIN=8de11115f166dd1457b39f592d453f713127b9c8e4da1d14fc5e2113b9d996e8
echo "== services"; for s in caddy fail2ban maxhigh-uat; do printf '%s: %s\n' "$s" "$(systemctl is-active $s)"; done
echo "== login POSTs per source IP (whole log)"
grep "$LOGIN" "$L" | grep -o '"remote_ip":"[0-9a-f.:]*"' | sort | uniq -c | sort -rn | head -10
echo "== status code mix"; grep -o '"status":[0-9]*' "$L" | sort | uniq -c | sort -rn | head -8
echo "== 5xx count: $(grep -c '"status":5' "$L")"
echo "== last 10 minutes: login POSTs by IP"
NOW=$(date +%s)
grep "$LOGIN" "$L" | awk -v now="$NOW" -F'"ts":' '{split($2,a,","); if (now-a[1] <= 600) print $0}' | grep -o '"remote_ip":"[0-9a-f.:]*"' | sort | uniq -c | sort -rn | head
if [ "${1:-}" = root ] && [ "$(id -u)" = 0 ]; then
  echo "== jail"; fail2ban-client status maxhigh-login; echo "== sshd jail"; fail2ban-client status sshd | head -6
  echo "ignoreself: $(fail2ban-client get maxhigh-login ignoreself)"
fi
