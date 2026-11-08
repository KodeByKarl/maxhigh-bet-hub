#!/usr/bin/env bash
# Operator-installed only. Requires a separately provisioned off-host restic repo.
set -euo pipefail
umask 077
: "${MYSQL_BACKUP_DEFAULTS:?Private MariaDB defaults file required}"
: "${MYSQL_DATABASE:?Explicit source database required}"
: "${RESTIC_REPOSITORY:?Off-host encrypted restic repository required}"
: "${RESTIC_PASSWORD_FILE:?Private restic password file required}"
: "${MAXHIGH_APP_ROOT:?Explicit application root required (for example /var/www/maxhigh)}"
[[ "$MAXHIGH_APP_ROOT" = /* && -d "$MAXHIGH_APP_ROOT/deploy/releases" ]] || exit 2
[[ "$MYSQL_DATABASE" =~ ^[A-Za-z0-9_]+$ ]] || exit 2
case "$RESTIC_REPOSITORY" in sftp:*|s3:*|b2:*|azure:*|gs:*|rclone:*|rest:https://*) ;; *) echo 'An off-host repository is required'; exit 2;; esac
exec 9>/run/lock/maxhigh-backup.lock
flock -n 9 || exit 2
state=/var/lib/maxhigh-backup
mkdir -p "$state"
# No plaintext SQL is stored on the VPS. pipefail rejects dump or upload failure.
mariadb-dump --defaults-extra-file="$MYSQL_BACKUP_DEFAULTS" \
  --single-transaction --quick --skip-lock-tables --hex-blob \
  --routines --events --triggers --skip-dump-date --order-by-primary \
  "$MYSQL_DATABASE" | \
  restic backup --stdin --stdin-filename maxhigh.sql --tag maxhigh --tag pending-restore --json > "$state/last-backup.json.tmp"
mv -- "$state/last-backup.json.tmp" "$state/last-backup.json"
metadata=("$MAXHIGH_APP_ROOT/deploy/releases/current.json")
for item in previous.json storage-requirements.json; do
  if [[ -f "$MAXHIGH_APP_ROOT/deploy/releases/$item" ]]; then metadata+=("$MAXHIGH_APP_ROOT/deploy/releases/$item"); fi
done
# Preserve compatibility policy with the recovery material. Pointer paths must
# be reviewed, never blindly applied to a different restore host.
restic backup --tag maxhigh-metadata --tag pending-restore --json "${metadata[@]}" > "$state/last-metadata.json.tmp"
mv -- "$state/last-metadata.json.tmp" "$state/last-metadata.json"
# Repository integrity sampling does not replace an actual isolated restoration.
bucket=$(( ($(date +%s) / 86400 % 20) + 1 ))
restic check --read-data-subset="$bucket/20"
printf '%s\n' 'Encrypted backup uploaded; mark verified only after a successful isolated restore.'
