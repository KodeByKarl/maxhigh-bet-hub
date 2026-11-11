# Ubuntu staging qualification and GitHub Actions deployment

For the user's first **manual, financially disabled** transfer to `maxhigh@151.242.136.34:/var/www/maxhigh/staging`, use [FIRST_TRANSFER_GUIDE.md](FIRST_TRANSFER_GUIDE.md). That runbook defines separate confirmation gates and a dedicated read-only preview; the older CI qualification path/activation commands below must not be repointed at production or used to bypass those gates.

Prepared 2026-11-08 (Asia/Shanghai). **Production remains blocked.** User requested files/commands only; no SSH connection, GitHub settings change, remote package install, SQL, DNS/Cloudflare modification or deployment was performed.

The reported VPS is Ubuntu 24.04, 2 shared vCPU/4 GB/50 GB, Node 24, MariaDB 10.11, PM2 7 and working Caddy HTTPS at `maxhigh.online`. These are supplied facts, not inspected evidence. Architecture, patch versions, grants, filesystem ownership, live proxy policy and backup topology must still be measured. Build supports **Linux x64 only**. If `uname -m` is not `x86_64`, stop; build/review for that architecture instead of renaming an artifact.

## Isolation and approval boundary

Production stays at `/var/www/maxhigh`, database `maxhigh`, private connection file `/var/www/maxhigh/.env.database`. The prepared workflow can target only `/var/www/maxhigh-staging`, database `maxhigh_staging`, identity `maxhigh-stage`, ports 18080/18081 on loopback and a dedicated PM2 home. It has no production job or production credential. Pushing `main` validates/builds; staging deployment requires a manual dispatch, protected main, an enabled staging variable, protected environment approval, a successful same-run build and pinned SSH host authentication.

A separate matching staging VM is preferred. A second directory/database on the production VPS is **not resource or kernel isolation**. Do not run load/fault/backup-restore tests there while real players are active without an explicitly approved maintenance/resource plan. A second MariaDB fixture service can exceed the four-GB budget. Do not disable production services, change global MariaDB settings, open ports or change existing groups/credentials automatically. Provisioning commands below are a reviewed operator runbook, not actions already taken.

## 1. Read-only inventory on the intended staging host

```bash
cat /etc/os-release
uname -m
getconf _NPROCESSORS_ONLN
free -h
df -h /var/www
node --version
command -v node
command -v pm2
pm2 --version  # As the intended identity; can start its own daemon, never use production PM2_HOME.
mariadb --version
caddy version
ss -lnt
```

Require Ubuntu 24.04, x64, `/usr/bin/node` **24.22.2** (current pinned builder patch), PM2 major 7 and MariaDB 10.11. If the VPS patch differs, have the operator choose a reviewed supported common patch and update/retest `.node-version`, engine floor and runtime together; no automatic production Node upgrade/symlink is performed. Node 24 tests on Windows do not qualify Linux. Confirm loopback database/Node/admin listeners, no public updater, sufficient disk/RAM, native swap/steal/IO and sustained backup headroom. Do not print connection-file contents or raw `pm2 jlist`/process environments.

## 2. Provision a dedicated staging identity (administrator, after review)

The commands deliberately create **new staging resources**. Stop if any existing identity/path has another owner or purpose. Review actual installed Node/PM2 paths before copying the templates.

```bash
set -euo pipefail
if getent passwd maxhigh-stage >/dev/null || test -e /var/www/maxhigh-staging; then
  printf '%s\n' 'Existing staging resources need operator review; stop first-time provisioning.' >&2
  exit 2
fi
sudo adduser --disabled-password --gecos '' --home /var/www/maxhigh-staging maxhigh-stage
sudo chown root:root /var/www/maxhigh-staging
sudo chmod 0755 /var/www/maxhigh-staging
sudo install -d -o root -g root -m 0755 /var/www/maxhigh-staging/deploy
sudo install -d -o root -g root -m 0755 /var/www/maxhigh-staging/deploy/staging
sudo install -d -o root -g root -m 0755 /var/www/maxhigh-staging/deploy/profiles/ph-vps-2
for item in incoming .pm2 evidence deploy/releases deploy/logs; do
  sudo install -d -o maxhigh-stage -g maxhigh-stage -m 0700 "/var/www/maxhigh-staging/$item"
done
printf 'maxhigh_staging\n' | sudo tee /var/www/maxhigh-staging/STAGING_ONLY >/dev/null
sudo chmod 0644 /var/www/maxhigh-staging/STAGING_ONLY
```

From an administrator-reviewed checkout of the same workflow revision, install control code (no npm install/build on VPS):

```bash
sudo install -d -o root -g root -m 0755 /usr/local/libexec
sudo install -o root -g root -m 0644 deploy/{release-manager.mjs,auto-update.mjs,serve.mjs,ecosystem.config.cjs} /var/www/maxhigh-staging/deploy/
sudo install -o root -g root -m 0644 deploy/profiles/ph-vps-2/{settings.cjs,pm2.config.cjs,backup.sh} /var/www/maxhigh-staging/deploy/profiles/ph-vps-2/
sudo install -o root -g root -m 0644 deploy/staging/{control.mjs,qualify.mjs,collect-linux.sh} /var/www/maxhigh-staging/deploy/staging/
sudo install -o root -g root -m 0755 deploy/staging/receive.sh /usr/local/libexec/maxhigh-staging-receive
sudo install -o root -g root -m 0644 deploy/staging/receive.py /usr/local/libexec/maxhigh-staging-receive.py
sudo install -o root -g maxhigh-stage -m 0640 deploy/staging/runtime.example /var/www/maxhigh-staging/.env
# Edit locally; replace ONLY staging credentials. Never copy the production connection file.
sudoedit /var/www/maxhigh-staging/.env
sudo install -d -o root -g root -m 0755 /var/www/maxhigh-staging/.ssh
sudo install -o root -g root -m 0644 /dev/null /var/www/maxhigh-staging/.ssh/authorized_keys
```

Provision `maxhigh_staging` and staging-only accounts using the DBA's secure local client, with independently generated passwords. Runtime `maxhigh_stage@127.0.0.1` gets SELECT, INSERT, UPDATE, DELETE on `maxhigh_staging.*` only; the separate migration account gets only reviewed schema privileges and is not readable by the app/CI. The backup and read-only probe identities are separate. No `ALL ON *.*`, GRANT OPTION, FILE, SUPER, passwordless root or production access. Use an approved sanitized dataset; copying financial/identity data requires separate approval. `SHOW GRANTS` must prove these boundaries without including credential material in the report.

Verify the new identity has no sudo or production DB/file access. If production secrets are currently world-readable, **stop and request the required permission change**, do not expose them to CI:

```bash
id maxhigh-stage
sudo -l -U maxhigh-stage
sudo -u maxhigh-stage test ! -r /var/www/maxhigh/.env.database
sudo -u maxhigh-stage test ! -w /var/www/maxhigh
```

The application artifact runs as the deployment identity, which has staging DML and staging artifact writes. It is not a security boundary against malicious staging application code; OS, DB grants, protected CI review and production credential isolation provide that boundary.

## 3. Restrict the SSH key and GitHub environment

Generate a dedicated ed25519 key on the operator's trusted workstation. Install only its public key in the root-owned staging `authorized_keys`, with a single line:

```text
restrict,command="/usr/local/libexec/maxhigh-staging-receive" ssh-ed25519 REPLACE_WITH_STAGING_PUBLIC_KEY maxhigh-staging-ci
```

This prohibits interactive shell, PTY, forwarding, agent forwarding and user rc. SCP/SFTP and arbitrary commands are rejected. Add a source-CIDR restriction only if using stable approved egress; do not open broad ingress merely to accommodate hosted runners. Verify the server SSH host-key fingerprint via an independent console channel; `ssh-keyscan` alone cannot authenticate it. Store the exact known_hosts entry (including `[host]:port` for nonstandard ports) and the dedicated private key only in GitHub's pre-created protected `staging` environment. No key is installed/generated by this task. Do not reuse the operator/prod key, use a root SSH account or grant sudo to the CI identity.

Follow [ENVIRONMENT_CHECKLIST.md](ENVIRONMENT_CHECKLIST.md). Replace/enforce the CODEOWNERS template and branch rules; prevent self-review/bypass where available. Keep `STAGING_DEPLOY_ENABLED=false` until the staging boundary and receiver are reviewed. GitHub plan restrictions can make environment reviewer protection unavailable; if so keep remote automation disabled.

## 4. Build and transfer the immutable Linux artifact

Review all existing dirty/uncommitted application work before an owner commits it to protected `main`; Actions can only build committed source. No commit/push was performed here. `.github/workflows/validate.yml` installs the frozen lockfile on Ubuntu 24.04/Node 24.22.2, checks high/critical dependency advisories, Python receiver tests, TypeScript, lint, all unit/QA, real MariaDB 10.11 migrations and HTTP tests, and Chromium. CI MariaDB is an ephemeral official-image fixture on 127.0.0.1:19307. It cannot qualify VPS memory/IO or production data. A failing QA check prevents artifact upload/deployment.

The builder bundles `.output/migrate.mjs`, verifies exact source/output public-asset hashes, and exports only `.output`, `drizzle` and a release manifest. Full commit SHA, Linux/architecture/Node patch, payload/migration digests and inventory digest are recorded. No `.env`, source `.git`, DB files or root `node_modules` is shipped. GitHub actions and the MariaDB image are pinned to reviewed immutable revisions; pins need controlled security updates. Build dependencies/browser tooling have no SSH or DB production secrets.

Once CI is green, an owner can manually dispatch **Manually deploy isolated staging** on main with `STAGING ONLY`. It reuses validation in the **same run**, consumes its exact immutable artifact ID and SHA-256 outputs, and enters the protected staging environment. The key-holding job checks out no source, runs no npm hooks, pins the SSH host and streams one archive to the forced receiver. Hashes protect the trusted same-run chain; no independent artifact signature/attestation is claimed. Never consume arbitrary run IDs, PR artifacts or an untrusted manifest hash.

The receiver rejects shell commands, archive traversal/links/devices/duplicates, wrong hashes, non-Linux/x64/Node24 builds, unsafe root/control ownership, wrong staging DB/user/ports and resource exhaustion. Import requires at least five GiB free **after** extraction; plan eight GiB or more for upload, extraction, import, rollback and DB growth. A schema gate may intentionally leave the artifact imported but unactivated. Use [RECOVERY.md](RECOVERY.md) to review/apply migrations locally, then rerun the same pinned staging deployment.

## 5. Runtime, readiness and PM2 persistence

PH-VPS-2 uses one fork, 1024 MiB V8 old-space target, separate 1536 MiB RSS restart threshold, bounded six-connection pool/queue 30, request admission 64, shutdown message/drain 30 seconds, PM2 kill timeout 45 seconds and bounded restart/backoff. Candidate has 256 MiB heap/two connections. A second serving worker, watcher/updater, build process or overlapping backup is not part of the four-GB budget. Keep receipt compression off for qualification.

As `maxhigh-stage`, with explicit HOME/PM2_HOME, after a successful activation:

```bash
cd /var/www/maxhigh-staging
export HOME=/var/www/maxhigh-staging PM2_HOME=/var/www/maxhigh-staging/.pm2
umask 077
pm2 save
node deploy/staging/qualify.mjs
curl --fail --silent --show-error http://127.0.0.1:18080/api/health
```

Provision `.mysql-readonly.cnf` first. The preflight writes only sanitized `evidence/preflight.json`: exact SHA/schema health, matching Node patch, one actual PM2 fork, DB pool settings, MariaDB 10.11/durability/foreign keys/private bind, disk/RAM. It fails rather than applying the candidate MariaDB config globally. Local-only health is private/no-store and includes the serving SHA. Admission/draining should return noncacheable 503 plus Retry-After, and same-key financial retries must replay once.

For reboot persistence, administrator reviews `maxhigh-staging-pm2.service` and paths, then **during a staging-only interruption** saves/kills only this isolated PM2 home, installs the service and starts/enables it. The unit is a template, not installed. Never run `sudo pm2 kill`, `pm2 resurrect` or `pm2 startup` with an unspecified/production home. Reboot the staging VM and re-run qualification; check exact worker count and no restart growth. Updating control code or the Node patch is an operator-reviewed change, not something the artifact can replace.

## 6. Caddy and HTTPS

Do not replace the working `maxhigh.online` site or switch it to HTTP. Staging has no new public hostname/DNS and stays loopback; a separately authorized **operator** SSH identity may tunnel `-L 18080:127.0.0.1:18080` for browser verification. The restricted CI key cannot forward ports. The app's PUBLIC_URL/origin must match the test URL. Do not publish financial test accounts on the production domain.

`Caddyfile.production-snippet` is a merge reference for the existing HTTPS block, with health/metrics denied and sensitive routes no-store. It targets production port 8080 only. Preserve existing certificate/ACME/origin-auth/trusted-proxy directives and validate the complete proposed configuration, not the snippet alone:

```bash
# Read-only inspection/validation by an authorized local operator.
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
curl --head --fail https://maxhigh.online/
# Before any future approved reload: save the active config, merge in a reviewed
# candidate file, validate that full file, and have a tested config rollback.
```

A HEAD response does not close AUD-018: review Cloudflare Full(strict), current trusted ranges, forwarded-client-IP spoofing, IPv4/IPv6 direct-origin denial/firewall and sensitive cache bypass from authenticated requests at the real edge. Never add `tls_insecure_skip_verify`, `auto_https off`, universal trusted proxies or a broad origin allowlist. No Caddy reload, TLS/DNS/Cloudflare change was executed or authorized here.

## 7. Actual Ubuntu functional/fault/load qualification

Perform these on a **separate disposable matching Ubuntu staging VM**, with Node 24.22.2/PM2 7, a reviewed checkout, native MariaDB 10.11 fixture bound to **127.0.0.1:19307**, and deliberately public fixture password `audit-local-only`. Never point these harnesses at the existing MariaDB 3306 or database `maxhigh`. They hardcode fixture names/port and create synthetic rows. The runner's native DB must use the reviewed PH-VPS-2 resource/durability config, with platform-specific paths adapted in a separate config. Record all version/settings evidence. Do not launch a second DB on the production VPS for this purpose. Build externally in Actions; the capacity VM consumes the exact verified Linux artifact, rather than building on a four-GB server. The source checkout/test dependencies below are disposable qualification tools, not the serving production tree.

```bash
set -euo pipefail
test "${CONFIRM_DISPOSABLE_UBUNTU:-}" = maxhigh_qualification
test "$(uname -m)" = x86_64
test "$(node --version)" = v24.22.2
# Fresh trusted checkout on this disposable VM; no .env/.env.database credentials.
npm ci --include=dev
npm audit --audit-level=high
npm run typecheck
npm run lint
TEST_OUTPUT=audit/ubuntu-staging/runtime/unit npm run test:unit
# Only after the QA blocker is resolved and the approved CI build has passed:
# QUALIFIED_ARTIFACT_DIR is an already safely extracted portable release, with its
# manifest hash obtained from the approved CI job (not from the same download).
: "${QUALIFIED_ARTIFACT_DIR:?Verified Linux artifact directory required}"
: "${RELEASE_MANIFEST_SHA256:?Pinned approved CI manifest hash required}"
export QUALIFIED_ARTIFACT_DIR RELEASE_MANIFEST_SHA256
node --input-type=module -e '
  import fs from "node:fs"; import path from "node:path";
  import {createHash} from "node:crypto"; import {execFileSync} from "node:child_process";
  import {validateRelease} from "./deploy/release-manager.mjs";
  const p=process.env.QUALIFIED_ARTIFACT_DIR;
  if(!path.isAbsolute(p)) throw Error("Absolute artifact path required");
  const actual=createHash("sha256").update(fs.readFileSync(path.join(p,"release-validation.json"))).digest("hex");
  if(actual!==process.env.RELEASE_MANIFEST_SHA256) throw Error("Manifest pin mismatch");
  const m=validateRelease(p);
  if(m.sha!==execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim() || m.nodeVersion!==process.versions.node)
    throw Error("Source/runtime must match artifact");'
test ! -e .output
cp -a -- "$QUALIFIED_ARTIFACT_DIR/.output" .output
MIGRATION_OUTPUT=audit/ubuntu-staging/runtime/migrations npm run test:migrations
INTEGRATION_OUTPUT=audit/ubuntu-staging/runtime/integration npm run test:integration
TOOLS_DIR=$(mktemp -d)
npm install --prefix "$TOOLS_DIR" --no-save --ignore-scripts playwright@1.65.0
node "$TOOLS_DIR/node_modules/playwright/cli.js" install --with-deps chromium
BROWSER_OUTPUT=audit/ubuntu-staging/runtime/browser \
  node scripts/test-browser.mjs "$TOOLS_DIR/node_modules/playwright"
export PERF_OUTPUT=audit/ubuntu-staging/runtime/performance
PERF_SECONDS=30 node scripts/perf/load.mjs optimized
node scripts/perf/lifecycle.mjs
# PM2 7 CLI path must exist; use its real installation path on this disposable VM.
node scripts/perf/staging.mjs "$(npm root -g)/pm2/bin/pm2"
MARIADB_BIN=/usr/bin node scripts/perf/backup-restore.mjs
PERF_RUN_LABEL=steady PERF_LEVELS=30 PERF_SECONDS=120 node scripts/perf/load.mjs optimized
```

Archive all outputs under an Ubuntu-specific evidence directory; `PERF_OUTPUT` prevents overwriting prior Windows reports. The PM2 harness copies real build artifacts and injects candidate/post-switch failures into **fixture** artifacts, uses a private PM2 home, and kills that home in `finally`. It must show healthy switch, candidate rejection, post-switch rollback, incompatible codec rollback rejection and one healthy fork; it does not mutate the installed staging control plane. The lifecycle test must finish a blocked paid transaction without forced kill, then replay the same key after restart with exactly one debit and conserved balance. The fixture backup restores all table hashes and rejects corruption, but still does not qualify remote backup transport or PITR.

Capture `vmstat -w 1`, `pidstat -rud`, `iostat -xz`, `/proc/meminfo`, DB lock/deadlock/pool counters and private app metrics alongside load. On the installed staging app `collect-linux.sh` collects 60 seconds of native samples after `CONFIRM_ISOLATED_STAGING_LOAD=maxhigh_staging`; provision `sysstat` locally if missing. Discard vmstat/iostat's first since-boot aggregate when assessing the measured interval. Record native RSS, CPU/steal, swap-in/out, DB commit/IO latency and free space. Never map Windows pagefile counters to Linux swap. Stop load on any financial error, unexpected replay/debit, queue saturation, restart, material swap pressure, available RAM <768 MiB or free disk <5 GiB. Do not run load, backup and release candidates together.

Increase 5 → 10 → 20 → 30 → 50 only while the prior level is healthy. Record actual think times/workload and agreed latency/error budgets; no user-capacity guarantee follows from a short loop. The harness uses two slot families plus fishing/public/session requests; it is not all-100-title visual/game-state certification. Obtain an hours-long representative soak without restart/RSS slope and a real-data storage forecast. The current Node 24 Wild Panther QA mismatch is an open gate; do not reduce sample counts, retry until green or alter payout rules to conceal it.

## 8. Required signoff

Use [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) and [RECOVERY.md](RECOVERY.md). Attach actual Ubuntu/CI run URLs, SHAs, native measurements, legacy-data/financial signoffs, edge security evidence and off-host restore/PITR records. The current deliverable provides preparation and local Windows checks only. **No automatic production deployment may be enabled**, even after a green staging build, until every critical security/financial/recovery gate is independently closed and the owner explicitly approves a concrete production release and maintenance/rollback plan.

Primary references: [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use), [deployment environments and plan limits](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [Node releases](https://nodejs.org/en/about/previous-releases), [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https), [Caddy proxy trust](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [MariaDB dumps](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump), [restic restore](https://restic.readthedocs.io/en/stable/050_restore.html).
