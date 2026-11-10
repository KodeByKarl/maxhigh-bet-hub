#!/bin/bash
# =====================================================================================================================
# MaxHigh UAT batch G6G7 - G6 restore-check schema + least-privilege account, G7 disposable RAM verification key
# Generated from reviewed parts (header + body + footer). Run ONLY through the runner one-liner, which copies this file
# to a root-owned location and verifies its SHA-256 before executing it. Stops at the first failure.
# Evidence: /root/maxhigh-evidence/G6G7-<UTC>.log, plus G6G7.pass (with the log hash) only when every check passed.
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
LOG="$EVID/G6G7-$TS.log"
PENDING="$EVID/.G6G7.pending"
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

# --------------------------------------------------------------------------------------------------------- G6+G7 body
# Creates ONLY: the isolated restore-check schema, the least-privilege account maxhigh_stage_restore, its root-only option
# file, and the disposable verification key in RAM. It never touches maxhigh_staging.

ACCOUNT=maxhigh_stage_restore

main() {
  set -Eeuo pipefail
  step "Gate: G5 evidence"
  need_marker G5
  ok "G5.pass present and bound to packet ${PACKET_SHA:0:12}"
  [ "$(( $(date +%s) - $(stat -c %Y "$EVID/G5.pass") ))" -lt 43200 ] && ok "G5 evidence is less than 12 hours old" || die "G5 evidence is stale; re-run the G5 batch"

  step "Pre-checks (nothing is created unless every one passes)"
  [ ! -e "$ADMIN/restore-client.cnf" ] && ok "restore-client.cnf absent" || die "restore-client.cnf already exists"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='$RESTORE_DB'")" = 0 ] && ok "restore-check schema absent" || die "restore-check schema already exists"
  [ "$(sqlv "SELECT COUNT(*) FROM mysql.user WHERE user='$ACCOUNT'")" = 0 ] && ok "restore account absent" || die "restore account already exists"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='$DB' AND default_character_set_name='utf8mb4'")" = 1 ] && ok "$DB is utf8mb4" || die "$DB is not utf8mb4"
  [ ! -e "$SHM_KEY" ] && ok "no verification key present" || die "$SHM_KEY already exists"
  BEFORE=$(sqlv "SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM $DB.users), (SELECT COUNT(*) FROM $DB.transactions), (SELECT COUNT(*) FROM $DB.audit_logs), (SELECT COALESCE(SUM(balance),0) FROM $DB.users))")
  info "source snapshot before: $BEFORE"

  step "G6. Create the isolated restore-check schema and account"
  P=$(openssl rand -hex 32)
  {
    printf "CREATE USER '%s'@'127.0.0.1' IDENTIFIED BY '%s' WITH MAX_USER_CONNECTIONS 4;\n" "$ACCOUNT" "$P"
    printf "CREATE DATABASE %s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n" "$RESTORE_DB"
    printf 'GRANT SELECT, INSERT, CREATE, INDEX, REFERENCES ON `maxhigh\\_staging\\_restorecheck`.* TO %s;\n' "'$ACCOUNT'@'127.0.0.1'"
  } | mariadb
  install -m 600 -o root -g root /dev/null "$ADMIN/restore-client.cnf"
  printf '[client]\nhost=127.0.0.1\nport=3306\nprotocol=tcp\ndatabase=%s\nuser=%s\npassword=%s\n' "$RESTORE_DB" "$ACCOUNT" "$P" >> "$ADMIN/restore-client.cnf"
  unset P
  ok "schema, account and option file created (password never printed)"
  [ "$(stat -c '%U:%G %a' "$ADMIN/restore-client.cnf")" = "root:root 600" ] && ok "restore-client.cnf is root:root 600" || bad "restore-client.cnf owner/mode"

  step "G6. Verify exactly what was created"
  [ "$(sqlv "SELECT CONCAT(default_character_set_name,'/',default_collation_name) FROM information_schema.schemata WHERE schema_name='$RESTORE_DB'")" = "utf8mb4/utf8mb4_unicode_ci" ] && ok "restore-check schema is utf8mb4 / utf8mb4_unicode_ci" || bad "restore-check charset"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$RESTORE_DB'")" = 0 ] && ok "restore-check schema is empty" || bad "restore-check schema is not empty"
  G=$(sqlv "SELECT COALESCE(GROUP_CONCAT(CONCAT(s, ':', p) ORDER BY s SEPARATOR ';'), '') FROM (SELECT REPLACE(table_schema, CHAR(92), '') AS s, GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ',') AS p FROM information_schema.SCHEMA_PRIVILEGES WHERE grantee = \"'$ACCOUNT'@'127.0.0.1'\" GROUP BY table_schema) x")
  [ "$G" = "maxhigh_staging_restorecheck:CREATE,INDEX,INSERT,REFERENCES,SELECT" ] && ok "restore account: exactly CREATE, INDEX, INSERT, REFERENCES, SELECT on $RESTORE_DB, nothing else" || bad "restore account schema grants: $G"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.USER_PRIVILEGES WHERE grantee = \"'$ACCOUNT'@'127.0.0.1'\" AND privilege_type <> 'USAGE'")" = 0 ] && ok "no global privileges" || bad "global privileges present"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.TABLE_PRIVILEGES WHERE grantee = \"'$ACCOUNT'@'127.0.0.1'\"")" = 0 ] && ok "no table-level privileges" || bad "table-level privileges present"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.SCHEMA_PRIVILEGES WHERE grantee = \"'$ACCOUNT'@'127.0.0.1'\" AND '$DB' LIKE table_schema")" = 0 ] && ok "NO privilege on $DB (pattern semantics checked)" || bad "restore account can reach $DB"
  (cd "$PKT" && python3 -B -c "import recovery; recovery.require_minimal_account('$ADMIN/restore-client.cnf', recovery.RESTORE_DB, recovery.RESTORE_PRIVILEGES); print('production grant check: OK')") && ok "recovery.py's own grant check accepts the account" || bad "recovery.py grant check rejected the account"
  I=$(mariadb --defaults-extra-file="$ADMIN/restore-client.cnf" -N -B -e "SELECT CURRENT_USER(), DATABASE()")
  [ "$I" = "$(printf '%s@127.0.0.1\t%s' "$ACCOUNT" "$RESTORE_DB")" ] && ok "the option file connects as the restore account to the restore-check schema" || bad "connection identity: $I"
  if mariadb --defaults-extra-file="$ADMIN/restore-client.cnf" -N -B -e "SELECT 1 FROM $DB.users LIMIT 1" > /dev/null 2>&1; then bad "restore account CAN read $DB"; else ok "restore account is denied reading $DB"; fi
  AFTER=$(sqlv "SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM $DB.users), (SELECT COUNT(*) FROM $DB.transactions), (SELECT COUNT(*) FROM $DB.audit_logs), (SELECT COALESCE(SUM(balance),0) FROM $DB.users))")
  [ "$AFTER" = "$BEFORE" ] && ok "source snapshot unchanged ($AFTER)" || bad "source snapshot changed: $BEFORE -> $AFTER"
  [ "$FAILS" -eq 0 ] || { echo "$FAILS check(s) FAILED in G6; stop here. Do NOT re-run blindly: the pre-checks will block a re-run until the DBA reviews."; exit 1; }

  step "G7. Disposable verification key, generated in RAM on this host (never leaves it)"
  age-keygen -o "$SHM_KEY" 2> /dev/null
  VERIFY_PUB=$(age-keygen -y "$SHM_KEY")
  [ "$(stat -c '%U:%G %a' "$SHM_KEY")" = "root:root 600" ] && ok "$SHM_KEY is root:root 600" || bad "key file owner/mode"
  [ "$(df --output=fstype "$SHM_KEY" | tail -1 | tr -d ' ')" = tmpfs ] && ok "key lives on tmpfs (RAM)" || bad "key is not on tmpfs"
  case "$VERIFY_PUB" in age1*) ok "verification PUBLIC recipient: $VERIFY_PUB" ;; *) bad "could not derive a public recipient" ;; esac
  [ "$VERIFY_PUB" != "$RECOVERY_PUB" ] && ok "verification recipient differs from the permanent recovery recipient" || bad "recipients are identical"
  [ "$FAILS" -eq 0 ] || exit 1

  mark restore_account "$ACCOUNT"
  mark restore_schema "$RESTORE_DB"
  mark verify_pub "$VERIFY_PUB"
  mark recovery_pub "$RECOVERY_PUB"
  mark source_snapshot "$BEFORE"
  step "G6+G7 summary"; echo "Restore-check schema, minimal account and RAM-only verification key are ready."
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
  { printf 'batch=G6G7\npacket_sha=%s\n' "$PACKET_SHA"; cat "$PENDING"; printf 'log=%s\nlog_sha256=%s\nfinished_utc=%s\n' "$LOG" "$LSHA" "$(date -u +%FT%TZ)"; } > "$EVID/G6G7.pass"
  chmod 600 "$EVID/G6G7.pass"
  printf 'evidence: '; sha256sum "$EVID/G6G7.pass"
  echo "RESULT: G6G7 PASS"
else
  echo "RESULT: G6G7 FAIL (exit $rc) - do not run any later batch; send this output and the log to the assistant"
fi
rm -f "$PENDING"
[ "$rc" -eq 0 ]
