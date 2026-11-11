# Combined UAT release: stabilization + mobile-first controls (NOT deployed)

Branch `feature/mobile-first-controls`, built from the deployed revision `0b58e6e`; includes `uat/stabilization-20261111` (merge `f7fc35c`).
**Artifact commit: `2d439ac38d8afaea2a93866b8b897b715bc1dae9`**. CI run 43016488636 (branch `ci/staging-artifact-uat-mobile-first-20261111`), Linux x64, Node 24.22.2. Commits after `2d439ac` are docs only.

| Item | SHA-256 |
|---|---|
| `release.tgz` (archive) | `de83525f17e86ac608a65ee8ff179a83d9d155835ffecafa2e7a129f3e15503a` |
| manifest | `6c34987ecc3f9d66db21d5ddcb6fcf5834eb5e1fd058a374d4570dce06e0c1a8` |
| `metadata.json` | `28c50696be9292c4d5f7006e94512240d76958472594b9d45b112b9dc43ae00b` |
| `safe-extract.py` | `522c5627dfdd2400f8b4237b671016e8be623a9894765029f816b40c3d9a8804` |
| GitHub artifact bundle (zip) | `0e13f7c081536fa1d573cc8400a96f102054aa0d9a5ba237d5a3a34ad42832d5` |

Verified locally: the downloaded zip matches GitHub's digest, and `sha256sum -c SHA256SUMS` passes for release.tgz, metadata.json and safe-extract.py. The built CSS contains the mobile layer.

## What changed vs 0b58e6e
- Stabilization: exact decimal Buy Bonus pricing (server and dialog), Wild Panther still locked at 10 free spins, Baccarat chip wrap, Color Game wheel labels, Shark Hunter rod row, fishing seabed skeleton, read-only browser guard.
- Mobile-first: `src/games/shared/layouts/skin-mobile.css` (presentation only): large primary Spin, 44px+ touch targets, safe-area padding, boards anchored above controls, landscape rules; Buy Bonus dialog totals always shown with two decimals.
- No schema, migration, lock/allocation, registry, auth, env or wallet change. The 50 unlocked / 50 locked allocation is untouched.

## Verification (before the artifact)
Typecheck, lint (0 errors), unit 27/27 (buy-bonus-spec, buy-bonus-modal, game-folders, realms-family, security-regressions, wild-panther), production build, read-only guard self-test ("read-only guard verified"), and 800 layout checks (100 games x 360x640, 375x667, 390x844, 393x852, 430x932, 844x390, 1366x768, 1920x1080) with 0 issues. CI integration tests passed.

## Deploy (operator; needs the SSH key and sudo; same procedure as 3e1a424)
```powershell
$k="$env:USERPROFILE\.ssh\maxhigh_vps2"; $d="maxhigh-ops@151.242.136.34"
ssh -i $k $d "mkdir -p ~/maxhigh-release-2d439ac"
# folder holding the downloaded artifact (release.tgz, SHA256SUMS, metadata.json, safe-extract.py) plus deploy\uat\upgrade-uat2.sh and rollback-uat2.sh:
scp -i $k release.tgz SHA256SUMS metadata.json safe-extract.py upgrade-uat2.sh rollback-uat2.sh "${d}:maxhigh-release-2d439ac/"
ssh -i $k $d "cd ~/maxhigh-release-2d439ac && sed -i 's/\r$//' *.sh && sha256sum -c SHA256SUMS"
ssh -t -i $k $d "sudo sh ~/maxhigh-release-2d439ac/upgrade-uat2.sh 2d439ac38d8afaea2a93866b8b897b715bc1dae9 de83525f17e86ac608a65ee8ff179a83d9d155835ffecafa2e7a129f3e15503a 6c34987ecc3f9d66db21d5ddcb6fcf5834eb5e1fd058a374d4570dce06e0c1a8"
```
The script takes a verified DB backup with a restore test, upgrades only `maxhigh-uat2`, health-checks `/api/health` for the new SHA, and reverts automatically on failure. It does not touch Caddy, the apex app, schema, accounts or locks.

## Rollback
`ssh -t -i $k $d "sudo sh ~/maxhigh-release-2d439ac/rollback-uat2.sh"` (restores the previous release; the pre-deploy backup stays in `/root/maxhigh-uat-predeploy-2d439ac-*`).

## After deploy
Check `/api/health` reports `2d439ac...`, then use only the read-only guarded browser checks (`scripts/qa/lib/readonly-guard.mjs`); do not press Buy & Play on UAT without the guard.

## Open items (not blocking this release)
- Wild Panther ledger investigation (`~/investigate-wp.sh`) still needs a sudo run; the unexplained balance movement needs the same read-only evidence.
- Quantity limits for the 79 non-Wild-Panther games remain provisional.
