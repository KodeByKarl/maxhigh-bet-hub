# PH-VPS-2 compatibility profile

Reporting date: 2026-11-09 (Asia/Shanghai). Evidence files retain their machine-generated UTC timestamps. No production deployment, real player changes, live Cloudflare changes or credential rotation were performed.

This is an implemented, locally tested candidate for 2 shared vCPUs, 4 GB RAM, 50 GB NVMe and 1 TB/month on Ubuntu 24.04. **Production readiness remains blocked by Ubuntu/VPS-equivalent qualification, live origin controls, off-host backup delivery/recovery verification and legacy feature reconciliation.** Local measurements use Windows, Node v26.13.0, MariaDB 13.0.2 and 12 logical CPUs; they cannot certify the VPS.

The profile starts one PM2 fork worker with a 1024 MiB V8 old-space target, a separate 1536 MiB RSS restart threshold, readiness IPC, draining shutdown, exponential restart delay and a six-connection pool with a finite queue. The revision watcher is omitted. [PM2 readiness and shutdown semantics](https://pm2.keymetrics.io/docs/usage/signals-clean-restart/) underpin these settings; the RSS threshold is not a hard memory limit.

Application changes retain all 100 lazy playable titles. Hidden/unmounted fishing views stop polling; subscriptions cannot overlap. Public feed/jackpot reads share a five-second server cache; account, authorization, balance and settlement data never use that cache. Room maps are released between requests and room payloads have a fail-closed 8 MiB bound. Existing paid features are not evicted. Idempotent responses are canonicalized, and confirmed InnoDB conflicts retry only after rollback. The shared jackpot row is locked before the first snapshot. No RNG weights, RTP, paylines, multipliers or bet limits changed.

Precompressed static assets retain fingerprinted immutable caching. Original public files are preserved. The measured stylesheet transfers 48655 gzip bytes instead of 401,041 raw bytes; main JS transfers 96091 gzip bytes. Global CSS is still about 401 kB raw; game designs were not removed to shrink it. Unused Bootstrap was removed after confirming no imports.

## Install only after separate deployment approval

Before building, review and commit the working-tree changes (including any pre-existing user work); the immutable SHA must include this implementation. No commit was made automatically.

1. Provision Ubuntu 24.04, an up-to-date supported Node LTS patch, PM2, MariaDB 10.11 LTS, Caddy and restic. Caddyfile adaptation used official Caddy 2.11.9; qualify an up-to-date compatible Linux version rather than assuming the distribution package supports every option. Pin the exact Node major to the trusted Linux builder; import rejects platform/architecture/major mismatches. Local tests used Node v26.13.0; a Windows artifact is rejected on Linux. No installer or live service was changed by this task.
2. Review and install mariadb.cnf with Linux log directories owned by mysql. Rehearse startup against a disposable copy and inspect effective variables. Current syntax was exercised with MariaDB 13 on Windows using portable paths; Ubuntu 10.11 startup is NOT TESTED. Durability remains flush-at-commit=1 and sync_binlog=1. [MariaDB durability reference](https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-system-variables).
3. Set DEPLOY_PROFILE=ph-vps-2 in the private root .env. Existing ecosystem/launchers then select this profile. Leave OPERATION_COMPRESSION=0 initially. Copy reviewed systemd/logrotate files and adjust the /srv/maxhigh path/user if different; nothing installs them automatically.
4. Build off the VPS using a trusted Linux checkout, frozen install and the existing prepare command. Export only .output, reviewed SQL migrations and validation manifest. The migration runner is bundled; runtime releases need no source tree, dev node_modules or continuous build toolchain.
5. Transfer over authenticated SSH and independently pin the builder's manifest hash. Import verifies hashes, platform, SQL payload and compatibility. Activation still performs a read-only migration gate, a 256 MiB candidate health check, candidate exit, an atomic pointer switch and post-switch revision health; it retains previous.json. A free-memory/disk gate refuses unsafe operations.

Builder example (outside the production host):

~~~sh
node deploy/auto-update.mjs --prepare FULL_40_CHARACTER_SHA
node deploy/auto-update.mjs --export FULL_40_CHARACTER_SHA /trusted/export/release
~~~

Approved operator example (not executed on production):

~~~sh
export DEPLOY_PROFILE=ph-vps-2
export RELEASE_MANIFEST_SHA256=BUILDER_MANIFEST_SHA256
node deploy/auto-update.mjs --import /srv/incoming/release
node scripts/migrate.mjs  # read-only legacy checkout gate, if using a full checkout
node deploy/auto-update.mjs --activate FULL_40_CHARACTER_SHA
~~~

Portable activation uses the bundled .output/migrate.mjs automatically; it checks the SQL journal without applying migrations. Pending/changed migrations block activation. Explicit reviewed schema application remains a separate authorized step. Startup never seeds.

## Receipt compression rollout

Readers support existing JSON and lossless gz1 receipts. Writes default to JSON to preserve rollback compatibility. Deploy two approved reader-capable releases with compression disabled, then opt in with OPERATION_COMPRESSION=1 during an approved activation. Activation verifies both readers and persists storage-requirements.json; it subsequently rejects rollback to artifacts that cannot read stored codecs. Do not remove that policy file to force a downgrade. Public result hashes, RNG commitments and decoded receipts remain unchanged. Browser intents also survive retryable service errors after an uncertain commit. Temporary session-check overload retains only the last UI identity; authoritative null responses still sign out the user, and every protected action still authenticates on the server. The load measurements used compression enabled; its disk savings are not the default first-deployment state.

See [resource budget](RESOURCE_BUDGET.md), [load results](LOAD_TEST_RESULTS.md), [deployment gates](DEPLOYMENT_CHECKLIST.md), [rollback](ROLLBACK_PLAN.md), [monitoring](MONITORING.md), [Cloudflare](CLOUDFLARE.md) and [backups](BACKUPS.md).
