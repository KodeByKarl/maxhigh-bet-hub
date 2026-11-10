# Final activation runbook - 50 playable / 50 locked games, CLIENT owner configures all 100, NO account cap

**Rule:** the activation release has the 50-game lock COMPILED IN. Deploying it IS the activation. It is therefore built and staged, and deployed only after the owner has approved deployment AND confirmed the contractual basis (the client's written acknowledgment, CLIENT_ACKNOWLEDGMENT_DRAFT.md, or the signed agreement verified to authorize the limitation). A verbal agreement reported by the owner is not enough on its own. The earlier build 75cc419 is SUPERSEDED (it gave the developer exclusive owner access) and must not be deployed.

## Identities (compiled into the build; usernames honoured only while the role is superadmin)
| Identity | Account | Games | Locked games | Accounts |
|---|---|---|---|---|
| **Client owner** (business owner) | `client_owner` | plays the 50 unlocked; sees, opens, views and edits the configuration of ALL 100 (config saves, catalog settings, bulk) | cannot play, cannot activate; config/bulk/API/role changes never unlock | full: creates and manages staff, agents, administrators, players; roles; synthetic credits (may credit itself, UAT only) |
| **Client administrators** | `client_admin01`, `client_admin02` (superadmin tier, not owners) | plays the 50 unlocked; configures the 50 playable only | cannot play, activate or configure | create staff/players within permissions; cannot modify the client owner or developer account; cannot apply grants |
| **Developer** (separate technical maintenance) | `uat_owner` (existing, unchanged) | all 100 incl. audited QA play with synthetic credits | QA only (audited); never the client's identity | support/maintenance; protected from everyone but itself |

* No account cap anywhere (`clientAccounts` off; `account_limits.enforced` stays `no`; never run `activate-restrictions.mjs --enforce yes`). The "Account Limit Reached" notice never appears.
* Locked-game notice: "Game Locked. Please settle the remaining project payment to activate this game."
* No signing key exists: unlocking the 50 games after payment requires a new verified release.
* The developer holds no copy of the client owner's password: `create-client-staff.mjs` writes random temporary passwords to a local file that the owner delivers; the client owner changes it at first sign-in. The developer never uses the client owner identity for maintenance.
* Notes: game configuration READS are open by design (the game clients load them); only WRITES are guarded. Choice recorded: only superadmins can create staff and configure games in this system, so client administrators are superadmin-tier.

## Order of events
1. (assistant, done at commit) Build + CI + artifact verification + kit pins + test evidence.
2. (owner) Approve deployment; confirm the contractual basis (client's written reply stored). Tell the assistant.
3. (owner, sudo) extract + plan; fresh trigger-aware backup (R2) + Windows drill; apply/switch script (automatic rollback to the previous release if health fails). No migration is pending for this release.
4. (assistant) `node scripts/qa/verify-activation.mjs`: client sees exactly 50 locked / 50 playable; developer sees all 100; no limit notice.
5. (assistant) `node scripts/qa/create-client-staff.mjs --apply` (client_owner + client_admin01/02, 0 credits, passwords to a local file only), then `verify-activation.mjs --client-owner`, ledger reconciliation (owner sudo, read-only script) and browser checks.
6. (owner) fill the 7-day dates in CLIENT_TESTING_HANDOVER.md, deliver the URL and each login through separate channels, remind the client of the PHP 50,000 balance.

## Rollback
Reinstall `uat-run.rollback-<previous sha>.mjs` and restart `maxhigh-uat` (all earlier releases stay on the VPS). Database changes are additive; never restore over UAT, restore into the isolated check schema and compare.
