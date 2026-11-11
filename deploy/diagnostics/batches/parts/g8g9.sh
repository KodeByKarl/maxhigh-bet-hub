
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

main() {
  set -Eeuo pipefail
  step "Gate: earlier evidence"
  need_marker G5; need_marker G6G7
  ok "G5.pass and G6G7.pass present and bound to packet ${PACKET_SHA:0:12}"
  VERIFY_PUB=$(marker_val G6G7 verify_pub)
  [ -f "$SHM_KEY" ] || die "verification key $SHM_KEY is missing (it lives in RAM; a reboot removes it) - re-run is not possible without the DBA"
  [ "$(age-keygen -y "$SHM_KEY")" = "$VERIFY_PUB" ] && ok "RAM key matches the verification recipient recorded in G6G7.pass" || die "RAM key does not match recorded recipient"
  [ -e "$ADMIN/restore-client.cnf" ] && ok "restore-client.cnf present" || die "restore-client.cnf missing"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$RESTORE_DB'")" = 0 ] && ok "restore-check schema is empty" || die "restore-check schema is not empty"
  [ "$(find "$BACKUPS" -maxdepth 1 -name '*.sql.gz.age' | wc -l)" = 0 ] && ok "backup directory has no earlier ciphertext" || info "earlier ciphertext files exist (the new one is identified by difference)"
  [ "$(systemctl is-active maxhigh-staging-preview.service || true)" = inactive ] && ok "staging preview unit inactive" || die "staging preview unit is active"

  step "Quiet-window gate (UAT must be idle: backup and compare must see the same data)"
  IDLE=$(idle_seconds); info "seconds since last UAT activity: $IDLE (required >= $QUIET_SECONDS)"
  [ "$IDLE" -ge "$QUIET_SECONDS" ] && ok "UAT has been idle long enough" || die "UAT was active ${IDLE}s ago - ask testers to stop, wait, and re-run this batch (nothing has been changed yet)"
  S0=$(activity_sig); info "activity signature before: $S0"
  table_sums "$DB" > "$EVID/.src-sums.before"; ok "recorded CHECKSUM TABLE of all $(wc -l < "$EVID/.src-sums.before") source tables"
  ls -1 "$BACKUPS"/*.sql.gz.age 2> /dev/null | sort > "$EVID/.ct.before" || : > "$EVID/.ct.before"

  step "G8. Encrypted backup (two recipients: permanent recovery key + disposable verification key)"
  recov backup --approve BACKUP --recipient "$RECOVERY_PUB" --recipient "$VERIFY_PUB" --peak-bytes 1073741824
  ls -1 "$BACKUPS"/*.sql.gz.age | sort > "$EVID/.ct.after"
  FILE=$(comm -13 "$EVID/.ct.before" "$EVID/.ct.after"); [ "$(printf '%s\n' "$FILE" | grep -c .)" = 1 ] || die "could not identify exactly one new ciphertext"
  CT=$(basename "$FILE"); CT_SHA=$(sha_of "$FILE")
  [ "$(cut -d' ' -f1 "$FILE.sha256")" = "$CT_SHA" ] && ok "ciphertext $CT matches its checksum file ($CT_SHA)" || bad "checksum file does not match"
  [ "$(stat -c '%U:%G %a' "$FILE")" = "root:root 600" ] && ok "ciphertext is root:root 600" || bad "ciphertext owner/mode: $(stat -c '%U:%G %a' "$FILE")"
  [ "$(head -c 21 "$FILE")" = "age-encryption.org/v1" ] && ok "ciphertext is age format" || bad "not an age file"
  [ "$(head -c 800 "$FILE" | grep -ac '^-> X25519')" = 2 ] && ok "exactly two recipient stanzas (permanent + verification)" || bad "recipient stanza count is not 2"
  if age -d -i "$SHM_KEY" "$FILE" | gzip -t; then ok "ciphertext decrypts with the verification key and gunzips cleanly"; else bad "decrypt/gunzip test failed"; fi
  PT_SHA=$(age -d -i "$SHM_KEY" "$FILE" | gzip -d | sha256sum | cut -d' ' -f1)
  PT_BYTES=$(age -d -i "$SHM_KEY" "$FILE" | gzip -d | wc -c | tr -d ' ')
  info "plaintext SQL fingerprint sha256=$PT_SHA bytes=$PT_BYTES (the Windows recovery-key drill must reproduce this exactly)"
  PT_BAD=$(age -d -i "$SHM_KEY" "$FILE" | gzip -d | grep -ciE '^(LOCK TABLES|UNLOCK TABLES|USE |CREATE DATABASE|DROP )|ALTER TABLE|DISABLE KEYS|DEFINER' || true)
  [ "$PT_BAD" = 0 ] && ok "dump contains no LOCK/UNLOCK TABLES, USE, CREATE DATABASE, DROP, ALTER TABLE, DISABLE KEYS or DEFINER" || bad "dump contains $PT_BAD unsafe statement line(s)"
  [ "$FAILS" -eq 0 ] || exit 1
  S1=$(activity_sig); [ "$S1" = "$S0" ] && ok "no UAT activity during the backup" || die "UAT data changed during the backup ($S0 -> $S1). The ciphertext is valid but compare would report a false mismatch. Do not continue; ask the owner (a fresh attempt needs a fresh restore-check schema)."

  step "G9. Isolated restore into $RESTORE_DB"
  recov restore --approve RESTORE --backup "$FILE" --sha256 "$CT_SHA" --identity "$SHM_KEY" --peak-bytes 1073741824 --dump-scope-reviewed --restore-grants-reviewed
  RT=$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$RESTORE_DB'")
  [ "$RT" = "$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB'")" ] && ok "restore-check holds all $RT tables" || bad "restore-check table count $RT differs from source"
  S2=$(activity_sig); [ "$S2" = "$S0" ] && ok "no UAT activity during the restore" || die "UAT data changed during the restore ($S0 -> $S2); stop and ask the owner"

  step "G9. Compare (canonical data hash, migration ledger, schema/constraint fingerprints)"
  CMP=$(recov compare --approve COMPARE --dump-scope-reviewed 2>&1) || { printf '%s\n' "$CMP"; die "compare FAILED"; }
  printf '%s\n' "$CMP"
  case "$CMP" in *"PASS canonical staging data, ledger and schema/constraint fingerprints"*) ok "compare PASSED" ;; *) bad "compare did not report PASS" ;; esac
  S3=$(activity_sig); [ "$S3" = "$S0" ] && ok "no UAT activity during the compare" || bad "UAT data changed during the compare"
  table_sums "$DB" > "$EVID/.src-sums.after"
  cmp -s "$EVID/.src-sums.before" "$EVID/.src-sums.after" && ok "maxhigh_staging is byte-for-byte unchanged (CHECKSUM TABLE on every table)" || bad "maxhigh_staging checksums changed"
  rm -f "$EVID/.src-sums.before" "$EVID/.src-sums.after" "$EVID/.ct.before" "$EVID/.ct.after"
  [ "$FAILS" -eq 0 ] || { echo "$FAILS check(s) FAILED"; exit 1; }

  mark ciphertext "$CT"
  mark ciphertext_sha256 "$CT_SHA"
  mark plaintext_sha256 "$PT_SHA"
  mark plaintext_bytes "$PT_BYTES"
  mark recipients "$RECOVERY_PUB,$VERIFY_PUB"
  mark compare PASS
  mark source_activity_signature "$S0"
  step "G8+G9 summary"
  echo "Backup, isolated restore and compare PASSED."
  echo "WINDOWS DRILL INPUTS (not secret):"
  echo "  ciphertext        : $CT"
  echo "  ciphertext sha256 : $CT_SHA"
  echo "  plaintext sha256  : $PT_SHA"
}
