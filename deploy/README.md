# Reviewed releases and startup

Production startup (`MaxHigh.bat` or `deploy/install.sh`) starts an already activated release through PM2. It never pulls source, installs dependencies, builds, migrates or seeds. Provision Node, PM2, MariaDB and the TLS reverse proxy separately. Both app and webhook bind to loopback.

No release was deployed as part of remediation. The following commands are an operator procedure requiring separate deployment authorization:

1. Commit and review a full revision, preserving the lockfile. Run `node deploy/auto-update.mjs --prepare FULL_40_CHARACTER_SHA`. This creates a separate worktree and requires frozen install, typecheck, lint, unit checks and build before writing a validation manifest.
2. Back up the intended database and rehearse restore. `node scripts/migrate.mjs` is read-only and exits unsuccessfully if migrations are pending. Review duplicates, historical feature credits, hierarchy violations and migration SQL before applying. Application requires `CONFIRM_SCHEMA_MIGRATIONS` equal to the explicit database name and `node scripts/migrate.mjs --apply`; never use `drizzle-kit push --force` against production.
3. Obtain deployment approval, then `node deploy/auto-update.mjs --activate FULL_40_CHARACTER_SHA`. The migration gate is read-only; candidate health must pass before the pointer changes. Failed post-switch health restores the previous pointer and reloads it. Validate this procedure with real PM2 in staging before production use.
4. Start the activated release with the platform launcher. Configure and validate `deploy/Caddyfile` separately. A launch does not install or start Caddy or the database service.

The watcher checks revision status only. It cannot activate releases. Webhooks are disabled by default (`DEPLOY_WEBHOOK_ENABLED=0`). If enabled, supply a distinct random secret of at least 32 characters and expose the loopback listener only through authenticated TLS proxying; do not open port 9090 publicly. HMAC, bounded payloads, persisted delivery replay protection and request limits are enforced. Manual checks use an Authorization Bearer header, never a URL token. Do not log secrets.

Cloudflare zone configuration, Full (strict) TLS, origin certificates, origin firewall allowlists, trusted proxy ranges, authenticated origin access and edge cache bypass require infrastructure access. No zone changes or credential rotation were performed. Do not enable caching for authenticated pages or RPC endpoints. Keep `.env`, release pointers, webhook journal and database backups private.

Demo seeding is prohibited with NODE_ENV=production and requires ALLOW_DEMO_SEED=disposable-test-only in a disposable database. It is never part of startup or release preparation.
