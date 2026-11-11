# Verified artifact: staging execution and rollback plan

Prepared 2026-11-09 (Asia/Shanghai). **PLAN ONLY — no host access, transfer, installation, provisioning, SQL or deployment is authorized by this document.** Execute one approved phase at a time and record its actual result before approving the next. This plan supersedes older staging activation examples for the nested `/var/www/maxhigh/staging` preview path. Do not repoint the older automatic receiver at this path.

## 1. Fixed artifact and scope

| Item | Required identity |
|---|---|
| Source | `2294d79afb2b900f13a9cd05c427dc9857b89de1` |
| Successful Ubuntu build | [42547305324](https://github.com/KodeByKarl/maxhigh-bet-hub/actions/runs/42547305324), attempt1 |
| GitHub artifact | `linux-node24-2294d79afb2b900f13a9cd05c427dc9857b89de1-1`, ID13644726056 |
| Deployment archive | `release.tgz`, **457442355 bytes** (436.25 MiB; approximately457 MB decimal) |
| Archive SHA-256 | `6d7d07f0181d1ab5fed2a0029705d3f354d2ed05d655595f9d3a49467b380c51` |
| Manifest SHA-256 | `cea567e8309030815b7b1bb969bcf3d491d1d7d670eff62bc76128e780a498ad` |
| Standalone extractor SHA-256 | `522c5627dfdd2400f8b4237b671016e8be623a9894765029f816b40c3d9a8804` |
| Expanded payload | 501256699 bytes, 5370 regular files |
| Preserved public content | 100 game mappings;3987 original assets;477802830 original asset bytes |
| Runtime | Ubuntu24.04, Linux x86_64, **Node24.22.2 exactly** |

[Verified artifact report and evidence](../../audit/first-transfer/UBUNTU_ARTIFACT_VERIFIED.md). Hosted-runner gates passed: QA22/22, Wild Panther8/8, referee80/80 at6000 spins each, TypeScript/build, migrations3/3, HTTP18/18, browser11/11, security and portable-start. This is not qualification of the VPS or its live data.

Use the existing downloaded artifact, or the pinned download command in that report into a fresh local directory. Do not rebuild, pull source, install Windows dependencies, run `npm ci`, alter the archive, use an artifact from another run, or substitute new hashes. GitHub retention is14 days; check availability before approving transfer. Expiry requires separate reviewed rebuilding and new identity approval.

First deployment is an **unpublished, read-only preview**. The bundled wrapper forces `STAGING_READ_ONLY=1`, binds127.0.0.1:18080 and requires `maxhigh_staging` / `maxhigh_stage_preview`. Its root is a notice, not a playable lobby. Authentication, staff/RPC routes and financial actions are blocked. Preserving all games/assets in the artifact does not authorize enabling them on this host.

Production `/var/www/maxhigh`, database `maxhigh`, `.env.database`, Caddy/HTTPS, DNS/Cloudflare, global database settings and production PM2 remain unchanged. No production dump, live wallet copy, credential reuse, production migration, live test transaction or reconciliation repair is part of this plan.

## 2. Approval gates and stop conditions

| Gate | Approval needed before execution | Exit evidence |
|---|---|---|
| A | Read-only host inventory via approved SSH identity/verified host key | Hardware/software, ownership, network and measured resource report |
| B | Any missing software or separate-runtime installation | Reviewed exact paths/versions; no global live upgrades |
| C | Private inbox creation and transfer of four approved files | Remote pinned hashes match; no extraction yet |
| D | Dedicated OS identity, directories, resource unit and extraction | Ownership/isolation and payload verification pass |
| E | New staging schema/accounts, fresh-schema migration and synthetic fixtures | Grants, database identity, migration ledger and health columns verified |
| F | Staging-only backup and restore drill; off-host destination/key handling | Verified encrypted backup and isolated restored-schema comparison |
| G | One private preview startup and low-volume smoke checks | Health, blocked routes, loopback listener and stable resources |
| H | Optional operator SSH tunnel and workstation browser checks | Notice/static asset checks without financial activity |
| I | Any later write-enabled staging, public proxy, persistence, production work | Separate explicit authorization and outstanding security/financial gates resolved |

Approvals are not inferred from elapsed time or from this plan. If a gate fails, stop the staging action, preserve private evidence and prepare a correction for review. No new source push, live configuration repair or test bypass is implied.

Block startup if staging secrets/PM2 files can be read through production Caddy, runtime can read production secrets, architecture/Node mismatches, resources are inadequate, grants are too broad, schema identity is wrong, migrations fail, or hashes differ. If production is serving traffic and safe headroom cannot be reserved, use a separate equivalent staging VM or approve a maintenance/resource window; a directory and SQL schema do not isolate kernel, RAM or MariaDB capacity.

## 3. Prerequisites and read-only inventory — Gate A

Operator: `maxhigh@151.242.136.34`, existing SSH key and independently verified host-key fingerprint. Use strict known-host checking and no agent forwarding. Do not connect in this preparation task. Later use [FIRST_TRANSFER_GUIDE.md](FIRST_TRANSFER_GUIDE.md) Gate0 after approval.

Proposed host commands (read-only; some metadata needs administrator access):

```bash
cat /etc/os-release
uname -m
getconf _NPROCESSORS_ONLN
free -m
swapon --show --bytes
df -B1 /var/www/maxhigh /var/lib/mysql
df -i /var/www/maxhigh /var/lib/mysql
findmnt -T /var/www/maxhigh
stat -fc %T /sys/fs/cgroup
vmstat 1 10
node --version
command -v node pm2 pm2-runtime python3 mariadb mariadb-dump caddy curl gzip age
python3 --version
mariadb --version
caddy version
systemctl is-active mariadb caddy
ss -lnt
namei -l /var/www/maxhigh/staging
stat -c '%a %U %G %n' /var/www/maxhigh/.env.database
```

Require Ubuntu24.04/x86_64, 2 logical CPUs, ~4GB physical RAM and existing ~1GB swap; actual usable disk is measured, not assumed50GiB. Do not create swap or change swappiness. Check10-minute idle CPU, steal, memory/swap and disk trends as well as snapshots. Ask operator to inspect Caddy roots/routes and existing service ownership locally without publishing raw configs or secrets. Check that neither staging subtree nor operator inbox is inside a public static-file root. A static production root covering `/var/www/maxhigh` blocks this nested path until separately approved isolation changes or a revised artifact/path are reviewed.

Verify PM2 package version using installed package metadata as the dedicated staging identity or an offline admin read. Avoid `pm2 --version` as the production user: it can create/connect to a daemon. Never print process environments, `pm2 jlist`, `pm2 env`, dumps, `.env` contents or client-option files. Filesystem modes are evidence, not credentials.

DBA obtains only aggregate staging-relevant metadata privately: MariaDB10.11 patch, data-directory filesystem, existing memory/connection usage and global limits, engine list, binary log growth and backup footprint. Do not assume the proposed old PH-VPS-2 global settings are installed. No tuning/restart of the shared MariaDB service is approved.

Required installed tools: exact Node24.22.2, PM2 major7 with `pm2-runtime`, Python3 supporting `hashlib.file_digest` (Ubuntu24.04's Python3.12 suffices), MariaDB10.11 client/server and `mariadb-dump`, systemd/cgroupv2, curl, tar/gzip/coreutils, OpenSSH, and an approved authenticated-encryption tool (`age` for examples below). Caddy remains installed and unchanged. Browser runs on the workstation; no Chromium, Docker, compiler or application build on the VPS. Missing tools or a different Node patch are GateB blockers: install a separately approved runtime without changing production's Node symlink/PATH. A different binary path must be reflected in reviewed service commands; do not silently substitute `/usr/bin/node`.

## 4. Resource and disk admission — before every mutating phase

These are conservative planning gates, not measured guarantees. One operation at a time: never overlap extraction, migration/import, backup/restore and preview startup. Full QA,80-game simulations, concurrency/load/fault tests and production-volume restore are off-host.

| Resource | Proposed staging control / admission |
|---|---|
| Preview worker | One fork;1024MiB V8 old-space;1536MiB sampled PM2 RSS restart; no cluster or second candidate |
| Preview cgroup, including PM2 | `MemoryHigh=1280M`, `MemoryMax=1792M`, `MemorySwapMax=128M`; `CPUQuota=50%`, `CPUWeight=10`, `IOWeight=10`, `TasksMax=128` |
| Startup headroom | At least2560MiB host MemAvailable before startup, leaving ~768MiB after the1792MiB ceiling; no sustained swap-in/out or existing pressure |
| Swap | Existing1GB only; at least512MiB available before work; swap is emergency space, not extra steady-state RAM |
| DB pool | Six connections max, queue30, idle3; admission64; only one smoke client initially |
| Maintenance tasks | Sequential, low priority (`nice -n 19`, `ionice -c 3` where supported); suggested512MiB process ceiling/50% single-CPU quota; shared MariaDB allocations are **not** bounded by client cgroups |
| Stop thresholds | MemAvailable below768MiB for30s, sustained swap activity, new OOM, sustained CPU/IO pressure or production health regression: stop preview/task and report |
| Logs | Private preview operational logs; initial100MiB alert budget, hourly10MiB rotations with five retained; stop on rapid growth, do not delete financial/DB/binlogs |

CPUQuota50% means half of one CPU, not half of a two-vCPU host. PM2 RSS checks are periodic (about30s), not a hard cap; systemd is the last-resort boundary. A cgroup OOM may kill staging, so startup/rollback must fail visibly. The1792MiB budget does not reserve RAM; admission must account for production, MariaDB, Caddy and kernel first. Do not transplant a full production memory budget onto a simultaneous staging worker. Reference: [PM2 memory limits](https://pm2.keymetrics.io/docs/usage/memory-limit/), [systemd resource controls](https://www.freedesktop.org/software/systemd/man/250/systemd.resource-control.html).

Disk budget in GiB (1GiB=1073741824 bytes):

| Item | Planning allowance |
|---|---:|
| Operator archive inbox + private staging archive copy | ~0.86GiB |
| One extracted release | ~0.47GiB payload; reserve0.60GiB with filesystem overhead |
| Retained rollback release, if one exists | Another0.60GiB; first deployment has none |
| Hash lists, logs, small evidence | 0.25GiB initially |
| Staging DB + isolated restored copy + DDL/temp headroom | At least `3 × measured staging DB/index bytes`, plus DBA-estimated temp/redo/binlog growth |
| Encrypted logical backup | Measure conservatively up to logical dump size plus encryption overhead; do not assume compression ratio |
| Untouched host free-space reserve | At least8GiB after planned peak use |

Admission: free bytes must exceed **8GiB + peak incremental artifact/DB/backup/temp demand on each affected filesystem**, with at least10% inodes free. Start with a synthetic DB capped by policy at256MiB including indexes; if it exceeds that, stop and recalculate. TenGiB free may suffice for the small first preview but is not a universal threshold. The extractor separately requires5GiB available immediately before extraction. Its temporary release is renamed in-place, not copied; allow interrupted-download/extraction leftovers explicitly. The GitHub ZIP457649512 bytes is workstation-only; send `release.tgz`, not both ZIP and archive.

No pruning until verification and rollback retention are established. Keep only this approved release on first install. Future retention is current+one verified previous release and one approved archive; do not use wildcard deletes or prune a referenced release. Remove obsolete inbox copies only after separate operator review of exact paths. Never free space by purging production ledgers, receipts, binlogs or untested backups. A50GB disk cannot promise indefinite financial-history retention.

## 5. Identity, directories and artifact verification — Gates C/D

Use existing `maxhigh` as operator only. Provision a new locked system identity `maxhigh-stage-preview`, no interactive login, SSH key, sudo or production groups. Runtime must not read `/var/www/maxhigh/.env.database` or any other production secret. If that check fails, stop for a permission/isolation review; do not chmod production files automatically.

Proposed structure (no production symlinks or ownership changes):

```text
/home/maxhigh/maxhigh-staging-inbox/     operator0700; approved transferred files only
/var/www/maxhigh/staging/               root:maxhigh-stage-preview0750; real directory
  incoming/                            private approved archive/extractor
  releases/2294d79.../                  full40-character SHA; root-owned, group-read-only
    .output/                           includes staging run/verify/PM2 controls
    drizzle/
    release-validation.json
  .env.preview                         root:runtime0640; preview SELECT credentials only
  .pm2/                                runtime0700; may contain credentials
  logs/                                runtime0700; never web-served
  evidence/                            private operator/admin evidence
/root/maxhigh-staging-admin/            root0700; migration/backup client options and keys
/var/backups/maxhigh-staging/           root0700; encrypted staging backups only
```

Root-owned releases make immutability an OS boundary; the runtime writes only logs/PM2 state. Parent traversal must permit the dedicated identity, without adding it to production groups. Stop if required directories/accounts already exist with unreviewed purpose. No current/previous symlink is required: service startup references the full release SHA directly.

After GateC approval, transfer only `release.tgz`, `metadata.json`, `SHA256SUMS`, `safe-extract.py` through the existing strict-host-key SCP helper described in FIRST_TRANSFER_GUIDE Gates2/3. Do not transfer `.env`, source checkout, secrets, keys or a production DB. Stop after transfer for remote hash verification.

Proposed Ubuntu checksum commands, in the private inbox:

```bash
set -euo pipefail
umask 077
SHA=2294d79afb2b900f13a9cd05c427dc9857b89de1
ARCHIVE_SHA256=6d7d07f0181d1ab5fed2a0029705d3f354d2ed05d655595f9d3a49467b380c51
MANIFEST_SHA256=cea567e8309030815b7b1bb969bcf3d491d1d7d670eff62bc76128e780a498ad
EXTRACTOR_SHA256=522c5627dfdd2400f8b4237b671016e8be623a9894765029f816b40c3d9a8804
test "$(stat -c %s release.tgz)" = 457442355
printf '%s  release.tgz\n' "$ARCHIVE_SHA256" | sha256sum --check --strict
printf '%s  safe-extract.py\n' "$EXTRACTOR_SHA256" | sha256sum --check --strict
sha256sum --check --strict SHA256SUMS
```

Authenticate the manifest inside the archive before running the extractor using FIRST_TRANSFER_GUIDE Gate3. Do not trust uploaded SHA256SUMS as the independent root of trust; compare the constants above. After GateD provisioning, copy authenticated files into root-private incoming. Keep `releases` root-owned; run only the authenticated Python extractor as administrator with `CONFIRM_STAGING_EXTRACT=maxhigh-staging-files-only`, pinned hashes and exact destination `/var/www/maxhigh/staging/releases`. This deliberately strengthens older Gate4 ownership: the runtime never needs write permission on the release parent. No application code runs as root. No generic `tar -x` fallback. Refuse traversal, links, special files, duplicate entries, symlinked destination and existing immutable release.

Extractor writes the new full-SHA release. Administrator then verifies its resolved path stays exactly under staging, makes **only that release tree** root-owned/group-readable and removes runtime write permission. Re-run the bundled verifier as the runtime identity:

```bash
RELEASE=/var/www/maxhigh/staging/releases/2294d79afb2b900f13a9cd05c427dc9857b89de1
sudo -u maxhigh-stage-preview env -i PATH=/usr/bin:/bin \
  RELEASE_MANIFEST_SHA256="$MANIFEST_SHA256" /usr/bin/node "$RELEASE/.output/staging/verify.mjs"
```

This checks payload, migrations, all original assets and exact runtime. Review verified metadata before any SQL or startup. If a runtime dependency is absent, stop; portable CI already ran without checkout node_modules, so no VPS npm install or floating patch is allowed.

## 6. Staging-only MariaDB and secrets — Gate E

Use the existing shared MariaDB10.11 service, not a second Docker/MariaDB instance. No global config, bind-address, TLS, users, credentials, binary logs or service restart changes. Require the existing listener not publicly exposed; an insecure live listener is a blocker requiring separate approval, not a reason to change it here.

DBA creates **fresh** `maxhigh_staging` with the reviewed application's charset/collation (baseline `utf8mb4`; match migration requirements). Refuse to reuse or overwrite an existing schema until owner and contents are reviewed. Use fresh schema and synthetic data only; initial health requires tables, not real accounts. No production import or automatic seed/admin account creation.

| Identity | Approved scope |
|---|---|
| `maxhigh_stage_preview@127.0.0.1` | SELECT on `maxhigh_staging.*` only; max six connections; no DML/DDL/global grants |
| Staging migration identity | Only reviewed schema-local SELECT/INSERT/UPDATE/DELETE/CREATE/ALTER/DROP/INDEX/REFERENCES needed by approved SQL on `maxhigh_staging.*`; no global admin/FILE/GRANT OPTION |
| Staging backup identity | SELECT and needed SHOW VIEW/TRIGGER privileges only on staging; require InnoDB for single-transaction consistency |
| Restore operator | Separate administrative session scoped to creating/importing `maxhigh_staging_restorecheck`; credentials never supplied to application |

DBA verifies `CURRENT_USER()`, `DATABASE()` and effective schema/global/role grants locally; publish only a redacted pass/fail summary. Credentials are independent, generated/stored locally through the approved secret channel. Do not put literal passwords into SQL files, command arguments, terminal transcripts, shell history, CI, chat or Git. Avoid raw SHOW GRANTS exports if they include authentication material. Database audit/general logging of user-creation statements must have an approved secret-safe provisioning path before account creation; do not disable shared logging to hide it.

Create `/var/www/maxhigh/staging/.env.preview` from the bundled `.output/staging/runtime.example`, root:runtime0640, edited locally. Required values:

```dotenv
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=maxhigh_staging
MYSQL_USER=maxhigh_stage_preview
MYSQL_PASSWORD=LOCALLY_PROVISIONED_SECRET
STAGING_READ_ONLY=1
OPERATION_COMPRESSION=0
PUBLIC_URL=http://127.0.0.1:18080
```

No DATABASE_URL, production URL/cookie domain, payment-provider key, SMTP credential, webhook, Cloudflare token or production connection file. Do not source dotenv as shell code. Set up root-only `.env.migration` separately with exact staging schema/migration identity and `CONFIRM_SCHEMA_MIGRATIONS=maxhigh_staging`; no preview account password in that file. MariaDB client option files are **INI `[client]` format**, not dotenv. Backups use separately provisioned root0600 client options pinned to staging; never pass the production `.env.database` to any client.

Secret handling: `set +x`, `umask077`; keep shell/transcript recording off during secure editing. Never dump PM2 environments or error connection URLs. Keep private stderr for administrator inspection, share redacted gate results only. Credentials inside PM2 memory/state are protected by dedicated identity0700 home; do not run `pm2 save`, enable PM2 cloud monitoring or export dump files. Service unit holds paths and non-secret settings only.

## 7. Migration sequence — Gate E, separate confirmation before apply

Review the four SQL files and bundled migration digest `d905c76cd51a3a77786312790cf4dd438306cd5874f86eea10e94d4cec23b2d4` from the verified manifest. A fresh DB is expected to have four pending migrations. Confirm database identity in a clean, root-only migration session; no inherited production variables. The bundled migration CLI defaults to listing pending migrations, returning exit2 if pending. This expected exit is not a failed apply and must not be masked with `|| true`.

Illustrative commands for an **approved privileged shell**, using the reviewed `/usr/bin/node` path and root-only staging env file:

```bash
cd /var/www/maxhigh/staging/releases/2294d79afb2b900f13a9cd05c427dc9857b89de1
# First guard: reject any unexpected host/schema/user or DATABASE_URL.
env -i PATH=/usr/bin:/bin HOME=/root DOTENV_CONFIG_PATH=/dev/null \
 /usr/bin/node --env-file=/root/maxhigh-staging-admin/.env.migration --input-type=module -e '
 const e=process.env;
 if(e.MYSQL_HOST!=="127.0.0.1" || e.MYSQL_PORT!=="3306" ||
 e.MYSQL_DATABASE!=="maxhigh_staging" || e.MYSQL_USER!=="maxhigh_stage_migrate" ||
 e.DATABASE_URL || e.CONFIRM_SCHEMA_MIGRATIONS!=="maxhigh_staging") process.exit(1);'
# List only; operator records exit0(no pending) or exit2(expected pending), other exits STOP.
env -i PATH=/usr/bin:/bin HOME=/root DOTENV_CONFIG_PATH=/dev/null \
 /usr/bin/node --env-file=/root/maxhigh-staging-admin/.env.migration .output/migrate.mjs
# STOP for apply approval, verified empty target, disk admission and recovery checkpoint.
env -i PATH=/usr/bin:/bin HOME=/root DOTENV_CONFIG_PATH=/dev/null \
 /usr/bin/node --env-file=/root/maxhigh-staging-admin/.env.migration .output/migrate.mjs --apply
# Re-run listing: now require exit0, empty pending list.
```

Run the guard before each listing/apply session, not once followed by edited credentials. DBA also checks actual authenticated target/grants using the same account before apply. The account name in the file must match the guard. A surrounding `set -e` shell must capture the expected dry-run exit2 explicitly; execute the listing as a separately observed command or with an `if command; then ... else rc=$?; ... fi` check accepting only0/2.

Verify four migration ledger checksums against SQL, required foreign keys, no orphan relationships, no negative synthetic balances, and health-required `financial_operations.id/proof`, `play_sessions.base_credited/open_game_key`. Insert only separately reviewed synthetic fixtures if needed; **never** execute the full CI migration harness on this shared host: it targets hard-coded disposable databases/port19307 and is not the staging migrator.

For an existing approved staging dataset, stop preview and make/test a pre-migration encrypted checkpoint first. DDL can implicitly commit; a transaction `ROLLBACK` does not undo an entire schema upgrade. No automatic reverse migration or deleting ledger rows to force reapplication. Legacy feature reconciliation failures are hard stops. See [MariaDB implicit commits](https://mariadb.com/docs/server/reference/sql-statements/transactions/sql-statements-that-cause-an-implicit-commit).

## 8. Backup and isolated restore drill — Gate F

First fresh deployment: checkpoint the reviewed empty-schema state and creation parameters, then migrate; back up the resulting schema plus minimal synthetic fixture for the restore drill. No claim of existing production backup/PITR verification follows from a staging-only drill. Replacing a nonempty staging schema later requires a verified pre-change backup before DDL.

Before work: stop preview, ensure staging has no writer, forbid concurrent staging DDL, verify InnoDB/charset and measured DB size, calculate peak restore/temp/binlog space, check resources. Prefer a separate restore host; a tiny approved same-instance restore into **`maxhigh_staging_restorecheck` only** is allowed only with GateF approval. Client limits do not cap shared MariaDB memory/IO. Never restore over `maxhigh`, point-in-time-rewind the shared instance or use `mariadb-backup --copy-back` on this server.

Proposed encrypted logical backup pipeline in an approved admin shell (`BACKUP_FILE` is a new root-private `.sql.gz.age` path; `BACKUP_RECIPIENT` is an independently verified age public recipient, not a secret):

```bash
set -euo pipefail
set +x
umask 077
# DBA has checked defaults file host/user/schema; its first option must follow the executable.
nice -n 19 ionice -c 3 mariadb-dump \
 --defaults-extra-file=/root/maxhigh-staging-admin/backup-client.cnf \
 --single-transaction --quick --hex-blob --skip-lock-tables --skip-comments \
 --skip-add-drop-table --no-create-db maxhigh_staging \
 | gzip -1 | age -r "$BACKUP_RECIPIENT" > "$BACKUP_FILE"
test -s "$BACKUP_FILE"
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
```

Ensure a new output path before redirection; never overwrite a checkpoint. Pipeline failure leaves an untrusted partial file: mark it failed, do not retain it as a valid recovery point. These schema tables have no required stored routines/events; DBA inventories views/triggers/routines/events first. If any exist, stop to review dump inclusion, DEFINER privileges and schema-qualified references before restore. No `--all-databases`, `--databases`, production schema, grant table or actual user password dump. `--single-transaction` alone is not sufficient for nontransactional tables or concurrent DDL. Reference: [mariadb-dump](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump).

Copy only encrypted backup plus checksum to a separately approved off-host restricted destination; transport, keys, retention, RPO/RTO and cost require owner approval. Keep age private identity separate from archive/repository/CI, available for recovery without this VPS. A checksum detects corruption; successful authenticated decryption and restore establish recoverability. Verify one deliberately corrupted **disposable copy** is rejected by age off-host; never corrupt the sole checkpoint.

Restore sequence:

1. Independently verify ciphertext checksum and key availability; first decrypt through `gzip -t` without a DB connection. Require both tools succeed with pipefail.
2. DBA inspects dump provenance and schema/DEFINER safety in a private environment, creates a new empty `maxhigh_staging_restorecheck` with no runtime access, and provisions temporary restore access restricted to that schema. Client options pin the restore schema; import identity has no production grants. Reject dumps containing CREATE DATABASE/USE or cross-schema references before import.
3. With approved resources and preview stopped, stream `age -d -i /ROOT_PRIVATE_IDENTITY "$BACKUP_FILE" | gzip -d | mariadb --defaults-extra-file=/root/maxhigh-staging-admin/restore-client.cnf maxhigh_staging_restorecheck`. Never put passwords in the pipeline. Failure can leave partial staging-only tables; keep them quarantined and do not promote them.
4. Compare table/column/index/constraint inventory, four ledger versions/checksums, per-table row counts and synthetic fixture values. For an exact data comparison with all tables having primary keys and no concurrent writes, generate deterministic data-only dumps for original and restored staging using matching client versions/options (`--compact --no-create-info --skip-triggers --skip-add-locks --skip-disable-keys --skip-extended-insert --order-by-primary --hex-blob`) and hash the streams. Verify identical output settings and schema-neutral dumps; handle any table without a primary key with an explicitly reviewed canonical row-order method. Compare schemas separately with normalized schema names. Do not publish rows or raw dumps.
5. Record backup bytes, elapsed backup/restore time, checksums, zero comparison differences, age integrity test and measured peak disk/RAM. Gate passes only after successful recovery and key retrieval. Approve exact staging-only restore-schema cleanup separately; no wildcard DROP or automated pruning.

Production backup status is a separate blocker: require independently reviewed off-host encrypted backups, key recovery, binlog/PITR chain and an isolated production-sized restore with reconciled financial totals and approved RPO/RTO before production. Do not test these against live data under this plan.

## 9. Isolated startup and resource envelope — Gate G

Start only the bundled `.output/staging/pm2.config.cjs`, which references the read-only wrapper; never start `.output/server/index.mjs` directly or the normal production ecosystem. Use a dedicated PM2 home and no inherited production environment. The bundled settings are one fork, wait_ready30s, kill_timeout45s,1024MiB heap,1536MiB sampled RSS restart, bounded restart/backoff, six DB connections and loopback18080.

Administrator prepares a **new staging-only** systemd unit, after reviewing exact installed executable paths. Example is a template, not an installed file. `/APPROVED/ABSOLUTE/pm2-runtime` must be replaced with its verified absolute path; ensure its shebang resolves exact Node24.22.2 through the fixed service PATH. If production uses a different Node binary, approve a private matching installation and template changes first.

```ini
[Unit]
Description=MaxHigh private read-only staging preview
After=network.target mariadb.service

[Service]
Type=simple
User=maxhigh-stage-preview
Group=maxhigh-stage-preview
WorkingDirectory=/var/www/maxhigh/staging
Environment=HOME=/var/www/maxhigh/staging
Environment=PM2_HOME=/var/www/maxhigh/staging/.pm2
Environment=PATH=/usr/bin:/bin
ExecStart=/APPROVED/ABSOLUTE/pm2-runtime start /var/www/maxhigh/staging/releases/2294d79afb2b900f13a9cd05c427dc9857b89de1/.output/staging/pm2.config.cjs --only maxhigh-staging-preview
Restart=no
TimeoutStopSec=60
KillMode=control-group
UMask=0077
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=/var/www/maxhigh/staging/.pm2 /var/www/maxhigh/staging/logs
InaccessiblePaths=/var/www/maxhigh/.env.database
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
IPAddressDeny=any
IPAddressAllow=localhost
MemoryAccounting=yes
MemoryHigh=1280M
MemoryMax=1792M
MemorySwapMax=128M
CPUQuota=50%
CPUWeight=10
IOWeight=10
TasksMax=128

[Install]
WantedBy=multi-user.target
```

Require cgroupv2 and working systemd IP restrictions; inspect unsupported-directive warnings and stop if the proposed isolation cannot be enforced. Add other production secret files to approved inaccessible paths without hiding the nested staging tree. Sandboxing does not replace proper secret ownership or schema grants. PM2 may perform its bounded internal restart attempts; stop the staging unit on repeated failure rather than looping manually.

After unit/path review and explicit startup approval: validate with `systemd-analyze verify` against the new unit, perform the approved daemon-reload, then start **only** `maxhigh-staging-preview.service`. Do not enable at boot, run pm2 startup/save/resurrect, restart production PM2 or reload Caddy. Record unit/cgroup memory/CPU, restart count, preview RSS, MemAvailable and swap for10–15minutes. This idle/smoke observation is not capacity certification.

## 10. HTTP, browser and security acceptance — Gates G/H

Host smoke probes use one client, timeouts, no real accounts and no request bodies. These known blocked paths must remain intercepted before handlers; stop immediately on any unexpected success:

```bash
curl --fail --silent --show-error --max-time 5 http://127.0.0.1:18080/api/health
curl --silent --show-error --max-time 5 --include http://127.0.0.1:18080/
for route in /_serverFn/paid-round /api/auth/login /api/deposit /api/withdraw /admin; do
  code=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' \
    "http://127.0.0.1:18080$route")
  test "$code" = 423 || exit 1
done
# No payment payload; explicitly verify non-GET requests remain blocked too.
test "$(curl --silent --show-error --max-time 5 -X POST --output /dev/null \
 --write-out '%{http_code}' http://127.0.0.1:18080/api/deposit)" = 423
ss -lnt
```

Health must be200 with `ok:true`, exact release SHA and no-store; it SELECT-probes required schema columns, not just process liveness. Root must show `Staging preview only. Application and financial actions are disabled.` with `X-Maxhigh-Preview: read-only`. Blocked routes require423/private-no-store. Use one known literal `/assets/...` or `/images/...` path from the verified inventory to confirm expected content hash; encoded separators/traversal must return423. GET/HEAD health/static behavior is allowed, POST to static/health must be blocked. Eight representative block cases were already exercised off-host by portable CI; add only controlled read-only/empty-body denial probes here, never a wager/payment payload.

Security checks: Node listener is127.0.0.1:18080 only; DB remains loopback/local; no public18080/3306; runtime cannot read production connection file, migration/backup keys or operator SSH keys; runtime cannot modify release files; preview SQL grants are SELECT-only; no public static root exposes staging or PM2 state; production Caddy TLS/config/routes and production process health are unchanged. Verify no public proxy to preview without opening firewall ports or changing DNS. Keep security headers expected for this plain-text preview; it is not the normal application page/CSP/login flow.

For browser inspection only after GateH approval: establish a strict-host-verified, no-agent-forwarding SSH tunnel from workstation local127.0.0.1:18080 to server127.0.0.1:18080 (`ssh -N -T -L 127.0.0.1:18080:127.0.0.1:18080 ...`). No Caddy change or public hostname. In a fresh browser profile check notice/health/static image, blocked login/admin/game/RPC paths, no cookies/session creation and no write requests. Close tunnel afterward. Do not install Chromium on the VPS. Full playable-browser/auth/financial testing requires a separately isolated writable staging environment and approval; CI's11 browser groups do not authorize it here.

## 11. Rollback and failure procedures

| Failure | Safe staging response |
|---|---|
| Hash/runtime/disk/grant mismatch before startup | Do not extract/start/apply SQL; quarantine candidate privately; retain evidence and request correction |
| Migration failure | Stop; quarantine staging schema and logs. DDL may be partial. Do not rerun blindly, alter ledger checksums or change financial records |
| First preview start/health/security/resource failure | Stop only `maxhigh-staging-preview.service`; confirm18080 closed and cgroup exited. First deployment has no earlier app: rollback is **preview OFF** |
| Backup/restore test fails | Do not promote/start based on that recovery point; keep last independently verified checkpoint; investigate staging-only partial import |
| Future app replacement fails | Only after separately approved replacement, stop new preview and verify old manifest/payload, Node and schema compatibility before switching the staging unit's exact release path; start one old worker and recheck health |
| Old code incompatible with migrated schema | Keep preview OFF; restore an approved staging checkpoint into a new quarantined schema, verify and separately approve replacement of `maxhigh_staging`. Do not silently point wrapper to another schema or downgrade SQL |

Emergency stop command after startup authorization is `sudo systemctl stop maxhigh-staging-preview.service`. A bounded60s unit stop may eventually terminate the staging cgroup; this preview cannot execute financial handlers. Never run `sudo pm2 kill`, kill shared Node/MariaDB, reboot, or stop production to recover staging.

For a first empty/synthetic schema with failed migration, DBA may later approve dropping/recreating **only exact `maxhigh_staging`** and reapplying the pinned migrations. That is a destructive staging-only recovery action requiring confirmation of schema ownership, no other consumers and backup need. No DROP command is pre-authorized. Existing data requires reviewed restore, not deletion. Keep previous verified release, env fingerprint (no secrets), schema ledger and backup identity until rollback is proven.

There is no new automated deployment/rollback mechanism in this plan. PM2 restart is process recovery, not release rollback. Operator compares30–60s health observations after startup and fails closed. An automated release controller would need separately reviewed control code, rollback compatibility and approval; do not invoke the older automatic receiver or enable CI deploy variables.

## 12. Evidence and unresolved approvals

For each phase, record date, approver, exact SHA/hash, command purpose, redacted exit/status, resource before/peak/after, schema identity, migration ledger, backup/restore hash comparisons and rollback result. Restrict evidence directory; no credentials, customer data, raw SQL rows, unredacted stack connection strings, PM2 dumps or secret configs in reports. Preserve the verified archive and off-host encrypted recovery points independently of this VPS.

**Outstanding blockers:** actual host inspection; exact Node/runtime paths and package versions; 2.5GiB pre-start MemAvailable and disk/IO admission on the shared host; staging path not web-served; production-secret isolation; administrator approval for OS/service/schema/account creation; approved secret provisioning; reviewed cgroup/PM2 unit; fresh/sanitized dataset decision; staging backup key/off-host destination/restore resources; host fingerprint verification and separate transfer approval. Any package installation, global permission change, production maintenance window or path redesign needs separate review. No broader changes are implied by artifact approval.

**Production remains blocked** by existing live security/deployment gates, historical financial/base-credit reconciliation, production-sized off-host recovery/PITR validation and actual VPS performance/storage qualification. Successful private preview does not enable betting, deposits, withdrawals, public staging, production deployment or automatic CI/CD. Stop at the next approval gate after reporting the plan.
