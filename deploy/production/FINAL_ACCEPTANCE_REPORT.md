# MaxHigh production acceptance report: staff routes and role QA
Date: 2026-11-13. Target: https://maxhigh.online. Release unchanged: `29656ce`. Evidence: `output/production-role-acceptance/` (git-ignored; screenshots redacted copies in `docs/owner-manual/screenshots/`).

## Incident
- Symptom: `/superadmin`, `/admin` returned HTTP 404 on mobile.
- Root cause: edge rule `respond @staff 404` in the public Caddy block (UAT-era design). Application routes were correct. Fixed by the administrator (rule removed, Caddy reloaded; `/api/health` still 404). Application, database, balances untouched.
- `/agent` never existed; agents/master agents use `/admin/login`.

## Role acceptance (desktop 1366px + mobile 390px; read-only run)
| Role | Login URL | Unauth behaviour | Login | Dashboard + refresh | Cross-role restriction | Session expiry | Logout | Mobile | Final |
|---|---|---|---|---|---|---|---|---|---|
| Super Admin (`uat_owner`) | /superadmin/login | locked page + sign-in link | PASS | PASS | N/A (full access) | PASS | PASS | PASS | **PASS** |
| Admin | /admin/login | locked page + sign-in link | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | **PENDING** (no account; not creatable in UI) |
| Master Agent (`qa_master_agent`) | /admin/login | same | PASS | PASS | PASS (/superadmin* refused) | PASS | PASS | PASS | **PASS** |
| Agent (`qa_agent`, upline qa_master_agent) | /admin/login | same | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Player (`uat_player5`) | / (Sign in) | guest lobby | PASS | PASS | PASS (/admin*, /superadmin* refused) | PASS | PASS | PASS | **PASS** |

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
Existing: `uat_owner` (SuperAdmin, developer account), players incl. `uat_player5`. Staff list contained no Admin and no `client_owner`. QA accounts are NOT locked (awaiting approval).

## NOT TESTED
Admin role entirely; inactivity timeout / 12h absolute session cap; data-changing staff actions (create player, adjust balance, lock/unlock); account-cap behaviour at the limit; the heartbeat call; any game play as part of this QA (a separate game suite exists: `verify-games.mjs`).

## Outstanding issues
1. **Admin role**: no creation path in the UI. Proposal: `ADMIN_ROLE_CREATION_PROPOSAL.md` (needs owner approval + release). Or supply an existing Admin account.
2. **`client_owner` does not exist on production.** Policy (`access-policy.config.ts`) reserves it for the client owner (full game-config access, protected); only developer `uat_owner` exists. The client currently has no owner login of their own. Needs owner approval to create (Super Admin -> Add Agent -> role SuperAdmin) and a secure password handover.
3. Agent/Master Agent dashboards show hardcoded trend badges ("+8.4%", "+5.2%", "+12.1%"; `AdminStatsCards.tsx:57,71,85`) regardless of data. Cosmetic but misleading; needs a code change/release.
4. Staff accounts count toward the client-account cap (enforcement currently "off", max 2 in policy config); lock QA accounts only with approval.
5. Encrypted handover not yet produced (see below). Git changes unpushed.

## Encrypted handover (run locally by the person holding the passwords)
`pwsh docs/owner-manual/credentials/Protect-MaxHighCredentials.ps1` (prompts for each password; AES-256-GCM; passphrase given in person/by phone). Template lists owner (pending creation), qa_master_agent, qa_agent, uat_player5. Never attach the passphrase to the file.

Verdict: incident NOT fully closed (Admin PENDING, owner account absent, remaining NOT TESTED items).
