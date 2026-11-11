# Verified backup and rollback plan (NOT EXECUTED)

Nothing here has been run. Every step that writes needs explicit approval. No passwords, DATABASE_URL
values or tokens belong in commands or logs: use private `--defaults-extra-file` option files (mode 600).

Variables (fill from the VPS configuration, never from guesswork): `DB` = actual production schema name,
`STAMP` = UTC timestamp, `BK` = a root-owned 700 backup directory with enough free space (check `df -h`).

## 1. Backup (read-only on the database)
Use the dedicated backup account (SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT, PROCESS only).
```bash
umask 077
mariadb-dump --defaults-extra-file=/root/.maxhigh-backup.cnf \
  --single-transaction --quick --routines --triggers --events --hex-blob \
  --default-character-set=utf8mb4 "$DB" | gzip -9 > "$BK/$DB-$STAMP.sql.gz"
sha256sum "$BK/$DB-$STAMP.sql.gz" > "$BK/$DB-$STAMP.sql.gz.sha256"
gzip -t "$BK/$DB-$STAMP.sql.gz"
```
`--single-transaction` gives a consistent InnoDB snapshot without blocking players.

## 2. Verify the backup by restoring into a SCRATCH schema (never over production)
Restore into `${DB}_restorecheck` using a privileged account that can create only that schema:
```bash
zcat "$BK/$DB-$STAMP.sql.gz" | sed "s/\`$DB\`/\`${DB}_restorecheck\`/g" | mariadb --defaults-extra-file=<restore cnf> "${DB}_restorecheck"
```
Then compare, source vs restored (read-only SELECTs, same output expected):
`COUNT(*)` of users, transactions, audit_logs, wallet_requests, play_sessions;
`SUM(balance)` of users; `SUM(amount)` of transactions; `MAX(created_at)` of transactions;
`SELECT * FROM risk_controls`; `SELECT version, checksum FROM _maxhigh_migrations ORDER BY version`.
Only when every figure matches is the backup "verified". Drop the scratch schema afterwards.

## 3. Rollback matrix
| Situation | Action | Data impact |
|---|---|---|
| risk_controls insert has a wrong value | `UPDATE risk_controls SET ... WHERE id='default'` to the approved value (one row) | none |
| Preflight fails | Stop. Nothing was changed. Fix data with a reviewed, separately approved script. | none |
| A migration fails midway (DDL is not transactional) | Do NOT delete ledger rows. Keep the app stopped, rerun after the cause is fixed (the runner skips objects that exist), or restore the verified backup | none unless restoring |
| Application release is bad but schema is fine | repoint `current` to the previous release directory and restart PM2 (schema changes in 0001-0004 are additive/compatible with the previous app except 0001 constraints) | none |
| Data corruption is found | Stop the app, restore the verified backup into a new schema, review, then swap with approval; transactions after the backup time must be reconciled from application logs | transactions after backup need reconciliation |

**Never** roll back by deleting the `risk_controls` default row (it disables every spin), by deleting
`_maxhigh_migrations` rows, or by truncating ledger/audit tables.

## 4. Pre-flight gates (all mandatory, in this order)
1. Backup exists, checksum file present, restore-verified (section 2).
2. `node .output/migrate.mjs --preflight` exits 0 with `issues: []` (read-only; also detects checksum mismatch).
3. Risk limits approved in writing by the business owner.
4. Written approval for the specific change (insert or migrate), then a single maintenance window.
