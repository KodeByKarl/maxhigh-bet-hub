#!/bin/sh
# Run as root. Controlled proof that the login jail detects and blocks, using reserved TEST-NET-3 IPs
# (203.0.113.0/24, documentation range, belongs to no real client). Also makes bans web-ports-only and
# whitelists your admin IP so a ban can never cut your SSH.
# Usage: sudo sh test-ratelimit.sh <YOUR_SSH_CLIENT_IP>
set -eu
ADMIN_IP=${1:?your SSH client IP, never banned}
case "$ADMIN_IP" in *[!0-9.]*|'') echo "bad IP"; exit 1;; esac
J=/etc/fail2ban/jail.d/maxhigh-login.local
LOG=/var/log/caddy/maxhigh-public-access.log
LOGIN=8de11115f166dd1457b39f592d453f713127b9c8e4da1d14fc5e2113b9d996e8
T1=203.0.113.77
T2=203.0.113.88
[ "$(id -u)" = 0 ] && [ -f "$J" ] && [ -f "$LOG" ]

echo "== 1. Bans limited to web ports (80/443); admin IP whitelisted"
cp -p "$J" "$J.bak.$(date +%s)"
sed -i 's/^banaction.*/banaction = iptables-multiport/' "$J"
sed -i "s#^ignoreip.*#ignoreip = 127.0.0.1/8 ::1 $ADMIN_IP#" "$J"
fail2ban-client reload
sleep 3
fail2ban-client get maxhigh-login ignoreip

echo "== 2. Enforcement: manual ban of test IP $T1 must create a web-ports-only rule, not a UFW/SSH rule"
fail2ban-client set maxhigh-login banip "$T1"
sleep 1
iptables -S | grep -E "$T1|f2b-maxhigh-login" || true
echo "UFW rules mentioning test IP (expected 0): $(ufw status | grep -c "$T1" || true)"
fail2ban-client set maxhigh-login unbanip "$T1"

echo "== 3. Detection: 12 Caddy-shaped login POSTs from $T2 appended to the real access log"
NOW=$(date +%s)
i=0
while [ "$i" -lt 12 ]; do
  printf '{"level":"info","ts":%s.%03d,"logger":"http.log.access.log0","msg":"handled request","request":{"remote_ip":"%s","remote_port":"4%04d","proto":"HTTP/2.0","method":"POST","host":"maxhigh.online","uri":"/_serverFn/%s"},"status":200}\n' "$NOW" "$i" "$T2" "$i" "$LOGIN" >> "$LOG"
  i=$((i+1))
done
sleep 8
fail2ban-client status maxhigh-login
if fail2ban-client status maxhigh-login | grep -q "$T2"; then echo "RESULT: jail DETECTED and BANNED $T2"; else echo "RESULT: NOT BANNED"; fi
iptables -S | grep -E "$T2" || true
fail2ban-client set maxhigh-login unbanip "$T2" || true

echo "== 4. Final state"
fail2ban-client status maxhigh-login
echo "SSH jail:"; fail2ban-client status sshd | head -6
