# MAXHIGH FINAL OVERNIGHT RELEASE REPORT - CHECKPOINT (written before the 03:50 PHT cutoff)

Written 2026-11-10 ~03:30 PHT. Hard stop: 03:50 (Windows shutdown 04:00, not disabled or postponed).

## 1. Final deployment status
**NOTHING WAS DEPLOYED. UAT was not modified in this phase.** Private UAT still runs release 2294d79 with the state left by the earlier G11/G12/G13 work (risk row fixed, 5 synthetic players funded to 100,000, 85 games QA'd). No migration is running or half-applied; no deployment is in flight.
Reasons the deployment gate was not passed (each is independently sufficient):
1. Activating the VPS release needs `sudo`/root on the VPS (password held only by the owner) and a service restart.
2. The two payment-dependent restrictions (50 locked games, 2 client accounts) are **not implemented** and have no approved list or confirmed contract authorization (see RESTRICTIONS_DESIGN_NOT_IMPLEMENTED.md). Shipping the Wild Panther fix without them would not meet the brief's definition of the release.
3. The release flow (`deploy/auto-update.mjs --prepare <sha>`) builds from a clean worktree of a commit; I committed locally but did not run it, and did not take a fresh pre-deploy backup.
4. 15 games are still untested on UAT; Android in-game navigation and real-device checks are not done.

## 2. Git
Branch `uat/wild-panther-calibration`, local commit `22d37cc176a361c7bfb74809be3e49419af3afc0` (parent 65a4fc2). **Not pushed.** ~440 other uncommitted entries in the working tree were deliberately left out (66 files committed: Wild Panther + Color Game files, calibrator, scripts/qa, deploy/handoff). Build digest and evidence checksums: `deploy/handoff/ARTIFACT.json` (build digest is of the working-tree build, not a clean-worktree release build).

## 3. Wild Panther (final, measured)
See WILD_PANTHER_REPORT.md. Seeded, 2,000,000 spins + 150,000 features, 95% CI: base **96.51%** [95.27, 97.74]; ante **96.41%** [95.30, 97.52]; buy-feature **96.30%** [94.67, 97.94]. Original defect: 713,919% RTP. Two further financial defects caught and fixed before commit: ante at 100.4% and buy price 24x too low (4.1x vs 41x per package). Server-path cross-check: 7,500 real paid spins, 98.97% observed (35 features; noise large), every ledger reconciled. Free-spin ceiling = 100 (never binds under final config: longest feature 25).

## 4. 100-game QA
Local disposable clone, final build: **100/100 games functional PASS**, 1,561 checks per run, **0 failures**, repeated (3 runs on the pre-fix build, 2 on the final build). Includes negative (zero/negative/sub-cent/over-max/under-min bets, forged fish ids), idempotent replay, concurrency, interrupted-session recovery. UAT: **85 PASS, 15 UNTESTED** (wild-panther + 14 games that had no recipe at the time; they pass locally). Do not report 100/100 on UAT. Per-game table: GAME_INVENTORY.md (generated from evidence).

## 5. 50 available / 50 locked - NOT DONE
No locks exist; all 100 games remain accessible on UAT. Needs owner decisions (RESTRICTIONS_DESIGN_NOT_IMPLEMENTED.md).

## 6. Two-account restriction - NOT DONE
Same. UAT currently has 1 superadmin + 5 synthetic QA players, all intact.

## 7. Color Game animation
COLOR_GAME_PERFORMANCE_REPORT.md. Changes committed; measured modest gain on Pro desktop (44.8 -> ~52 fps), Color Game unchanged (already ~59 fps in this environment). **The Android lag was not reproduced** (no real GPU); unproven on devices.

## 8. Responsiveness
Lobby pages (/, /slots, /fishing, /cards, /support) at 320, 360, 390, 412, 430 px portrait, 915x412 landscape, 800x1280 tablet: 35 checks, **0 horizontal scroll, 0 console errors, 0 touch targets < 32 px**; desktop+mobile smoke 48/48. **NOT done:** in-game screens at phone widths, safe-area/gesture-bar layout, virtual keyboard, Android Back/Home behaviour, duplicate history entries, round-loss prevention on Back. These need real-device or emulator work.

## 9. Security and ledger
29 security probes, 0 failed (anonymous access, player->superadmin escalation incl. real-victim balance adjust, forged origin/cookie, malformed/overflow bets, hostile strings, idempotency replay, logout invalidation). Observed design notes: foreign `Origin` is refused unless the browser-controlled `Sec-Fetch-Site: same-origin` is spoofed (non-browser clients only); `superAdjustBalanceFn` returns "User not found" for a non-existent id before the role check for non-admins (low-severity existence oracle, UUIDs). Clone ledger reconciliation: balance == opening + ledger sum for all users, balance_after chains unbroken, no negative balances. Unit suite 23/23, migrations 5/5, integration 18/18 (earlier build; unit re-run on final code). `tsc` clean. The app's login throttle triggered during heavy test logins (expected control).

## 10. VPS health
Not re-checked in this phase (no tunnel opened, UAT untouched). Last known (earlier today): health ok, release 2294d79, 0 restarts.

## 11. Backup / rollback
Recovery qualification G5-G11 passed earlier and evidence is preserved (`/root/maxhigh-evidence/*.pass` on the VPS; Windows drill evidence `g10b-drill-*.txt`; permanent key untouched in `C:\Users\Keydi\maxhigh-keys`). Deployment/rollback plan for this change: DEPLOYMENT_AND_ROLLBACK.md (no schema change; rollback = re-activate previous release). A fresh pre-deploy backup has NOT been taken.

## 12. Handoff files (deploy/handoff/ and evidence folder)
WILD_PANTHER_REPORT.md, COLOR_GAME_PERFORMANCE_REPORT.md, DEPLOYMENT_AND_ROLLBACK.md, GAME_INVENTORY.md/.json, RESTRICTIONS_DESIGN_NOT_IMPLEMENTED.md, ARTIFACT.json, this report. **Not written:** client-facing admin guide, UAT access instructions, acceptance checklist, mobile compatibility report beyond section 8.
Evidence: `C:\Users\Keydi\maxhigh-evidence\` (rtp-validation\, release-clone-100-r1/r2, release-security, release-browser, colorgame-perf, unit-tests-final2.txt, test-migrations-final.txt, test-integration-final.txt, wild-panther-calibration-*.txt/json, execution-log.md).

## 13. Blockers needing owner approval
1. Approve deploying the Wild Panther/Color Game commit to UAT (and who runs sudo), or tell me to do the release steps through you.
2. The 50-game list, contract confirmation, key-holder for unlock, and which two accounts are client accounts.
3. Whether to push the branch to GitHub (not done).
4. Approve the Wild Panther gameplay change (it hits ~20% of spins with small wins, rare retriggers) with the client before sign-off.

## Unfinished work (priority order)
1. Deploy gate: clean-worktree release prepare, fresh encrypted backup, activate, verify, rollback-ready.
2. Server-side game locks + 2-account cap (design done).
3. Android navigation/safe-area/in-game responsive pass; real-device Color Game profiling.
4. UAT QA of the 15 untested games after the new build is on UAT.
5. Client docs (admin guide, UAT access, acceptance checklist).

## Exact commands to resume
```powershell
# Repo state
cd D:\Porjects\maxhigh-bet-hub
git -c safe.directory=* log --oneline -3          # expect 22d37cc on uat/wild-panther-calibration
git -c safe.directory=* status --short | wc -l     # ~440 unrelated uncommitted entries remain

# Re-run local gates (needs the disposable MariaDB 10.11 on 127.0.0.1:19307, root pw 'audit-local-only')
npm run typecheck ; npm run test:unit ; npm run build
$env:CLONE_ROOT_PW='audit-local-only'; node scripts/qa/local-clone.mjs setup     # prints UAT_BASE / creds-file env
node scripts/qa/uat-fund.mjs --apply                                              # clone only (env points at the clone)
node scripts/qa/uat-qa.mjs --run --confirm-uat --rounds 3 --evidence <dir>
node scripts/qa/uat-security.mjs --confirm --evidence <dir>
npx tsx scripts/qa/wild-panther-validate.ts 2000000 150000 606 0                  # seeded RTP + CI (base); last arg 1 = ante
node scripts/qa/local-clone.mjs teardown

# Prepare the release (build machine, after approval)
node deploy/auto-update.mjs --prepare 22d37cc176a361c7bfb74809be3e49419af3afc0

# UAT access (read-only checks): loopback tunnel, then scripts use http://127.0.0.1:18080
ssh -i $env:USERPROFILE\.ssh\maxhigh_vps2 -N -L 127.0.0.1:18080:127.0.0.1:18080 maxhigh-ops@151.242.136.34
# Owner-run sudo checks on the VPS:
sudo grep -c "Financial risk controls unavailable" /var/www/maxhigh/staging/logs/uat-error.log
sudo mariadb -N -e "SELECT game_id FROM maxhigh_staging.game_controls"            # expect no rows (no wild-panther override)
```
