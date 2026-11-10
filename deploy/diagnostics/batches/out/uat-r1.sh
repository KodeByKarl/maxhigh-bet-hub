#!/bin/bash
# =====================================================================================================================
# MaxHigh UAT batch R1 - fresh backup before 0005 migration
# Generated from reviewed parts (header + body + footer). Run ONLY through the runner one-liner, which copies this file
# to a root-owned location and verifies its SHA-256 before executing it. Stops at the first failure.
# Evidence: /root/maxhigh-evidence/R1-<UTC>.log, plus R1.pass (with the log hash) only when every check passed.
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
LOG="$EVID/R1-$TS.log"
PENDING="$EVID/.R1.pending"
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


# ---- R1 main: fresh backup (+ reset of the DISPOSABLE restore-check schema, new RAM key, stage ciphertext copy) ----
RETR=/home/maxhigh-ops/maxhigh-retrieval

main() {
  set -Eeuo pipefail
  step "Gate: earlier evidence and state"
  need_marker G5; need_marker G6G7; need_marker G8G9
  VERIFY_PUB_OLD=$(marker_val G6G7 verify_pub)
  [ "$RESTORE_DB" = maxhigh_staging_restorecheck ] && [ "$DB" = maxhigh_staging ] || die "unexpected schema names"
  [ -e "$ADMIN/restore-client.cnf" ] && ok "restore-client.cnf present" || die "restore-client.cnf missing"
  [ "$(systemctl is-active maxhigh-staging-preview.service || true)" = inactive ] && ok "staging preview unit inactive" || die "staging preview unit is active"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$DB'")" = 0 ] && ok "source has no triggers (migration 0005 not applied yet; recovery.py backup supports this state only)" || die "source already has triggers; recovery.py would refuse"
  [ "$(sqlv "SELECT version FROM $DB._maxhigh_migrations ORDER BY version DESC LIMIT 1")" = 0003_rapid_quentin_quire.sql ] && ok "ledger ends at 0003 (pre-migration state)" || info "ledger tip: $(sqlv "SELECT version FROM $DB._maxhigh_migrations ORDER BY version DESC LIMIT 1")"
  OLD=$(ls -1 "$BACKUPS"/*.sql.gz.age | wc -l); info "existing ciphertext files (kept, never deleted): $OLD"

  step "Quiet-window gate"
  IDLE=$(idle_seconds); info "seconds since last UAT activity: $IDLE (required >= $QUIET_SECONDS)"
  [ "$IDLE" -ge "$QUIET_SECONDS" ] && ok "UAT idle long enough" || die "UAT active ${IDLE}s ago - wait and re-run (nothing changed yet)"

  step "Reset the DISPOSABLE restore-check schema (tables of $RESTORE_DB only; never $DB)"
  for t in $(sqlv "SELECT table_name FROM information_schema.tables WHERE table_schema='$RESTORE_DB' AND table_type='BASE TABLE'"); do
    mariadb -e "SET FOREIGN_KEY_CHECKS=0; DROP TABLE \`maxhigh_staging_restorecheck\`.\`$t\`"
  done
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$RESTORE_DB'")" = 0 ] && ok "restore-check schema is empty" || die "restore-check not empty"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB'")" -gt 15 ] && ok "$DB untouched ($(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB'") tables)" || die "source table count unexpected"

  step "New disposable verification key (RAM only)"
  [ ! -e "$SHM_KEY" ] || die "$SHM_KEY already exists"
  age-keygen -o "$SHM_KEY" 2> /dev/null
  VERIFY_PUB=$(age-keygen -y "$SHM_KEY")
  [ "$(df --output=fstype "$SHM_KEY" | tail -1 | tr -d ' ')" = tmpfs ] && ok "key on tmpfs" || die "key not on tmpfs"
  trap 'rm -f "$SHM_KEY"' EXIT

  S0=$(activity_sig); info "activity signature before: $S0"
  table_sums "$DB" > "$EVID/.src-sums.before"; ok "recorded CHECKSUM TABLE of $(wc -l < "$EVID/.src-sums.before") source tables"
  ls -1 "$BACKUPS"/*.sql.gz.age | sort > "$EVID/.ct.before"

  step "Encrypted backup (recipients: permanent recovery key + this run's disposable key)"
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
  PT_BAD=$(age -d -i "$SHM_KEY" "$FILE" | gzip -d | grep -ciE '^(LOCK TABLES|UNLOCK TABLES|USE |CREATE DATABASE|DROP )|ALTER TABLE|DISABLE KEYS|DEFINER' || true)
  [ "$PT_BAD" = 0 ] && ok "no unsafe statements in dump" || bad "$PT_BAD unsafe statement line(s)"
  [ "$FAILS" -eq 0 ] || exit 1
  S1=$(activity_sig); [ "$S1" = "$S0" ] && ok "no UAT activity during backup" || die "UAT data changed during backup"

  step "Isolated restore into $RESTORE_DB"
  recov restore --approve RESTORE --backup "$FILE" --sha256 "$CT_SHA" --identity "$SHM_KEY" --peak-bytes 1073741824 --dump-scope-reviewed --restore-grants-reviewed
  RT=$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$RESTORE_DB'")
  [ "$RT" = "$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB'")" ] && ok "restore-check holds all $RT tables" || bad "table count differs"
  S2=$(activity_sig); [ "$S2" = "$S0" ] && ok "no UAT activity during restore" || die "UAT data changed during restore"

  step "Compare"
  CMP=$(recov compare --approve COMPARE --dump-scope-reviewed 2>&1) || { printf '%s\n' "$CMP"; die "compare FAILED"; }
  printf '%s\n' "$CMP"
  case "$CMP" in *"PASS canonical staging data, ledger and schema/constraint fingerprints"*) ok "compare PASSED" ;; *) bad "compare did not report PASS" ;; esac
  S3=$(activity_sig); [ "$S3" = "$S0" ] && ok "no UAT activity during compare" || bad "UAT data changed during compare"
  table_sums "$DB" > "$EVID/.src-sums.after"
  cmp -s "$EVID/.src-sums.before" "$EVID/.src-sums.after" && ok "$DB byte-for-byte unchanged (CHECKSUM TABLE)" || bad "$DB checksums changed"
  rm -f "$EVID/.src-sums.before" "$EVID/.src-sums.after" "$EVID/.ct.before" "$EVID/.ct.after"
  [ "$FAILS" -eq 0 ] || { echo "$FAILS check(s) FAILED"; exit 1; }

  step "Remove disposable key and stage a COPY of the ciphertext for the Windows permanent-key drill"
  rm -f "$SHM_KEY"; [ ! -e "$SHM_KEY" ] && ok "RAM key removed" || bad "key still present"
  install -d -m 700 -o maxhigh-ops -g maxhigh-ops "$RETR"
  install -m 600 -o maxhigh-ops -g maxhigh-ops "$FILE" "$RETR/$CT"
  install -m 600 -o maxhigh-ops -g maxhigh-ops "$FILE.sha256" "$RETR/$CT.sha256"
  [ "$(sha_of "$RETR/$CT")" = "$CT_SHA" ] && ok "staged copy matches" || bad "staged copy differs"
  [ "$FAILS" -eq 0 ] || exit 1

  mark ciphertext "$CT"; mark ciphertext_sha256 "$CT_SHA"; mark plaintext_sha256 "$PT_SHA"; mark plaintext_bytes "$PT_BYTES"
  mark recipients "$RECOVERY_PUB,$VERIFY_PUB"; mark compare PASS; mark source_activity_signature "$S0"
  step "Summary"
  echo "Backup, isolated restore and compare PASSED."
  echo "WINDOWS DRILL INPUTS (not secret):"
  echo "  ciphertext        : $CT"
  echo "  ciphertext sha256 : $CT_SHA"
  echo "  plaintext sha256  : $PT_SHA"
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
  { printf 'batch=R1\npacket_sha=%s\n' "$PACKET_SHA"; cat "$PENDING"; printf 'log=%s\nlog_sha256=%s\nfinished_utc=%s\n' "$LOG" "$LSHA" "$(date -u +%FT%TZ)"; } > "$EVID/R1.pass"
  chmod 600 "$EVID/R1.pass"
  printf 'evidence: '; sha256sum "$EVID/R1.pass"
  echo "RESULT: R1 PASS"
else
  echo "RESULT: R1 FAIL (exit $rc) - do not run any later batch; send this output and the log to the assistant"
fi
rm -f "$PENDING"
[ "$rc" -eq 0 ]
