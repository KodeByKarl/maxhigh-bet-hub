# Access restrictions - specification and status

**Implemented locally and tested on a disposable clone. NOT activated anywhere. NOT deployed.**
Activation of either restriction is `PENDING APPROVAL` and `BLOCKED` on the items in section 7.
This document supersedes `RESTRICTIONS_DESIGN_NOT_IMPLEMENTED.md`.

## 1. What exists (status)
| Item | Status |
|---|---|
| Server-side game-access gate in the shared financial wrapper | IMPLEMENTED, TESTED |
| Policy compiled into the build (`src/server/policy/access-policy.config.ts`), shipped **off** | IMPLEMENTED |
| Locked-game status for the lobby (display only) + approved client message | IMPLEMENTED, TESTED |
| Account classes (`client` / `admin` / `qa`) + cap (application layer + DB triggers) | IMPLEMENTED, TESTED |
| Developer-signed entitlement grants (unlock games, lift cap, authorize exempt account) | IMPLEMENTED, TESTED |
| Developer activation script (dry run by default) | IMPLEMENTED, TESTED |
| Migration `0005_account_classes_and_entitlements` | IMPLEMENTED, TESTED on a disposable clone; NOT applied to UAT |
| The final list of 50 locked games | **PENDING APPROVAL** (a proposal exists, see PROPOSED_GAME_ALLOCATION.md) |
| Contract authorization to activate either restriction | **BLOCKED** - no agreement text available in the repository |
| Real grant-signing key | **NOT GENERATED** - owner must decide who holds it |

## 2. Game locks
* **Where it is enforced:** `assertGameAccess(gameId, action, actor)` runs inside `withFinancialOperation` before any wallet write. All 170 game operations pass a game id (static audit: `node scripts/audit-game-gate-coverage.mjs`; the 6 calls without one are non-game wallet operations). The 50 Realms slots pass `data.gameId` dynamically; the other 50 games pass a literal id.
* **Roles:** none exempt - player, admin, superadmin and owner get the same refusal, and it happens before balance checks (verified with a zero-balance owner).
* **Entry points covered (tested):** spin/deal/start/ensure-session/room sync/fishing shot for every locked game; feature purchase; direct RPC calls. There is no WebSocket channel in this application.
* **Rounds already paid for:** actions that *finish* a round (`...FreeSpinFn`, `...PlayFn`, `...FoldFn`, `...DrawFn`, `...GuessFn`, `...SkipFn`, `...CashoutFn`) are still allowed on a locked game so a player never loses a paid round or winnings; every new wager or purchase is refused. Verified: a feature bought before the lock was completed (10 free spins) and a new purchase was refused. Unknown/new action names default to refused.
* **No data is touched:** nothing is deleted, no balance is changed, history and audit stay readable. Locked attempts write an audit row (`game.locked_attempt`).
* **Message (exact):** "Game Locked. Please settle the remaining project payment to activate this game." (error code `GAME_LOCKED`; audit actions `game.locked_attempt` and `game.activation_rejected`)
* **Not a client-editable flag:** the lock list is compiled into the release. Changing it means a new reviewed release; unlocking one game needs a signed grant (section 4).

## 3. Two client accounts
* **Classes:** `client` (counts toward the cap), `admin` (maintenance/recovery), `qa` (synthetic test). The class is **never** taken from request data: new accounts are always `client` unless a valid developer-signed grant names that exact username (tested: a caller-supplied `accountClass` is ignored).
* **Cap:** maximum 2 active client accounts (active = class client and not admin-disabled). Brute-force lockouts are temporary and still count as active.
* **Atomic enforcement, two layers:** (1) application: capacity check inside the creating transaction, serialised on the single `account_limits` row; (2) database: `users_client_cap_bi/ai/au/ad` triggers maintain a counter and refuse a third active client (`CLIENT_ACCOUNT_LIMIT`) even for direct SQL. Tested: 20 concurrent inserts -> exactly 2; 24 concurrent creations through EACH creation path at the cap with a cold grant cache -> 0 created, app still answering (this test also guards against a connection-pool deadlock that an earlier version of the capacity check had).
* **Paths covered:** superadmin create, admin/agent create, re-enabling an admin-disabled client account, role change (class does not change), direct DB update of `account_class` (blocked without the developer session flag, trigger `users_class_guard_bu`).
* **Disabled-account replacement policy:** an admin-disabled client account does not count; disabling one frees exactly one slot; re-enabling it while full is rejected.
* **Existing accounts:** the migration only adds the column (default `client`) and marks `superadmin` accounts `admin`. UAT's 5 synthetic players stay `client` until the developer activation step classifies them `qa`. Nothing is deleted, disabled or edited otherwise (byte-for-byte check of every user row).
* **Audit:** `account.create_rejected` for every refused attempt (application and database layers); `restrictions.activate` for the activation step.
* **Message (exact, every surface):** "Account Limit Reached. Please settle the remaining project payment to add more client accounts." (error code `ACCOUNT_LIMIT_REACHED`; audit action `account.create_rejected`). Shown in the create-account forms, the admin notice and API errors.
* **Who counts (migration 0006):** only STAFF accounts (any role other than `player`, class `client`, not admin-disabled). Ordinary player accounts are never counted or limited. Promoting a player to a staff role while the cap is full is refused.

## 4. Unlocking / lifting (no master password, no backdoor)
Grants are JSON payloads signed offline with an Ed25519 private key held by the developer (never on the VPS, never in the repository). The build contains only the **public** key(s) (`grantKeys` in the policy). Applying a grant needs: a superadmin session + password re-confirmation + typing `APPLY SIGNED GRANT` + a valid signature, for this environment, unexpired, single-use (nonce). It is recorded in an append-only table and audited (`entitlement.apply`). Stored grants are **re-verified on every load**, so a row inserted straight into the database without a valid signature unlocks nothing (tested). Kinds: `unlock-games`, `lift-client-cap`, `authorize-exempt-account`.
Developer tool: `scripts/dev/sign-entitlement-grant.mjs` (requires a key file outside the repository).

## 5. Activation procedure (when approved) - nothing here has been run on UAT
1. Owner confirms the 50-game list and contractual authorization in writing.
2. Developer generates the signing key pair offline; adds the PUBLIC key to `grantKeys`; fills `gameLocks.lockedGames`; sets both `enforcement` fields to `"on"` in a reviewed commit.
3. Pre-deployment encrypted backup (G8/G9 flow). Deploy migration 0005 and the release through the normal reviewed release procedure.
4. Dry run: `node scripts/dev/activate-restrictions.mjs --classify qa:uat_player,uat_player2,uat_player3,uat_player4,uat_player5 --classify admin:uat_owner --max-clients 2 --enforce yes` (shows the plan, writes nothing).
5. Apply with `--apply` and `CONFIRM_ACTIVATE_RESTRICTIONS=maxhigh_staging`.
6. Verify: lobby shows exactly 50 Locked; locked games refuse; third client account refused; QA/admin logins unaffected; ledger reconciles.
Rollback: re-deploy the previous release (the app then ignores the new tables); optionally `activate-restrictions.mjs --enforce no`. Full schema rollback (drop 5 triggers, 2 tables, 1 column) is tested and loses no user data.

## 6. Safety properties (what the restrictions never do)
No deletions, no balance or ledger changes, no confiscation of winnings, no remote shutdown, no hidden control, no block on backups, restore, data export, read-only history, security updates or emergency maintenance. Both mechanisms are visible to the client (messages, audit log, this document).

## 7. Open decisions and blockers
1. The exact 50 games (a proposal exists and is arbitrary by design).
2. Written confirmation that the signed development agreement authorizes activating each restriction on UAT.
3. Who holds the grant-signing private key (and a backup of it).
4. Which two accounts are the client accounts (new or existing).
5. Whether the superadmin created for the client should be `client` or `admin` class (a superadmin created in-app is `client` unless a grant says otherwise).
