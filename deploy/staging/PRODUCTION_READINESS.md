# Production readiness: BLOCKED

**Latest actual VPS findings (2026-11-09):** runtime bootstrap is installed/verified;archive is privately transferred and fully hash-verified;30 native control tests and current application/PM2 dependency audits pass. Protected release/migration/app/recovery execution is still blocked by sudo authentication and recovery configuration. Ubuntu reports age+Caddy ESM security updates;MariaDB10.11.14 patch coverage versusCI10.11.19 remains unresolved. [Consolidated actual evidence and production checklist](../../audit/first-transfer/AUTONOMOUS_VPS_REPORT.md). Earlier no-host-access/no-artifact statements below are historical. Production/public staging remain disabled.

**Update 2026-11-09:** the approved private review-branch GitHub Actions run42547305324 passed all required Ubuntu builder gates and produced an independently verified immutable Linux artifact. [Exact results, archive and SHA-256](../../audit/first-transfer/UBUNTU_ARTIFACT_VERIFIED.md). Earlier statements below that no Actions run/archive exists are historical. No VPS access or transfer occurred; live security, financial reconciliation, backup recovery and actual VPS staging qualification remain required. Production stays blocked.

Prepared 2026-11-08 (Asia/Shanghai). Continue from the [PH-VPS-2 local report](../../audit/ph-vps-2/COMPATIBILITY_REPORT.md); its historical Windows evidence is retained. The client reporting date in that report was corrected from November 9 to November 8; machine-generated timestamps are unchanged.

The user supplied the availability of Ubuntu 24.04 / 2 shared vCPU / 4 GB / 50 GB, Node 24, MariaDB 10.11, PM2 7, Caddy HTTPS and `maxhigh.online`. The user selected **prepare files and commands only**. No remote host or GitHub Actions execution occurred. Existing `/var/www/maxhigh`, database `maxhigh`, `/var/www/maxhigh/.env.database`, TLS, credentials, DNS, Cloudflare and financial data were not touched. No production workflow, production secret, automatic deployment trigger or privileged self-hosted runner was created.

First-transfer follow-up: the Wild Panther defect is now fixed and local validation passes 22/22 unit/QA, 18 HTTP and 11 browser groups. The original referee is unchanged. See [current status](../../audit/first-transfer/STATUS.md) and [the confirmation-gated manual transfer guide](FIRST_TRANSFER_GUIDE.md). No Linux archive/transfer exists yet; an authorized Linux builder and reviewed source revision are still required. Production remains blocked.

## Evidence and deliverables

| Item | Status / practical limit |
|---|---|
| Node 24.22.2 runtime | Official Windows archive SHA-256 checked; native local execution confirmed |
| Node 24 TypeScript/build | PASS on Windows; does not establish Ubuntu/native-module compatibility |
| Node 24 existing unit/QA | Initial 19/20 failure preserved; subsequent **22/22 PASS** including two new regression commands ([current evidence](../../audit/first-transfer/evidence/verification.json)) |
| Restricted receiver tests | 6 Python groups PASS locally: exact commands, payload preservation, traversal, links/devices/FIFO, duplicates, expansion bound |
| Release helper security tests | 4 local checks PASS, including quiesce/rollback order, exact revision health and invalid manifest rejection |
| Workflow static validation | actionlint 1.7.12 PASS; shellcheck/pyflakes integrations disabled, Bash syntax checked separately |
| Frozen lockfile | Node 24 `npm ci --dry-run --ignore-scripts` PASS; this is not a fresh Linux native install |
| Public assets | Local exact source/build SHA-256 comparison recorded separately; previous inventory retained; the subsequent first-transfer task corrects only the Wild Panther terminal-refill scatter omission |
| Linux artifact | Strict Linux x64/Ubuntu24.04/Node24 builder implemented; **not produced or certified locally**; failed QA blocks CI export |
| Linux CI functional checks | Prepared: frozen install, audit, full checks/build, pinned MariaDB10.11 migration/HTTP tests and pinned Chromium; **not run on GitHub yet** |
| Staging deploy | Manual protected-main workflow, same-run immutable artifact ID/digests, pinned SSH host and forced unprivileged receiver; **not installed/executed** |
| Production deployment | **Absent/disabled; must remain blocked** |

Local evidence: [Node runtime/checks summary](../../audit/ubuntu-staging/evidence/local-verification.json), [failed QA log](../../audit/ubuntu-staging/evidence/node24-unit/cluster-referee.txt), [supply-chain pins](../../audit/ubuntu-staging/evidence/supply-chain-pins.json). These are local preparation evidence, not Ubuntu staging results.

## Wild Panther QA defect — resolved locally; Linux confirmation pending

The initial 19/20 run reported one Wild Panther scatter-count mismatch in 6,000 spins. That historical failure remains preserved. First-transfer preparation reproduced the cause deterministically: the 40th gravity/refill can display four new scatters while the loop guard exits before updating the scatter count (reported zero). The fix counts terminal-board scatters before cash/feature/retrigger resolution, without another tumble or RNG draw. A deterministic regression fails on the original resolver; all four regressions pass after the correction; the unchanged original referee now passes all 80 games and the full local suite passes 22/22. See [first-transfer evidence](../../audit/first-transfer/STATUS.md).

This fixes the local engine defect; it does not qualify Ubuntu/MariaDB10.11, authorize server financial tests, reconcile historical awards or allow production promotion. Genuine Linux checks must still run before a Linux artifact is produced.

## Required production gates

| Gate | Required evidence / owner | Current status |
|---|---|---|
| AUD-036 historical feature credits | Reviewed ledger/base-credit reconciliation for open legacy features, duplicate/open-session/seed and hierarchy anomaly review; preserve balances/entitlements; owner decision for already-paid cap reductions | **Critical financial blocker, open** |
| Wild Panther terminal-refill mismatch | Deterministic engine regression + unchanged full referee now pass locally; genuine Linux check still required | **Fixed locally; Linux confirmation pending** |
| AUD-018 live origin security | Actual IPv4/IPv6 direct-origin/updater/admin denial, Cloudflare Full(strict), client-IP spoofing tests, sensitive edge cache bypass, approved firewall/proxy policy | **Security blocker, open** |
| AUD-034 actual Linux release recovery | Node24/MariaDB10.11 platform evidence, real PM2 single-worker candidate/bootstrap/drain/failure/rollback/reboot tests, tested compatible old artifact; interrupted activation/DDL recovery review | Prepared only; **open** |
| Backup and PITR | Successful encrypted off-host upload; isolated actual restore with financial/table/hash verification; valid snapshot coordinates plus gap-free off-host binlogs; measured/approved RPO/RTO, retained keys | **Recovery blocker, open** |
| Host resource and storage | Native Linux 5/10/20/30/50 ramp, realistic hours-long soak, no integrity errors/restarts/swap slope; latency SLO and 50-GB growth/archive/expansion plan | **Open**; hosted CI is not 2-vCPU/4GB equivalence |
| Credentials/identity | Local review of existing production connection-file format/mode/grants; restricted app/migration/backup identities; explicit approval for any required credential/permission change | **Open**; no credentials rotated/read remotely |
| GitHub trust configuration | Valid CODEOWNERS + main branch/ruleset review, CI required checks, actual environment reviewer enforcement/plan support, host-key pin verified independently, staging key restrictions tested | **Open**, templates only |
| Operational policy | Legitimate rewards and external payment reconciliation, alarms delivered/tested, financial audit retention, immutable release provenance/config recovery, approved maintenance/rollback operator | **Open**; historical limitations remain |
| Final production authorization | Named owner/security/financial/operations signoffs, exact approved SHA, reviewed backup/schema/rollback/edge evidence and explicit production action approval | **Not requested/granted** |

The earlier [remaining risks](../../audit/REMAINING_RISKS.md) remain applicable; local source fixes do not close infrastructure or historical-data findings. Existing lint warnings, distributed login/IP throttling, full stateful-game replay context and storage growth limitations remain review items. No retroactive fairness commitments or inferred historical financial credits are generated.

## Promotion policy

Validation can run automatically for PRs/main with no VPS secrets. Staging is opt-in and manual with an environment gate; it can be used to collect evidence while production remains blocked. No application rollback ever triggers database rollback/restore automatically. Keep two compatible reader releases and the codec requirement; schema changes must remain backward-compatible with the approved old artifact.

Do not introduce production SSH credentials, enable any updater/automatic production switch, or add a production deployment workflow while a critical gate above remains open. After closure, prepare a concrete separate production proposal containing exact artifact/manifest hashes, reviewed schema plan and backup snapshot/coordinates, maintenance window, health/financial acceptance criteria, automatic **application-only** rollback conditions and an explicit owner approval. No green CI run alone authorizes production.

See [staging guide](STAGING_GUIDE.md), [environment checklist](ENVIRONMENT_CHECKLIST.md), [migration/backup/rollback runbook](RECOVERY.md), [.github/workflows/validate.yml](../../.github/workflows/validate.yml), and [.github/workflows/staging.yml](../../.github/workflows/staging.yml).
