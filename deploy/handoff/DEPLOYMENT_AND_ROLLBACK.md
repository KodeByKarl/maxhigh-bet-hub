# Deployment, verification and rollback - release `release/uat-phase2`

## UPDATE 2026-11-10 - preflight results and the deployment blocker (read this first)
**Status: NOT DEPLOYED. Deployment stopped at a mandatory safety gate (artifact provenance). UAT still runs release 2294d79; nothing was restarted or migrated.**

### Read-only VPS preflight (done; evidence `vps-db-preflight-*.txt`, `vps-deploy-layout.txt`, `vps-ledger-reconcile.txt`)
| Item | Result |
|---|---|
| MariaDB | 10.11.14 (Ubuntu 24.04), active |
| Binary logging | **OFF**; `log_bin_trust_function_creators` OFF (so the error-1419 risk does not apply here) |
| Migration ledger | 0000-0003, checksums **match** the LF release files exactly; 0004 and 0005 pending |
| Existing triggers / 0005 objects | none / absent |
| Baseline (before QA) | 6 users, 454 transactions, 50 audit rows, 1 risk_controls row (approved UAT values); `game_controls` empty (no Wild Panther override); original-defect message in app logs: **0** |
| Resources | 43 GB disk free, ~2.9 GB RAM available |
| Previous release | preserved: `/var/www/maxhigh/staging/releases/2294d79...` (immutable, root-owned) |
| Backups | only the 2026-11-09 16:44Z ciphertext exists - it predates the risk repair, funding and QA, so a **fresh backup is required** before any change |

### Privileges for migration 0005 (tested on a disposable MariaDB with the VPS's exact grants)
* `maxhigh_stage_migrate` has SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER but **no TRIGGER**: `0005` fails at its 6th statement (first `CREATE TRIGGER`) with "TRIGGER command denied".
* Minimum extra privilege: `TRIGGER` on `maxhigh_staging.users` (table-scoped; narrower than database-scoped).
* **A temporary grant that is revoked afterwards MUST NOT be used.** MariaDB checks the trigger DEFINER's `TRIGGER` privilege every time a trigger fires. Tested: after revoking it, every `INSERT`/`UPDATE` on `users` made by the app fails, which includes every wallet balance update.
* **Recommended: apply 0005 as root through the local socket**, so the DEFINER is `root@localhost`: no grant, nothing to revoke, no dependence on the migrate account (tested: triggers keep working with the migrate account removed; app writes work; enforcement works when enabled). Exact form (owner-run, after a verified backup): `sudo env DATABASE_URL='mysql://root@localhost/maxhigh_staging?socketPath=%2Frun%2Fmysqld%2Fmysqld.sock' CONFIRM_SCHEMA_MIGRATIONS=maxhigh_staging <approved node> <release>/migrate.mjs` - first WITHOUT `--apply` (read-only; prints the pending list and proves the connection), then with `--apply`. The socket URL form is standard mysql2 but could not be exercised on Windows; the read-only run is the proof.
* If the owner prefers a grant instead, it must be **permanent**: `GRANT TRIGGER ON maxhigh_staging.users TO 'maxhigh_stage_migrate'@'127.0.0.1'`, and the account must never be dropped while the triggers exist (a dropped DEFINER makes writes fail).

### Why the deployment stopped (mandatory gate: "documented pipeline, exact artifact")
UAT's 2294d79 is a **CI-built Linux artifact** (`release.tgz` + manifest + standalone extractor; validation manifest requires `platform linux`, `arch x64`, `os ubuntu-24.04`, `node 24.22.2`). `deploy/ci/build-artifact.mjs` aborts on anything else ("never relabel a Windows build"). This machine is Windows with no WSL/Docker; the CI builder needs a push to GitHub (excluded by the owner); building on the shared VPS would violate the setup kit's own resource and isolation rules. The VPS control scripts (`common.py`) also hard-code the single approved release identity (SHA and archive/manifest/extractor hashes), the service runs `pm2-uat.config.cjs` against `releases/<sha>`, and root-owned immutable releases are required. **No workaround was attempted.**

### Owner options to unblock (pick one)
1. **Authorize one narrow push**: `git push origin release/uat-phase2:ci/staging-artifact-dbf9134` (the repository already uses `ci/staging-artifact-*` branches for exactly this). CI builds and validates the Linux artifact; the owner downloads it with the pinned `deploy/staging/DOWNLOAD_ARTIFACT.ps1`. I then prepare the control-kit update (new SHA/hashes, tests, checksums) and the runbook below.
2. **Provide a Linux builder** (Ubuntu 24.04 x64, Node 24.22.2, clean checkout of `dbf9134`, network for `npm ci`): run `node deploy/ci/build-artifact.mjs` there and bring back `release.tgz` + manifest.
3. Not recommended: build on the VPS itself in a maintenance window.

### Runbook once an approved artifact exists (each step needs its own owner action where it uses sudo)
1. Verify artifact SHA-256 + manifest against `RELEASE_MANIFEST.json`; update the control kit identity constants in a reviewed commit and re-run `test_controls.py`.
2. **Fresh encrypted backup**: re-run the reviewed G6+G7, G8+G9 batches (restore-check schema recreation is developer-assisted), then the G10 drill with the permanent key; require plaintext hash match. Never delete the existing ciphertext.
3. Record baseline totals (`vps-ledger-reconcile-sudo.sh`).
4. Upload to the private inbox; verify hashes; extract with the standalone extractor into `releases/<new sha>` (previous release stays).
5. Migration as root via socket (above): read-only first, then `--apply`.
6. Switch `pm2-uat.config.cjs` to the new release path; restart only `maxhigh-uat.service`.
7. Verify (section 5 below) and run the 100-game QA; roll back (section 6) on any critical failure.

**Status: PREPARED. NOT DEPLOYED. DEPLOYMENT IS ON HOLD** pending owner approval. Nothing here has been run against UAT, no service was restarted and no commit was pushed.
Every step marked `[OWNER]` needs the owner (sudo password, approvals). Steps marked `[DEV]` are read-only or local.

## 1. What is being released
Branch `release/uat-phase2` = the deployed release **2294d79** + 16 explicit commits (exact commit, file list and checksums: `RELEASE_MANIFEST.json`). Logical groups:
1. **DB safety:** idempotent seed of the default `risk_controls` row (the original "Financial risk controls unavailable" defect; UAT already has the row from G11, the migration is a no-op there), migration preflight, destructive-script guards.
2. **Ops tooling:** encrypted backup/restore tooling, runbooks, diagnostics (not runtime code).
3. **Wild Panther calibration + Color Game wheel** (gameplay change, pending client acceptance).
4. **Access restrictions - SHIPPED INACTIVE** (migration 0005, server-side game gate, client-account cap, signed grants) + Back-button handling.
5. **QA tooling and handoff documents.**
6. **Safe-area-aware game shell** (mobile).
Why a separate branch: the main working branch carried a different history from the deployed release; the release branch contains *only* the identified delta on top of what is actually running (verified by a filesystem diff against `git archive 2294d79`).

## 2. Database changes (the only schema change in this release)
| Migration | Effect | Risk |
|---|---|---|
| `0004_seed_default_risk_controls` | `INSERT ... ON DUPLICATE KEY UPDATE id = id` | none (row exists on UAT; never overwrites configured limits) |
| `0005_account_classes_and_entitlements` | adds `users.account_class` (default `client`; superadmin -> `admin`), tables `account_limits` (ships `enforced='no'`) and `entitlement_grants`, 5 triggers on `users` | additive; no row is altered other than the superadmin class marker; **inactive until activation** |
No `DROP`, no `TRUNCATE`, no data rewrite. Tested on a disposable MariaDB 10.11.14 clone: upgrade from the UAT-like pre-0005 state preserved every user row byte-for-byte; 20 concurrent inserts -> exactly 2 clients; rollback restores the pre-0005 shape with identical user data (`scripts/test-restrictions-db.mjs`, 15/15).

### Two pre-deployment checks that could block migration 0005 `[OWNER]`
**Local reproduction (MariaDB 10.11.14 with `--log-bin`, `scripts/qa/test-binlog-trigger.mjs`): with binary logging ON and `log_bin_trust_function_creators=0`, a NON-SUPER account with every normal privilege (including TRIGGER) FAILS at the first `CREATE TRIGGER` (error 1419), leaving the column/table created and no triggers; re-running after the setting is enabled, or running as an account with SUPER, succeeds and keeps all user data.** The VPS state is unknown until the read-only preflight is run: use `deploy/diagnostics/vps-db-preflight-sudo.sh` + `scripts/qa/compare-ledger.mjs` (commands and decision options in APPROVAL_GATES.md).
1. **Trigger privilege.** `CREATE TRIGGER` needs the `TRIGGER` privilege for the migration account, and with binary logging enabled MariaDB additionally requires `log_bin_trust_function_creators=1` or SUPER (error 1419). Check (read-only): `SHOW VARIABLES LIKE 'log_bin%'; SHOW VARIABLES LIKE 'log_bin_trust_function_creators'; SHOW GRANTS FOR <migration account>;`. If binary logging is on and the variable is 0, **stop and ask the developer**; do not change server settings without review.
2. **Application account grants.** The UAT app account must be able to `SELECT/INSERT/UPDATE` the two new tables. If its grants are schema-wide (`maxhigh_staging.*`) nothing is needed; if they are per-table, add grants for `account_limits` and `entitlement_grants` (reviewed SQL, `[OWNER]`). Until activation the app only *reads* them (and only when the policy is on).

## 3. Pre-deployment gate (all must be true) `[DEV]` + `[OWNER]`
- [ ] Owner approves deployment in writing and resolves the artifact blocker above.
- [ ] A fresh encrypted backup exists and its plaintext hash was verified by the isolated restore + compare (G8/G9 flow) **after** the last UAT change, and the permanent-key drill (G10) is still valid.
- [ ] `RELEASE_MANIFEST.json` build digest matches the artifact that is about to be activated (`artifactDigest` from `deploy/release-manager.mjs`).
- [ ] `node scripts/migrate.mjs` (read-only) on the VPS lists exactly `0004` and `0005` as pending and reports no preflight issues (`--preflight`).
- [ ] Section 2 checks done.
- [ ] No unresolved critical finding (none known at the time of writing; see SECURITY_AND_QA_SUMMARY.md).
- [ ] Contractual authorization is **not** needed to deploy (restrictions ship inactive); it is needed to *activate* them.

## 4. Procedure `[OWNER runs privileged steps; developer prepares commands]`
1. From the build machine: `git -c safe.directory=* checkout release/uat-phase2`; `npm ci`; `npm run typecheck`; `npm run test:unit`; `npm run build`.
2. `node deploy/auto-update.mjs --prepare <FULL_SHA_OF_release/uat-phase2>` (separate worktree + validation manifest, read-only for the live site).
3. Backup (section 3). Keep the previous release directory.
4. Apply migrations through the reviewed gate: `CONFIRM_SCHEMA_MIGRATIONS=maxhigh_staging node scripts/migrate.mjs --apply` (needs the migration DB account; checksum-verified; stops on any error). **Half-applied state is not possible to get stuck in:** MariaDB DDL auto-commits, so a failure midway (typically trigger privilege, section 2) leaves the earlier statements applied and the migration unrecorded; `0005` is written to be fully re-runnable (`IF NOT EXISTS` / `CREATE OR REPLACE`), so you fix the cause and run the same command again (tested: re-running 3x is a no-op; recovery from a failure after the tables but before the triggers converges and the recovered triggers enforce). If it cannot be fixed, roll back (section 6).
5. `node deploy/auto-update.mjs --activate <FULL_SHA>` (atomic pointer switch, candidate health must pass, previous pointer saved as `previous.json`).
6. `[OWNER]` restart `maxhigh-uat.service` only if the activation procedure requires it.
7. Do **not** set `MAXHIGH_POLICY_TEST_FILE` / `MAXHIGH_POLICY_TEST_OVERRIDE` anywhere (test-only hooks that refuse to start outside a disposable loopback database).

## 5. Post-deployment verification (read-only unless stated)
1. `GET /api/health` -> `ok` and the new release SHA; systemd/pm2 healthy, 0 unexpected restarts.
2. `getAccessStatusFn` returns `lockedGames: []` (restrictions inactive) - **nothing is locked after this deployment**.
3. Row counts unchanged for `users`, `transactions`; `SELECT COUNT(*) FROM account_limits` = 1 with `enforced='no'`; `entitlement_grants` empty.
4. Smoke spin on `golden-panther` with `uat_player` (writes one synthetic round), ledger reconciles.
5. UAT test plan for all 100 games (writes synthetic rounds; needs the loopback tunnel; funding already done, do not repeat): `node scripts/qa/uat-qa.mjs --run --confirm-uat --evidence <dir>`; expected 100/100 with restrictions inactive; Wild Panther included (new math). Then `uat-postcheck.mjs` and the ledger reconciliation queries (UAT_QA_PLAN.md section 8).
6. Wild Panther spot check: Buy Bonus shows 41x the bet; a feature ends within ~25 spins.
7. Color Game / Pro open and spin on a phone (physical Android check, see section 8 of the QA summary).
8. Existing synthetic accounts intact: 1 superadmin + 5 players, balances and history unchanged apart from QA play.

## 6. Rollback
* **Application:** re-activate the previous release (`previous.json` pointer). The old build ignores the new tables/column.
* **Database (only if required):** `0004` needs no rollback. For `0005`: drop the 5 triggers (`users_client_cap_bi/ai/au/ad`, `users_class_guard_bu`), drop tables `entitlement_grants` and `account_limits`, `ALTER TABLE users DROP COLUMN account_class`, and delete the `0005%` row from `_maxhigh_migrations`. Tested: user data is identical before/after. Prefer re-activating the old release and leaving the additive schema in place.
* **Data problem suspected:** do not restore over UAT. Restore the pre-deployment backup into the isolated `maxhigh_staging_restorecheck` schema, compare, then decide with the owner.
* Wallet integrity after any rollback: run the ledger reconciliation (balance == opening + ledger sum, `balance_after` chain unbroken, no negative balances).
* Rollback does not reverse wins already paid; ledger rows are append-only.

## 7. Decisions needed before deployment
1. Approve deployment of this release to private UAT, and who performs the privileged steps.
2. Confirm the Wild Panther gameplay change with the client (hits ~20% of spins with small wins; retriggers rare).
3. Section 2 checks (binary logging / trigger privilege, app grants).
4. Separately, for **activation** of restrictions: the 50-game list, contractual authorization, key holder (ACCOUNT_AND_GAME_RESTRICTIONS_SPEC.md section 7).

## 8. What was and was not verified
Verified on disposable clones: typecheck, build, unit/integration/migration suites, 100-game functional suite, restricted-mode end-to-end suite (50 available pass, 50 locked refuse), security probes, browser checks, ledger reconciliation. Not verified: the real VPS (nothing deployed), physical Android devices, trigger creation under the VPS server's binary-log settings, production data (no production access was used).
