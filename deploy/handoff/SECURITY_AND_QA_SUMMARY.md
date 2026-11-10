# Security and QA summary - release `release/uat-phase2`

All results are from the clean release tree's own build, on disposable local MariaDB 10.11.14 clones with synthetic data and loopback-only access. Nothing was run against UAT or production in this phase. Raw evidence: `C:\Users\Keydi\maxhigh-evidence\phase2\` (checksums in RELEASE_MANIFEST.json).

## 1. Results (final build)
| Suite | Result |
|---|---|
| TypeScript typecheck | clean |
| Production build | succeeds; **reproducible** (two builds from the same commit give the same digest; see manifest) |
| Unit suite | **23/23** |
| Migration suite (fresh, upgrade with sentinel user, preflight dirty-data, risk-row preserved, legacy feature) | **5/5**, includes "0005 ships inactive" assertions |
| Integration suite (HTTP, fail-closed risk, idempotency, caps, rollback) | **18/18** |
| Restriction database tests (upgrade byte-for-byte, classification, cap, 20-way race, idempotent re-run, mid-failure recovery, rollback) | **15/15** |
| Restricted-mode end-to-end suite (restrictions OFF then ON) | **49/49** |
| All 100 games, restrictions disabled (functional, negative, idempotency, concurrency, recovery) | **100/100**, 1,561 checks, 0 failures |
| 50 proposed-available games, restrictions ON | **50/50**, 465 checks |
| 50 proposed-locked games, restrictions ON | **50/50 refused** with the approved message and no wallet/ledger change |
| Security probes (anonymous, escalation, forged origin/cookie, malformed bets, hostile strings, replay, logout) | **29/29** |
| Wallet/ledger reconciliation | balance = opening + ledger sum for every account; `balance_after` chain unbroken; no negative balances |
| Browser: lobby smoke desktop+mobile | 48/48 |
| Browser: lobby widths 320-430 px, landscape, tablet | 35/35 |
| Browser: Back/history behaviour | 10/10 |
| Wild Panther buy-feature price/settlement | price exactly 41x at bets 0.2/1/5/200; ledger balanced; Super Buy refused |
Wild Panther RTP (seeded, 2M spins + 150k features, 95% CI): base 96.51% [95.27, 97.74]; ante 96.41% [95.30, 97.52]; buy 96.30% [94.67, 97.94]. See WILD_PANTHER_REPORT.md.

## 2. "Locked" versus "functional" - kept separate
Functional QA runs with restrictions disabled and proves the engines work (100/100). Access-restriction QA runs with the policy ON and proves refusal (50 locked) and continued function (50 available). A locked game passing functional QA locally while refusing access under the policy is the expected result; **the restricted configuration has been exercised locally only** (proposal list, test policy), never on UAT, and the active policy ships empty.

## 3. Restriction-specific tests (all passed)
Every new wager, feature purchase, room join/populate and shot on a locked game is refused for player, admin and superadmin alike, before any balance check; a round paid for before a lock can still be finished and a new purchase is refused; caller-supplied `accountClass` is ignored; role changes do not change the class; the class cannot be changed in the database without the developer session flag; third client account refused; **24 concurrent creations through each creation path at the cap -> none created, app still answers**; disabled-account replacement and re-enable rules; QA/admin identities keep working; grants: tampered, wrong key, missing confirmation, wrong password, non-superadmin, replay, forged database row all rejected, valid grant applied, lift-cap and exempt-account grants work; every refusal audited (49 rows in the burst test).

## 4. Defects found in my own work during this phase (all fixed before this release)
1. **Connection-pool deadlock** (critical when restrictions are active): the cap check read grants through a second pooled connection while holding a transaction; with N concurrent creators (N = pool size 6) the app stopped answering. Fixed by reading through the caller's transaction; regression test verified to detect it on the pre-fix build (90 s timeout) and to pass on the fixed build.
2. A first capacity check locked every user row and wrote its audit row on another connection, deadlocking on its own locks; replaced by the trigger-maintained counter on one row and post-transaction auditing.
3. MariaDB forbids a locking read of `users` inside a trigger on `users`: the DB backstop was redesigned around the counter row (tested under 20-way concurrency).
4. Migration `0005` was not re-runnable and could be left half-applied by a mid-way failure (DDL auto-commits); now fully idempotent and tested.
5. An existing migration test silently skipped its fixture once a 6th migration existed; fixed.
6. A mobile "fix" that only removed padding regressed portrait; caught by the audit, root cause (`h-dvh` inside a padded shell) fixed.
7. Earlier in the phase: Wild Panther ante RTP 100.4% and buy price 24x too low were caught by validation before release.

## 5. Security findings (no unresolved critical or high item known)
| Finding | Severity | Status |
|---|---|---|
| `superAdjustBalanceFn` reports "User not found" before the role check when a non-admin supplies a non-existent id (existence oracle on UUIDs) | low | open (documented) |
| A spoofed `Sec-Fetch-Site: same-origin` with a foreign `Origin` is accepted (a browser cannot forge that header; non-browser clients only; refused with 403 when the header is absent or cross-site) | informational | accepted |
| Test-only policy hook (`MAXHIGH_POLICY_TEST_FILE`) | informational | refuses to start outside a loopback, disposable-named database; must never be set on UAT/production |
| Grant expiry is apply-time only; no signed revocation kind (GRANT_SECURITY_REVIEW.md section 9) | low | documented, decision for owner |
| Login rate limiting trips under many scripted sign-ins | informational | the control working as designed |

## 6. Known issues and limitations
* Color Game lag not reproducible; Pro desktop improved (+7.7 fps, repeatable), everything else unchanged; unproven on real devices (COLOR_GAME_PERFORMANCE_REPORT.md).
* Mobile results are emulation only; Deep Bass fish labels at landscape margins are moving targets, judged not a defect; ~90 games not audited in-game at phone sizes (MOBILE_COMPATIBILITY_REPORT.md).
* Wild Panther: retriggers are rare (~0.4% per free spin) and features short (~10 spins); hit frequency ~20% with small wins; client acceptance pending.
* No admin screen for applying grants yet (applied through the audited server call).
* Release baseline: `2294d79`; the previous branch lineage and ~440 working-tree entries are unrelated history, deliberately excluded (see manifest).
* The VPS database preflight was not run (SSH key access lost at the machine restart); binary-log trigger risk reproduced locally (APPROVAL_GATES.md).
* No contract text available to me; no activation without confirmation.
