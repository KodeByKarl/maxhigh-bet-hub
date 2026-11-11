#!/usr/bin/env bash
# Builds branch release/uat-phase2 in a separate worktree from the DEPLOYED release 2294d79, adding ONLY the identified delta as
# logical commits. Local only: nothing is pushed. Usage: scripts/qa/build-release-branch.sh <worktree-dir>
set -euo pipefail
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
REL="${1:?worktree dir}"
G="git -c safe.directory=* -c core.autocrlf=false"
ATTR='Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>'

cp_file() { mkdir -p "$REL/$(dirname "$1")"; cp "$SRC/$1" "$REL/$1"; }
cp_tree() { mkdir -p "$REL/$1"; (cd "$SRC/$1" && find . -type f ! -path '*/__pycache__/*' ! -name '*.pyc' -print0 | while IFS= read -r -d '' f; do mkdir -p "$REL/$1/$(dirname "$f")"; cp "$f" "$REL/$1/$f"; done); }
commit() { (cd "$REL" && $G add -A -- . && $G commit -q -F - <<EOF
$1

$2

$ATTR
EOF
); }

cd "$REL"
[ "$($G rev-parse --abbrev-ref HEAD)" = "release/uat-phase2" ] || { echo "wrong branch"; exit 1; }

# ---- 1. database safety: default risk_controls row, migration preflight, destructive-script guards
cp_file drizzle/0004_seed_default_risk_controls.sql
node -e '
const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
j.entries=j.entries.filter(e=>e.idx<=4);fs.writeFileSync(process.argv[2],JSON.stringify(j,null,2)+"\n");' "$SRC/drizzle/meta/_journal.json" "$REL/drizzle/meta/_journal.json"
for f in scripts/migrate.mjs scripts/seed.ts scripts/test-migrations.mjs scripts/test-integration.mjs scripts/truncate.ts scripts/demo-reset.ts scripts/cleanup-audit-game-noise.ts scripts/test-destructive-guard.ts scripts/run-unit.mjs package.json .gitignore deploy/release-manager.mjs; do cp_file "$f"; done
cp_tree scripts/lib
commit "fix(db): seed default risk_controls row; migration preflight; guard destructive scripts" "Spins failed with 'Financial risk controls unavailable' because the singleton risk_controls row was missing. Adds an idempotent seed migration (never overwrites configured values), read-only migration preflight checks, and environment guards for truncate/demo-reset/cleanup scripts."

# ---- 2. operations tooling and runbooks (no runtime code)
for d in deploy/vps-setup deploy/diagnostics deploy/uat; do cp_tree "$d"; done
for f in deploy/staging/FIRST_TRANSFER_GUIDE.md deploy/staging/PRODUCTION_READINESS.md deploy/staging/VERIFIED_ARTIFACT_EXECUTION_PLAN.md; do cp_file "$f"; done
commit "ops: encrypted backup/restore tooling, UAT runbooks and diagnostics" "Recovery qualification tooling (age-encrypted backups, isolated restore, compare), read-only diagnostics, remediation SQL and runbooks. Not part of the application runtime."

# ---- 3. Wild Panther calibration + Color Game wheel
for f in src/lib/wild-panther-config.ts src/server/games/wild-panther.server.ts src/components/maxhigh/wild-panther/gridState.ts src/components/maxhigh/wild-panther/tumbleEngine.ts src/components/maxhigh/wild-panther/PaytableModal.tsx src/components/maxhigh/games/color-game/ColorGameTable.tsx src/components/maxhigh/games/color-game-pro/ColorGameProTable.tsx scripts/test-wild-panther.ts scripts/calibrate-panther.ts; do cp_file "$f"; done
commit "fix(wild-panther): calibrate to 96.5% RTP, bound free spins; smoother Color Game wheel" "Measured (seeded, 95% CI): base 96.51%, ante 96.41%, buy feature 96.30%. Tumble refills no longer spawn scatters, calibrated cluster/bomb/pay settings, ante multiplier 1.27, buy price 41x per package, maxFsSessionSpins=100 backstop. Color Game wheel: WAAPI flapper, reduced motion, hidden-tab settle, paint-cost reductions."

# ---- 4. access restrictions (shipped inactive) + Back-button handling
cp_file drizzle/0005_account_classes_and_entitlements.sql
cp_file drizzle/meta/_journal.json
for f in src/server/operation.server.ts src/server/superadmin/services.server.ts src/server/admin/services.server.ts src/server/db/schema.ts src/server/access-policy.server.ts src/server/access-admin.server.ts src/functions/access.ts src/lib/useAccessStatus.ts src/lib/overlay-history.ts src/lib/round-guard.ts src/lib/useOverlayBack.ts src/components/admin/AccountLimitNotice.tsx src/components/admin/users/CreateUserForm.tsx src/routes/superadmin/users.tsx src/routes/superadmin/admins.tsx src/components/maxhigh/GameModal.tsx src/components/maxhigh/SlotGameGrid.tsx src/components/maxhigh/GamePlayModal.tsx scripts/test-access-policy.ts scripts/test-restrictions-db.mjs scripts/audit-game-gate-coverage.mjs; do cp_file "$f"; done
cp_tree src/server/policy
cp_tree scripts/dev
commit "feat(access): server-side game locks and 2-client-account cap (SHIPPED INACTIVE); Back-button handling" "Policy compiled into the build with enforcement OFF. Migration 0005 adds account classes, account_limits, entitlement_grants and backstop triggers. Unlocking only via developer-signed Ed25519 grants. Activation needs a reviewed release, owner-confirmed game list and contractual authorization. Back button closes overlays first and is absorbed while a round request is in flight."

# ---- 5. QA tooling and handoff documents
cp_tree scripts/qa
cp_tree deploy/handoff
commit "test(qa): 100-game, security, restriction, browser and RTP validation tooling; handoff documents" "Loopback-only QA harness (refuses non-loopback targets), seeded RTP validators, security probes, browser checks, evidence generators."

echo "built:"; $G log --oneline -6 | cat
