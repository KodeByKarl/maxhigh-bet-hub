#!/bin/bash
# =====================================================================================================================
# MaxHigh UAT batch G11 - G11 risk_controls write (UAT-only values, hard-gated on the permanent-key drill)
# Generated from reviewed parts (header + body + footer). Run ONLY through the runner one-liner, which copies this file
# to a root-owned location and verifies its SHA-256 before executing it. Stops at the first failure.
# Evidence: /root/maxhigh-evidence/G11-<UTC>.log, plus G11.pass (with the log hash) only when every check passed.
# Scope: database maxhigh_staging (UAT, synthetic data) only. The permanent recovery private key and its passphrase
# exist only on the Windows operator machine and are never read, requested or needed here.
# =====================================================================================================================
set -Eeuo pipefail
umask 077
export LC_ALL=C.UTF-8 PATH=/usr/sbin:/usr/bin:/sbin:/bin
[ "$(id -u)" = 0 ] || { echo "STOP  must run as root (via sudo)"; exit 2; }

ARGS=("$@")
EVID=/root/maxhigh-evidence
PKT=/root/maxhigh-staging-385ed041
ADMIN=/root/maxhigh-staging-admin
BACKUPS=/var/backups/maxhigh-staging
SHM_KEY=/dev/shm/maxhigh-verify.key
DB=maxhigh_staging
RESTORE_DB=maxhigh_staging_restorecheck
PACKET_SHA=385ed04116d4f0f43b96b7b27cdd03b681482a05b9dad1ac2d295fbd4d7e40c2
RECOVERY_SHA=b12a38c583bd51ab6c2273905606375f2ca4bde16686777bd023c4d4e8d0365d
RECOVERY_PUB=age1g8y0kk95pvdptc5zzlmadjt0yza4pjuka4xdal9w9ulqxm0se9aqefsjv0
UAT_RELEASE=2294d79afb2b900f13a9cd05c427dc9857b89de1
# Migration ledger as shipped in the approved release (LF-normalised SQL).
LEDGER_EXPECTED='0000_init-from-schema.sql 6378baf80c7281b10db326b75880fa01bc657bb6ee049a94687d87a79671c856;0001_financial_integrity.sql ce92417246b525294cbdf58d99401ef41ccf8242def0b2420c984f761c80956b;0002_reward_entitlements.sql 6acd18c48411a11ec1967d39c33abb62d08743abf7503f6f3149af3776e6d1c6;0003_rapid_quentin_quire.sql 769283b4865423e24c8554406b6642872b27748e93e7eb4b07a2aebce6eb81b2'

install -d -m 700 "$EVID"
TS=$(date -u +%Y%m%dT%H%M%SZ)
LOG="$EVID/G11-$TS.log"
PENDING="$EVID/.G11.pending"
: > "$PENDING"

FAILS=0
ok()   { printf 'PASS  %s\n' "$*"; }
bad()  { printf 'FAIL  %s\n' "$*"; FAILS=$((FAILS + 1)); }
info() { printf 'INFO  %s\n' "$*"; }
die()  { printf 'STOP  %s\n' "$*"; exit 1; }
step() { printf '\n== %s\n' "$*"; }
mark() { printf '%s=%s\n' "$1" "$2" >> "$PENDING"; }
sqlv() { mariadb -N -B -e "$1"; }
sha_of() { sha256sum "$1" | cut -d' ' -f1; }
need_marker() {   # need_marker <name> : earlier batch evidence must exist and name this exact packet
  [ -s "$EVID/$1.pass" ] || die "missing evidence $EVID/$1.pass - run the earlier batch first"
  grep -q "^packet_sha=$PACKET_SHA$" "$EVID/$1.pass" || die "evidence $1.pass does not reference packet $PACKET_SHA"
}
marker_val() { grep "^$2=" "$EVID/$1.pass" | head -1 | cut -d= -f2-; }
trap 'rc=$?; printf "STOP  command failed (exit %s) at line %s: %s\n" "$rc" "$LINENO" "$BASH_COMMAND" >&2' ERR

# ---------------------------------------------------------------------------------------------------------- G11 body
# Inserts the single risk_controls 'default' row with the owner-approved UAT-ONLY values (Write Path A, reviewed SQL).
# HARD GATE: the Windows drill must have reproduced the plaintext fingerprint with the PERMANENT recovery key; its hash is
# passed as an argument and compared with the fingerprint recorded at backup time. No hash match, no write.
# UAT-ONLY values. They must never be copied to a real-money database (target is hard-coded to maxhigh_staging).

SQL_SRC=/home/maxhigh-ops/risk-controls-remediation.sql
SQL_SHA=33a5e7cad6884bb3043d4176d3684b788c15e3b9ad8f6600d727704d0c695f51
EXPECT_ROW='default|100000.00|100000000.00|1000000000.00|yes|10000.00'
VARS="SET @target_db='maxhigh_staging'; SET @max_single_bet=100000.00; SET @max_daily_payout=100000000.00; SET @max_weekly_limit=1000000000.00; SET @auto_flag='yes'; SET @large_win_threshold=10000.00;"

snap() {   # everything that must not change, except risk_controls
  sqlv "SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM $DB.users), (SELECT COUNT(*) FROM $DB.transactions), (SELECT COUNT(*) FROM $DB.audit_logs), (SELECT COUNT(*) FROM $DB.wallet_requests), (SELECT COALESCE(SUM(balance),0) FROM $DB.users))"
}
sums_except_risk() {
  local t
  for t in $(sqlv "SELECT table_name FROM information_schema.tables WHERE table_schema='$DB' AND table_type='BASE TABLE' AND table_name <> 'risk_controls' ORDER BY table_name"); do
    sqlv "CHECKSUM TABLE \`$DB\`.\`$t\`"
  done
}
run_sql() {   # run_sql ROLLBACK|COMMIT   (no --force: any SQL error aborts, and an unterminated transaction rolls back)
  ( printf '%s\n' "$VARS"; cat "$WORK/remediation.sql"; printf '%s;\n' "$1" ) | mariadb --defaults-extra-file="$ADMIN/migrate-client.cnf" -B "$DB"
}

main() {
  set -Eeuo pipefail
  WORK=$(mktemp -d -p /root); trap 'rm -rf "$WORK"' EXIT

  step "Gate: recovery qualification evidence"
  need_marker G5; need_marker G6G7; need_marker G8G9; need_marker G10a
  [ "$(marker_val G8G9 compare)" = PASS ] && ok "backup + isolated restore + compare PASSED (G8G9.pass)" || die "compare not recorded as PASS"
  [ "${ARGS[0]:-}" = "--g10-plaintext-sha256" ] && [ -n "${ARGS[1]:-}" ] || die "usage: --g10-plaintext-sha256 <64 hex printed by the Windows drill>"
  G10_SHA=${ARGS[1]}
  [[ "$G10_SHA" =~ ^[0-9a-f]{64}$ ]] || die "argument is not a 64-character lowercase hex SHA-256"
  [ "$G10_SHA" = "$(marker_val G10a plaintext_sha256)" ] && ok "Windows drill with the PERMANENT key reproduced the plaintext fingerprint recorded at backup time" || die "drill hash does not match - the permanent recovery key has NOT been proven; no write performed"
  [ ! -e "$SHM_KEY" ] && ok "disposable verification key already removed" || die "verification key still present - run G10a first"

  step "Reviewed SQL integrity"
  install -m 600 -o root -g root "$SQL_SRC" "$WORK/remediation.sql"
  [ "$(sha_of "$WORK/remediation.sql")" = "$SQL_SHA" ] && ok "risk-controls-remediation.sql matches the reviewed SHA-256 (root-owned copy used)" || die "SQL file differs from the reviewed version"
  if grep -qE "INSERT INTO risk_controls" "$WORK/remediation.sql" && ! grep -qiE "DELETE|DROP|TRUNCATE|ALTER|UPDATE[[:space:]]" "$WORK/remediation.sql"; then ok "SQL contains only the guarded INSERT (no DELETE/DROP/TRUNCATE/ALTER/UPDATE)"; else die "unexpected statements in SQL"; fi

  step "Pre-state"
  I=$(mariadb --defaults-extra-file="$ADMIN/migrate-client.cnf" -N -B -e "SELECT CURRENT_USER(), DATABASE()")
  [ "$I" = "$(printf 'maxhigh_stage_migrate@127.0.0.1\t%s' "$DB")" ] && ok "migrate option file connects as maxhigh_stage_migrate to $DB" || die "connection identity: $I"
  [ "$(sqlv "SELECT COUNT(*) FROM $DB.risk_controls")" = 0 ] && ok "risk_controls is empty (nothing will be overwritten)" || die "risk_controls already has a row - refusing to touch it"
  PRE=$(snap); info "pre snapshot (users|transactions|audit_logs|wallet_requests|balance): $PRE"
  sums_except_risk > "$WORK/sums.before"

  step "Dry run (ROLLBACK)"
  D="$EVID/G11-dryrun-$TS.out"
  run_sql ROLLBACK > "$D"
  info "dry-run transcript: $D  sha256=$(sha_of "$D")"
  grep -qxF "$(printf 'maxhigh_staging\tmaxhigh_staging\t1\t0')" "$D" && ok "dry run: connected db = target db, inputs valid, no existing row" || bad "dry run: guard line not as expected"
  grep -qxF "$(printf '1\t1\t1\t1\t1')" "$D" && ok "dry run: users/transactions/audit/balance unchanged and exactly one risk row staged" || bad "dry run: unchanged-counters line not as expected"
  grep -qF "$(printf 'default\t100000.00\t100000000.00\t1000000000.00\tyes\t10000.00\t')" "$D" && ok "dry run: staged row has exactly the approved values" || bad "dry run: staged row differs"
  [ "$(sqlv "SELECT COUNT(*) FROM $DB.risk_controls")" = 0 ] && ok "dry run rolled back (risk_controls still empty)" || bad "dry run left a row behind"
  [ "$(snap)" = "$PRE" ] && ok "dry run changed nothing" || bad "dry run changed data"
  [ "$FAILS" -eq 0 ] || { echo "Dry run failed; no COMMIT was attempted."; exit 1; }

  step "COMMIT"
  C="$EVID/G11-commit-$TS.out"
  run_sql COMMIT > "$C"
  info "commit transcript: $C  sha256=$(sha_of "$C")"
  ROW=$(sqlv "SELECT CONCAT_WS('|', id, max_single_bet, max_daily_payout, max_weekly_limit, auto_flag_large_wins, large_win_threshold) FROM $DB.risk_controls")
  [ "$ROW" = "$EXPECT_ROW" ] && ok "risk_controls now holds exactly: $ROW" || bad "risk_controls row is '$ROW'"
  [ "$(sqlv "SELECT COUNT(*) FROM $DB.risk_controls")" = 1 ] && ok "exactly one row" || bad "row count is not 1"
  POST=$(snap); [ "$POST" = "$PRE" ] && ok "users, transactions, audit logs, wallet requests and total balance unchanged" || bad "snapshot changed: $PRE -> $POST"
  sums_except_risk > "$WORK/sums.after"
  cmp -s "$WORK/sums.before" "$WORK/sums.after" && ok "every other table is byte-for-byte unchanged (CHECKSUM TABLE)" || bad "another table changed"
  [ "$FAILS" -eq 0 ] || { echo "$FAILS check(s) FAILED after COMMIT - STOP. The row exists; do not edit it. Report to the assistant."; exit 1; }

  step "Audit evidence"
  EV="$EVID/G11-evidence-$TS.txt"
  {
    echo "risk_controls UAT write - $(date -u +%FT%TZ)"
    echo "operator=${SUDO_USER:-unknown} host=$(hostname)"
    echo "database=$DB (UAT, synthetic data only; NOT for real money)"
    echo "sql_sha256=$SQL_SHA"
    echo "values=$EXPECT_ROW"
    echo "g10_plaintext_sha256=$G10_SHA"
    echo "ciphertext=$(marker_val G8G9 ciphertext) sha256=$(marker_val G8G9 ciphertext_sha256)"
    echo "dryrun_sha256=$(sha_of "$D")"
    echo "commit_sha256=$(sha_of "$C")"
    echo "pre_snapshot=$PRE"
    echo "post_snapshot=$POST"
  } > "$EV"
  info "evidence file: $EV  sha256=$(sha_of "$EV")"
  if command -v logger > /dev/null; then
    logger -t maxhigh-uat-change -p auth.notice "risk_controls default row inserted in $DB (UAT-only values $EXPECT_ROW) by ${SUDO_USER:-unknown}; evidence $(sha_of "$EV")" && ok "syslog entry written (tag maxhigh-uat-change)"
  fi

  mark values "$EXPECT_ROW"
  mark sql_sha256 "$SQL_SHA"
  mark evidence "$EV"
  mark evidence_sha256 "$(sha_of "$EV")"
  mark g10_plaintext_sha256 "$G10_SHA"
  step "G11 summary"
  echo "risk_controls written (UAT-only). UAT spins can now pass the financial risk check. Next: synthetic accounts and the 100-game QA."
}

# ----------------------------------------------------------------------------------------------------- run + evidence
trap - ERR
main_wrapped() {   # the ERR trap is re-armed inside the subshell that runs the batch body only
  set -E
  trap 'rc=$?; printf "STOP  command failed (exit %s) at line %s: %s\n" "$rc" "$LINENO" "$BASH_COMMAND" >&2' ERR
  main
}
set +e
main_wrapped 2>&1 | tee -a "$LOG"
rc=${PIPESTATUS[0]}
set -e
LSHA=$(sha256sum "$LOG" | cut -d' ' -f1)
printf '\nlog=%s\nlog_sha256=%s\nexit=%s\n' "$LOG" "$LSHA" "$rc"
if [ "$rc" -eq 0 ]; then
  { printf 'batch=G11\npacket_sha=%s\n' "$PACKET_SHA"; cat "$PENDING"; printf 'log=%s\nlog_sha256=%s\nfinished_utc=%s\n' "$LOG" "$LSHA" "$(date -u +%FT%TZ)"; } > "$EVID/G11.pass"
  chmod 600 "$EVID/G11.pass"
  printf 'evidence: '; sha256sum "$EVID/G11.pass"
  echo "RESULT: G11 PASS"
else
  echo "RESULT: G11 FAIL (exit $rc) - do not run any later batch; send this output and the log to the assistant"
fi
rm -f "$PENDING"
[ "$rc" -eq 0 ]
