#!/bin/sh
# Run as root, AFTER install-public-caddy.sh (needs /var/log/caddy/maxhigh-public-access.log).
# Per-IP login rate limiting without an app change: fail2ban watches POSTs to the loginFn server function
# on the public host and bans an IP for 15 minutes after 10 login attempts in 10 minutes (UFW deny rule).
# The app's own per-account lockout stays. Usage: sudo sh install-login-ratelimit.sh
set -eu
umask 022
LOGIN=8de11115f166dd1457b39f592d453f713127b9c8e4da1d14fc5e2113b9d996e8
LOG=/var/log/caddy/maxhigh-public-access.log
[ "$(id -u)" = 0 ]
[ -f "$LOG" ] || { echo "Public Caddy log missing; install the public block first"; exit 1; }
DEBIAN_FRONTEND=noninteractive apt-get install -y fail2ban
cat > /etc/fail2ban/filter.d/maxhigh-login.conf <<EOF
[Definition]
failregex = "remote_ip":"<HOST>".*"method":"POST","host":"maxhigh\.online","uri":"/_serverFn/$LOGIN
ignoreregex =
datepattern = "ts":{EPOCH}
EOF
cat > /etc/fail2ban/jail.d/maxhigh-login.local <<EOF
[maxhigh-login]
enabled  = true
filter   = maxhigh-login
logpath  = $LOG
port     = http,https
maxretry = 10
findtime = 600
bantime  = 900
banaction = ufw
ignoreip = 127.0.0.1/8 ::1
EOF
# Prove the filter matches before enabling: a synthetic Caddy-shaped line.
T=$(mktemp)
printf '{"level":"info","ts":1794227489.1,"logger":"http.log.access.log0","msg":"handled request","request":{"remote_ip":"203.0.113.9","remote_port":"5000","proto":"HTTP/2.0","method":"POST","host":"maxhigh.online","uri":"/_serverFn/%s"},"status":200}\n' "$LOGIN" > "$T"
fail2ban-regex "$T" /etc/fail2ban/filter.d/maxhigh-login.conf | grep -E "Lines:|matched"
rm -f "$T"
systemctl enable --now fail2ban
sleep 3
fail2ban-client status maxhigh-login
echo "Rollback: sudo systemctl disable --now fail2ban && sudo rm /etc/fail2ban/jail.d/maxhigh-login.local /etc/fail2ban/filter.d/maxhigh-login.conf"
