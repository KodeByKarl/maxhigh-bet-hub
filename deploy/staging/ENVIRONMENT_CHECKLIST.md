# Environment and identity checklist

Prepared 2026-11-08, Asia/Shanghai. Templates only; nothing installed remotely.

| Location | Required values / handling |
|---|---|
| Repository `.node-version` | `24.22.2`, exact trusted-builder/runtime patch; controlled updates and requalification |
| GitHub repository variable | `STAGING_DEPLOY_ENABLED` absent or `false` by default; owner may enable **staging only** after reviewing these files |
| Protected `staging` environment variables | `STAGING_HOST` (SSH hostname/IP, no user/path), `STAGING_SSH_PORT` (1–65535) |
| Protected `staging` environment secrets | `STAGING_SSH_KEY` (dedicated staging key), `STAGING_KNOWN_HOSTS` (exact host key independently verified with the server console) |
| `/var/www/maxhigh-staging/.env` | From `runtime.example`: staging-only DML credentials, `MYSQL_DATABASE=maxhigh_staging`, `MYSQL_USER=maxhigh_stage`, host `127.0.0.1`, port `3306`; **no DATABASE_URL** |
| Staging runtime | `PORT=NITRO_PORT=18080`, `HOST=NITRO_HOST=127.0.0.1`, candidate `18081`, one fork, PH-VPS-2 profile, compression `0`, auto-apply/webhook `0` |
| Staging PM2 | Dedicated `PM2_HOME=/var/www/maxhigh-staging/.pm2`; never the production user's PM2 home; app name `maxhigh-app` inside this home only |
| Staging migration file | `/var/www/maxhigh-staging/.env.migration`, administrator-only, staging DDL identity; never supplied to CI/runtime |
| Staging DB probe | `.mysql-readonly.cnf`, mode 0640 root:staging group, `[client]` host/port/user/password/database for staging only; `qualify.mjs` checks actual `DATABASE()` |
| Backup agent | `MYSQL_BACKUP_DEFAULTS` (private client defaults file), `MYSQL_DATABASE`, `MAXHIGH_APP_ROOT`, `RESTIC_REPOSITORY` (off-host), `RESTIC_PASSWORD_FILE`, provider credential file(s); provision outside GitHub |
| Production connection file | Existing `/var/www/maxhigh/.env.database`: keep private and unchanged. Format/permissions/account grants must be inspected locally by an authorized operator before any use |
| Future production runtime | Exact approved Linux SHA, matching Node patch, private application DML account, immutable pointers/storage-codec policy; **no production CI secrets or job are provided** |

The staging receiver loads only the staging `.env` with Node's dotenv parser, validates its database/user/ports, and rejects production paths. Never `source` a dotenv file as shell code. Native Node `--env-file` also accepts dotenv format; a MariaDB `--defaults-extra-file` requires **INI `[client]` format**, not dotenv. Do not feed `.env.database` to `mariadb` as a client defaults file.

Do not add seed usernames/passwords, root DB credentials, production URLs, payment-provider credentials, DNS/Cloudflare tokens, TLS private keys, repository PATs, or sudo credentials to Actions. `VITE_*` values are public build inputs; never put a secret there. The CI MariaDB root password is an intentionally public fixture, bound only to loopback on an ephemeral hosted runner; it is never a VPS credential.

Ownership: staging root/control code/marker/`.env` are root-owned and not group-writable; `.env` is root:maxhigh-stage 0640. Only `incoming`, `deploy/releases`, `deploy/logs`, `.pm2`, and `evidence` are writable by `maxhigh-stage` (0700). Its SSH directory and `authorized_keys` are root-owned to prevent replacing restrictions. The identity has no sudo, no production group membership, no production filesystem access, and no database grants on `maxhigh.*`. Application code in an artifact runs as this staging identity, so these OS/DB boundaries are essential.

Protect `main` against direct/force pushes, require CI and independent review for workflow/deploy/migration/financial changes, replace the commented CODEOWNERS template with valid owners and enforce owner review. Pre-create the `staging` environment with main-only deployment policy, required reviewers, no self-approval and no bypass where supported. Verify the GitHub plan actually enforces these rules; an environment name alone is not approval. If required review is unavailable, keep the variable false and perform operator-controlled staging activation. No `pull_request_target`, privileged self-hosted production runner, cross-workflow `workflow_run` artifact consumption, or production auto-deploy is used.
