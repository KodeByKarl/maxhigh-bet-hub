#!/usr/bin/env bash
# READ-ONLY inspection of the UAT release layout, service unit, runtime and backups. Changes NOTHING. Secret-looking values are masked.
# Run by the OWNER (sudo):  sudo bash ~/vps-deploy-layout-sudo.sh 2>&1 | tee ~/deploy-layout-$(date -u +%Y%m%dT%H%M%SZ).txt
set -u
mask() { sed -E 's/((pass|pwd|secret|token|key|database_url|dsn)[A-Za-z_]*[[:space:]]*[=:][[:space:]]*).*/\1<masked>/I'; }
SQL() { mariadb --batch --raw -N "$@"; }
echo "== time/host"; date -u +%FT%TZ; hostname
echo "== service unit (masked)"; systemctl cat maxhigh-uat 2>&1 | mask
echo "== service state"; systemctl show maxhigh-uat -p ActiveState -p SubState -p NRestarts -p MainPID -p ExecMainStartTimestamp 2>&1
echo "== staging root layout (names, owners, sizes)"; ls -la /var/www/maxhigh/staging 2>&1 | head -30
echo "== releases"; ls -la /var/www/maxhigh/staging/releases 2>&1 | head -20; du -sh /var/www/maxhigh/staging/releases/* 2>/dev/null
echo "== release pointers / manifests (non-secret JSON only)"
for f in /var/www/maxhigh/staging/releases/*/release-validation.json /var/www/maxhigh/staging/current.json /var/www/maxhigh/staging/previous.json; do [ -f "$f" ] && { echo "--- $f"; head -c 900 "$f"; echo; }; done
echo "== env/config FILE NAMES only (no contents)"; ls -la /var/www/maxhigh/staging/.env* /var/www/maxhigh/staging/*.env* 2>&1 | head
echo "== runtime"; ls -ld /opt/maxhigh-node-24.22.2 /opt/maxhigh-pm2 2>&1; /opt/maxhigh-node-24.22.2/bin/node -v 2>&1; command -v node && node -v
echo "== bootstrap state"; ls -la /var/lib/maxhigh-bootstrap 2>&1 | head -20; cat /var/lib/maxhigh-bootstrap/release-preparation.json 2>/dev/null | head -c 700
echo "== evidence and backups (names only)"; ls -la /root/maxhigh-evidence 2>&1 | head -30; ls -la /var/backups/maxhigh-staging 2>&1
echo "== disk / memory"; df -h / /var /var/www /var/backups 2>&1; free -m
echo "== UAT application log: occurrences of the original defect message (must be 0 since the repair)"
for f in /var/www/maxhigh/staging/logs/*.log; do [ -f "$f" ] && printf '%s: ' "$f" && grep -c "Financial risk controls unavailable" "$f"; done 2>/dev/null
echo "== last service log lines (errors only, masked)"; journalctl -u maxhigh-uat --no-pager -n 400 2>/dev/null | grep -iE "error|fail|exception" | tail -12 | mask
echo "== game_controls overrides (a row would override code defaults, e.g. wild-panther)"; SQL -e "SELECT game_id, enabled, LEFT(IFNULL(engine_config,''),80) FROM maxhigh_staging.game_controls;" 2>&1
echo "== risk_controls"; SQL -e "SELECT id,max_single_bet,max_daily_payout,max_weekly_limit,auto_flag_large_wins,large_win_threshold FROM maxhigh_staging.risk_controls;" 2>&1
echo "== ledger totals baseline (users, balances, transactions)"; SQL -e "SELECT COUNT(*), SUM(balance) FROM maxhigh_staging.users; SELECT COUNT(*), SUM(amount) FROM maxhigh_staging.transactions;" 2>&1
echo "== done (read-only)"
