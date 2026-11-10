#!/bin/bash
# Run with bash (uses /dev/tcp). Non-root. Controlled REAL-event test: sends 12 genuine (wrong-password, NON-EXISTENT user) application login
# requests to https://maxhigh.online from THIS server, whose source address is its own public IP (151.242.136.34).
# No real account is touched. If the jail works, this server's own address gets banned on ports 80/443 only;
# the script then proves 443 is blocked while SSH (22) stays reachable. Unban afterwards (root):
#   sudo fail2ban-client set maxhigh-login unbanip 151.242.136.34
set -u
IP=151.242.136.34
URL=https://maxhigh.online/_serverFn/8de11115f166dd1457b39f592d453f713127b9c8e4da1d14fc5e2113b9d996e8
BODY='{"t":{"t":10,"i":0,"p":{"k":["data"],"v":[{"t":10,"i":1,"p":{"k":["username","password"],"v":[{"t":1,"s":"uat_nouser"},{"t":1,"s":"f2b-controlled-test"}]},"o":0}]},"o":0},"f":127,"m":[]}'
echo "== before: 443 reachable? $(curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://maxhigh.online/)"
i=1
while [ $i -le 12 ]; do
  K=$(cat /proc/sys/kernel/random/uuid)
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 -X POST "$URL" -H 'content-type: application/json' -H 'x-tsr-serverfn: true' \
      -H "idempotency-key: $K" -H 'origin: https://maxhigh.online' -H 'sec-fetch-site: same-origin' --data-binary "$BODY")
  printf 'attempt %s -> HTTP %s\n' "$i" "$C"
  i=$((i+1)); sleep 1
done
echo "waiting 10s for the jail..."; sleep 10
echo "== after: 443 from this server (expect timeout/000 if banned): $(curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://maxhigh.online/)"
if timeout 6 bash -c "echo > /dev/tcp/$IP/22" 2>/dev/null; then echo "== SSH port 22 from banned source: REACHABLE (good)"; else echo "== SSH port 22: UNREACHABLE (bad: ban is not web-only)"; fi
