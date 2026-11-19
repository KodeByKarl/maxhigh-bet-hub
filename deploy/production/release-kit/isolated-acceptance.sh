#!/usr/bin/env bash
# Usage (host): docker commit the finished linux-build container as an image, start a FRESH pinned MariaDB on port 19307,
#   then run this script in that image with --network container:<db> and the build output mounted at /out.
# Isolated acceptance: the exact artifact on a fresh disposable database with synthetic demo accounts. Loopback only.
set -euo pipefail
export PATH=/opt/node-v24.22.2-linux-x64/bin:$PATH
DB=mh_acceptance_qa
mkdir -p /rel && tar -xzf /out/ci/release.tgz -C /rel
test "$(node -p "require('/rel/release-validation.json').sha")" = d22dfd99ef47afdf26d60eaf69ab1244adab910f
cd /src
mariadb_url="mysql://root:audit-local-only@127.0.0.1:19307/$DB"
node -e "require('mysql2/promise').createConnection('mysql://root:audit-local-only@127.0.0.1:19307').then(c=>c.query('CREATE DATABASE IF NOT EXISTS $DB').then(()=>c.end()))"
DATABASE_URL=$mariadb_url CONFIRM_SCHEMA_MIGRATIONS=$DB node scripts/migrate.mjs --apply
DATABASE_URL=$mariadb_url ALLOW_DEMO_SEED=disposable-test-only NODE_ENV=development node --import tsx scripts/seed.ts | tail -3
cd /rel
DATABASE_URL=$mariadb_url PORT=18999 NITRO_PORT=18999 HOST=127.0.0.1 NITRO_HOST=127.0.0.1 NODE_ENV=production \
  PUBLIC_URL=http://127.0.0.1:18999 RELEASE_SHA=d22dfd99ef47afdf26d60eaf69ab1244adab910f \
  node .output/server/index.mjs > /out/acceptance-server.log 2>&1 &
for i in $(seq 1 60); do curl -fs http://127.0.0.1:18999/api/health && break; sleep 1; done; echo
ACCEPTANCE_BASE=http://127.0.0.1:18999 RELEASE_DIR=/rel ACCEPTANCE_OUTPUT=/out/acceptance \
  PLAYWRIGHT_MODULE=/tmp/browser-tools/node_modules/playwright SEROVAL_FROM=/src/package.json \
  CATALOG_TSV=/src/deploy/diagnostics/uat-game-catalog.tsv node /out/isolated-acceptance.mjs
echo "== ACCEPTANCE COMPLETE"
