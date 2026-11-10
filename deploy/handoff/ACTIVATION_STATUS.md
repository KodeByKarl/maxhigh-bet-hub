# Activation status (2026-11-10)

**Live UAT:** release `8066092`, all 100 games open, no restriction active. The client has no access.
**Staged, not deployed:** release `75cc41980c70a2d188a9a8263ed56d4eb580d7a1` (CI run 42801994079, branch `ci/staging-artifact-dbf9134`; `main` untouched). Deploying it activates the 50-game lock, so it waits for the client's written acknowledgment.

| Item | Value |
|---|---|
| Artifact | `release.tgz` 457,442,659 bytes, SHA-256 `75c9ae791bd6cdb7ce08e152263d251f6ad08d66181c112133c86bb2505b57bc`; manifest `b759b5dd75b2dda89eb78c1a514c172c250641e2ee7f50421678a6b946b48fc9`; Linux x64, Ubuntu 24.04, Node 24.22.2, 100 games, 3,987 assets; no new migration |
| Staged on the VPS | `~/maxhigh-release-75cc419`, `~/maxhigh-kit-75cc419` (kit checksums verified there), `vps-extract-plan-75cc419-sudo.sh` (d7bf5b03...106d), `vps-apply-activate-75cc419-sudo.sh` (1a3c4ca9...955b3), backup batch `uat-r2.sh` (d843c60f...0821) |
| Policy | 50 locked / 50 playable (Wild Panther playable, Color Game Pro locked); NO account cap; owner `uat_owner` has full access to all 100 games; no grant keys |
| Tests on this code | policy unit 15 checks; end-to-end restrictions 89/89 (restrictions-off 100/100; 50/50 available; 50/50 locked refuse; compiled-only build: no account cap, owner plays/configures/bulk-configures all 100 with audit, owner QA never unlocks for clients, client administrators cannot play/activate locked games, cannot modify the owner account on any path, cannot apply grants, staff-tier admins cannot escalate); DB 18/18; unit suite 23/23; lint 0 errors; typecheck clean; kit tests pass |

## Still required before client access
1. The client's written acknowledgment (or the signed agreement verified to authorize the 50-game limitation). Draft: `CLIENT_ACKNOWLEDGMENT_DRAFT.md`.
2. Owner sudo steps (see ACTIVATION_RUNBOOK_FINAL.md): extract + plan, fresh trigger-aware backup (R2) + Windows drill, apply/switch script.
3. Post-deployment: `verify-activation.mjs`, `create-client-staff.mjs --apply`, ledger reconciliation, 100-game-equivalent and browser checks on the live UAT.
4. Owner decision recorded in the runbook: client administrators are superadmin-tier (non-owner) accounts, because only superadmins can create staff accounts and configure games.
5. Do not run `activate-restrictions.mjs --enforce yes`; `account_limits.enforced` must stay `no`.
