
# --------------------------------------------------------------------------------------------------------- G8+G9 body
# Encrypted backup of maxhigh_staging -> isolated restore into maxhigh_staging_restorecheck -> compare.
# The ONLY writes: one ciphertext + checksum in the backup directory and the restore-check schema. maxhigh_staging is only read.
# Everything is done with the reviewed recovery.py; its own checks (grant minimums, isolated names, empty target) also apply.

QUIET_SECONDS=${QUIET_SECONDS:-600}

activity_sig() {   # one line that changes if anyone uses UAT: row counts, balance sum, newest timestamp
  sqlv "SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM $DB.users), (SELECT COUNT(*) FROM $DB.transactions), (SELECT COUNT(*) FROM $DB.audit_logs), (SELECT COUNT(*) FROM $DB.sessions), (SELECT COUNT(*) FROM $DB.wallet_requests), (SELECT COUNT(*) FROM $DB.play_sessions), (SELECT COALESCE(SUM(balance),0) FROM $DB.users), GREATEST(COALESCE((SELECT MAX(created_at) FROM $DB.transactions),'1970-01-01'), COALESCE((SELECT MAX(created_at) FROM $DB.audit_logs),'1970-01-01'), COALESCE((SELECT MAX(last_seen_at) FROM $DB.sessions),'1970-01-01'), COALESCE((SELECT MAX(created_at) FROM $DB.sessions),'1970-01-01'), COALESCE((SELECT MAX(updated_at) FROM $DB.play_sessions),'1970-01-01'), COALESCE((SELECT MAX(updated_at) FROM $DB.users),'1970-01-01'), COALESCE((SELECT MAX(created_at) FROM $DB.wallet_requests),'1970-01-01')))"
}
idle_seconds() {
  sqlv "SELECT TIMESTAMPDIFF(SECOND, GREATEST(COALESCE((SELECT MAX(created_at) FROM $DB.transactions),'1970-01-01'), COALESCE((SELECT MAX(created_at) FROM $DB.audit_logs),'1970-01-01'), COALESCE((SELECT MAX(last_seen_at) FROM $DB.sessions),'1970-01-01'), COALESCE((SELECT MAX(created_at) FROM $DB.sessions),'1970-01-01'), COALESCE((SELECT MAX(updated_at) FROM $DB.play_sessions),'1970-01-01'), COALESCE((SELECT MAX(updated_at) FROM $DB.users),'1970-01-01'), COALESCE((SELECT MAX(created_at) FROM $DB.wallet_requests),'1970-01-01')), NOW())"
}
table_sums() {      # CHECKSUM TABLE for every table of one schema, stable order
  local schema=$1 t
  for t in $(sqlv "SELECT table_name FROM information_schema.tables WHERE table_schema='$schema' AND table_type='BASE TABLE' ORDER BY table_name"); do
    sqlv "CHECKSUM TABLE \`$schema\`.\`$t\`"
  done
}
recov() { ( cd "$PKT" && python3 -B recovery.py "$@" ); }


# ---- R2 main: fresh backup WITH the five reviewed triggers (uses the reviewed control kit's recovery.py, not the old packet copy) ----
RETR=/home/maxhigh-ops/maxhigh-retrieval
KIT=/root/maxhigh-vps-controls
recov() { ( cd "$KIT" && python3 -B recovery.py "$@" ); }

main() {
  set -Eeuo pipefail
  step "Gate: earlier evidence and state"
  need_marker G5; need_marker G6G7; need_marker G8G9; need_marker R1
  [ -f "$KIT/recovery.py" ] && ( cd "$KIT" && sha256sum --check --strict --quiet CONTROL_SHA256SUMS ) && ok "control kit installed and checksum-verified" || die "control kit missing or modified"
  grep -q "EXPECTED_TRIGGERS" "$KIT/recovery.py" && ok "kit recovery.py is the trigger-aware version" || die "kit recovery.py is not the trigger-aware version"
  [ "$RESTORE_DB" = maxhigh_staging_restorecheck ] && [ "$DB" = maxhigh_staging ] || die "unexpected schema names"
  [ -e "$ADMIN/restore-client.cnf" ] && ok "restore-client.cnf present" || die "restore-client.cnf missing"
  [ "$(systemctl is-active maxhigh-staging-preview.service || true)" = inactive ] && ok "staging preview unit inactive" || die "staging preview unit is active"
  TRG=$(sqlv "SELECT IFNULL(GROUP_CONCAT(CONCAT(trigger_name,'|',definer) ORDER BY trigger_name SEPARATOR ','),'') FROM information_schema.triggers WHERE trigger_schema='$DB'")
  info "source triggers: $TRG"
  NT=$(printf '%s' "$TRG" | tr ',' '\n' | grep -c . || true)
  [ "$NT" = 5 ] && ok "source holds the five reviewed triggers" || die "expected 5 triggers, found $NT"
  [ "$(printf '%s' "$TRG" | tr ',' '\n' | grep -vc '|root@localhost$' || true)" = 0 ] && ok "all triggers are defined by root@localhost" || die "unexpected trigger definer"
  info "existing ciphertext files (kept, never deleted): $(ls -1 "$BACKUPS"/*.sql.gz.age | wc -l)"

  step "Quiet-window gate"
  IDLE=$(idle_seconds); info "seconds since last UAT activity: $IDLE (required >= $QUIET_SECONDS)"
  [ "$IDLE" -ge "$QUIET_SECONDS" ] && ok "UAT idle long enough" || die "UAT active ${IDLE}s ago - wait and re-run (nothing changed yet)"

  step "Restore-check schema: reset (disposable) and grant TRIGGER on THAT schema only"
  for t in $(sqlv "SELECT table_name FROM information_schema.tables WHERE table_schema='$RESTORE_DB' AND table_type='BASE TABLE'"); do
    mariadb -e "SET FOREIGN_KEY_CHECKS=0; DROP TABLE \`maxhigh_staging_restorecheck\`.\`$t\`"
  done
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$RESTORE_DB'")" = 0 ] && ok "restore-check schema is empty" || die "restore-check not empty"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$RESTORE_DB'")" = 0 ] && ok "restore-check holds no triggers" || die "restore-check still has triggers"
  mariadb -e "GRANT TRIGGER ON \`maxhigh_staging_restorecheck\`.* TO 'maxhigh_stage_restore'@'127.0.0.1'"
  GR=$(mariadb -N -e "SHOW GRANTS FOR 'maxhigh_stage_restore'@'127.0.0.1'")
  printf '%s\n' "$GR" | grep -q 'TRIGGER ON `maxhigh_staging_restorecheck`' && ok "restore account has TRIGGER on the restore-check schema" || die "TRIGGER grant missing"
  [ "$(printf '%s\n' "$GR" | grep -c "ON \`maxhigh_staging\`\.")" = 0 ] && ok "restore account has NO privilege on the live schema" || die "restore account has a live-schema privilege"
  [ "$(printf '%s\n' "$GR" | grep -c '\*\.\* TO' )" -le 1 ] && ok "restore account has no global privileges beyond USAGE" || die "restore account has global privileges"

  step "New disposable verification key (RAM only)"
  [ ! -e "$SHM_KEY" ] || die "$SHM_KEY already exists"
  age-keygen -o "$SHM_KEY" 2> /dev/null
  VERIFY_PUB=$(age-keygen -y "$SHM_KEY")
  [ "$(df --output=fstype "$SHM_KEY" | tail -1 | tr -d ' ')" = tmpfs ] && ok "key on tmpfs" || die "key not on tmpfs"
  trap 'rm -f "$SHM_KEY"' EXIT

  S0=$(activity_sig); info "activity signature before: $S0"
  table_sums "$DB" > "$EVID/.src-sums.before"; ok "recorded CHECKSUM TABLE of $(wc -l < "$EVID/.src-sums.before") source tables"
  ls -1 "$BACKUPS"/*.sql.gz.age | sort > "$EVID/.ct.before"

  step "Encrypted backup of the schema WITH triggers"
  recov backup --approve BACKUP --recipient "$RECOVERY_PUB" --recipient "$VERIFY_PUB" --peak-bytes 1073741824
  ls -1 "$BACKUPS"/*.sql.gz.age | sort > "$EVID/.ct.after"
  FILE=$(comm -13 "$EVID/.ct.before" "$EVID/.ct.after"); [ "$(printf '%s\n' "$FILE" | grep -c .)" = 1 ] || die "cannot identify exactly one new ciphertext"
  CT=$(basename "$FILE"); CT_SHA=$(sha_of "$FILE")
  [ "$(cut -d' ' -f1 "$FILE.sha256")" = "$CT_SHA" ] && ok "ciphertext $CT matches checksum file ($CT_SHA)" || bad "checksum file mismatch"
  [ "$(stat -c '%U:%G %a' "$FILE")" = "root:root 600" ] && ok "root:root 600" || bad "owner/mode"
  [ "$(head -c 21 "$FILE")" = "age-encryption.org/v1" ] && ok "age format" || bad "not age"
  [ "$(head -c 800 "$FILE" | grep -ac '^-> X25519')" = 2 ] && ok "two recipient stanzas" || bad "recipient stanza count"
  age -d -i "$SHM_KEY" "$FILE" | gzip -t && ok "decrypts and gunzips" || bad "decrypt test failed"
  PT_SHA=$(age -d -i "$SHM_KEY" "$FILE" | gzip -d | sha256sum | cut -d' ' -f1)
  PT_BYTES=$(age -d -i "$SHM_KEY" "$FILE" | gzip -d | wc -c | tr -d ' ')
  info "plaintext sha256=$PT_SHA bytes=$PT_BYTES"
  PT_BAD=$(age -d -i "$SHM_KEY" "$FILE" | gzip -d | grep -ciE '^(LOCK TABLES|UNLOCK TABLES|USE |CREATE DATABASE|DROP )|ALTER TABLE|DISABLE KEYS' || true)
  [ "$PT_BAD" = 0 ] && ok "no LOCK/UNLOCK/USE/CREATE DATABASE/DROP/ALTER/DISABLE KEYS in the dump" || bad "$PT_BAD unsafe statement line(s)"
  PT_TRG=$(age -d -i "$SHM_KEY" "$FILE" | gzip -d | grep -c '^/\*!50003 CREATE\*/ /\*!50017 DEFINER=`root`@`localhost`\*/ ' || true)
  [ "$PT_TRG" = 5 ] && ok "dump carries the five reviewed trigger definitions (definer root@localhost)" || bad "dump holds $PT_TRG trigger definitions, expected 5"
  [ "$FAILS" -eq 0 ] || exit 1
  S1=$(activity_sig); [ "$S1" = "$S0" ] && ok "no UAT activity during backup" || die "UAT data changed during backup"

  step "Isolated restore into $RESTORE_DB (DEFINER filtered, triggers recreated)"
  recov restore --approve RESTORE --backup "$FILE" --sha256 "$CT_SHA" --identity "$SHM_KEY" --peak-bytes 1073741824 --dump-scope-reviewed --restore-grants-reviewed
  RT=$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$RESTORE_DB'")
  [ "$RT" = "$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB'")" ] && ok "restore-check holds all $RT tables" || bad "table count differs"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$RESTORE_DB'")" = 5 ] && ok "restore-check holds the five triggers" || bad "restored trigger count is not 5"
  S2=$(activity_sig); [ "$S2" = "$S0" ] && ok "no UAT activity during restore" || die "UAT data changed during restore"

  step "Compare (data, ledger, schema, constraints AND triggers)"
  CMP=$(recov compare --approve COMPARE --dump-scope-reviewed 2>&1) || { printf '%s\n' "$CMP"; die "compare FAILED"; }
  printf '%s\n' "$CMP"
  case "$CMP" in *"PASS canonical staging data, ledger and schema/constraint fingerprints"*) ok "compare PASSED" ;; *) bad "compare did not report PASS" ;; esac
  S3=$(activity_sig); [ "$S3" = "$S0" ] && ok "no UAT activity during compare" || bad "UAT data changed during compare"
  table_sums "$DB" > "$EVID/.src-sums.after"
  cmp -s "$EVID/.src-sums.before" "$EVID/.src-sums.after" && ok "$DB byte-for-byte unchanged (CHECKSUM TABLE)" || bad "$DB checksums changed"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$DB'")" = 5 ] && ok "live schema still has its five triggers" || bad "live trigger count changed"
  rm -f "$EVID/.src-sums.before" "$EVID/.src-sums.after" "$EVID/.ct.before" "$EVID/.ct.after"
  [ "$FAILS" -eq 0 ] || { echo "$FAILS check(s) FAILED"; exit 1; }

  step "Remove disposable key and stage ciphertext copy for the Windows permanent-key drill"
  rm -f "$SHM_KEY"; [ ! -e "$SHM_KEY" ] && ok "RAM key removed" || bad "key still present"
  install -d -m 700 -o maxhigh-ops -g maxhigh-ops "$RETR"
  install -m 600 -o maxhigh-ops -g maxhigh-ops "$FILE" "$RETR/$CT"
  install -m 600 -o maxhigh-ops -g maxhigh-ops "$FILE.sha256" "$RETR/$CT.sha256"
  [ "$(sha_of "$RETR/$CT")" = "$CT_SHA" ] && ok "staged copy matches" || bad "staged copy differs"
  [ "$FAILS" -eq 0 ] || exit 1

  mark ciphertext "$CT"; mark ciphertext_sha256 "$CT_SHA"; mark plaintext_sha256 "$PT_SHA"; mark plaintext_bytes "$PT_BYTES"
  mark recipients "$RECOVERY_PUB,$VERIFY_PUB"; mark compare PASS; mark triggers_in_dump 5; mark source_activity_signature "$S0"
  step "Summary"
  echo "Trigger-aware backup, isolated restore and compare PASSED."
  echo "WINDOWS DRILL INPUTS (not secret):"
  echo "  ciphertext        : $CT"
  echo "  ciphertext sha256 : $CT_SHA"
  echo "  plaintext sha256  : $PT_SHA"
}
