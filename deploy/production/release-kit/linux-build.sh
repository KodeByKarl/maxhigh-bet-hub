#!/usr/bin/env bash
# Usage (host): start mariadb@sha256:6c65a843396dc6c78dd0da19eccaa0a91d25d9d26a4c2afcb75010ac3f59f5ea with --port=19307, then
#   docker run --name mh-ci-build --network container:<db> -v <outdir>:/out ubuntu:24.04 bash /out/linux-build.sh
# Reproduces .github/workflows/validate.yml (job "build") on ubuntu:24.04. Runs inside the builder container.
set -euo pipefail
SHA=d22dfd99ef47afdf26d60eaf69ab1244adab910f
NODE=24.22.2
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq git curl xz-utils python3 ca-certificates >/dev/null
cd /tmp
curl -fsSLO https://nodejs.org/dist/v$NODE/node-v$NODE-linux-x64.tar.xz
curl -fsSL https://nodejs.org/dist/v$NODE/SHASUMS256.txt | grep " node-v$NODE-linux-x64.tar.xz\$" | sha256sum -c -
tar -xJf node-v$NODE-linux-x64.tar.xz -C /opt && export PATH=/opt/node-v$NODE-linux-x64/bin:$PATH
git clone -q https://github.com/KodeByKarl/maxhigh-bet-hub.git /src && cd /src && git checkout -q $SHA
test "$(git rev-parse HEAD)" = "$SHA"
echo "== checkout $(git rev-parse HEAD), node $(node -v), $(grep VERSION_ID /etc/os-release)"
npm ci --include=dev
npm audit --audit-level=high
python3 -m unittest discover -s scripts/ci -p 'test_*.py' -v
npm install --prefix /tmp/browser-tools --no-save --ignore-scripts playwright@1.65.0
node /tmp/browser-tools/node_modules/playwright/cli.js install --with-deps chromium
export TEST_OUTPUT=audit/ubuntu-staging/runtime/unit MIGRATION_OUTPUT=audit/ubuntu-staging/runtime/migrations \
  INTEGRATION_OUTPUT=audit/ubuntu-staging/runtime/integration BROWSER_OUTPUT=audit/ubuntu-staging/runtime/browser \
  PLAYWRIGHT_MODULE=/tmp/browser-tools/node_modules/playwright PREVIEW_TEST_OUTPUT=audit/ubuntu-staging/runtime/preview \
  GITHUB_SHA=$SHA
node deploy/ci/build-artifact.mjs
cp -r audit/ubuntu-staging/runtime/ci /out/ci
cp -r audit/ubuntu-staging/runtime /out/evidence
echo "== BUILD COMPLETE"
