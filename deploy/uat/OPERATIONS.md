# MaxHigh controlled client UAT: operations runbook

Scope: `https://maxhigh.online` (public player site, release 2294d79, synthetic data only) and `https://uat.maxhigh.online` (Basic Auth, staff). Controlled UAT only. Not production. Real-money operations are disabled (deposit/withdraw limits min 1,000,000 / max 0.01, no payment integration).

## 1. Caddy rollback (exact files, verified 2026-11-09)

| File in `/etc/caddy/` | Contents | Use |
|---|---|---|
| `Caddyfile` | live: UAT (Basic Auth) + public maxhigh.online + www | current |
| `Caddyfile.pre-public.20261109204242` | UAT block only (before the public site) | **roll back the public site, keep UAT** |
| `Caddyfile.pre-uat.20261109200331`, `...200503` | stock Debian default (`:80`) | full reset to stock |
| `MAXHIGH_PROXY_APPROVED` | marker required by the `caddy.service.d/60-maxhigh-awaiting-proxy.conf` drop-in | do not delete the drop-in; remove marker only to stop Caddy from starting |

Withdraw the public site (UAT keeps working):
```bash
sudo cp -p /etc/caddy/Caddyfile.pre-public.20261109204242 /etc/caddy/Caddyfile && sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && sudo systemctl reload caddy
```
Stop all HTTPS exposure: `sudo systemctl disable --now caddy && sudo rm /etc/caddy/MAXHIGH_PROXY_APPROVED`.
Verify after any rollback: `curl -sI https://maxhigh.online/` (public: fails or 404 after rollback), `curl -sI https://uat.maxhigh.online/` (401).

## 2. Dependency audit of `basicauth.txt` (local file, never printed)

- Server side: **no dependency.** Caddy holds only a bcrypt hash; the plaintext is never on the VPS.
- Repo, deploy scripts, GitHub workflows, `audit/`, `docs/`: **no references.**
- Only users: my local Playwright test scripts (in the session scratchpad) that authenticate to `uat.maxhigh.online`.
- Recovery implication: the file is **not** needed to restore anything. If lost, set a new password with `caddy hash-password` and replace the hash in `/etc/caddy/Caddyfile`, then `systemctl reload caddy`. The Owner's own login is separate.
- Retained per instruction; delete only on explicit confirmation.

## 3. Monitoring the public login jail

Config: `/etc/fail2ban/jail.d/maxhigh-login.local` (polling backend, 10 login POSTs / 10 min per IP, 15 min ban, iptables-multiport ports 80,443, `ignoreself = true`, `ignoreip` = localhost + admin IP 27.49.8.82). Log: `/var/log/caddy/maxhigh-public-access.log`.

```bash
bash ~/uat/monitor-login-jail.sh              # non-root: login attempts per IP, status codes, 403s, service state
sudo bash ~/uat/monitor-login-jail.sh root    # adds jail status and active bans
sudo fail2ban-client set maxhigh-login unbanip <IP>   # manual unban
```
Baseline 2026-11-09 21:07: 44 login POSTs total, all from the admin IP and the server's own test traffic; no external attempts; 6 chat-block 403s (my tests). Review daily during UAT. Alert on: any external IP with >=5 login POSTs, any ban, 5xx, `caddy`/`fail2ban`/`maxhigh-uat` not active.
Caveats: protects only the public host's login function (ID tied to release 2294d79; re-derive IDs if the release changes). The admin IP in `ignoreip` must be updated if the operator's IP changes.

## 4. Backup and restore plan (UAT; plan only, nothing executed)

Goal for UAT: prove the procedure works before production. Data is synthetic, so RPO is relaxed (24 h); target RTO 60 min for a rebuild from artifact + restore.

**What to protect**
1. DB `maxhigh_staging` (users, ledger, sessions, settings). Encrypted dump via existing `deploy/vps-setup/recovery.py` (mariadb-dump `--single-transaction`, gzip, `age`).
2. Config: `/etc/caddy/Caddyfile`, `/etc/fail2ban/jail.d/maxhigh-login.local`, `/etc/fail2ban/filter.d/maxhigh-login.conf`, `/etc/systemd/system/maxhigh-uat.service`, `/var/www/maxhigh/staging/{uat-run.mjs,pm2-uat.config.cjs}`. Back these up encrypted too. **`.env.uat` holds the DB password: include only inside the encrypted archive, never in plain copies.**
3. Release artifact: `~/maxhigh-release-2294d79/release.tgz`, SHA-256 `6d7d07f0181d1ab5fed2a0029705d3f354d2ed05d655595f9d3a49467b380c51`; keep a copy off-host. App code is otherwise rebuildable from this artifact.
4. Local secrets folder on the operator workstation (`maxhigh-uat-secrets`): back up separately in a password manager. Not on the VPS.

**Prerequisites (operator decisions; not yet done)**
- Generate an `age` keypair. Keep the private key off the VPS (password manager / offline). Give only the public recipient (`age1...`) to the backup job. For the drill, the private key must be placed temporarily in a root-only file for decrypt; remove it afterwards.
- Create `/var/backups/maxhigh-staging` (root, 0700).
- Create the empty restore schema `maxhigh_staging_restorecheck` and a restore-only DB account with grants on that schema only; write `/root/maxhigh-staging-admin/restore-client.cnf` (INI `[client]`, mode 0600) from `templates/restore-client.cnf.example`. `recovery.py` refuses to restore into a non-empty schema or into `maxhigh_staging`.
- Off-host destination (workstation or object storage) chosen by the operator.

**Drill (run once, with approval; each step is a separate sudo command)**
1. `sudo python3 /root/maxhigh-staging-cdd7474b/recovery.py backup --approve BACKUP --recipient <age1...> --peak-bytes 1073741824`
2. Restore into the restorecheck schema: `... restore --approve RESTORE --backup /var/backups/maxhigh-staging/<file>.sql.gz.age --sha256 <hash> --identity <private-key-file> --peak-bytes 1073741824 --dump-scope-reviewed --restore-grants-reviewed`
3. Compare: `... compare --approve COMPARE --dump-scope-reviewed` (hashes source and restored data plus the migration ledger).
4. Corruption test: flip a byte in a copy of the ciphertext; restore must fail (never attempt on the original).
5. Off-host retrieval: `scp` the ciphertext + `.sha256` to the workstation, verify the hash, and prove decrypt works with the stored private key.
6. Record results (sizes, durations, hashes only; no secrets) in `audit/first-transfer/`. Only then is the staging recovery gate evidence real.
7. Drop nothing: leave the restorecheck schema for review; remove it only with explicit approval.

**Schedule (after the drill passes)**: daily systemd timer running step 1, retain 7 daily + 4 weekly, copy off-host, alert on failure. Not enabled; needs approval.

**App rebuild order (disaster):** reinstall packages per `deploy/vps-setup`, extract the artifact via the kit, restore the DB dump into `maxhigh_staging`, restore configs, `sudo sh ~/uat/activate-uat.sh` equivalent, Caddy, fail2ban, then rerun the UAT regression.

**Known limits:** `recovery.py` refuses databases with views/triggers/routines/events and tables without a primary key (none expected); the drill runs while the UAT app stays up (single-transaction dump), which is acceptable for synthetic data but not for production.

## 5. Production gap (unchanged)
Production still requires a real money kill switch in code, in-app rate limiting, a passed backup/restore drill with off-host copy and key custody, financial reconciliation, MariaDB/age/caddy patching, and an explicit go-live approval.
