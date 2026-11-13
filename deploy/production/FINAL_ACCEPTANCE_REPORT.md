# MaxHigh production acceptance report: staff routes and role QA
Date: 2026-11-13. Target: https://maxhigh.online. Release unchanged: `29656ce`. Evidence: `output/production-role-acceptance/` (git-ignored; screenshots redacted copies in `docs/owner-manual/screenshots/`).

## Incident
- Symptom: `/superadmin`, `/admin` returned HTTP 404 on mobile.
- Root cause: edge rule `respond @staff 404` in the public Caddy block (UAT-era design). Application routes were correct. Fixed by the administrator (rule removed, Caddy reloaded; `/api/health` still 404). Application, database, balances untouched.
- `/agent` never existed; agents/master agents use `/admin/login`.

## Operational roles (owner clarification 2026-11-13)
Operational roles: **Super Admin, Master Agent, Agent, Player.** Master Agent and Agent perform the administrative functions assigned to them. The backend `admin` role/permissions are retained unchanged and unused; the proposed Admin-creation feature is cancelled (not implemented, not deployed); no `qa_admin` account exists.

## Role acceptance (desktop 1366px + mobile 390px; read-only run; authentication + page access only)
| Role | Login URL | Unauth behaviour | Login | Dashboard + refresh | Cross-role restriction | Session expiry (cookie) | Logout | Mobile | Final |
|---|---|---|---|---|---|---|---|---|---|
| Super Admin (`uat_owner`) | /superadmin/login | locked page + sign-in link | PASS | PASS | N/A (full access) | PASS | PASS | PASS | **PASS** |
| Master Agent (`qa_master_agent`) | /admin/login | same | PASS | PASS | PASS (/superadmin* refused) | PASS | PASS | PASS | **PASS** |
| Agent (`qa_agent`, upline qa_master_agent) | /admin/login | same | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Player (`uat_player5`) | / (Sign in) | guest lobby | PASS | PASS | PASS (/admin*, /superadmin* refused) | PASS | PASS | PASS | **PASS** |
| Admin | - | - | - | - | - | - | - | - | **N/A - Not part of the operational role requirements** |

## Agent vs Master Agent: intended administrative functions (from the server permission rules; NOT identical)
Verified by code review (`rbac.server.ts`, `network-scope.server.ts`, `admin/services.server.ts`) plus the tested menus; not exercised end to end.
| Function | Master Agent | Agent |
|---|---|---|
| Menu (tested) | Dashboard, Player List, Reports, Live Support | same menu |
| Permissions granted (rbac) | dashboard, user list/create, balance adjust, lock/unlock, reset failed sign-ins, wallet list, support, audit log, transactions, reports | same set |
| Visible accounts | own Agents, own Players, Players under those Agents | Players it created, Agents under it |
| Create accounts | Player or Agent | Player or Agent; **creating an Agent auto-promotes the creator to Master Agent** |
| Add/withdraw chips | direct Agents and Players; Players under its Agents | only Players it created |
| Credential edit, force sign-out, wallet-request review, roles, game/jackpot/promo/risk/system settings | not permitted | not permitted |
So: same permission names, different scope. Functional confirmation of each action = NOT TESTED (below).

## Blocked requests (40 in total: 8 superadmin, 9 master agent, 9 agent, 7 player; one kind only)
`POST /_serverFn/50c15694...518e` = `heartbeatFn` (`src/functions/api.ts:2178`, handler `heartbeatPresence` -> `touchPresence`, `src/server/session.ts:92`).
- Classification: **mutating, low impact**: `UPDATE sessions SET lastSeenAt = now WHERE token = <own session> AND not expired`. No balance, ledger, account or config write. Fired by `AuthProvider` on user activity (`src/lib/auth.tsx:115`) for every role.
- Not whitelisted (instruction). Effect on results: login/dashboard/permission/refresh/logout assertions do not depend on it and passed with it blocked; blocking cannot create a false PASS for cookie-clear session expiry. It does mean inactivity-based expiry was NOT exercised (NOT TESTED).
- Guest browsing makes zero POSTs.

## QA account inventory (created through the Super Admin UI by the QA tool, 0 balance)
| Username | Role | Upline | Created via |
|---|---|---|---|
| qa_master_agent | master_agent | @System / Direct | /superadmin/admins "+ Add Agent" |
| qa_agent | agent | qa_master_agent | same |
Existing: `uat_owner` (SuperAdmin, developer account), players incl. `uat_player5`. Staff list contained no Admin (none required) and no `client_owner`. QA accounts are NOT locked (awaiting approval).

## NOT TESTED (each separately identified)
1. Inactivity timeout (automatic sign-out after inactivity).
2. 12-hour absolute session expiry.
3. Data-changing workflows: create player/agent, add/withdraw chips, lock/unlock, reset failed sign-ins, support replies, Super Admin game/settings/jackpot changes, role changes. The runner blocked all non-GET requests except sign-in/sign-out.
4. The `heartbeatFn` background call (blocked).
5. Account-cap behaviour at the limit.
6. Game play (separate suite: `verify-games.mjs`).

## Outstanding issues
1. **`client_owner` does not exist on production** (separate handover requirement). Policy reserves it for the client owner (full game-config access, protected); only developer `uat_owner` exists. Needs owner approval to create (Super Admin -> Add Agent -> role SuperAdmin) and a secure password handover.
2. Agent/Master Agent dashboards show hardcoded trend badges ("+8.4%", "+5.2%", "+12.1%"; `AdminStatsCards.tsx:57,71,85`) regardless of data. Cosmetic but misleading; needs a code change/release (not requested).
3. An Agent creating an Agent is silently promoted to Master Agent; staff should be told (documented in the manual).
4. Staff accounts count toward the client-account cap (enforcement currently "off", max 2 in policy config); lock QA accounts only with approval.
5. Encrypted handover not yet produced; git changes unpushed; nothing deployed by this work except the administrator's Caddy change.

## Encrypted handover (run locally by the person holding the passwords)
`pwsh docs/owner-manual/credentials/Protect-MaxHighCredentials.ps1` (prompts for each password; AES-256-GCM; passphrase given in person/by phone). Template lists owner (pending creation), qa_master_agent, qa_agent, uat_player5. Never attach the passphrase to the file.

Verdict: incident **NOT fully closed**. The four operational roles passed authentication and page-access checks, but the NOT TESTED items above, the missing `client_owner` account and the pending handover remain.
