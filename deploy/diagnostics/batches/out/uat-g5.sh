#!/bin/bash
# =====================================================================================================================
# MaxHigh UAT batch G5 - G5 read-only verification of the host, packet, services, database, grants, charset and ledger
# Generated from reviewed parts (header + body + footer). Run ONLY through the runner one-liner, which copies this file
# to a root-owned location and verifies its SHA-256 before executing it. Stops at the first failure.
# Evidence: /root/maxhigh-evidence/G5-<UTC>.log, plus G5.pass (with the log hash) only when every check passed.
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
LOG="$EVID/G5-$TS.log"
PENDING="$EVID/.G5.pending"
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

# ------------------------------------------------------------------------------------------------------------ G5 body
# READ-ONLY verification. It changes nothing except writing its own evidence files under /root/maxhigh-evidence.

q_schema_privs() {   # q_schema_privs <grantee>  ->  "schema:PRIV,PRIV;schema:PRIV"  (backslashes stripped, no hashes)
  sqlv "SELECT COALESCE(GROUP_CONCAT(CONCAT(s, ':', p) ORDER BY s SEPARATOR ';'), '') FROM (SELECT REPLACE(table_schema, CHAR(92), '') AS s, GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ',') AS p FROM information_schema.SCHEMA_PRIVILEGES WHERE grantee = \"'$1'@'127.0.0.1'\" GROUP BY table_schema) x"
}

check_packet() {
  step "1. Packet integrity (G4 result re-verified)"
  [ "$(sha_of /root/maxhigh-staging-385ed041.tgz)" = "$PACKET_SHA" ] && ok "root copy of packet tgz has the approved SHA-256" || bad "packet tgz SHA-256 differs"
  (cd "$PKT" && sha256sum --check --strict CONTROL_SHA256SUMS > /dev/null 2>&1) && ok "control manifest: every listed file verifies (strict)" || bad "control manifest check failed"
  [ "$(sha_of "$PKT/recovery.py")" = "$RECOVERY_SHA" ] && ok "recovery.py is the reviewed, patched version" || bad "recovery.py hash differs"
  [ "$(stat -c '%U:%G %a' "$PKT")" = "root:root 700" ] && ok "extraction directory is root:root 700" || bad "extraction directory ownership/mode: $(stat -c '%U:%G %a' "$PKT")"
  [ -d /root/maxhigh-staging-cdd7474b ] && ok "previous control packet directory untouched and present" || info "previous packet directory not present (not required)"
}

check_services() {
  step "2. Services and UAT health"
  [ "$(systemctl is-active maxhigh-staging-preview.service || true)" = inactive ] && ok "staging preview unit inactive (recovery.py requires this)" || bad "staging preview unit is not inactive"
  for u in maxhigh-uat mariadb; do
    [ "$(systemctl is-active "$u.service" || true)" = active ] && ok "$u.service active" || bad "$u.service not active"
  done
  info "caddy.service: $(systemctl is-active caddy.service || true)"
  [ "$(systemctl show maxhigh-uat.service -p NRestarts --value)" = 0 ] && ok "maxhigh-uat NRestarts = 0" || bad "maxhigh-uat has restarted"
  H=$(curl -s -m 5 http://127.0.0.1:18080/api/health || true)
  case "$H" in *'"ok":true'*"$UAT_RELEASE"*) ok "UAT health ok for release ${UAT_RELEASE:0:12}" ;; *) bad "UAT health unexpected: $H" ;; esac
}

check_resources() {
  step "3. Memory, swap, disk and /dev/shm"
  avail=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo); swapfree=$(awk '/^SwapFree:/ {print $2}' /proc/meminfo)
  [ "$avail" -ge 1500000 ] && ok "MemAvailable ${avail} kB (>= 1500000; recovery.py needs 1310720)" || bad "MemAvailable ${avail} kB too low"
  [ "$swapfree" -ge 524288 ] && ok "SwapFree ${swapfree} kB (>= 524288)" || bad "SwapFree ${swapfree} kB too low"
  disk=$(df -B1 --output=avail /var/backups | tail -1 | tr -d ' ')
  [ "$disk" -ge 5000000000 ] && ok "free space for backups ${disk} bytes (>= 5 GB)" || bad "free space ${disk} bytes too low"
  [ "$(findmnt -no FSTYPE /dev/shm)" = tmpfs ] && [ ! -L /dev/shm ] && ok "/dev/shm is a real tmpfs directory" || bad "/dev/shm is not a plain tmpfs directory"
  [ ! -e "$SHM_KEY" ] && ok "no verification key present yet" || bad "$SHM_KEY already exists"
}

check_tools() {
  step "4. Tools and compatibility"
  for t in mariadb mariadb-dump gzip openssl nice ionice sha256sum age age-keygen python3; do
    command -v "$t" > /dev/null && ok "tool present: $t" || bad "tool missing: $t"
  done
  info "age: $(age --version 2>&1 | head -1)   age-keygen: $(age-keygen --version 2>&1 | head -1)   $(python3 --version 2>&1)"
  python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' && ok "python >= 3.11 (hashlib.file_digest)" || bad "python too old"
  # age must accept two recipients and decrypt with either (round trip with throw-away keys held only in this process).
  T=$(mktemp -d -p /dev/shm); k1=$(age-keygen 2> /dev/null | tee "$T/k1" | age-keygen -y); k2=$(age-keygen 2> /dev/null | tee "$T/k2" | age-keygen -y)
  printf 'drill' | age -r "$k1" -r "$k2" > "$T/c"
  [ "$(age -d -i "$T/k1" "$T/c")" = drill ] && [ "$(age -d -i "$T/k2" "$T/c")" = drill ] && ok "installed age encrypts to two recipients and either key decrypts" || bad "age two-recipient round trip failed"
  printf 'x' | age -r "$RECOVERY_PUB" > /dev/null && ok "age accepts the permanent recovery PUBLIC recipient" || bad "age rejected the recovery recipient"
  rm -rf "$T"
}

check_files() {
  step "5. Admin directory, client option files, backup directory"
  [ -d "$ADMIN" ] && ok "admin directory exists" || bad "admin directory missing"
  for f in backup migrate preview; do
    [ "$(stat -c '%U:%G %a' "$ADMIN/$f-client.cnf" 2> /dev/null)" = "root:root 600" ] && ok "$f-client.cnf is root:root 600" || bad "$f-client.cnf missing or wrong owner/mode"
  done
  [ ! -e "$ADMIN/restore-client.cnf" ] && ok "restore-client.cnf does not exist yet" || bad "restore-client.cnf already exists"
  [ "$(stat -c '%U:%G %a' "$BACKUPS" 2> /dev/null)" = "root:root 700" ] && ok "backup directory is root:root 700" || bad "backup directory missing or wrong owner/mode"
  info "files currently in backup directory: $(find "$BACKUPS" -maxdepth 1 -type f | wc -l)"
}

check_database() {
  step "6. MariaDB: server, schema, charset, accounts, grants, ledger"
  V=$(sqlv "SELECT VERSION()"); case "$V" in 10.11.*) ok "MariaDB $V (10.11 series, the tested line)" ;; *) bad "MariaDB $V is not 10.11.x" ;; esac
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='$DB'")" = 1 ] && ok "schema $DB exists" || bad "schema $DB missing"
  [ "$(sqlv "SELECT CONCAT(default_character_set_name,'/',default_collation_name) FROM information_schema.schemata WHERE schema_name='$DB'")" = "utf8mb4/utf8mb4_unicode_ci" ] && ok "$DB default is utf8mb4 / utf8mb4_unicode_ci" || bad "$DB default charset/collation differs"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='$DB' AND character_set_name IS NOT NULL AND character_set_name <> 'utf8mb4'")" = 0 ] && ok "no non-utf8mb4 text columns" || bad "non-utf8mb4 columns exist"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB' AND table_type='BASE TABLE'")" = 21 ] && ok "21 base tables" || bad "table count is not 21"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB' AND table_type='BASE TABLE' AND engine <> 'InnoDB'")" = 0 ] && ok "all tables InnoDB" || bad "non-InnoDB tables exist"
  [ "$(sqlv "SELECT (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$DB')+(SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='$DB')+(SELECT COUNT(*) FROM information_schema.events WHERE event_schema='$DB')")" = 0 ] && ok "no triggers, routines or events (backup precondition)" || bad "triggers/routines/events present"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='$RESTORE_DB'")" = 0 ] && ok "restore-check schema does not exist yet" || bad "restore-check schema already exists"
  [ "$(sqlv "SELECT COUNT(*) FROM mysql.user WHERE user='maxhigh_stage_restore'")" = 0 ] && ok "restore account does not exist yet" || bad "restore account already exists"
  ACCTS=$(sqlv "SELECT COALESCE(GROUP_CONCAT(CONCAT(user,'@',host) ORDER BY user SEPARATOR ','),'') FROM mysql.user WHERE user LIKE 'maxhigh%'")
  [ "$ACCTS" = "maxhigh_stage_backup@127.0.0.1,maxhigh_stage_migrate@127.0.0.1,maxhigh_stage_preview@127.0.0.1,maxhigh_uat_app@127.0.0.1" ] && ok "exactly the four expected maxhigh accounts, all loopback-only" || bad "maxhigh accounts differ: $ACCTS"
  B=$(q_schema_privs maxhigh_stage_backup);  [ "$B" = "maxhigh_staging:SELECT,SHOW VIEW,TRIGGER" ] && ok "backup account: exactly SELECT, SHOW VIEW, TRIGGER on $DB" || bad "backup account grants: $B"
  P=$(q_schema_privs maxhigh_stage_preview); [ "$P" = "maxhigh_staging:SELECT" ] && ok "preview account: SELECT only on $DB" || bad "preview account grants: $P"
  info "migrate account schema grants: $(q_schema_privs maxhigh_stage_migrate)"
  info "uat app account schema grants: $(q_schema_privs maxhigh_uat_app)"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.USER_PRIVILEGES WHERE grantee LIKE \"'maxhigh%\" AND privilege_type <> 'USAGE'")" = 0 ] && ok "no global privileges on any maxhigh account" || bad "a maxhigh account holds global privileges"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.TABLE_PRIVILEGES WHERE grantee LIKE \"'maxhigh%\"")" = 0 ] && ok "no table-level grants on maxhigh accounts" || bad "table-level grants exist"
  [ "$(sqlv "SELECT COUNT(*) FROM information_schema.SCHEMA_PRIVILEGES WHERE grantee LIKE \"'maxhigh%\" AND '$RESTORE_DB' LIKE table_schema")" = 0 ] && ok "no existing grant pattern on any maxhigh account matches the restore-check schema name" || bad "a maxhigh account has a grant pattern that covers $RESTORE_DB"
  L=$(sqlv "SELECT COALESCE(GROUP_CONCAT(CONCAT(version,' ',checksum) ORDER BY version SEPARATOR ';'),'') FROM $DB._maxhigh_migrations")
  [ "$L" = "$LEDGER_EXPECTED" ] && ok "migration ledger: 0000-0003 with the LF checksums shipped in the approved release" || bad "ledger differs: $L"
  R=$(sqlv "SELECT CONCAT_WS(' ', 'users=', (SELECT COUNT(*) FROM $DB.users), 'transactions=', (SELECT COUNT(*) FROM $DB.transactions), 'audit_logs=', (SELECT COUNT(*) FROM $DB.audit_logs), 'risk_rows=', (SELECT COUNT(*) FROM $DB.risk_controls), 'total_balance=', (SELECT COALESCE(SUM(balance),0) FROM $DB.users))")
  info "data snapshot: $R"
  mark data_snapshot "$(echo "$R" | tr ' ' '_')"
  [ "$(sqlv "SELECT COUNT(*) FROM $DB.risk_controls")" = 0 ] && ok "risk_controls default row is missing (the known cause of the spin failure)" || info "risk_controls already has rows - batch G11 will refuse to overwrite; review before continuing"
  info "seconds since last UAT activity: $(sqlv "SELECT TIMESTAMPDIFF(SECOND, GREATEST(COALESCE((SELECT MAX(created_at) FROM $DB.transactions),'1970-01-01'), COALESCE((SELECT MAX(created_at) FROM $DB.audit_logs),'1970-01-01'), COALESCE((SELECT MAX(last_seen_at) FROM $DB.sessions),'1970-01-01'), COALESCE((SELECT MAX(updated_at) FROM $DB.users),'1970-01-01')), NOW())")"
}

main() {
  set -Eeuo pipefail
  step "G5 context"
  echo "utc=$(date -u +%FT%TZ) host=$(hostname) user=$(id -un) invoked_by=${SUDO_USER:-unknown}"
  check_packet; check_services; check_resources; check_tools; check_files; check_database
  step "G5 summary"
  if [ "$FAILS" -eq 0 ]; then echo "All G5 checks passed."; else echo "$FAILS check(s) FAILED."; exit 1; fi
  mark checks_failed 0
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
  { printf 'batch=G5\npacket_sha=%s\n' "$PACKET_SHA"; cat "$PENDING"; printf 'log=%s\nlog_sha256=%s\nfinished_utc=%s\n' "$LOG" "$LSHA" "$(date -u +%FT%TZ)"; } > "$EVID/G5.pass"
  chmod 600 "$EVID/G5.pass"
  printf 'evidence: '; sha256sum "$EVID/G5.pass"
  echo "RESULT: G5 PASS"
else
  echo "RESULT: G5 FAIL (exit $rc) - do not run any later batch; send this output and the log to the assistant"
fi
rm -f "$PENDING"
[ "$rc" -eq 0 ]
