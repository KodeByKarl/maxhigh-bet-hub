# Migration, application rollback and recovery

Prepared 2026-11-08. No production SQL, credentials or backup configuration was changed.

## Migration rehearsal (staging only)

Use a quiescent, approved, sanitized production-like copy in `maxhigh_staging`. A fresh fixture cannot qualify legacy reconciliation. Do not copy live secrets/sessions into an accessible staging environment. Record the source snapshot, sanitization approval and all financial totals before/after. Never seed or run `db:push`, `db:setup`, or `db:seed*` against production or a financial restore.

The receiver imports an artifact, then runs the bundled migration **without `--apply`**. Pending/checksum-invalid migrations reject activation before switching workers. The artifact remains in `deploy/releases/SHA` for review. Uploading the identical artifact again is supported; a different manifest for the same SHA is refused.

As the authorized local administrator, set a reviewed 40-character `RELEASE_SHA`, inspect its SQL and manifest, verify its hash against the approved CI run, and use a separately provisioned staging migration identity. The following commands are **not CI steps**:

```bash
set -euo pipefail
: "${RELEASE_SHA:?Reviewed full artifact SHA required}"
[[ "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]]
cd "/var/www/maxhigh-staging/deploy/releases/$RELEASE_SHA"
# Read-only plan: exit 2 means pending work; every other failure must be reviewed.
node --env-file=/var/www/maxhigh-staging/.env.migration .output/migrate.mjs
# ONLY after approved backup/restore, legacy-data review and a write-quiescence window:
CONFIRM_SCHEMA_MIGRATIONS=maxhigh_staging \
  node --env-file=/var/www/maxhigh-staging/.env.migration .output/migrate.mjs --apply
# Must now return apply:false, pending:[] and exit 0.
node --env-file=/var/www/maxhigh-staging/.env.migration .output/migrate.mjs
```

The first read-only command intentionally stops a `set -e` shell when migrations are pending. Review and run the apply command separately; never append `|| true` to bypass a migration error. DDL privileges belong only to the operator migration account, scoped to staging; use the minimum privileges required by the reviewed SQL. Runtime gets SELECT/INSERT/UPDATE/DELETE only on its own database, with no grant option, FILE, SUPER, administrative or global grants.

MariaDB DDL can implicitly commit. This runner is checksum-gated and has some idempotent guards, but a multi-statement schema migration is **not an atomic transaction**. Record per-statement outcomes after interruption. Do not delete the migration ledger or edit already-applied SQL to make checksums pass. Negative balances, orphan/cyclic uplines, duplicate unique records, open legacy features missing verified `base_credited`, or a failed financial reconciliation must block promotion. Preserve balances, entitlements, seeds and audit rows. AUD-036 needs reviewed historical records and an owner-approved policy for already-paid features/caps; no automatic inferred credits are proposed.

## Automatic application rollback

Activation validates platform/Node/artifact/migration digests and persisted receipt codec policy, runs a loopback candidate on 18081 with a 256 MiB heap and two DB connections, checks schema plus exact release SHA, then stops it. It drains the old PM2 worker before atomically changing the serving pointer and starts one worker on 18080. Failed post-switch health quiesces that worker, restores the old pointer, and restarts/probes the old release. The deployment job reports failure even when recovery succeeds. Expect a short maintenance gap with one fork worker; this is not a zero-downtime promise.

`current.json`, `previous.json`, `storage-requirements.json`, artifact manifests and both artifacts are recovery material. No DB schema/data downgrade is performed. Rollback is allowed only when the old artifact can read the current schema and stored receipts. Keep `OPERATION_COMPRESSION=0`; compression readers must exist in both retained releases before any future opt-in. Never overwrite/remove the persisted codec requirement to bypass downgrade protection.

Operator rollback uses the same restricted control path (administrator on the server, not the CI SSH key):

```bash
cd /var/www/maxhigh-staging
export PM2_HOME=/var/www/maxhigh-staging/.pm2
PREVIOUS_SHA=$(node --input-type=module -e '
  import fs from "node:fs"; import path from "node:path";
  const p=JSON.parse(fs.readFileSync("deploy/releases/previous.json"));
  if(path.dirname(p.directory)!==process.cwd()+"/deploy/releases") throw Error("Invalid pointer");
  const sha=path.basename(p.directory); if(!/^[a-f0-9]{40}$/.test(sha)) throw Error("Invalid SHA");
  console.log(sha);')
node deploy/staging/control.mjs --activate "$PREVIOUS_SHA"
```

Run as `maxhigh-stage` with its fixed HOME/PATH/PM2_HOME. First-release failure has no old artifact: the app stays unavailable; it cannot truthfully report a successful rollback. A timeout/power loss may leave `activation.lock`. Inspect worker PID/cwd, candidates, pointer files and pending DDL before an administrator removes a stale lock. Never remove a lock while an activation process is alive. Keep the prior artifact until an actual rollback rehearsal succeeds. `pm2 jlist`/dump files contain secrets; never attach their raw output to CI or reports.

## Off-host encrypted backup and restore gate

Existing `deploy/profiles/ph-vps-2/backup.sh` now requires `MAXHIGH_APP_ROOT` instead of assuming `/srv/maxhigh`; use `/var/www/maxhigh-staging` for rehearsal and only an independently approved production root later. The old service template paths must be adapted by an operator; nothing is installed automatically. Keep restic repository/password/provider credentials outside CI and readable only by a backup identity. Grant that identity only the privileges required for consistent dumps, reviewed routines/events/triggers and binlog coordinates. A local encrypted fixture restore from Windows is historical evidence, **not** an off-host delivery/PITR pass.

Actual staging commands, with private INI/credential files already provisioned:

```bash
set -euo pipefail
umask 077
export MAXHIGH_APP_ROOT=/var/www/maxhigh-staging
export MYSQL_DATABASE=maxhigh_staging
export MYSQL_BACKUP_DEFAULTS=/etc/maxhigh-staging/backup-client.cnf
export RESTIC_REPOSITORY='sftp:BACKUP_HOST:/APPROVED_REPOSITORY'
export RESTIC_PASSWORD_FILE=/etc/maxhigh-staging/restic-password
# A local administrator runs this with the backup identity; it takes a lock.
bash /var/www/maxhigh-staging/deploy/profiles/ph-vps-2/backup.sh
restic snapshots --tag maxhigh
restic check --read-data
# Choose the exact SQL snapshot ID from this rehearsal, not "latest".
: "${RESTORE_SNAPSHOT_ID:?Explicit reviewed SQL snapshot ID required}"
[[ "$RESTORE_SNAPSHOT_ID" =~ ^[a-f0-9]{64}$ ]]
# On a SEPARATE isolated recovery host only; client file targets a NEW empty schema.
test "${CONFIRM_ISOLATED_RECOVERY:-}" = maxhigh_recovery
RESTORE_DIR=$(mktemp -d /var/lib/maxhigh-recovery/verified.XXXXXX)
restic restore "$RESTORE_SNAPSHOT_ID" --target "$RESTORE_DIR" --verify
# Restic dump-to-SQL is not piped into MariaDB: authentication/integrity must finish first.
test -f "$RESTORE_DIR/maxhigh.sql"
mariadb --defaults-extra-file=/etc/maxhigh-recovery/client.cnf maxhigh_recovery < "$RESTORE_DIR/maxhigh.sql"
```

The recovery administrator must create `maxhigh_recovery` empty and ensure the recovery identity has **no grants to staging or production**, disable scheduled events, and inspect SQL for embedded schema qualifiers/DEFINER clauses before import. Avoid replaying unreviewed external routines/events against live services. Revoke any access to payment/email providers. The restic snapshot has tag `pending-restore`; mark it verified only after checking all table row counts and canonical hashes on a quiescent source/restore pair, wallet balances vs signed ledger, operation key/proof uniqueness, retained features/base credits, seeds/nonces, migration checksums, artifact/schema/codec compatibility, and application smoke tests. Record snapshot/metadata IDs, off-host location, versions, duration/RTO, timestamp/RPO and reviewer; keep secrets out of evidence. Never prune recovery material before that review.

For point-in-time recovery, the current dump script is **not sufficient**: it does not archive a continuous off-host binlog chain or establish a tested snapshot coordinate. Before production, prepare an approved consistent snapshot with verified binlog file/position or GTID coordinates, encrypted continuous off-host binlog retention, tested gap detection and retention alarms. Rehearse on an isolated host: restore base, apply matching binlogs to an explicitly chosen transaction boundary with `mariadb-binlog`, validate financial conservation and measure RPO/RTO. Do not invent a coordinate or stop time. No production PITR command is supplied because the source topology/coordinates/recovery policy have not been verified. A failed rollback must not trigger automatic restoration over the live financial database.
