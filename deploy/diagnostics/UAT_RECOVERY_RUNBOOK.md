# MaxHigh UAT recovery runbook (Phase 2) - NOTHING IN THIS FILE HAS BEEN EXECUTED ON THE VPS

Scope: `maxhigh_staging` (UAT, synthetic data) only. No production database is in scope.
Packet: `385ed04116d4f0f43b96b7b27cdd03b681482a05b9dad1ac2d295fbd4d7e40c2` (`setup.tgz`, 56,542 bytes). The existing packet `cdd7474b...` and `/root/maxhigh-staging-cdd7474b` are never touched.
Every gate below needs the owner's explicit "APPROVE G<n>" before it runs. Stop at the first unexpected output.
Commands marked **[operator]** need an interactive `sudo` password or a private key, so they are run by the owner, not by Claude.

## Approval gates

| Gate | What | Writes? | Who | Evidence required to continue | Stop if |
|---|---|---|---|---|---|
| G0 | Packet integrity (local) | none | Claude | full SHA-256 equals `385ed04116d4f0f43b96b7b27cdd03b681482a05b9dad1ac2d295fbd4d7e40c2` | any mismatch |
| G1 | Generate the PERMANENT age recovery key (Windows) | local files only | **[operator]** | public recipient `age1...` shared; local drill decrypts with the recovery key through the passphrase prompt | passphrase not stored, drill fails |
| G2 | `scp` packet to `~/maxhigh-staging-continuation/setup-385ed041.tgz` | 1 file in maxhigh-ops home | Claude | remote SHA-256 equals `385ed04116d4f0f43b96b7b27cdd03b681482a05b9dad1ac2d295fbd4d7e40c2` | mismatch, or target file already exists |
| G3 | Unprivileged verify + unit tests in a temp dir | temp dir in maxhigh-ops home (removed) | Claude | strict manifest OK, 50 tests OK (1 skipped on Linux - needs a local Node path), only regular files/dirs | any failure |
| G4 | Root extract into `/root/maxhigh-staging-385ed041` | new root dir + root-owned tgz copy | **[operator]** | strict manifest OK, directory did not exist before | directory exists |
| G5 | Read-only state check (SQL + shell) | none | **[operator]** | see "Expected G5 results" | any expectation unmet |
| G6 | Create restore-check schema + `maxhigh_stage_restore` | DB: 1 schema, 1 account; 1 root file | **[operator]** | G5 re-run shows exact grants | pre-check fails (script aborts itself) |
| G7 | Generate the DISPOSABLE verification key ON the VPS, in RAM (`/dev/shm`) | one RAM file | **[operator]** | public recipient printed; file is `-rw------- root root` in `/dev/shm` | file not in `/dev/shm`, or not 0600 |
| G8 | Backup (quiet window) | 1 ciphertext + 1 checksum in `/var/backups/maxhigh-staging` | **[operator]** | checksum file verifies | any error |
| G9 | Restore into restore-check + compare | restore-check schema only | **[operator]** | `PASS canonical staging data, ledger and schema/constraint fingerprints` | any failure |
| G10 | Delete verification key; off-host copy + local DR decrypt drill with the permanent key | removes RAM file | **[operator]** | file gone; the real backup decrypts on Windows with the permanent key | drill fails: backup is NOT recovery-qualified |
| G11 | Risk-controls write using the configuration in `UAT_QA_PLAN.md` section 3 (PROPOSED, NOT YET APPROVED): dry run, then commit | one `risk_controls` row | **[operator]** | G9 PASS **and** G10 permanent-key drill PASS; your written approval of the exact values; dry run shows `inputs_valid=1`, `rows_inserted=1`, all `*_unchanged=1` | any other output |
| G12 | Post-fix test plan with `uat_player1` | UAT test spins | operator/Claude | one `bet` row per spin, balance arithmetic exact | any unexpected row |
| G13 | Drop restore-check schema + account (cleanup) | DB: removes scratch objects | **[operator]** | separate approval | - |

## G0 - verify the packet locally (DONE: scratch and stable copies both match)
```powershell
$pkt = "C:\Users\Keydi\AppData\Local\Temp\claude\83679715592fcd6a\7eee5964-7e6e-4447-b2e4-4adda0d38cd1\scratchpad\packet-new\setup.tgz"
$want = "385ed04116d4f0f43b96b7b27cdd03b681482a05b9dad1ac2d295fbd4d7e40c2"
$got = (Get-FileHash $pkt -Algorithm SHA256).Hash.ToLower()
if ($got -ne $want) { throw "packet hash mismatch: $got" } else { "MATCH $got" }
```
The packet currently sits in a temporary scratch folder. Copy it somewhere stable (outside the project) and re-verify before G2:
`Copy-Item $pkt "$env:USERPROFILE\maxhigh-packets\setup-385ed041.tgz"` after `New-Item -ItemType Directory "$env:USERPROFILE\maxhigh-packets"`.

## G1 - permanent recovery key on Windows (operator; needs your explicit confirmation first)
This is the ONE key procedure; it supersedes the key steps in `AGE_KEYS_WINDOWS.md` (see "Errata" at the end).
Principles: the permanent private key exists only as a passphrase-encrypted file outside the project, and is never printed, put on the clipboard,
copied to the VPS or decrypted on the VPS. Only PUBLIC `age1...` values are shared or passed to `recovery.py`. The disposable verification key is created later,
ON the VPS in RAM (G7), so no key material ever crosses your clipboard, your screen or the network.
Validated with disposable keys: the pipe plumbing (private key never written in plaintext), public-key capture and `age -d -i -`. The `age -p` passphrase prompt is
interactive and cannot be scripted.
```powershell
winget install --id FiloSottile.age -e          # or the verified release; then reopen PowerShell
age --version; age-keygen --version              # expect 1.2.x or newer

$keys = "$env:USERPROFILE\maxhigh-keys"
$project = (Resolve-Path "D:\Porjects\maxhigh-bet-hub").Path
if ($keys.StartsWith($project, [StringComparison]::OrdinalIgnoreCase)) { throw "keys folder must be outside the project" }
New-Item -ItemType Directory -Path $keys | Out-Null
icacls $keys /inheritance:r /grant:r "${env:USERNAME}:(OI)(CI)F" | Out-Null      # only you

# PERMANENT recovery key: generated straight into a passphrase-encrypted file (you are prompted twice).
# The plaintext private key is never written to disk. Use a long passphrase; store it in your password manager.
cmd /c "age-keygen 2> ""$keys\recovery.pub.txt"" | age -p -o ""$keys\maxhigh-uat-recovery.key.age"""
$recoveryPub = ((Get-Content "$keys\recovery.pub.txt") -replace '^Public key:\s*','').Trim(); $recoveryPub   # PUBLIC value, safe to share

# Local drill with the recovery key ONLY (the disposable verification key does not exist yet)
"drill" | Set-Content -NoNewline "$keys\drill.txt"
age -r $recoveryPub -o "$keys\drill.age" "$keys\drill.txt"
cmd /c "age -d ""$keys\maxhigh-uat-recovery.key.age"" | age -d -i - ""$keys\drill.age"""      # passphrase prompt, then prints: drill
cmd /c "age -d ""$keys\maxhigh-uat-recovery.key.age"" | age-keygen -y"                        # passphrase prompt; must equal $recoveryPub
Remove-Item "$keys\drill.txt","$keys\drill.age"
```
Then: keep `maxhigh-uat-recovery.key.age` in at least two offline places and the passphrase in your password manager (losing both makes every backup permanently unreadable).
Send me only `$recoveryPub`. Never paste, print, email or commit any `AGE-SECRET-KEY-...` text.

## G2 - upload (DONE: remote file new, hash verified, old setup.tgz untouched)
```powershell
$k   = "$env:USERPROFILE\.ssh\maxhigh_vps2"
$pkt = "$env:USERPROFILE\maxhigh-packets\setup-385ed041.tgz"          # the stable copy from G0 (done; uploaded in G2)
if ((Get-FileHash $pkt -Algorithm SHA256).Hash.ToLower() -ne "385ed04116d4f0f43b96b7b27cdd03b681482a05b9dad1ac2d295fbd4d7e40c2") { throw "hash mismatch" }
$ssh = 'C:\Windows\System32\OpenSSH\ssh.exe'
& $ssh -o BatchMode=yes -i $k maxhigh-ops@151.242.136.34 'test ! -e ~/maxhigh-staging-continuation/setup-385ed041.tgz && echo target-free'
& 'C:\Windows\System32\OpenSSH\scp.exe' -o BatchMode=yes -i $k $pkt maxhigh-ops@151.242.136.34:maxhigh-staging-continuation/setup-385ed041.tgz
& $ssh -o BatchMode=yes -i $k maxhigh-ops@151.242.136.34 'sha256sum ~/maxhigh-staging-continuation/setup-385ed041.tgz'   # must start 385ed04116d4
```

## G3 - unprivileged verification on the VPS (DONE: manifest 32/32 OK, 50 tests OK)
Runs as `maxhigh-ops` (not root) in a temporary directory that is removed at the end.
```sh
set -eu
cd ~/maxhigh-staging-continuation
printf '%s  setup-385ed041.tgz\n' 385ed04116d4f0f43b96b7b27cdd03b681482a05b9dad1ac2d295fbd4d7e40c2 | sha256sum --check --strict
if tar -tzf setup-385ed041.tgz | grep -qE '^/|(^|/)\.\.(/|$)'; then echo UNSAFE-MEMBER; exit 1; fi
tar -tzvf setup-385ed041.tgz | cut -c1 | sort | uniq -c        # expect only '-' (files) and 'd' (directories)
T=$(mktemp -d)
tar -xzf setup-385ed041.tgz -C "$T" --no-same-owner --no-same-permissions
( cd "$T" && sha256sum --check --strict CONTROL_SHA256SUMS && python3 -B -m unittest discover -p 'test_*.py' )
rm -rf "$T"
```
The unit tests only use temporary directories and mocks (no database, no network, no services). They run as the unprivileged user.

## G4 - root extraction into a NEW directory [operator]
The tarball is first copied to a root-owned location and verified/extracted from that copy, so `maxhigh-ops` cannot swap the file in between.
It refuses to run if the target directory already exists, and never references `/root/maxhigh-staging-cdd7474b`.
```sh
sudo sh -c 'set -eu; umask 077
  test ! -e /root/maxhigh-staging-385ed041; test ! -e /root/maxhigh-staging-385ed041.tgz
  install -m 600 -o root -g root /home/maxhigh-ops/maxhigh-staging-continuation/setup-385ed041.tgz /root/maxhigh-staging-385ed041.tgz
  printf "%s  /root/maxhigh-staging-385ed041.tgz\n" 385ed04116d4f0f43b96b7b27cdd03b681482a05b9dad1ac2d295fbd4d7e40c2 | sha256sum --check --strict
  mkdir -m 700 /root/maxhigh-staging-385ed041
  tar -xzf /root/maxhigh-staging-385ed041.tgz -C /root/maxhigh-staging-385ed041 --no-same-owner --no-same-permissions
  cd /root/maxhigh-staging-385ed041 && sha256sum --check --strict CONTROL_SHA256SUMS
  ls -ld /root/maxhigh-staging-385ed041 /root/maxhigh-staging-385ed041/recovery.py'
```
Rollback: `sudo rm -rf /root/maxhigh-staging-385ed041 /root/maxhigh-staging-385ed041.tgz` and `rm ~/maxhigh-staging-continuation/setup-385ed041.tgz`. No database or service impact.

## G5 - read-only state checks [operator]
Shell part (copy/paste block; the `sudo` lines only list names and modes):
```sh
# READ-ONLY service/host state (no changes). Run as maxhigh-ops; the sudo lines only list names/modes.
systemctl is-active maxhigh-staging-preview.service maxhigh-uat.service mariadb.service caddy.service || true
systemctl show maxhigh-uat.service -p ActiveState,SubState,NRestarts,ActiveEnterTimestamp
curl -s -m 5 http://127.0.0.1:18080/api/health; echo
free -m; uptime
df -h / /dev/shm
findmnt -no FSTYPE,OPTIONS /dev/shm; ls -ld /dev/shm
age --version; python3 --version; mariadb --version | cut -c1-70
for t in mariadb-dump gzip openssl nice ionice sha256sum; do printf '%s: ' "$t"; command -v "$t" || echo MISSING; done
sudo ls -ld /var/backups/maxhigh-staging /root/maxhigh-staging-admin
sudo ls -l /root/maxhigh-staging-admin
sudo ls -1 /var/backups/maxhigh-staging | wc -l
sudo ls -ld /root/maxhigh-staging-cdd7474b /root/maxhigh-staging-385ed041 2>&1 | head -3
```
SQL part (root over the unix socket; `SELECT`/`SHOW` only; session is `READ ONLY`; no password hashes, no row contents):
```sh
sudo mariadb -t <<'SQL'
-- READ-ONLY state check for the VPS (run as root over the unix socket). SELECT/SHOW only. No password hashes, no row data.
SET SESSION TRANSACTION READ ONLY;
SELECT 'server' AS item, VERSION() AS version, @@character_set_server AS server_charset, @@collation_server AS server_collation, @@max_connections AS max_connections;
SHOW DATABASES LIKE 'maxhigh%';
SELECT schema_name, default_character_set_name AS charset, default_collation_name AS collation FROM information_schema.schemata WHERE schema_name LIKE 'maxhigh%' ORDER BY 1;
SELECT table_schema, table_collation, engine, COUNT(*) AS tables FROM information_schema.tables WHERE table_schema LIKE 'maxhigh%' AND table_type = 'BASE TABLE' GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
SELECT table_schema, COUNT(*) AS non_utf8mb4_columns FROM information_schema.columns WHERE table_schema LIKE 'maxhigh%' AND character_set_name IS NOT NULL AND character_set_name <> 'utf8mb4' GROUP BY 1;
SELECT user, host, max_user_connections FROM mysql.user WHERE user LIKE 'maxhigh%' ORDER BY user, host;
SELECT grantee, table_schema, GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ', ') AS schema_privileges FROM information_schema.SCHEMA_PRIVILEGES WHERE grantee LIKE "'maxhigh%" GROUP BY grantee, table_schema ORDER BY 1, 2;
SELECT grantee, GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ', ') AS global_privileges FROM information_schema.USER_PRIVILEGES WHERE grantee LIKE "'maxhigh%" GROUP BY grantee ORDER BY 1;
SELECT grantee, table_schema, table_name, GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ', ') AS table_privileges FROM information_schema.TABLE_PRIVILEGES WHERE grantee LIKE "'maxhigh%" GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
SELECT (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'maxhigh_staging') AS triggers, (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'maxhigh_staging') AS routines, (SELECT COUNT(*) FROM information_schema.events WHERE event_schema = 'maxhigh_staging') AS events, (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'maxhigh_staging' AND table_type = 'BASE TABLE' AND engine <> 'InnoDB') AS non_innodb_tables;
SELECT version, checksum FROM maxhigh_staging._maxhigh_migrations ORDER BY version;
SELECT (SELECT COUNT(*) FROM maxhigh_staging.users) AS users, (SELECT COUNT(*) FROM maxhigh_staging.transactions) AS transactions, (SELECT COUNT(*) FROM maxhigh_staging.audit_logs) AS audit_logs, (SELECT COUNT(*) FROM maxhigh_staging.risk_controls) AS risk_rows, (SELECT COALESCE(SUM(balance), 0) FROM maxhigh_staging.users) AS total_balance;
SELECT NOW() AS server_now, (SELECT MAX(created_at) FROM maxhigh_staging.transactions) AS last_transaction, (SELECT MAX(created_at) FROM maxhigh_staging.audit_logs) AS last_audit_log, (SELECT MAX(last_seen_at) FROM maxhigh_staging.sessions) AS last_session_seen, (SELECT MAX(updated_at) FROM maxhigh_staging.play_sessions) AS last_play_session;
SQL
```
### Expected G5 results (stop and report if any differ)
- `maxhigh-staging-preview.service` inactive; `maxhigh-uat.service`, `mariadb.service` active; UAT health `ok` for release `2294d79...`.
- `maxhigh_staging`: charset `utf8mb4`, collation `utf8mb4_unicode_ci`, 21 InnoDB tables, `non_utf8mb4_columns` row absent, triggers/routines/events = 0, non-InnoDB = 0.
- No `maxhigh_staging_restorecheck` schema and no `maxhigh_stage_restore` account yet.
- Ledger checksums for 0000-0003 are the **LF** values (these are also the hashes of the SQL shipped in release 2294d79):
  `0000` `6378baf80c7281b10db326b75880fa01bc657bb6ee049a94687d87a79671c856`,
  `0001` `ce92417246b525294cbdf58d99401ef41ccf8242def0b2420c984f761c80956b`,
  `0002` `6acd18c48411a11ec1967d39c33abb62d08743abf7503f6f3149af3776e6d1c6`,
  `0003` `769283b4865423e24c8554406b6642872b27748e93e7eb4b07a2aebce6eb81b2`.
  A CRLF-derived value (e.g. `0000` `bb8898e4...`) would mean the ledger was written from a Windows checkout - stop and report.
- `maxhigh_stage_backup`: exactly `SELECT, SHOW VIEW, TRIGGER` on `maxhigh_staging`, global `USAGE`. `maxhigh_stage_preview`: `SELECT` only. `maxhigh_stage_migrate`: broader DDL/DML on `maxhigh_staging` only. `maxhigh_uat_app`: no access to any restore-check schema. (If any account differs, `recovery.py` refuses to run; resolve with the DBA before continuing.)
- `risk_rows = 0` (the known missing row), `users = 2`, `transactions = 0`, total balance `1000.00`.
- Quiet-window evidence: `last_session_seen` / `last_audit_log` are older than the planned window start; agree with testers that UAT is idle for G8-G9.
- `/dev/shm` is a `tmpfs` directory (not a symlink); `age` 1.1.1 or newer; `python3` 3.11+; `openssl`, `gzip`, `nice`, `ionice`, `mariadb-dump` present; `/var/backups/maxhigh-staging` root-only with enough free space (43 GB free earlier).

## G6 - create the isolated restore-check schema and account [operator, DB write]
Reviewed against the tested minimal grant set `SELECT, INSERT, CREATE, INDEX, REFERENCES` (no `ALTER`, `LOCK TABLES`, `DROP`, `DELETE`, `UPDATE`, global or `maxhigh_staging` privilege).
Review findings fixed vs the earlier draft: (1) backticks inside an unquoted heredoc would have been executed by the shell as commands -> rewritten with `printf`;
(2) added pre-checks so nothing is created if the schema, account or `restore-client.cnf` already exists or `maxhigh_staging` is not `utf8mb4`;
(3) the account is created first, so a failure never leaves a schema without its guard.
Tested locally on MariaDB 10.11.14: creates exactly this; a second run refuses and changes nothing; the account can create/insert/select in its own schema and is denied
everything on `maxhigh_staging` (SELECT/INSERT/DROP/CREATE/SHOW/`DROP DATABASE`/`GRANT`) and `ALTER`/`LOCK`/`DROP`/`DELETE`/`UPDATE` anywhere.
```sh
# open a root shell first:  sudo -s
# Run as root (sudo -s) on the VPS. Creates ONLY the isolated restore-check schema + its minimal account.
# Aborts before changing anything unless every pre-check passes. Never prints the password.
set -eu
set +x
umask 077
ADMIN=/root/maxhigh-staging-admin
SCHEMA=maxhigh_staging_restorecheck
ACCOUNT=maxhigh_stage_restore

# --- pre-checks (read-only); any failure stops the script with nothing created
test -d "$ADMIN"
test ! -e "$ADMIN/restore-client.cnf"
test "$(mariadb -N -e "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='$SCHEMA'")" = 0
test "$(mariadb -N -e "SELECT COUNT(*) FROM mysql.user WHERE user='$ACCOUNT'")" = 0
test "$(mariadb -N -e "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='maxhigh_staging' AND default_character_set_name='utf8mb4'")" = 1

# --- create (single session; printf keeps backticks and backslashes literal, password only on stdin)
P=$(openssl rand -hex 32)
{
  printf "CREATE USER '%s'@'127.0.0.1' IDENTIFIED BY '%s' WITH MAX_USER_CONNECTIONS 4;\n" "$ACCOUNT" "$P"
  printf "CREATE DATABASE %s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n" "$SCHEMA"
  printf 'GRANT SELECT, INSERT, CREATE, INDEX, REFERENCES ON `maxhigh\_staging\_restorecheck`.* TO %s;\n' "'$ACCOUNT'@'127.0.0.1'"
} | mariadb

# --- client option file for recovery.py (root-only, mode 0600)
install -m 600 /dev/null "$ADMIN/restore-client.cnf"
printf '[client]\nhost=127.0.0.1\nport=3306\nprotocol=tcp\ndatabase=%s\nuser=%s\npassword=%s\n' "$SCHEMA" "$ACCOUNT" "$P" >> "$ADMIN/restore-client.cnf"
unset P
stat -c '%U:%G %a %n' "$ADMIN/restore-client.cnf"
```
If a step after the first `CREATE` fails, do NOT re-run blindly; run G5 SQL, report the output, and let the DBA decide (the pre-checks will intentionally block a re-run).
Note: the restore account cannot `DROP`/`DELETE`, so cleaning a failed import (non-empty restore-check) is a root action under its own approval (G13).

## G7 - disposable verification key: generated ON the VPS, in RAM only [operator]
This key only has to decrypt this one UAT backup (synthetic data) during the restore check, so it is created where it is used: nothing is pasted, copied, echoed or
transported, and nothing is stored on Windows. It is deleted in G10. Accepted residual risk: tmpfs pages can be swapped to disk (the VPS has ~1 GiB, normally unused, swap);
the key protects synthetic UAT data only. The permanent recovery key is never generated on, copied to or decrypted on the VPS.
```sh
sudo sh -c 'set -eu; umask 077; test ! -e /dev/shm/maxhigh-verify.key; age-keygen -o /dev/shm/maxhigh-verify.key; ls -l /dev/shm/maxhigh-verify.key'
```
`age-keygen` prints only `Public key: age1...` (a PUBLIC value; it is the second `--recipient`) and the file must show `-rw------- 1 root root`.
Optional re-check of the public value at any time: `sudo age-keygen -y /dev/shm/maxhigh-verify.key`.

## G8 - backup in a quiet window [operator]
Preconditions: G5 clean, G6 verified, G7 verified, testers told that UAT is idle. `recovery.py` itself refuses to run if the staging preview unit is active, if the
backup account's grants differ from `SELECT, SHOW VIEW, TRIGGER` on `maxhigh_staging`, or if any recipient is not a valid age public key.
```sh
sudo sh -c 'cd /root/maxhigh-staging-385ed041 && python3 -B recovery.py backup --approve BACKUP \
  --recipient <RECOVERY_age1_PUBLIC> --recipient <VERIFY_age1_PUBLIC> --peak-bytes 1073741824'
sudo ls -l /var/backups/maxhigh-staging
sudo sh -c 'cd /var/backups/maxhigh-staging && sha256sum -c *.sha256'
```
The dump is a `--single-transaction` snapshot (no table locks), so UAT stays usable, but anything written between this snapshot and G9 will show as a mismatch.

## G9 - restore into the isolated schema, then compare [operator]
```sh
FILE=$(sudo sh -c 'ls -1 /var/backups/maxhigh-staging/*.sql.gz.age | tail -1'); HASH=$(sudo sha256sum "$FILE" | cut -d" " -f1); echo "$FILE"; echo "$HASH"
sudo sh -c "cd /root/maxhigh-staging-385ed041 && python3 -B recovery.py restore --approve RESTORE --backup $FILE --sha256 $HASH \
  --identity /dev/shm/maxhigh-verify.key --peak-bytes 1073741824 --dump-scope-reviewed --restore-grants-reviewed"
sudo sh -c 'cd /root/maxhigh-staging-385ed041 && python3 -B recovery.py compare --approve COMPARE --dump-scope-reviewed'
```
`--dump-scope-reviewed` and `--restore-grants-reviewed` assert that you reviewed G5/G6 output. Success line:
`PASS canonical staging data, ledger and schema/constraint fingerprints.` A data-hash mismatch after UAT activity is not corruption evidence by itself: check the activity timestamps first.

## G10 - remove the disposable key; off-host copy and local decrypt drill
```sh
sudo rm -f /dev/shm/maxhigh-verify.key && sudo ls -l /dev/shm/maxhigh-verify.key 2>&1 | head -1      # expect: No such file
```
There is no local verification key to delete (it never existed on Windows). The backup is **not recovery-qualified** until the permanent key proves it can open the real ciphertext
away from the VPS. With your approval: root copies the ciphertext to the maxhigh-ops home (`sudo install -m 600 -o maxhigh-ops <file> ~/`), you `scp` it to Windows, remove the home copy,
then on Windows:
```powershell
cmd /c "age -d ""$keys\maxhigh-uat-recovery.key.age"" | age -d -i - ""<downloaded>.sql.gz.age"" > ""$keys\drill.sql.gz"""   # passphrase prompt
```
and (optional) restore `drill.sql.gz` into a throw-away local MariaDB. Delete the local plaintext artefacts afterwards.

## G11 / G12 - risk-controls write and QA (only after G9 PASS and the G10 drill; values per `UAT_QA_PLAN.md`)
The earlier fixed UAT limits are withdrawn. The proposed finite configuration, write path (SQL or audited superadmin screen), accounts/credits and the QA matrix are in
`UAT_QA_PLAN.md`; nothing is written until you approve them. The SQL path uses the already uploaded, hash-verified `~/risk-controls-remediation.sql`
(SHA-256 `33a5e7cad688...695f51`, no values inside, aborts unless `DATABASE()` equals `@target_db`), dry run first (`ROLLBACK;`), then `COMMIT;`.
Rollback for a wrong value is a single-row `UPDATE` through the same reviewed path; never delete the `default` row.
G12 = the QA matrix and the read-only reconciliation in `UAT_QA_PLAN.md` sections 7-8.

## Abort / rollback summary
- Before G6: nothing in the database was touched; remove files only.
- After G6 (schema + account created): leave in place until G13, or drop them (root) under approval. They cannot affect `maxhigh_staging`.
- A failed or partial restore leaves a non-empty restore-check schema: root drops/recreates it (never the restore account); `maxhigh_staging` is unaffected by design.
- At any point: `sudo rm -f /dev/shm/maxhigh-verify.key`.

## Errata: differences between this runbook and `AGE_KEYS_WINDOWS.md` (inside the approved packet - not edited, to keep hash `385ed041...`)
| # | `AGE_KEYS_WINDOWS.md` | This runbook (authoritative) | Why |
|---|---|---|---|
| 1 | Verification key generated on Windows, pasted into the VPS terminal | Verification key generated on the VPS in `/dev/shm` (G7) | Nothing is pasted, echoed or left in clipboard history / scrollback; the key never exists on Windows |
| 2 | Drill encrypts to both keys and decrypts with each | Local drill uses the recovery key only; the real backup is drilled in G10 | Proves the passphrase, file and recipient correspond without a second key to protect |
| 3 | No guard that the key folder is outside the project | `StartsWith` guard before creating the folder | Prevents accidental placement inside the repository |
| 4 | Prints the whole `Public key:` line | Extracts the bare `age1...` value and re-derives it from the encrypted key (`age-keygen -y`) | Detects a wrong or corrupted key file early |
| 5 | Retrieval of the ciphertext is a side note | Mandatory G10 drill before the backup is called recovery-qualified | `recovery.py` itself states it is not qualified until off-host decryption passes |
Everything else (folder ACL, pipeline that keeps the plaintext key off disk, `.gitignore` safety net, public-only `--recipient`, rotation) is consistent.
If the packet is ever rebuilt, align `AGE_KEYS_WINDOWS.md` with this runbook first.

## Remaining blockers
1. The permanent key is not generated yet (G1 needs your confirmation; the passphrase prompt is interactive). The disposable key is created on the VPS in G7.
2. (resolved) The packet is at `C:\Users\Keydi\maxhigh-packets\setup-385ed041.tgz` and on the VPS at `/home/maxhigh-ops/maxhigh-staging-continuation/setup-385ed041.tgz` (G0, G2, G3 done).
3. G4-G10 need an interactive `sudo` password, so they are run by the operator.
4. Live VPS facts are still unverified until G5: account grants, `openssl`/`nice`/`ionice`/`python3` versions, `/dev/shm` type, free space, ledger checksums, charset.
5. A quiet UAT window must be agreed for G8-G9.
