#!/bin/bash
# Local end-to-end test of deploy/diagnostics/batches/out/*.sh on a DISPOSABLE MariaDB 10.11 (127.0.0.1:3306) with real age.
# Simulated: /root, /var/backups, /dev/shm, /home/maxhigh-ops -> a temp tree; systemctl/curl/findmnt/stat-modes/install -o stubs.
# Real: the batch scripts' logic, the approved recovery.py from the packet, age, gzip, sha256sum, MariaDB, the SQL files.
# Usage: test-batches.sh <mariadb-bin-dir> <age-dir> <root-password> <packet.tgz>
set -uo pipefail
MARIA=$1; AGEDIR=$2; RPW=$3; PACKET=$4
REPO=$(cd "$(dirname "$0")/../.." && pwd)
BATCH="$REPO/deploy/diagnostics/batches/out"
TU=$(mktemp -d); T=$(cygpath -m "$TU"); export MAXHIGH_TEST_TREE="$T" MARIA_BIN="$MARIA" AGE_DIR="$AGEDIR" RPW
RESULTS=0; FAILED=0
t() { local name=$1; shift; if "$@"; then echo "PASS  $name"; RESULTS=$((RESULTS+1)); else echo "FAIL  $name"; RESULTS=$((RESULTS+1)); FAILED=$((FAILED+1)); fi; }
M() { "$MARIA/mariadb.exe" -h127.0.0.1 -P3306 -uroot -p"$RPW" --default-character-set=utf8mb4 -N -B "$@"; }

# ------------------------------------------------------------------ shims for OS-specific commands
mkdir -p "$T/bin" "$T/root/maxhigh-staging-admin" "$T/var-backups/maxhigh-staging" "$T/shm" "$T/home/maxhigh-ops" "$T/proc"
printf 'MemAvailable:    3000000 kB\nSwapFree:    1000000 kB\n' > "$T/proc/meminfo"
cat > "$TU/bin/mariadb" <<EOF
#!/bin/bash
x="$MARIA/mariadb.exe"
for a in "\$@"; do case "\$a" in --defaults-extra-file=*) "\$x" "\$@" | tr -d ''; exit \${PIPESTATUS[0]};; esac; done
"\$x" -h127.0.0.1 -P3306 -uroot -p"$RPW" --default-character-set=utf8mb4 "\$@" | tr -d ''; exit \${PIPESTATUS[0]}
EOF
cat > "$TU/bin/systemctl" <<'EOF'
#!/bin/bash
case "$1" in
  is-active) shift; for u in "$@"; do case "$u" in maxhigh-staging-preview.service) echo inactive;; *) echo active;; esac; done;;
  show) echo 0;;
esac
EOF
echo '#!/bin/bash
echo "{\"ok\":true,\"release\":\"2294d79afb2b900f13a9cd05c427dc9857b89de1\"}"' > "$TU/bin/curl"
echo '#!/bin/bash
echo tmpfs' > "$TU/bin/findmnt"
cat > "$TU/bin/id" <<'EOF'
#!/bin/bash
case "$1" in -u) echo 0;; -un) echo root;; *) /usr/bin/id "$@";; esac
EOF
cat > "$TU/bin/stat" <<'EOF'
#!/bin/bash
# NTFS has no unix modes: report what the production host would for root-owned private files
if [ "$1" = "-c" ] && [ "$2" = "%Y" ]; then exec /usr/bin/stat "$@"; fi
if [ "$1" = "-c" ] && [ "$2" = "%U:%G %a" ]; then
  p=$3
  case "$p" in *maxhigh-retrieval*) own="maxhigh-ops:maxhigh-ops";; *) own="root:root";; esac
  if [ -d "$p" ]; then echo "$own 700"; elif [ -e "$p" ]; then echo "$own 600"; else exit 1; fi
  exit 0
fi
exec /usr/bin/stat "$@"
EOF
cat > "$TU/bin/df" <<'EOF'
#!/bin/bash
case "$*" in *fstype*) printf 'Type\ntmpfs\n';; *) printf 'Avail\n99999999999\n';; esac
EOF
cat > "$TU/bin/install" <<'EOF'
#!/bin/bash
args=(); skip=0
for a in "$@"; do if [ $skip = 1 ]; then skip=0; continue; fi; case "$a" in -o|-g|-m) skip=1;; *) args+=("$a");; esac; done
exec /usr/bin/install "${args[@]}"
EOF
echo '#!/bin/bash
echo "$*" >> "'"$T"'/logger.log"' > "$TU/bin/logger"
printf '#!/bin/bash\nexec "%s" "$@"\n' "$(command -v python)" > "$TU/bin/python3"
printf '#!/bin/bash\necho MaxHigh-Production\n' > "$TU/bin/hostname"
printf '#!/bin/bash\nexec "%s/mariadb-dump.exe" "$@"\n' "$MARIA" > "$TU/bin/mariadb-dump"
printf '#!/bin/bash\nshift 2; exec "$@"\n' > "$TU/bin/ionice"
printf '#!/bin/bash\nexec "%s/age.exe" "$@"\n' "$AGEDIR" > "$TU/bin/age"
printf '#!/bin/bash\nexec "%s/age-keygen.exe" "$@"\n' "$AGEDIR" > "$TU/bin/age-keygen"
chmod +x "$TU"/bin/*
export PATH="$TU/bin:$PATH"; hash -r

# ------------------------------------------------------------------ real packet extraction (approved bytes)
mkdir -p "$T/root/maxhigh-staging-385ed041"
cp "$PACKET" "$T/root/maxhigh-staging-385ed041.tgz"
tar --force-local -xzf "$(cygpath -m "$T/root/maxhigh-staging-385ed041.tgz")" -C "$T/root/maxhigh-staging-385ed041"

# ------------------------------------------------------------------ disposable database fixture (state like the VPS: ledger 0000-0003, no risk row)
srv=$(M -e "SELECT @@datadir")
case "$srv" in *m1011*|*scratchpad*) ;; *) echo "Refusing: not the disposable server ($srv)"; exit 2;; esac
M -e "DROP DATABASE IF EXISTS maxhigh_staging; DROP DATABASE IF EXISTS maxhigh_staging_restorecheck;
 DROP USER IF EXISTS 'maxhigh_stage_backup'@'127.0.0.1'; DROP USER IF EXISTS 'maxhigh_stage_preview'@'127.0.0.1'; DROP USER IF EXISTS 'maxhigh_stage_migrate'@'127.0.0.1'; DROP USER IF EXISTS 'maxhigh_uat_app'@'127.0.0.1'; DROP USER IF EXISTS 'maxhigh_stage_restore'@'127.0.0.1';
 CREATE DATABASE maxhigh_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
(cd "$REPO" && DATABASE_URL="mysql://root:$RPW@127.0.0.1:3306/maxhigh_staging" CONFIRM_SCHEMA_MIGRATIONS=maxhigh_staging node scripts/migrate.mjs --apply > /dev/null)
LEDGER='0000_init-from-schema.sql 6378baf80c7281b10db326b75880fa01bc657bb6ee049a94687d87a79671c856;0001_financial_integrity.sql ce92417246b525294cbdf58d99401ef41ccf8242def0b2420c984f761c80956b;0002_reward_entitlements.sql 6acd18c48411a11ec1967d39c33abb62d08743abf7503f6f3149af3776e6d1c6;0003_rapid_quentin_quire.sql 769283b4865423e24c8554406b6642872b27748e93e7eb4b07a2aebce6eb81b2'
M maxhigh_staging -e "DELETE FROM _maxhigh_migrations WHERE version LIKE '0004%'; DELETE FROM risk_controls;"
IFS=';' read -ra L <<< "$LEDGER"; for e in "${L[@]}"; do M maxhigh_staging -e "UPDATE _maxhigh_migrations SET checksum='${e#* }' WHERE version='${e%% *}'"; done
M maxhigh_staging -e "INSERT INTO users(id,public_user_id,username,password_hash,balance,role) VALUES ('u1','uat_player1','uat_player1','h',1000.00,'player'),('u2','uat_super','uat_super','h',0.00,'superadmin')"
bpw=$(openssl rand -hex 8); ppw=$(openssl rand -hex 8); mpw=$(openssl rand -hex 8); apw=$(openssl rand -hex 8)
M -e "CREATE USER 'maxhigh_stage_backup'@'127.0.0.1' IDENTIFIED BY '$bpw'; GRANT SELECT,SHOW VIEW,TRIGGER ON maxhigh_staging.* TO 'maxhigh_stage_backup'@'127.0.0.1';
 CREATE USER 'maxhigh_stage_preview'@'127.0.0.1' IDENTIFIED BY '$ppw'; GRANT SELECT ON maxhigh_staging.* TO 'maxhigh_stage_preview'@'127.0.0.1';
 CREATE USER 'maxhigh_stage_migrate'@'127.0.0.1' IDENTIFIED BY '$mpw'; GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,DROP,INDEX,REFERENCES ON maxhigh_staging.* TO 'maxhigh_stage_migrate'@'127.0.0.1';
 CREATE USER 'maxhigh_uat_app'@'127.0.0.1' IDENTIFIED BY '$apw'; GRANT SELECT,INSERT,UPDATE,DELETE ON maxhigh_staging.* TO 'maxhigh_uat_app'@'127.0.0.1';"
for pair in "backup:maxhigh_stage_backup:$bpw" "preview:maxhigh_stage_preview:$ppw" "migrate:maxhigh_stage_migrate:$mpw"; do
  IFS=: read -r n u p <<< "$pair"
  printf '[client]\nhost=127.0.0.1\nport=3306\nprotocol=tcp\ndatabase=maxhigh_staging\nuser=%s\npassword=%s\n' "$u" "$p" > "$T/root/maxhigh-staging-admin/$n-client.cnf"
done
cp "$REPO/deploy/diagnostics/risk-controls-remediation.sql" "$T/home/maxhigh-ops/risk-controls-remediation.sql"

# disposable "permanent recovery" key pair (stands in for the Windows key; only its PUBLIC half is given to the batches)
age-keygen -o "$T/recovery.key" > /dev/null 2>&1
REC_PUB=$(age-keygen -y "$T/recovery.key")

# ------------------------------------------------------------------ build a path-substituted copy of a batch and run it
RUNNER=$(cygpath -m "$REPO/scripts/qa/recovery-local-runner.py")
runb() {   # runb <tag> [args...]  -> output in $T/out.<tag>, returns the script's exit code
  local tag=$1; shift
  local src="$BATCH/uat-$(echo "$tag" | tr 'A-Z' 'a-z').sh" dst="$T/uat-$tag.sh"
  sed -e "s#PATH=/usr/sbin:/usr/bin#PATH=$TU/bin:/usr/sbin:/usr/bin#" -e "s#/proc/meminfo#$T/proc/meminfo#g" -e "s#-p /root)#-p $T/root)#g" -e "s#/root/#$T/root/#g" -e "s#/var/backups#$T/var-backups#g" -e "s#/dev/shm#$T/shm#g" -e "s#/home/maxhigh-ops#$T/home/maxhigh-ops#g" \
      -e "s#RECOVERY_PUB=age1[0-9a-z]*#RECOVERY_PUB=$REC_PUB#" \
      -e "s#python3 -B recovery.py#python3 -B $RUNNER#g" -e "s#python3 -B -c \"#python3 -B $RUNNER --eval \"#g" "$src" > "$dst"
  sed -i "s#^PKT=.*#PKT=$T/root/maxhigh-staging-385ed041#; s#^EVID=.*#EVID=$T/root/maxhigh-evidence#" "$dst"
  # the hash of the recovery.py inside the packet is checked for real; the packet hash is of the real tgz
  bash "$dst" "$@" > "$T/out.$tag" 2>&1; return $?
}
has() { grep -q -- "$2" "$T/out.$1"; }
export QUIET_SECONDS=1

echo "=== NEGATIVE: batch G6G7 must refuse without G5 evidence"
runb G6G7; rc=$?
t "G6G7 refuses without G5.pass (exit $rc)" test $rc -ne 0
t "...and says why" has G6G7 "missing evidence"
t "...and created nothing" test "$(M -e "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='maxhigh_staging_restorecheck'")" = 0

echo "=== G5"
M -e "GRANT INSERT ON maxhigh_staging.* TO 'maxhigh_stage_backup'@'127.0.0.1'"
runb G5; rc=$?
t "G5 FAILS when the backup account has an extra privilege (exit $rc)" test $rc -ne 0
t "...no G5.pass written" test ! -e "$T/root/maxhigh-evidence/G5.pass"
M -e "REVOKE INSERT ON maxhigh_staging.* FROM 'maxhigh_stage_backup'@'127.0.0.1'"
runb G5; rc=$?
t "G5 PASSES on the correct fixture (exit $rc)" test $rc -eq 0
t "...RESULT line" has G5 "RESULT: G5 PASS"
t "...G5.pass written with packet hash" grep -q "^packet_sha=385ed04116d4f0f43b96b7b27cdd03b681482a05b9dad1ac2d295fbd4d7e40c2$" "$T/root/maxhigh-evidence/G5.pass"
t "...log hash recorded" grep -q "^log_sha256=" "$T/root/maxhigh-evidence/G5.pass"
echo "   failed checks in G5 output: $(grep -c '^FAIL' "$T/out.G5")"

echo "=== G6+G7"
runb G6G7; rc=$?
t "G6G7 passes (exit $rc)" test $rc -eq 0
t "restore schema exists and is empty" test "$(M -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='maxhigh_staging_restorecheck'")" = 0
t "restore account has exactly the minimal grants" test "$(M -e "SELECT GROUP_CONCAT(privilege_type ORDER BY privilege_type) FROM information_schema.SCHEMA_PRIVILEGES WHERE grantee=\"'maxhigh_stage_restore'@'127.0.0.1'\"")" = "CREATE,INDEX,INSERT,REFERENCES,SELECT"
t "verification key exists in RAM dir" test -s "$T/shm/maxhigh-verify.key"
t "G6G7.pass records both recipients" grep -q "^verify_pub=age1" "$T/root/maxhigh-evidence/G6G7.pass"
runb G6G7; rc=$?
t "G6G7 refuses to run twice (exit $rc)" test $rc -ne 0

echo "=== G8+G9: quiet-window gate (negative), then full run"
QUIET_SECONDS=100000 runb G8G9; rc=$?
t "G8G9 refuses while UAT is not idle (exit $rc)" test $rc -ne 0
t "...nothing written to backup dir" test -z "$(ls "$T/var-backups/maxhigh-staging" 2>/dev/null)"
sleep 2
runb G8G9; rc=$?
t "G8G9 passes (exit $rc)" test $rc -eq 0
t "compare PASS reported" has G8G9 "PASS canonical staging data, ledger and schema/constraint fingerprints"
t "source reported byte-for-byte unchanged" has G8G9 "byte-for-byte unchanged"
t "ciphertext has exactly two recipient stanzas" has G8G9 "exactly two recipient stanzas"
t "dump contains no unsafe statements" has G8G9 "no LOCK/UNLOCK TABLES"
CT=$(grep '^ciphertext=' "$T/root/maxhigh-evidence/G8G9.pass" | cut -d= -f2); PT=$(grep '^plaintext_sha256=' "$T/root/maxhigh-evidence/G8G9.pass" | cut -d= -f2)
t "restore-check holds the tables" test "$(M -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='maxhigh_staging_restorecheck'")" -ge 20

echo "=== NEGATIVE: G11 before G10a"
runb G11 --g10-plaintext-sha256 "$PT"; rc=$?
t "G11 refuses before G10a evidence (exit $rc)" test $rc -ne 0
t "...no risk row written" test "$(M -e "SELECT COUNT(*) FROM maxhigh_staging.risk_controls")" = 0

echo "=== G10a"
runb G10a; rc=$?
t "G10a passes (exit $rc)" test $rc -eq 0
t "disposable key removed" test ! -e "$T/shm/maxhigh-verify.key"
t "ciphertext copy staged for retrieval" test -s "$T/home/maxhigh-ops/maxhigh-retrieval/$CT"
t "original ciphertext still in backup dir" test -s "$T/var-backups/maxhigh-staging/$CT"

echo "=== simulated Windows drill with the PERMANENT key only"
WIN=$(age -d -i "$T/recovery.key" "$T/home/maxhigh-ops/maxhigh-retrieval/$CT" | gzip -d | sha256sum | cut -d' ' -f1)
t "permanent key reproduces the recorded plaintext fingerprint" test "$WIN" = "$PT"

echo "=== G11 negatives"
runb G11 --g10-plaintext-sha256 "$(printf '0%.0s' $(seq 64))"; rc=$?
t "G11 refuses a wrong drill hash (exit $rc)" test $rc -ne 0
runb G11; rc=$?
t "G11 refuses a missing argument (exit $rc)" test $rc -ne 0
cp "$T/home/maxhigh-ops/risk-controls-remediation.sql" "$T/sql.good"; echo "-- tampered" >> "$T/home/maxhigh-ops/risk-controls-remediation.sql"
runb G11 --g10-plaintext-sha256 "$PT"; rc=$?
t "G11 refuses a tampered SQL file (exit $rc)" test $rc -ne 0
cp "$T/sql.good" "$T/home/maxhigh-ops/risk-controls-remediation.sql"
t "...still no risk row after all refusals" test "$(M -e "SELECT COUNT(*) FROM maxhigh_staging.risk_controls")" = 0

echo "=== G11"
runb G11 --g10-plaintext-sha256 "$PT"; rc=$?
t "G11 passes (exit $rc)" test $rc -eq 0
t "risk_controls holds exactly the approved UAT values" test "$(M -e "SELECT CONCAT_WS('|',id,max_single_bet,max_daily_payout,max_weekly_limit,auto_flag_large_wins,large_win_threshold) FROM maxhigh_staging.risk_controls")" = "default|100000.00|100000000.00|1000000000.00|yes|10000.00"
t "users and balance untouched" test "$(M -e "SELECT COUNT(*),SUM(balance) FROM maxhigh_staging.users" | tr '\t' ' ')" = "2 1000.00"
t "syslog evidence entry written" grep -q "risk_controls default row inserted" "$T/logger.log"
t "evidence files exist (dry-run, commit, summary)" test "$(ls "$T"/root/maxhigh-evidence/G11-*.out "$T"/root/maxhigh-evidence/G11-evidence-*.txt 2>/dev/null | wc -l)" -eq 3
runb G11 --g10-plaintext-sha256 "$PT"; rc=$?
t "G11 refuses a second run - never overwrites (exit $rc)" test $rc -ne 0

echo
echo "evidence tree:"; ls "$T/root/maxhigh-evidence" | sed 's/^/   /'
echo "RESULT: $((RESULTS-FAILED))/$RESULTS passed"
M -e "DROP DATABASE IF EXISTS maxhigh_staging_restorecheck; DROP DATABASE IF EXISTS maxhigh_staging; DROP USER IF EXISTS 'maxhigh_stage_backup'@'127.0.0.1'; DROP USER IF EXISTS 'maxhigh_stage_preview'@'127.0.0.1'; DROP USER IF EXISTS 'maxhigh_stage_migrate'@'127.0.0.1'; DROP USER IF EXISTS 'maxhigh_uat_app'@'127.0.0.1'; DROP USER IF EXISTS 'maxhigh_stage_restore'@'127.0.0.1'" 2>/dev/null
[ -n "${KEEP_TREE:-}" ] && echo "tree kept at $T" || rm -rf "$TU"
[ "$FAILED" -eq 0 ]
