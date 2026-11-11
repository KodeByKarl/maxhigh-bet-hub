#!/bin/bash
# Run as root. DIAGNOSTIC for the trigger-aware restore. Reads maxhigh_staging (dump only) and writes ONLY into the disposable
# maxhigh_staging_restorecheck schema, as the restore account, with the error output visible. No plaintext file is written;
# only ERROR lines and the shape of trigger lines (no data rows) are printed.
set -u
umask 077
[ "$(id -u)" = 0 ] || { echo "must be root"; exit 2; }
ADMIN=/root/maxhigh-staging-admin
RDB=maxhigh_staging_restorecheck
SRC=maxhigh_staging
export LC_ALL=C.UTF-8
echo "== versions"; mariadb --version; mariadb-dump --version
echo "== reset restore-check tables (disposable schema only)"
for t in $(mariadb -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema='$RDB' AND table_type='BASE TABLE'"); do
  mariadb -e "SET FOREIGN_KEY_CHECKS=0; DROP TABLE \`$RDB\`.\`$t\`"
done
echo "tables now: $(mariadb -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$RDB'")"
echo "== restore account grants"; mariadb -N -e "SHOW GRANTS FOR 'maxhigh_stage_restore'@'127.0.0.1'" | cut -c1-200
echo "== shape of trigger lines in the dump (first 60 chars + end of line)"
mariadb-dump --single-transaction --quick --hex-blob --skip-lock-tables --skip-add-locks --skip-disable-keys --skip-comments \
  --skip-add-drop-table --no-create-db --triggers "$SRC" 2> /dev/null | grep -n '50003 CREATE' | cut -c1-140 | head -6
echo "== sed filter result on the same lines"
mariadb-dump --single-transaction --quick --hex-blob --skip-lock-tables --skip-add-locks --skip-disable-keys --skip-comments \
  --skip-add-drop-table --no-create-db --triggers "$SRC" 2> /dev/null | sed -E 's/^(\/\*!50003 CREATE\*\/ )\/\*!50017 DEFINER=`[^`]+`@`[^`]+`\*\/ /\1/' | grep -n '50003 CREATE' | cut -c1-140 | head -6
echo "== import as the restore account (errors shown)"
mariadb-dump --single-transaction --quick --hex-blob --skip-lock-tables --skip-add-locks --skip-disable-keys --skip-comments \
  --skip-add-drop-table --no-create-db --triggers "$SRC" 2> /dev/null \
  | sed -E 's/^(\/\*!50003 CREATE\*\/ )\/\*!50017 DEFINER=`[^`]+`@`[^`]+`\*\/ /\1/' \
  | mariadb --defaults-extra-file="$ADMIN/restore-client.cnf" "$RDB" 2> /root/restore-diag.err
echo "import exit: ${PIPESTATUS[2]}  (dump=${PIPESTATUS[0]} sed=${PIPESTATUS[1]})"
echo "== error lines"; grep -i 'error' /root/restore-diag.err | cut -c1-300 | head -8
echo "== restore-check state"
mariadb -N -e "SELECT 'tables',COUNT(*) FROM information_schema.tables WHERE table_schema='$RDB' UNION ALL SELECT 'triggers',COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$RDB'"
rm -f /root/restore-diag.err
echo "== done (the restore-check schema is disposable; the next R2 run empties it first)"
