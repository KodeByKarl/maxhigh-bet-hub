# MaxHigh private UAT - final deployment report (2026-11-10)

**Status: DEPLOYED to the private synthetic-credit UAT. Restrictions IMPLEMENTED BUT INACTIVE (awaiting owner/contract approvals). Not production. No real money.**

## Release
| Item | Value |
|---|---|
| Deployed release SHA | `e89359f0ea26ea71bea4522a2c8eced7911d8fc3` (branch `release/uat-phase2`, CI branch `ci/staging-artifact-dbf9134`, run 42761192283) |
| Artifact | `release.tgz`, 457,425,238 bytes, SHA-256 `0374e3840daea94ca1ea44fcc60ef6b3f3161f9f7724ac0a7ea23e0d92d2f448` |
| Manifest SHA-256 | `c7df90858160166b985be0db6b415e4d92c00c398f5f145d84ee4afdb92facd4` |
| Extractor SHA-256 | `522c5627dfdd2400f8b4237b671016e8be623a9894765029f816b40c3d9a8804` |
| Built on | CI, Linux x64, Ubuntu 24.04, Node 24.22.2; 100 games, 3,987 public assets; 8 CI checks passed |
| Previous release (kept for rollback) | `2294d79afb2b900f13a9cd05c427dc9857b89de1` (`releases/2294d79...` and `uat-run.rollback-2294d79...mjs` on the VPS) |
| Control kit | commit `9a8937a` (pins to the new artifact, root-socket migration script) |
| Live health | `{"ok":true,"release":"e89359f0..."}` on the UAT loopback endpoint |

## Database
* Fresh encrypted backup `staging-20261110T080853896081Z.sql.gz.age` (ciphertext SHA-256 `9404221ce9f9d10dd10877145789e0a7d21cc14d7660eb548fb3b66b0571ab36`, plaintext SHA-256 `10a085282595fdd3ac22df88d4cb4d395738b1736666ec0751777d3238d1f1f8`, 5,361,979 bytes), two recipients.
* Isolated restore into `maxhigh_staging_restorecheck`: all 21 tables; canonical data, ledger and schema fingerprints PASS; source CHECKSUM TABLE unchanged during backup.
* Permanent-key drill on Windows: PASS (plaintext fingerprint identical). The earlier 2026-11-09 backup was kept.
* Migrations 0004 and 0005 applied via the local root socket (`migrate-uat-root.sh`); preflight clean first; ledger now 0000-0005; **all 5 triggers have DEFINER `root@localhost`** (no service account was granted TRIGGER, nothing to revoke).
* Data preserved: before = after migration = after activation: 6 users, 637 transactions, 215 audit rows, balance sum 498,390.52.
* `account_limits`: enforced `no`, max 2; `entitlement_grants`: 0 rows.

## QA on the deployed release (synthetic credits, through the loopback tunnel)
* **100-game regression: 100/100 games passed, 927 checks, 0 failures** (functional 317, negative 500, idempotency 100, recovery 5, concurrency 5), including Wild Panther with the corrected math (3 functional rounds, negatives and idempotency pass). Evidence: `maxhigh-evidence\final\uat-100\`.
* Security probes: 29/29.
* Restrictions inactive: the locked-game check wagered on all 100 games and none was refused.
* Browser (Chromium emulation): lobby smoke 48/48, mobile/tablet widths 35 pages with no overflow or errors, back-navigation 10/10, Wild Panther page no console errors.
* No physical Android device was used; mobile results are browser emulation only.
* Ledger reconciliation (on the VPS database): see `LEDGER_RECONCILIATION_FINAL.md` in the evidence folder.

## Restrictions status (not activated)
The 50-game lock and the 2-client-account cap are built and tested locally but **shipped inactive** and **not activated**. Activation needs, in the owner's own words, an authorizing agreement and an approved 50-game list; neither exists in the repository. See `ACCOUNT_AND_GAME_RESTRICTIONS_SPEC.md`, `PROPOSED_GAME_ALLOCATION.md` (proposal only) and `GRANT_SECURITY_REVIEW.md`.
Update: the final notification wording, error codes, admin-catalog lock, staff-only cap (migration 0006) and trigger-aware backups were built after this deployment as release 8066092 (CI green, staged on the VPS, not deployed). See ACTIVATION_RUNBOOK.md.

## Known limitations
See `SECURITY_AND_QA_SUMMARY.md`, `WILD_PANTHER_REPORT.md`, `MOBILE_COMPATIBILITY_REPORT.md`. The recovery tool refuses to back up a schema that has triggers, so the next backups after migration 0005 need a reviewed extension of `recovery.py` (the pre-migration backup above is the recovery point for this deployment).
