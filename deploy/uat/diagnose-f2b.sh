#!/bin/sh
# Run as root. Read-mostly diagnosis of why the maxhigh-login jail did not see appended log lines.
# The only writes are 12 fake login lines for the reserved documentation IP 203.0.113.99, and it unbans that IP.
# Usage: sudo sh diagnose-f2b.sh
set -u
LOG=/var/log/caddy/maxhigh-public-access.log
J=maxhigh-login
LOGIN=8de11115f166dd1457b39f592d453f713127b9c8e4da1d14fc5e2113b9d996e8
[ "$(id -u)" = 0 ] || { echo need root; exit 1; }
echo "== server pid / open log files / inode"
PID=$(pidof -s fail2ban-server); echo "pid=$PID"
ls -l /proc/$PID/fd 2>/dev/null | grep -E "caddy|inotify" || echo "NO caddy log fd and no inotify fd open"
ls -i "$LOG"
echo "== jail as loaded"
fail2ban-client status $J
for k in logpath findtime maxretry datepattern failregex ignoreregex ignoreip bantime banaction logencoding; do printf '%s: ' $k; fail2ban-client get $J $k 2>&1 | tr '\n' ' '; echo; done
echo "== backend / python inotify"
fail2ban-client get $J backend 2>&1 || true
python3 -c "import pyinotify;print('pyinotify ok')" 2>&1
cat /proc/sys/fs/inotify/max_user_instances /proc/sys/fs/inotify/max_user_watches
echo "== fail2ban.log (maxhigh + errors, last 40)"
grep -iE "maxhigh|error|warn" /var/log/fail2ban.log | tail -40
echo "== live append test (203.0.113.99), checking at 3s and 12s"
NOW=$(date +%s); i=0
while [ $i -lt 12 ]; do
  printf '{"level":"info","ts":%s.%03d,"logger":"http.log.access.log0","msg":"handled request","request":{"remote_ip":"203.0.113.99","remote_port":"5%04d","proto":"HTTP/2.0","method":"POST","host":"maxhigh.online","uri":"/_serverFn/%s"},"status":200}\n' "$NOW" "$i" "$i" "$LOGIN" >> "$LOG"
  i=$((i+1))
done
sleep 3; fail2ban-client status $J | grep -E "Currently failed|Total failed|Banned IP"
sleep 9; fail2ban-client status $J | grep -E "Currently failed|Total failed|Banned IP"
fail2ban-client set $J unbanip 203.0.113.99 >/dev/null 2>&1 || true
echo "== last fail2ban.log lines"
tail -15 /var/log/fail2ban.log
