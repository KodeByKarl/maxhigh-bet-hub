# Deployment impact, deployment procedure and rollback - Wild Panther fix and QA tooling

Status: **PREPARED, NOT EXECUTED.** Nothing here has been committed, pushed, built on the VPS, deployed or restarted.
Every step marked `[APPROVAL]` needs an explicit go-ahead from the owner.

## 1. What changes at runtime

| Area | Change | Data impact |
|---|---|---|
| `src/lib/wild-panther-config.ts` | Calibrated defaults (see WILD_PANTHER_REPORT.md): cluster size, dead-spin %, bomb table, pay table, retrigger rule, new `maxFsSessionSpins` ceiling | None. Code defaults only |
| `src/components/maxhigh/wild-panther/gridState.ts`, `tumbleEngine.ts` | Tumble refills no longer spawn scatters (same rule as the calibrated Panther family) | None |
| `src/server/games/wild-panther.server.ts` | Retriggers stop at `maxFsSessionSpins`; earned wins are never reduced | None |
| `src/components/maxhigh/wild-panther/PaytableModal.tsx` | Rules text shows trigger, retrigger and ceiling from config | None |
| `scripts/*`, `scripts/qa/*` | Tests and QA tooling only; not part of the runtime bundle | None |

No database migration. No schema change. No change to `risk_controls`, wallet, ledger or audit code.

**Important precondition:** these are *code defaults*. A row in `game_controls` for `wild-panther` overrides them.
UAT has zero `game_controls` rows (verified), so the fix takes effect there. Before any production deploy, run
`SELECT game_id, enabled, LEFT(engine_config,200) FROM game_controls WHERE game_id='wild-panther';` - if an override exists it
keeps the old numbers until it is reviewed.

**In-flight sessions:** an open `wild-panther` free-spin session simply continues under the new rules (spins left and
accumulated win are stored in `play_sessions`). Prefer deploying when no player has an open feature.

**Behaviour change players will notice:** Wild Panther hits less often and pays smaller headline wins than before. That is
the point (the old build returned many thousands of percent of the stake). Tell the client before UAT sign-off.

## 2. Artifact and checksum
`deploy/handoff/ARTIFACT.json` records the SHA-256 of the build output (`.output`) computed with the repository's own
`artifactDigest()` and the SHA-256 of the source patch `wild-panther-fix.patch`. Verify both before use:
```powershell
Get-FileHash deploy\handoff\wild-panther-fix.patch -Algorithm SHA256
```
The VPS release flow (`deploy/auto-update.mjs`) works from a **full commit SHA**, so the patch must be committed
`[APPROVAL]` before a release can be prepared. The patch file is for review only.

## 3. Procedure (after approval) `[APPROVAL]`
1. Review `CHANGED_FILES.md`; commit only the listed files (no push yet).
2. `npm ci && npm run typecheck && npm run test:unit` on the build machine; `npm run build`.
3. `node deploy/auto-update.mjs --prepare <FULL_SHA>` (creates a separate worktree and validation manifest; read-only for the live site).
4. Take a fresh encrypted backup (`recovery.py backup`, same flow as G8/G9) and keep the previous release directory.
5. Owner approves; `node deploy/auto-update.mjs --activate <FULL_SHA>` - the migration gate is read-only, candidate health must pass, the pointer is switched atomically and the previous pointer is saved as `previous.json`.
6. Restart `maxhigh-uat.service` only if the activation procedure requires it (owner runs sudo).
7. Post-deploy: `/api/health` shows the new release; run `scripts/qa/uat-smoke.mjs`, then `uat-qa.mjs` for `wild-panther` through the loopback tunnel.

## 4. Rollback
* **Code:** re-activate the previous release (`previous.json` pointer is written by the activation step). Because there is no
  schema change, nothing needs to be undone in the database.
* **Database:** none required. If an unexpected data problem is ever suspected, restore the pre-deploy encrypted backup into the
  isolated `maxhigh_staging_restorecheck` schema first, compare, and only then decide (see UAT_RECOVERY_RUNBOOK.md and the G5-G10 evidence).
* **Wallet integrity check after rollback:** run the ledger reconciliation queries in `deploy/diagnostics/UAT_QA_PLAN.md` section 8.
* A rollback does **not** reverse wins already paid under either version; ledger rows are append-only.

## 5. What was verified, and what was not
Verified locally (see EVIDENCE index in the final report): unit suite, typecheck, 100-game functional/negative/idempotency/
concurrency suite on a disposable clone, security probes, ledger reconciliation of the clone.
Not verified: behaviour on the VPS build (it is not deployed), browser/visual rendering of the changed paytable text, and
production data (no production access was used).
