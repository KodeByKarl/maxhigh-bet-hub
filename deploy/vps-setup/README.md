# MaxHigh VPS setup kit — prepared, not executed

**Latest autonomous continuation:** runtime bootstrap is complete and the verified archive is in the private VPS inbox. Agent sudo remains password-blocked, so protected extraction/SQL/startup cannot be claimed. The finite `finish_private_staging.py --approve QUALIFY-PRIVATE-STAGING` continuation prepares the pinned release, admits only a new empty staging schema for automatic migrations, records a metadata checkpoint and verifies schema/grants, then enforces the existing recovery gate. Missing verified backup/restore/off-host/key-recovery evidence leaves the preview OFF. It creates no secrets, forges no certification, resets no schema, changes no pinned app bytes and enables no public traffic. See the consolidated audit report for actual results and the hash-pinned one-time command.

**Current execution handoff:** the owner has now approved routine runtime installation, updates, required directories and staging preparation. `bootstrap_install.py --approve INSTALL-APPROVED-RUNTIMES` is a finite one-shot installer using this kit, not a privileged runner/control service. It first checks SSH/UFW, refreshes package indexes, selects coherent Ubuntu MariaDB10.11 packages, installs private Node24.22.2 and PM2**7.1.2**, audits PM2, applies conservative fresh-server MariaDB resources and creates staging directories. It suppresses package auto-start temporarily without replacing an existing policy; Caddy remains gated/inactive pending proxy approval. It also prepares only the fresh maxhigh_staging schema, restricted staging accounts and locally generated private environment files after checking query/audit logging is off. No application transfer, migration or app startup occurs. Sudo authentication must happen in the operator's existing interactive terminal; no security policy change is made. Older per-step approval requirements below are superseded only within this newly approved scope. A hash-pinned root snapshot is required before running the installer.

Prepared2026-11-09 (Asia/Shanghai). **No remote access, upload, package install, firewall/SSH change, SQL, merge, push or deployment was performed.** This is an operator control kit outside the immutable application artifact. No application/business logic or verified archive was changed. Review these new controls and their `CONTROL_SHA256SUMS` separately before any later approved upload; do not insert them into `release.tgz` or presume the artifact's successful CI qualified these new scripts.

Primary reference: [verified artifact execution plan](../staging/VERIFIED_ARTIFACT_EXECUTION_PLAN.md). Artifact only: source `2294d79afb2b900f13a9cd05c427dc9857b89de1`, [CI42547305324](https://github.com/KodeByKarl/maxhigh-bet-hub/actions/runs/42547305324), archive457442355 bytes, SHA-256 `6d7d07f0181d1ab5fed2a0029705d3f354d2ed05d655595f9d3a49467b380c51`. All100 game mappings and3987 assets remain. Exact Node24.22.2; MariaDB10.11; one PM2 worker. No rebuild or VPS npm install of the application.

## Conflicts and prerequisites to resolve before execution

1. Latest server specification uses temporary bootstrap `root` and provider key label **MaxHigh-VPS2-PC**. Older instructions used `maxhigh` and a local key filename. A key label is not a Windows path. Confirm actual private-key path, SSH port22 or actual alternate port, and independently obtained host-key fingerprint. Do not assume agent access or read the key into chat/scripts.
2. Server is named MaxHigh-Production; running production services/data and provider recovery console are uninspected. SSH/UFW, updates, package installation, global MariaDB/Caddy tuning and reboots affect the whole host. Separate approval/maintenance plan required; none is inferred from staging permission.
3. No public staging route. Existing Caddy/HTTPS stays intact. Compression/cache and global DB resource settings are uninstalled proposals only. Root disabling is forbidden until a second non-root key login, working sudo and console recovery are proven.
4. The artifact wrapper requires Node24.22.2 exactly. Kit uses a private `/opt/maxhigh-node-24.22.2` and `/opt/maxhigh-pm2` to avoid switching production's binary/symlink. Private runtime paths differ from the execution plan's illustrative `/usr/bin/node`; service template explicitly uses the private path. Existing matching global tools can be reused only after separately reviewing paths/templates; do not alias silently.
5. Root-owned immutable releases strengthen the older first-transfer guide's runtime-owned directories. Stage root remains the exact required `/var/www/maxhigh/staging`; changing the path requires a newly reviewed wrapper/artifact, not editing verified payload.
6. 2560MiB MemAvailable and8GiB post-peak disk reserve are actual admission gates. On a busy shared4GB host these may fail. Use a separate matching VM or an approved maintenance/resource window; do not weaken gates or stop production to force fit.

## Kit and execution contract

| File | Purpose |
|---|---|
| `setup.py` | Read-only inventory; separately approved admin, private Node/PM2, packages, directories |
| `hardening.py` | Separate SSH/firewall/index/logrotate phases; login/recovery confirmation required |
| `database.py` | Fresh synthetic staging schema/accounts and private secrets; refuses unowned existing schemas/users |
| `stage.py` | Exact artifact extraction/verification; migration plan/apply; DB isolation check; guarded startup/smoke; staging-only OFF rollback |
| `recovery.py` | Streaming multi-recipient encrypted staging backup, empty restorecheck import, canonical data + schema fingerprint comparison, least-privilege account checks |
| `monitor.py` | One-shot RAM/swap/disk/log/cgroup pressure evidence without process environments |
| `templates/` | Root-safe service/SSH/logrotate templates; explicitly uninstalled MariaDB/Caddy/update proposals |
| `test_controls.py` | Local denial, integrity, scope and pipeline tests; no server interaction |

Every script requires a Linux/Ubuntu24.04/x86_64 root session and an exact `--approve PHASE` argument. **Typing that flag is not authorization**: first obtain the user's approval for that specific phase. No shell orchestrator calls all phases. Scripts never initiate SSH, download artifacts from GitHub or automatically enable boot/CI deployment. The setup kit is operator-controlled; do not grant the application sudo to invoke it.

Idempotency means repeating an approved matching state does not overwrite it. Different existing config, package prefix, identity, secret, archive or immutable release fails closed. A failed step may leave new staging-only resources (DDL/package installs are not atomic). Preserve and inspect them before an approved retry; no wildcard cleanup. Package versions already installed still need candidate/transaction review. Different existing SSH/UFW/global settings are not silently normalized. The scripts do not relax all existing config just to become idempotent.

Stage/admin secrets must be root-only0600, except `.env.preview` root:runtime0640. Use a private operator session, `set +x`, `umask077`; no transcript recorder, PM2 dumps, environment printouts, raw connection errors or SQL password arguments. Logs/reports contain gate results and fingerprints, not secrets/customer data. On failure command names are reported without argv/stdin/stderr. Inspect diagnostic details only through a separately approved private local session; never turn shell tracing on.

## 0. Exact first phase — request approval before SSH

**Only read-only preflight is proposed next.** Verify provider-console access and host fingerprint first. The following PowerShell requires an existing independently verified known-host entry and asks for the real key path; it does not use the agent, copy a key, create an inbox or upload a script. Confirm SSH port22 from provider configuration; change only after review if different.

```powershell
$SshKey = Read-Host 'Full existing private-key path for provider key label MaxHigh-VPS2-PC'
$KnownHosts = Join-Path $env:USERPROFILE '.ssh\known_hosts'
if (!(Test-Path -LiteralPath $SshKey -PathType Leaf)) { throw 'Key file missing; stop' }
if (!(Test-Path -LiteralPath $KnownHosts -PathType Leaf)) { throw 'Trusted known_hosts missing; stop' }
ssh-keygen.exe -F 151.242.136.34 -f $KnownHosts
if ($LASTEXITCODE -ne 0) { throw 'Verify/install public host key through provider console first' }
$Preflight = @'
set -eu
id -un
cat /etc/os-release
uname -m
getconf _NPROCESSORS_ONLN
date -u
timedatectl show -p NTPSynchronized -p Timezone
free -m
swapon --show --bytes
df -B1 / /var /var/www
df -i / /var /var/www
ip -brief address
ip route show default
ss -lnt
systemctl list-units --type=service --state=running --no-pager --plain
for tool in node pm2 pm2-runtime python3 mariadb mariadb-dump caddy ufw age; do
  command -v "$tool" || true
done
dpkg-query -W -f='${Package} ${Version}\n' openssh-server sudo ufw mariadb-server caddy unattended-upgrades fail2ban 2>/dev/null || true
if command -v ufw >/dev/null; then ufw status verbose; fi
apt list --upgradable 2>/dev/null
if test -e /var/run/reboot-required; then printf 'REBOOT_REQUIRED\n'; else printf 'NO_REBOOT_FLAG\n'; fi
if test -f /root/.ssh/authorized_keys; then
  stat -c '%a %U %G %n' /root/.ssh/authorized_keys
  ssh-keygen -lf /root/.ssh/authorized_keys | awk '{print $1,$2,$NF}'
fi
if test -d /var/www/maxhigh; then
  stat -c '%a %U %G %n' /var/www/maxhigh
fi
if test -e /var/www/maxhigh/.env.database; then
  stat -c '%a %U %G %n' /var/www/maxhigh/.env.database
fi
if test -e /var/www/maxhigh/staging; then printf 'EXISTING_STAGING_REQUIRES_REVIEW\n'; fi
vmstat 1 10
'@
$Preflight = $Preflight -replace "`r`n", "`n"
# RUN ONLY AFTER EXPLICIT READ-ONLY SSH APPROVAL:
$Preflight | ssh.exe -F NUL -T -p 22 -i $SshKey `
  -o BatchMode=yes -o IdentitiesOnly=yes -o ForwardAgent=no `
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" `
  -o GlobalKnownHostsFile=NUL root@151.242.136.34 'sh -s'
if ($LASTEXITCODE -ne 0) { throw 'Preflight incomplete; stop and report; no repair authorized' }
```

Minimal images may lack `/var/www`, some tools or NTP reporting. Such failure is evidence to review, not permission to install/repair. Update availability uses cached indexes; no apt update/upgrade, PM2 daemon command, production DB connection or Caddy reload. Provider firewall, SSH socket activation and IPv6 must be reviewed too. Do not publish root key comments, raw private configs or full package proxy settings. No command above was executed by the agent.

**Approval question for next turn:** authorize this read-only SSH preflight only, after confirming the actual key path, port and independently verified host fingerprint? Stop after its report before any change.

## 1. Review preflight; approve operator/bootstrap recovery

Record OS24.04/x86_64,2CPU,4GB,1GB existing swap, clock synchronization, real free bytes/inodes, listening services, current UFW/provider firewall, pending security packages and reboot marker. Inventory root/other authorized-key **fingerprints**, never private keys. Identify live traffic and service owners. Inspect Caddy's static roots privately: neither staged releases/secrets nor inbox may be web-served. If production root exposes the nested staging tree, stop for an isolation design review.

Review approved control files/hashes locally. Their upload is a new explicit approval, separate from artifact transfer; these controls are not inside release.tgz. After an approved upload, administrator installs a root-owned control directory (example `/root/maxhigh-vps-controls`,0700), verifies CONTROL_SHA256SUMS before Python execution, and keeps it outside application-writable paths. Never execute controls directly from an untrusted operator-writable checkout as root. Use Python3.12+ from Ubuntu; no pip install needed.

Example following-phase commands, **not authorized by this document**:

```bash
cd /root/maxhigh-vps-controls
sha256sum --check --strict CONTROL_SHA256SUMS
python3 setup.py preflight --approve PREFLIGHT
# After separate approval; public file must be independently verified, NOT private key.
python3 setup.py admin --approve ADMIN --user maxhigh-ops --public-key /root/maxhigh-ops.pub
passwd maxhigh-ops   # Private terminal; no argument password; do not record/paste it.
```

The sudo administrator has a password for sudo (no blanket NOPASSWD). A locked-password account created by adduser needs this private password step before sudo verification. Open a second SSH session as `maxhigh-ops` using its approved key and run `sudo -v`, `sudo id -u` (expect0). Keep root's original session and provider console open. Repeat admin setup only for owned matching identity/key; existing users require `--existing-admin-reviewed`. The script rejects the production/operator `maxhigh` account to avoid silently granting it more privilege.

## 2. Updates, firewall, SSH hardening — separately approved host-wide phases

Do not combine these into one connection. Preserve current configs/recovery instructions through provider console. Verify real SSH port (including socket activation), provider rules and IPv6. Never UFW reset, change SSH port, delete existing keys or install an AllowUsers list blindly.

```bash
# Refresh indexes only after approval; may consume network/disk.
python3 hardening.py security-index --approve SECURITY-INDEX
# Review, without installation, exact planned packages and service restart effects:
apt-get -s install --no-install-recommends sudo ufw python3 age logrotate
# Install ONLY approved missing/candidate packages; simulation and maintenance review required.
python3 setup.py packages --approve PACKAGES --maintenance-approved --simulation-reviewed \
 --packages sudo ufw python3 age logrotate
# Firewall bootstrap ONLY if UFW inactive and its existing saved rules were reviewed.
python3 hardening.py firewall --approve FIREWALL --admin-user maxhigh-ops --ssh-port 22 \
 --console-verified --new-login-verified --sudo-verified --existing-rules-reviewed
# STOP: second login + expected SSH/80/443 access, no3306/18080, IPv6/provider policy checked.
# Then, separately approved root/password SSH disabling:
python3 hardening.py ssh --approve SSH --admin-user maxhigh-ops --client-ip APPROVED_OPERATOR_PUBLIC_IP \
 --console-verified --new-login-verified --sudo-verified
```

Replace the IP placeholder before invocation. Active existing UFW is a manual review path; the bootstrap script refuses to rewrite it. Inactive saved UFW rules are preserved, so the operator must resolve any extra permissive rules under separate approval before calling the host hardened. Allow required TCPSSH/80/443 only; no UDP443 unless HTTP3 is separately desired/approved, no DB/app/admin public ports. Never disable required provider networking or agent rules without understanding them.

SSH changes use a new managed snippet only, `sshd -t`, effective `sshd -T -C` tests for root+new admin, then reload, not restart. First-value/Include/Match precedence can block the template; failure removes only its just-created snippet and leaves prior settings. Existing snippet differences fail rather than overwrite. If reload fails or fresh login fails, use original session/provider console to remove **only the known new snippet**, revalidate and reload old SSH configuration; no global SSH replacement. Keep sessions open until a new non-root login and sudo succeed again. Source: [Ubuntu OpenSSH configuration](https://ubuntu.com/server/docs/how-to/security/openssh-server/).

Install security updates only after reviewing exact candidates, package simulation, rollback/restart impacts and maintenance approval. `setup.py packages` intentionally has a small allowlist; other OS/kernel security transactions require an administrator-reviewed command, not a generic upgrade-all script. A reboot marker requires a separate approved reboot window and post-reboot SSH/service check. No script reboots or removes kernels.

`unattended-upgrades-review-only.conf` proposes security origins and no automatic reboot; do not enable automatic service-affecting updates without host policy approval. Do not install fail2ban by default. First measure SSH auth-failure volume and existing firewall controls; if justified, measure fail2ban RSS/CPU and choose an SSH-only journal-backed jail with operator CIDR exclusions and tested recovery. Installing its package does not prove a jail is configured or useful. No extra monitoring agent/container stack is needed.

## 3. Runtime installation — no production PATH change

Use installed correct tools if review proves exact versions and paths; otherwise use the private prefixes expected by this kit. Official Node archive must be downloaded and authenticated on a trusted workstation/admin channel with signed vendor SHASUMS and independently trusted release keys. Do not run curl-to-shell. Actual Node archive checksum is a separate vendor checksum, **not** the application archive checksum. Obtain/review it before installation; no Linux Node checksum is invented here. [Official Node24.22.2 downloads](https://nodejs.org/en/download/archive/v24.22.2).

```bash
python3 setup.py node --approve NODE \
 --archive /ROOT_PRIVATE_APPROVED_PATH/node-v24.22.2-linux-x64.tar.xz \
 --sha256 APPROVED_64_HEX_VENDOR_NODE_ARCHIVE_HASH
/opt/maxhigh-node-24.22.2/bin/node --version  # v24.22.2
/opt/maxhigh-node-24.22.2/bin/node /opt/maxhigh-node-24.22.2/lib/node_modules/npm/bin/npm-cli.js --version
# Exact reviewed7.x.y patch, not latest. Separate network/package/dependency approval:
python3 setup.py pm2 --approve PM2 --version APPROVED_PM2_7_PATCH
```

Node archive extraction is bounded and uses Python's safe data filter; existing private prefix must already match or it stops. Production `/usr/bin/node`, symlinks, PM2 home and service PATH stay unchanged. PM2 is installed privately with lifecycle scripts disabled, no global npm install, no daemon startup. Inspect retained lockfile and `npm audit --prefix /opt/maxhigh-pm2 --audit-level=high` under approved network review before app startup. If private install is incomplete, stop for exact-path inspection; no automatic removal/retry. Do not install dependencies/build from application source. The artifact already contains traced Linux runtime dependencies.

If missing, MariaDB server/client must come from reviewed Ubuntu24.04 sources with candidates10.11.x (validated CI used10.11.19). Caddy should use the existing reviewed install or a separately reviewed signed package source. Installation may start services; use package transaction approval and inspect first. Never replace/reinitialize `/var/lib/mysql`, run unattended hardening password changes or restart the live service automatically. Exact commands can use the packages phase after successful candidate/simulation/maintenance review; no unverified external repository is added by scripts.

## 4. Resource, directories and isolation

Use the primary plan's full disk formula. Archive0.426GiB + second archive copy0.426GiB + extracted payload0.467GiB + overhead/current rollback capacity/logs/DB/backup/import temporary space must leave **8GiB free after peak on each affected filesystem**. Nominal50GB is not50GiB. The bundled extractor has an additional5GiB immediate-free check. For first synthetic DB keep a reviewed256MiB DB+index cap; larger needs recalculation. No production financial history pruning, binlog deletion or optimistic compression assumptions.

Admission checks in scripts are snapshot guards, not proof of IO/native-swap stability. Inventory at least10minutes; stop if ongoing pressure/steal or insufficient RAM. Node's1024MiB heap is not RSS. Unit budgets: MemoryHigh1280MiB, MemoryMax1792MiB, swap128MiB, CPUQuota50%(half one CPU), IOWeight10, TasksMax128; one fork, PM2 RSS1536MiB, pool6/queue30/idle3/admission64. Startup requires2560MiB MemAvailable, swapfree512MiB. No new swapfile/sysctl or durability downgrade.

```bash
python3 setup.py directories --approve DIRECTORIES
```

If parent `/var/www/maxhigh` is absent, stop and separately approve creation of an empty root-owned parent. Never chmod/chown an existing production parent. Scripts create only exact nested staging resources, runtime `maxhigh-stage-preview` (nologin/no supplementary groups/sudo/SSH), root-owned releases/incoming/evidence, private `.pm2`/logs, root-only admin/backup folders. Runtime must not read production `.env.database` or write production parent. If production secrets are world-readable, stop; changing live permissions is a separate action. Verify parent traversal without adding production groups.

MariaDB review-only template suggests512MiB buffer pool,30 connections, small per-query buffers and caches. Shared memory/connection consumption must be measured first; don't apply a staging budget globally. Preserve `innodb_flush_log_at_trx_commit=1` and `sync_binlog=1` when binary logging is enabled; never relax them for speed. Binlogs/recovery topology and retention require their own review. [MariaDB commit durability](https://mariadb.com/docs/server/server-usage/storage-engines/innodb/binary-log-group-commit-and-innodb-flushing-performance).

Caddy review-only template is commented and deliberately contains no staging site. Existing HTTPS stays active. Any future compressed/static cache policy must cache only truly fingerprinted public files and exclude sessions/RPC/financial decisions; no route/path to staging or credentials. No Caddy validation/reload/write in this kit.

## 5. Transfer and authenticate — separate gates

Follow [FIRST_TRANSFER_GUIDE Gates2–4](../staging/FIRST_TRANSFER_GUIDE.md), with bootstrap/admin identity reviewed for current host state. No transfer in the current task. Transfer four approved release files only; no `.env`, keys, source, Windows modules or DB. New control-kit upload is separate and its own hashes must be reviewed. Check archive size/hash on workstation and Ubuntu, and metadata/extractor/manifest pins against trusted constants before executing extraction.

```bash
python3 stage.py extract --approve EXTRACT --inbox /ABSOLUTE_PRIVATE_APPROVED_INBOX
python3 stage.py verify --approve VERIFY
```

The helper verifies archive457442355 bytes, exact SHA/manifest/extractor/metadata/checksum inventory, uses only the artifact's authenticated safe extractor, then root-owns the new immutable release and invokes its verifier as runtime. No generic tar fallback. Refuses unsafe paths, links, duplicate/special entries and overwrites. Existing release is accepted only after full verification, not rewritten. Runtime uses the exact full-SHA path; no editable current pointer. Stop/report before SQL.

## 6. Fresh staging DB and migration — separate provisioning/apply approval

DBA reviews server10.11, durability and schema collation requirements, isolated accounts and secret-safe audit/general-log handling. Provide a root0600 admin-client INI locally (not production `.env.database`). Schema/user identifiers in helper SQL are fixed to staging; no production imports/queries/repairs. Use fresh/synthetic data only. The helper refuses to adopt existing unowned staging schema/users. A partial prior owned install can be retried under review without resetting passwords.

```bash
python3 database.py --approve PROVISION-STAGING-DATABASE \
 --admin-client /root/APPROVED_LOCAL_DBA_CLIENT.cnf --secret-logging-reviewed
python3 stage.py migrate-plan --approve MIGRATE-PLAN
# STOP: expected exit2 captured internally means pending; review all SQL/recovery checkpoint first.
python3 stage.py migrate-apply --approve MIGRATE-APPLY --recovery-checkpoint-reviewed
python3 stage.py database-check --approve DATABASE-CHECK
```

Before apply, separately approve fresh empty-schema checkpoint or independently tested pre-change backup. Helper generates independent random credentials **locally**, writes root-only files under `/root/maxhigh-staging-admin`, root:runtime0640 `.env.preview`, no terminal output of passwords. No `DATABASE_URL`, payment/Cloudflare/SMTP/prod keys. Login tests verify actual schema/account. No blind FLUSH PRIVILEGES, global grants or password resets. Creating accounts may be recorded by DB audit facilities; if secret-safe provisioning is not established, **do not run database.py**; DBA must use an approved secret manager/channel instead.

Preview `maxhigh_stage_preview@127.0.0.1` is SELECT-only on `maxhigh_staging.*`, max6 connections; migration user has schema-local reviewed DDL/DML only; backup user has staging SELECT/SHOW VIEW/TRIGGER only. DBA verifies all global/schema/column/role grants on every identity. `database-check` rejects unexpected direct grants/roles on preview and checks exact migration ledger/health columns. It does not prove privileges on other identities or production file isolation; those are separate review items.

Migrator uses exact bundled `.output/migrate.mjs`, private Node, clean environment and cwd, forced target guard, and name-matched confirmation. Four migrations must complete; rerun listing must have no pending. Check schema/FKs and synthetic invariants privately. DDL implicitly commits, so transaction rollback is not schema recovery. No test harness/CI root fixtures on the VPS, no deleting ledger entries to force reruns. The readonly preview user never gets migration credentials.

## 7. Backup, off-server storage and isolated restoration

Primary plan section8 defines full acceptance. Stop preview; forbid staging writers/DDL; check InnoDB,256MiB synthetic dataset and measured disk/IO/temp/binlog budget. The backup helper rejects visible views/triggers/routines/events pending expanded DBA review; DBA must separately inventory objects invisible to its restricted account. It does not certify production backups.

```bash
# Repeat --recipient (1-4 age X25519 PUBLIC keys, never private keys): the permanent OFFLINE recovery key
# (its private half never reaches the VPS) plus, optionally, a disposable verification key whose private half is
# placed in /dev/shm only for the restore check and deleted afterwards. See AGE_KEYS_WINDOWS.md.
python3 recovery.py backup --approve BACKUP --recipient OFFLINE_RECOVERY_PUBLIC_RECIPIENT --recipient DISPOSABLE_VERIFY_PUBLIC_RECIPIENT \
 --peak-bytes APPROVED_MEASURED_INCREMENTAL_PEAK_BYTES
```

Use a new root-private ciphertext filename; bounded streaming dump->gzip-1->age, no plaintext SQL file. Every process exit is checked; a partial file is untrusted and never marked verified. Outputs ciphertext plus checksum. Peek at metadata/checksums only, never decrypt to a public file or print rows. Store recovery key separately from server/CI/archive and validate retrieval.

**Off-server copy is a separate approval, destination/account/host fingerprint not yet supplied.** Operator selects a restricted encrypted-backup destination and credentials outside CI. After approval, from the backup holder use strict known-host checking with a dedicated backup identity, e.g. `scp -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -i /ROOT_PRIVATE_BACKUP_TRANSPORT_KEY -- /var/backups/maxhigh-staging/EXACT_BACKUP.sql.gz.age /var/backups/maxhigh-staging/EXACT_BACKUP.sql.gz.age.sha256 APPROVED_USER@APPROVED_BACKUP_HOST:APPROVED_PRIVATE_PATH/`. Verify checksum after retrieval from destination, not just upload exit. This example is not an executable configured command; no destination is invented or contacted. Destination retention/immutability/access/RPO/RTO/key-recovery policy must be approved before claiming off-server protection.

DBA separately creates an **empty** `maxhigh_staging_restorecheck` with `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` (the same as `maxhigh_staging`; a `latin1` default cannot store the peso sign and compare's schema fingerprint includes table/column collations) and the account `maxhigh_stage_restore` with exactly `GRANT SELECT, INSERT, CREATE, INDEX, REFERENCES ON `maxhigh\_staging\_restorecheck`.* TO 'maxhigh_stage_restore'@'127.0.0.1'` (no LOCK TABLES, ALTER, DROP, global or source-schema privilege; the dump is produced with `--skip-add-locks --skip-disable-keys` so none is needed); use root0600 restore-client options from template. `recovery.py` re-reads the account's own `SHOW GRANTS` and refuses anything beyond that set, and the backup account beyond `SELECT, SHOW VIEW, TRIGGER` on `maxhigh_staging`. Compare uses `--single-transaction --skip-lock-tables` (never locks live tables), also compares schema/constraint fingerprints, and must run when UAT is quiet or any live write since the backup will look like a mismatch. No application can access this schema. Inspect backup for CREATE DATABASE/USE/DEFINER/cross-schema references before import; helper requires this confirmation, not an automatic SQL rewrite. First validate complete age authentication+gzip integrity, then import; never restore over production or source staging.

```bash
python3 recovery.py restore --approve RESTORE --backup /var/backups/maxhigh-staging/EXACT_BACKUP.sql.gz.age \
 --sha256 APPROVED_CIPHERTEXT_HASH --identity /ROOT_PRIVATE_AGE_IDENTITY \
 --peak-bytes APPROVED_MEASURED_INCREMENTAL_PEAK_BYTES \
 --dump-scope-reviewed --restore-grants-reviewed
python3 recovery.py compare --approve COMPARE --dump-scope-reviewed
```

Canonical data hashes stream without plaintext files, with matched dump options and primary-key ordering; tables without PK block comparison pending a reviewed ordering method. Also compare schema/columns/indexes/FKs, every table count, migration checksums and synthetic fixture values, not just aggregate row counts. Helper data/ledger pass alone does not mark restore fully verified. Test deliberately corrupted **disposable copy** with age and require rejection; never corrupt sole backup. Test off-server retrieval/key access and record measured RTO/backup size/resource peaks. Restorecheck cleanup is a separate exact-schema destructive approval; no script drops it.

Retention proposal: latest verified pre-change recovery point plus two recent successful encrypted staging checkpoints locally, and approved7 daily/4 weekly off-server copies if storage permits. Do not install pruning: calculate actual bytes first, preserve unverified/failed evidence and never delete last verified recovery point. New backup/restore/import must not overlap preview startup or other maintenance. Production RPO/RTO/binlog/PITR/off-server restore certification remains blocked and out of scope.

## 8. Start private preview and validate — separate approval

Service template uses private Node/PM2, root-owned pinned release, dedicated PM2_HOME, no boot enable, no Caddy route, only127.0.0.1:18080. App credentials are SELECT-only, wrapper forcesfinancial block. Require cgroupv2 and verified systemd IP restriction support; review unsupported warnings. Root-owned service limits the whole staging PM2 cgroup, not shared MariaDB allocations. `Restart=no` prevents systemd retry loops; bundled PM2 retains bounded internal restart/backoff.

```bash
python3 stage.py start --approve START --isolation-reviewed --observation-reviewed
python3 stage.py smoke --approve SMOKE
python3 monitor.py --approve MONITOR
# Over10–15minutes, also observe vmstat/PSI/current cgroup resources/restart count.
```

The start command verifies payload, env ownership/target, readonly SQL grants, required ledger/columns, resources, runtime and existing isolation before installing only the new staging unit. Unit validation+daemon-reload is a host action requiring startup gate approval. If initial service or smoke fails, it stops only that unit and reports failure; it never activates another release or touches DB. No pm2 save/startup/resurrect, production pm2 command, boot enable or deployment scheduler.

Expected smoke: health200/oktrue/exactSHA/no-store; root200 read-only notice; eight financial/auth/admin/encoded/non-GET routes423/no-store; approved static asset200 and exact hash; listener127.0.0.1 only. GET/POST denial probes have no credentials/payment body and must be stopped on unexpected handler success. No production account/browser session is used. Stage wrapper intentionally prevents playable application/browser auth tests; CI already passed full11 browser groups on disposable data, not on this live host.

After **separate tunnel approval**, operator uses a new non-root SSH login with strict host checking and local bind `-N -T -L 127.0.0.1:18080:127.0.0.1:18080` to inspect notice/health/static asset in a fresh workstation browser. No VPSChromium, public subdomain or Caddy/TLS change. Verify no staging cookies/login/game/RPC activity; close tunnel. Later writable functional staging requires separate design/approval.

Review security without disclosing secrets: readonly grants/target, env0640 and PM2state0700, no production-secret/file access, readonly release, Caddy no stage/inbox static exposure, public firewall no3306/18080, effective SSH key-only/nonrootlogin, service IP/sandbox limits, no secrets in exported logs, no production health change. Do not scan/load/fault-test the public host.

Monitoring uses no heavy daemon: one-shot `monitor.py`, systemd-cgroup metrics, `vmstat`, kernel OOM events inspected privately, rotated staging logs, backup status. Alert at logs100MiB, diskfree<8GiB, swapfree<512MiB, MemAvailable<768MiB or sustained pressure. If lowmemory persists30s, OOM, repeated restarts or production impact occurs, stop staging immediately. First approval does not install a timer/alert destination; owner must approve scheduling and delivery channel. MariaDB/Caddy live tuning requires evidence, not inferred test success.

`hardening.py logrotate --approve LOGROTATE` validates/installs only staging operational log policy. Hourly checks require separate approved timer/integration; existing daily logrotate is not silently changed. copytruncate may lose an operational log line; never apply to financial audit records or binlogs. No financial audit/data retention changes.

## 9. Rollback and failure workflow

```bash
python3 stage.py rollback --approve ROLLBACK
```

First deployment has no prior app release. Rollback is staging **OFF**, unit stopped and port18080 closed. No SQL/Caddy/main/process-wide kill, file pruning, production restart or schema downgrade. An unrelated process on18080 is reported for inspection, never killed. Keep service disabled at boot.

| Failure | Likely cause / safest response |
|---|---|
| SSH preflight/login | Wrong key/path/port/host fingerprint/provider rule; stop, use provider console, no host-key bypass |
| Hardening fresh login | Include/Match/UFW/provider conflict; keep original session/console; undo only newly managed change after review |
| Packages/private runtime | Candidate/source/checksum/partial install; preserve current production runtime, inspect exact new prefix; no purge/reinitialize |
| Resource/hash/extraction | Busy/shared host, lowdisk, corrupt/different archive or path; no startup/SQL, quarantine and recalculate/retransfer after approval |
| DB provisioning/grants | Existing schema/account, audit policy, partialDDL or wrongtarget; no credential reset/adoption, DBA review only |
| Migration | Partial implicit-commit DDL, legacy conflicts; stop, preserve evidence, use approved staged checkpoint/new empty synthetic recreation only after approval |
| Startup/smoke/monitor | Wrong Node/env/schema/resource/dependency/isolation; stop only preview, preserve private logs, prepare correction; no test bypass |
| Backup/restore | Key/hash/dump scope/space or partial import; quarantine restorecheck, no promotion/drop/production restore |

Future release rollback requires a separately approved prior verified artifact, exact manifest/runtime/schema compatibility and service-path change; none is bundled here. If DB downgradability is unknown keep staging OFF. Restoring a backup is a DB operation with its own approval; application rollback does not reverse schema migration.

## 10. Concise execution checklist / production blockers

Additional implementation safeguards: private Node reinstalls require the root-owned vendor archive/binary provenance stamp created by this kit; an unmarked existing prefix is not adopted merely because it prints the right version. Existing staging directories/accounts require this kit's ownership marker or separate review. Before any bundled release verifier executes, independent control code validates the pinned payload digest and root-owned, non-writable release tree. The service's `InaccessiblePaths=-/var/www/maxhigh/.env.database` tolerates a fresh host where that file is absent; filesystem permissions and repeated secret-access checks remain mandatory if production credentials are later created. None of these checks replaces operator review.

Optional approved intrusion evidence is a count, not raw logs: `journalctl -u ssh --since '1 hour ago' --grep 'Failed|Invalid user' --no-pager --output=cat | wc -l`. Inspect console/NTP/provider state privately. Fail2ban review template is not installed by any phase. Monitor scheduling and alert recipients are approval blockers, not hidden new services.

- [ ] Approve only first read-only SSH command; verify key path, port, host fingerprint, provider recovery console.
- [ ] Report live-service state, ownership, clock, package/update/reboot findings, RAM/swap/disk/IO and public exposure.
- [ ] Approve control-kit upload and verify its separately reviewed SHA256 list; no root execution from writable source.
- [ ] Approve dedicated admin/key setup; set private sudo password; prove second login+sudo while root/console remain available.
- [ ] Approve each firewall/SSH/update/package action separately; recheck access after each; no root-disable-before-login proof.
- [ ] Approve exact runtime/PM2 patch/candidate packages; audit private dependencies; no global runtime switching.
- [ ] Approve directories, cgroup service and staging isolation; satisfy2560MiB startup/8GiB post-peak reserve.
- [ ] Approve exact artifact transfer, remotechecksum/extractor, immutable extraction+verification.
- [ ] Approve fresh schema/identity/secret policy, revieweffective grants; separately approve migrations and recovery checkpoint.
- [ ] Approve staging encrypted backup/off-server destination/key handling and isolated restore drill; verify full comparison/RTO.
- [ ] Approve private startup; one worker; HTTPsecurity/static tests, native resource observation; optional separately approved workstation tunnel/browser.
- [ ] Verify staging-only OFF rollback and report all results; production stays blocked.

Unresolved production blockers: actual server inventory; secure nonrootadmin/rootdisable recovery; software candidates/versions/security patches; staging path/secret exposure; shared resource admission; reviewed service sandbox; DBA secret logging/grants/collation; encrypted off-host backup destination/key recovery, production-scale restore/PITR/RPO/RTO; historical financial/base-credit reconciliation and open security/deployment gates; long-term50GB financial-history capacity; live HTTPS/proxy policy verification and real VPS qualification. No auto-production workflow, live wagering, public staging or production data access is enabled by this kit. Do not merge or push these controls without explicit source-publication approval.
