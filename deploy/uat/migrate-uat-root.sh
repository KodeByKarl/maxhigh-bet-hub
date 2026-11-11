#!/bin/sh
# Run as root on the VPS. Applies pending migrations (0004, 0005) to maxhigh_staging over the LOCAL ROOT SOCKET so the
# triggers get DEFINER root@localhost (no TRIGGER grant to any service account; nothing to revoke later).
# Usage: sudo sh migrate-uat-root.sh <release-sha> [apply]     (without "apply" it only prints the plan, read-only)
set -eu
umask 077
SHA=${1:?release sha}
MODE=${2:-plan}
R=/var/www/maxhigh/staging/releases/$SHA
N=/opt/maxhigh-node-24.22.2/bin/node
[ "$(id -u)" = 0 ]
[ -f "$R/.output/migrate.mjs" ]
export DATABASE_URL='mysql://root@localhost/maxhigh_staging?socketPath=%2Frun%2Fmysqld%2Fmysqld.sock'
export CONFIRM_SCHEMA_MIGRATIONS=maxhigh_staging DOTENV_CONFIG_PATH=/dev/null
cd "$R"
echo "== identity"; mariadb -N -e "SELECT CURRENT_USER(), DATABASE()" maxhigh_staging
echo "== preflight (read-only)"; "$N" .output/migrate.mjs --preflight
echo "== plan (read-only)"; "$N" .output/migrate.mjs || true
if [ "$MODE" = apply ]; then
  echo "== apply"; "$N" .output/migrate.mjs --apply
  echo "== pending after apply"; "$N" .output/migrate.mjs
  echo "== trigger definers"
  mariadb -N -e "SELECT trigger_name,definer FROM information_schema.triggers WHERE trigger_schema='maxhigh_staging' ORDER BY 1"
  mariadb -N -e "SELECT version FROM maxhigh_staging._maxhigh_migrations ORDER BY 1; SELECT enforced,max_client_accounts,active_clients FROM maxhigh_staging.account_limits; SELECT COUNT(*) FROM maxhigh_staging.entitlement_grants"
fi
