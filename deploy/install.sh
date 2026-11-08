#!/usr/bin/env bash
# Start an already reviewed, activated release. No dependency/schema/data changes.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null
command -v pm2 >/dev/null
test -f .env || { echo 'Configure .env first'; exit 1; }
test -f deploy/releases/current.json || { echo 'Activate a validated release first; see deploy/README.md'; exit 1; }
mkdir -p deploy/logs
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
