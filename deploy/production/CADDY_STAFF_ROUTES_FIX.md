# Incident: /superadmin, /admin returning 404 on maxhigh.online

## Root cause (confirmed from the repo and live responses; the live Caddyfile itself was not read)
- `/superadmin`, `/admin`, `/superadmin/login`, `/admin/login` all return an **empty-body 404** with Caddy-only headers
  (no CSP, no content-type). The app's own 404s carry a CSP nonce (`/agent` does).
- `/api/health` also returns the same empty 404 publicly, matching the `@internal` rule.
- The public-host block `deploy/uat/Caddyfile.public-block` (installed on the VPS in /etc/caddy/Caddyfile) contains
  `@staff path /superadmin /superadmin/* /admin /admin/*` + `respond @staff 404`, written for UAT ("administer via uat.maxhigh.online").
  Release 29656ce reused it unchanged, so the edge hides the consoles. The application is not at fault.
- `/agent` was never a route. Roles: player, admin, agent, master_agent, superadmin. Admin/agent/master_agent sign in at
  `/admin/login`; owner (superadmin) at `/superadmin/login`; players use the sign-in modal on `/`.

## Fix
Remove `respond @staff 404` (done in `deploy/uat/Caddyfile.public-block`; staff paths now just get `Cache-Control: private, no-store`).
Authentication/authorization stay in the app; nothing is disabled. `@internal` (`/api/health`, `/api/metrics`) stays blocked.
No application rebuild is needed: this is an edge-config-only change, and no database is touched.

## Apply (administrator, root, on the VPS)
```sh
sudo cp -a /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%Y%m%d-%H%M%S)
sudoedit /etc/caddy/Caddyfile        # in the maxhigh.online block: delete "respond @staff 404", add: header @staff Cache-Control "private, no-store"
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy          # graceful; no restart, no app/DB impact
```
Rollback: `sudo cp -a /etc/caddy/Caddyfile.bak-<stamp> /etc/caddy/Caddyfile && sudo systemctl reload caddy`.
Note: `operate.py verify` treats /etc/caddy/Caddyfile as a protected baseline; expect it to report a Caddy change after this edit.

## Verify afterwards
`/superadmin` and `/admin` -> 200 login/redirect page (not 404); `/agent` stays 404 (no such route);
unauthenticated visits show the sign-in form; staff APIs reject anonymous callers; then run the per-role checks.

## Administrator-run role acceptance (credential-safe)
`deploy/production/verify-roles.mjs` signs in through the real login pages for superadmin, admin, master_agent, agent and player,
then checks dashboard access, direct URL + refresh, forbidden pages (admin roles -> `/superadmin*`; player -> `/admin*`, `/superadmin*`),
mobile overflow (390px), session expiry (cookies dropped) and logout. It is read-only: every non-GET request is blocked except the
sign-in/sign-out calls, and no account is created or funded. Passwords, cookies and request bodies are never printed or saved.

1. Create a TSV **outside the repository** (e.g. `C:\Users\<you>\maxhigh-secrets\role-qa.tsv`), one line per existing QA account:
   `role<TAB>username<TAB>password` where role is `superadmin|admin|master_agent|agent|player`. A missing role is reported PENDING.
2. From the repo root (Playwright is in `output/production-browser-tools`, as for `verify-browser.mjs`):
   ```powershell
   $env:ROLE_QA_CREDENTIALS_FILE = "C:\Users\<you>\maxhigh-secrets\role-qa.tsv"
   node deploy/production/verify-roles.mjs
   Remove-Item Env:ROLE_QA_CREDENTIALS_FILE
   ```
3. Share only `output/production-role-acceptance/report.json` (PASS/FAIL/PENDING per role and viewport; screenshots are beside it and
   may show account names/balances, so review before sharing). The script refuses a credentials file inside the repository.
Note: the dashboards may use POST calls for reads; those are blocked, so a page that cannot load without POST reports FAIL, never a mutation.

## UAT integrity (read-only)
Unauthenticated probe of `https://uat.maxhigh.online` on 2026-11-13 (after the change): `/`, `/superadmin/login`, `/admin/login`,
`/api/health` all return 401 with `WWW-Authenticate: Basic realm="restricted"` (Basic Auth intact). Administrator confirmation on the VPS:
```sh
sudo diff <(sed -n '/uat.maxhigh.online/,/^}/p' /etc/caddy/Caddyfile.bak-<stamp>) <(sed -n '/uat.maxhigh.online/,/^}/p' /etc/caddy/Caddyfile) && echo UAT-BLOCK-UNCHANGED
systemctl show maxhigh-uat2 -p ActiveState,MainPID,ExecMainStartTimestamp   # start time must predate the Caddy reload
curl -s https://uat.maxhigh.online/api/health -u '<uat basic-auth user>'   # prompts for the password; check release SHA is 2d439ac
```
