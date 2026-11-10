
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
