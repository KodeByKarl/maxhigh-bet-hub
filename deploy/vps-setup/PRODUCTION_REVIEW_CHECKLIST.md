# Production review checklist — activation blocked

Current verified application: `2294d79afb2b900f13a9cd05c427dc9857b89de1`; archive SHA-256 `6d7d07f0181d1ab5fed2a0029705d3f354d2ed05d655595f9d3a49467b380c51`. No application byte/logic change, rebuild, Git push or merge is part of this setup.

## Evidence to review before any production approval

| Gate | Current standing / required evidence |
|---|---|
| Artifact identity | Verified local+VPS full archive, manifest, extractor, original3987 per-asset hashes;100 mappings pinned by approved CI artifact |
| Runtime | Actual Node24.22.2,PM2 7.1.2,MariaDB10.11.14,Caddy2.6.2; installed binary/metadata checks and Node provenance stamp verified |
| Dependency security | Current pinned application lockfile audit0 reported advisories;PM2 audit0;partial traced-runtime metadata audit0. These are not an OS/complete binary vulnerability certification |
| OS security | `pro security-status --esm-apps` reports pending age and Caddy security updates. Resolve with approved entitlement or independently verified supported upstream packaging; no token/password in chat, no unsigned repositories |
| MariaDB maintenance |10.11.14 differs from CI10.11.19. Installed changelog does not prove all later fixes backported. Review [Canonical CVE-2026-107823 status](https://ubuntu.com/security/CVE-2026-107823), package coverage and a supported patched update route before production |
| Native DB/application qualification |Protected extraction, actual schema migration,credential-backed DB checks,private health/API/browser,service limits and operational rollback are still pending privileged execution. Historical CI22/8/80/HTTP18/browser11 results are not VPS results |
| Isolation |Dedicated nologin OS identity/root-owned directories;restricted schema accounts/credential permissions from bootstrap. Recheck via prepared root controls; no copying prod credentials/customer data |
| SSH/firewall |Bootstrap root-owned report says root/password SSH off,UFW22/80/443 TCP v4/v6 only. Match-context coverage is limited to reported context; provider firewall/recovery console and actual client contexts need review |
| Private preview |Must remain127.0.0.1:18080,SELECT-only SQL,STAGING_READ_ONLY=1,all application/financial routes blocked. No public proxy/subdomain/firewall rule |
| Backups/recovery |Approved age public recipient,secure key custody,off-host destination/retention and isolated restore identity are not configured/verified. Require real ciphertext/decrypt/corruption/restore/schema+row+ledger comparison/key retrieval/off-host retrieval and measured RPO/RTO; never create a fake certification marker |
| Financial readiness |Historical base-credit/feature/financial reconciliation and remaining security gates require owner-reviewed evidence; no automatic credits/debits/ledger repair. No real-money transaction for setup tests |
| Resource capacity |Idle/native integrity/control checks only. Need startup and10–15min steady observations plus approved representative load on matching isolated infrastructure. Do not quote Windows desktop throughput as VPS capacity |
| Storage |8GiB post-peak reserve,2560MiB pre-start availability,existing1GiB swap budget. Forecast receipt/ledger/binlog growth;50GB is not indefinite financial retention |
| HTTPS/proxy |Caddy currently inactive with an approval-marker condition. Future candidate parses but is not installed. Verify DNS/TLS/origin/Cloudflare trust/rate limits/public headers before activation; no settings changed in this task |
| Deployment authorization |Separate explicit production activation approval after all gates,protected release/branch/environment controls and a reviewed maintenance/rollback window |

## Prepared production configurations (not installed)

- `templates/production.Caddyfile.review-only`: exact maxhigh.online HTTPS site syntax,localhost8080 upstream,private health/metrics hidden,sensitive routes no-store,fingerprinted-only immutable caching;parsed with installed Caddy2.6.2. No `http://` site,auto_https off,public18080 or insecure TLS. Do not replace an existing site or introduce duplicate directives. Re-evaluate after patching Caddy.
- Existing `deploy/staging/Caddyfile.production-snippet`, `deploy/profiles/ph-vps-2/pm2.config.cjs`,resource budget/deployment checklist provide reviewed production building blocks, not a deploy-now command. Production service identity/secret schema/path must be configured/reviewed independently of staging. Do not repoint preview wrapper at production.
- Private staging unit:one fork,1024MiB old-space,1536MiB sampled PM2 RSS safeguard,cgroup1792MiB hard ceiling/128MiB swap/half-single-CPU quota,root-owned release,loopback only,no boot enable. Its start helper now waits for health before smoke checks instead of racing Type=simple startup;wrong-release responses fail immediately.
- Resource service/timer review templates are not installed/enabled. Use immutable root-owned controls at a reviewed non-home path before activating them; the example ProtectHome sandbox must not hide its own executable. Approval must cover scheduling/alert routing,not an unconfigured silent cron job.

## Monitoring and recovery thresholds

Record MemAvailable,swap si/so,CPU+IO PSI,serviceRSS/cgroupMemoryCurrent,NRestarts,healthrelease,dbconnections,freebytes/inodes,operational loggrowth and lastverifiedbackup/off-hostretrieval. Alert on <768MiB available sustained30s,swap activity,<512MiB free swap,<8GiB disk reserve,logs>100MiB,restarts or production impact. Stop only the dedicated preview;never kill sharedMariaDB/Caddy/SSH. No blanket telemetry agent is required.

Operational preview logs rotate at10MiB/five copies;hourly invocation needs reviewed scheduling. copytruncate has operational-line-loss limits;never use it for financial audit/binlogs. Backup retention must preserve latest verified pre-change recovery point and fit real sizes;no unreviewed prune/financial record purge. Keep encryption keys outside repo/CI and usable if VPS is lost.

## Rollback runbook

First staging release has no previous app release: `stage.py rollback --approve ROLLBACK` stops only maxhigh-staging-preview.service and verifies18080 closed. A migration/app failure must preserve staging data and logs;no automatic DROP/TRUNCATE/reset/down migration or ledger checksum edit. Existing/nonempty schemas block the fresh-schema automatic path.

Future production rollback: validate prior immutable artifact,exact runtime and schema/receipt-codec compatibility;quiesce/drain financial work,stop serving worker,restore reviewed prior pointer/service path,start one worker and probe expected release/schema. A fork has a maintenance gap. Application rollback does not undo DDL or financial commits. Incompatible schema means maintenance/off state and reviewed restore into a separate isolated target,not automatic production rewind. Never restore the shared MariaDB instance or copy-back a physical backup over it as a staging test.

## Final activation checklist

- [ ] Resolve OS/DB patch coverage and rerun advisory/native compatibility checks.
- [ ] Complete privileged release/schema/health/security/browser/resource/rollback gates and retain actual evidence.
- [ ] Complete encrypted off-host backup/isolated restore/key recovery/PITR certification.
- [ ] Resolve historical financial reconciliation/security findings and owner data review.
- [ ] Approve exact production identities,env,grants,migration plan,storage and resource budgets.
- [ ] Approve current+previous compatible artifacts and a tested maintenance rollback window.
- [ ] Validate complete HTTPS/proxy/origin config,private health policy and trusted client-IP handling.
- [ ] Independently review CI protections;verify production auto-deploy remains disabled.
- [ ] Obtain separate explicit production activation approval.

Until then,no public staging,production traffic,live wagering,deposits,withdrawals or payment-provider processing. Prepared syntax/configuration is not deployment readiness.
