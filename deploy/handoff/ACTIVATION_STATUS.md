# Activation status (2026-11-10)

**Live UAT:** release `8066092`, all 100 games open, no restriction active. The client has no access.
**Staged, not deployed:** release `07d670abe485e06292d8c3e624e7df4824ae80eb` (CI run 42807038394, branch `ci/staging-artifact-dbf9134`; `main` untouched). Deploying it activates the 50-game lock, so it waits for the owner's explicit approval and the contractual basis.
**SUPERSEDED, never deploy:** `9f8ac98` (old 2-staff cap) and `75cc419` (developer-exclusive owner access).

| Item | Value |
|---|---|
| Artifact | `release.tgz` 457,443,419 bytes, SHA-256 `b5425205b5e64523760d16db708afa7bc42b138d58cabb206be3abc78b9c4760`; manifest `fad11c7053503732bbba6f63e1a94dce9f0c8ca87bad0975a3feefa9af65408b`; Linux x64, Ubuntu 24.04, Node 24.22.2, 100 games, 3,987 assets; no new migration; no secret files |
| Staged on the VPS | `~/maxhigh-release-07d670a`, `~/maxhigh-kit-07d670a` (kit checksums verified there), `vps-extract-plan-07d670a-sudo.sh` (58dd04e1...3407), `vps-apply-activate-07d670a-sudo.sh` (798f2fcd...780b), backup batch `uat-r2.sh` (d843c60f...0821) |
| Game policy | 50 playable / 50 locked (Wild Panther playable, Color Game Pro locked); no account cap; no grant keys |
| Client Owner (`client_owner`) | full administration; view/edit configuration of ALL 100 games (catalog, config saves, bulk); plays the 50 unlocked; cannot play or activate the 50 locked; can credit itself synthetic UAT credits |
| Client administrators (`client_admin01/02`) | create/manage permitted staff and players; configure the 50 playable games; cannot play/activate/configure locked games; cannot modify the client owner or developer account |
| Developer (`uat_owner`, unchanged) | separate technical-maintenance identity; audited QA play of locked games; never the client's identity; protected from everyone else |
| Tests on this code | policy unit 17 checks; end-to-end 109/109 (restrictions off 100/100; test policy 50/50 available, 50/50 locked refuse; compiled-only build: no cap; developer QA; client owner config of locked games + no play/activation + manages staff + cannot modify developer; client administrators cannot configure/play/activate locked games nor modify client owner/developer; staff-tier admins cannot escalate); DB 18/18; unit suite 23/23; lint 0 errors; typecheck clean; kit tests pass |

## Still required before client access
1. Owner approves deployment and confirms the contractual basis (the client's WRITTEN acknowledgment, draft in CLIENT_ACKNOWLEDGMENT_DRAFT.md, or the signed agreement). A verbal agreement alone is not a written basis.
2. Owner sudo steps (ACTIVATION_RUNBOOK_FINAL.md): extract + plan, fresh trigger-aware backup (R2) + Windows drill, apply/switch script.
3. After deployment: `verify-activation.mjs`, `create-client-staff.mjs --apply` (client_owner + two administrators, 0 credits, passwords to a local file only), `verify-activation.mjs --client-owner`, ledger reconciliation, browser checks.
4. Do not run `activate-restrictions.mjs --enforce yes`.
