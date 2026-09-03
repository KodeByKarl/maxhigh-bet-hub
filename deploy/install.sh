#!/usr/bin/env bash
# One-time install of MaxHigh production + auto-update on Linux.
# Run from the repo root as the deploy user (not root for the app itself).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> MaxHigh auto-deploy install (Linux)"
echo "    repo: $ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: missing .env — copy .env.example and fill MySQL + DEPLOY_* secrets first."
  exit 1
fi

if ! command -v node >/dev/null; then
  echo "ERROR: node is required"
  exit 1
fi

if ! command -v pm2 >/dev/null; then
  echo "==> Installing pm2 globally"
  npm install -g pm2
fi

echo "==> npm ci"
npm ci

echo "==> production build"
NODE_ENV=production npm run build

mkdir -p deploy/logs

echo "==> starting PM2 (app + updater)"
pm2 start deploy/ecosystem.config.cjs
pm2 save

echo ""
echo "Done. Next:"
echo "  1) pm2 startup          # enable boot persistence (run the printed command)"
echo "  2) Optional: open firewall for DEPLOY_WEBHOOK_PORT (default 9090)"
echo "  3) GitHub → Settings → Webhooks →"
echo "       Payload URL:  https://YOUR_DOMAIN:9090/hooks/github"
echo "       Content type: application/json"
echo "       Secret:       same as DEPLOY_WEBHOOK_SECRET in .env"
echo "       Events:       Just the push event"
echo ""
echo "Polling works even without webhook (every DEPLOY_POLL_SECONDS)."
echo "Logs: deploy/logs/  |  Status: curl -s localhost:9090/health"
