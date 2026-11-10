#!/bin/sh
# Run as root. Two phases around the non-root live-login-test.sh.
#   sudo sh f2b-selftest.sh prep     -> temporarily let the jail ban THIS server's own address (ignoreself=false)
#   (run: bash ~/uat/live-login-test.sh   as maxhigh-ops)
#   sudo sh f2b-selftest.sh finish   -> show firewall evidence, unban, restore ignoreself, verify SSH jail + final state
# Bans are web-ports-only (80/443) and affect only this server's own public IP, not clients or your SSH.
set -u
J=maxhigh-login
IP=151.242.136.34
F=/etc/fail2ban/jail.d/maxhigh-login.local
[ "$(id -u)" = 0 ] || { echo need root; exit 1; }
case "${1:-}" in
prep)
  cp -p "$F" "$F.pre-selftest"
  grep -q '^ignoreself' "$F" && sed -i 's/^ignoreself.*/ignoreself = false/' "$F" || echo 'ignoreself = false' >> "$F"
  fail2ban-client reload; sleep 3
  fail2ban-client get $J ignoreself 2>&1; fail2ban-client get $J ignoreip; fail2ban-client get $J banaction
  echo "READY: now run  bash ~/uat/live-login-test.sh   as maxhigh-ops, then  sudo sh f2b-selftest.sh finish" ;;
finish)
  echo "== jail status (expect $IP banned)"; fail2ban-client status $J
  echo "== firewall evidence (expect multiport dports 80,443; no UFW rule for $IP)"
  iptables -S | grep -E "f2b-$J|$IP" || echo "no f2b rules found"
  iptables -S INPUT | grep -E "f2b" || true
  echo "UFW rules mentioning $IP: $(ufw status | grep -c "$IP" || true)"
  echo "== unban"; fail2ban-client set $J unbanip $IP
  sleep 1
  echo "banned after unban:"; fail2ban-client status $J | grep -E "Currently banned|Banned IP"
  iptables -S | grep -c "$IP" | sed 's/^/rules left for test IP: /'
  echo "== restore ignoreself default"
  if [ -f "$F.pre-selftest" ]; then cp -p "$F.pre-selftest" "$F"; rm -f "$F.pre-selftest"; fi
  fail2ban-client reload; sleep 3
  echo "ignoreself: $(fail2ban-client get $J ignoreself 2>&1)  ignoreip: $(fail2ban-client get $J ignoreip | tr '\n' ' ')"
  echo "== jails"; fail2ban-client status | tail -2
  echo "sshd jail:"; fail2ban-client status sshd | head -5
  echo "ufw: $(ufw status | head -1)" ;;
*) echo "usage: sh f2b-selftest.sh prep|finish"; exit 1 ;;
esac
