# MaxHigh private UAT - final report for release 8066092 (2026-11-10)

**Status: DEPLOYED and VERIFIED on the private synthetic-credit UAT. Both payment restrictions are IMPLEMENTED and TESTED but INACTIVE.** All 100 games are still playable, so the system must not be given to the client yet. Not production; no real money.

## Release
| Item | Value |
|---|---|
| Live release | `8066092cc16ee8f990cdbf6d5bced89cd186fb5b` (CI run 42789649819, branch `ci/staging-artifact-dbf9134`; `main` untouched) |
| Artifact | `release.tgz` 457,449,830 bytes, SHA-256 `e219f495fa973e272cd7d069674d2ecb6c1461c72a6eb56a376ca511e900ec06`; manifest `7733197aeb4c3cfb3442378088d15ebcb63285fdd06d74865b2152d125ff58ca`; Linux x64, Ubuntu 24.04, Node 24.22.2, 100 games, 3,987 public assets |
| Rollback | previous releases kept on the VPS: `e89359f...` (runner `uat-run.rollback-e89359f...mjs`) and `2294d79...` |
| Live check | `/api/health` returns the release above; service `maxhigh-uat` active; only that service was restarted |

## Database
* Migration ledger 0000-0006 (0006 `staff_accounts_only_cap` applied through the local root socket); all five triggers `DEFINER root@localhost`; write-path probe with triggers active passed.
* Data preserved across the migration and the switch: 6 users, 1,308 transactions, 355 audit rows, 491,946.75 credits (before = after).
* `account_limits`: enforced `no`, max 2. `entitlement_grants`: 0 rows. Lobby access status: no locked games. Admin catalog: 100 listed, 0 locked.

## Backups (trigger-aware, verified)
* Pre-0006 backup `staging-20261110T100406314824Z.sql.gz.age`: ciphertext SHA-256 `491b31e6241c3c546b662f4dbeb63abe449cdbd706b1de872a4aa57ec354055a`, plaintext SHA-256 `bcf6fb0ae6e8386f49190b7cf4b693ce874e2302df50ab0c26a226ece1debb1a` (11,158,354 bytes), recipients: permanent recovery key + a throw-away verification key.
* Isolated restore into `maxhigh_staging_restorecheck`: 23 tables and the 5 triggers; data, ledger, schema, constraint and trigger fingerprints identical; live schema byte-for-byte unchanged (CHECKSUM TABLE).
* Windows permanent-key drill: **G10b PASS** (`g10b-drill-20261110T100943Z.txt`).
* Two earlier backups kept. A first R2 attempt failed on a MariaDB privilege-row quirk (TRIGGER granted on the unescaped schema name); diagnosed with `vps-restore-diag-sudo.sh`, fixed and re-run. `recovery.py` now supports exactly the five reviewed triggers; any other trigger, routine, event or view is still refused.
* Limitation: a restore into the check schema needs `log_bin` OFF (true on this VPS) or SUPER / `log_bin_trust_function_creators`.

## QA on the deployed release (synthetic credits, through the loopback tunnel)
| Test | Result |
|---|---|
| 100-game regression (functional, negative, idempotency, recovery, concurrency) | **100/100 games, 927 checks, 0 failed**, includes Wild Panther (corrected math) |
| Security probes | 29/29 |
| Browser (Chromium emulation) | lobby smoke 48/48; 35 page/viewport widths without overflow or errors; back-navigation 10/10; Wild Panther page 0 console errors, 0 failed requests |
| Ledger reconciliation (VPS database, read-only) | balance = opening + ledger sum for every account (only opening: `uat_player` 1,000.00 seed; total difference exactly 1,000.00); balance_after chain breaks 0; negative balances 0; orphan transactions 0; large-win flags 0; 1,858 transactions, 480 audit rows |
| Open sessions | fishing rooms open by design; one `crane-pavilion` feature session with 12 free spins left (from earlier QA, preserved) |
| Restrictions, isolated disposable clone, same code | 56/56: 100/100 with restrictions off; proposed 50 available 50/50; proposed 50 locked all refuse for every role with no wallet/ledger change; cap 2 staff accounts, third refused with the notice; players unlimited; promotion to staff refused when full; admin catalog marks Locked and refuses activation; bulk actions skip locked games; signed grants |
| Kit and unit | kit tests pass (recovery 25); unit suite 23/23; lint 0 errors; typecheck clean; DB tests 18/18; trigger backup/restore proof 18/18 |

Evidence: `C:\Users\Keydi\maxhigh-evidence\final\` and `\final2\`.

## Not claimed
No physical Android device was used. The restrictions are not active on the live UAT, so "50 playable / 50 locked" is verified only on the isolated clone.

## Security notes
The sudo/SSH password and the recovery-key passphrase were pasted into the chat; they were not used by the assistant, but treat them as exposed: change the sudo password and re-wrap the recovery key under a new passphrase after today's work.
