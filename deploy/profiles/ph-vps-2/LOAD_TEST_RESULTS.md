# Load and concurrency results

Reporting date: 2026-11-09 (Asia/Shanghai). Evidence files retain their machine-generated UTC timestamps. No production deployment, real player changes, live Cloudflare changes or credential rotation were performed.

**Not a VPS capacity certification.** Host: AMD Ryzen 5 9600X 6-Core Processor, 12 logical CPUs, 15.15 GiB RAM, Windows, Node v26.13.0, local MariaDB 13.0.2. No Ubuntu, Docker/WSL, CPU quota, shared-vCPU steal, Philippines RTT, Cloudflare traffic, Linux swap or production-size DB was available.

The controlled scenarios use 50 distinct fixture players, 600–1,499 ms think times, two slot families, real paid/free rounds, fishing spawn state, session/feed/stat reads and duplicate operation keys. Each level runs about ten seconds plus in-flight completion. The additional 30-player run lasted 61.0 seconds. Inputs use loopback port 19307 and newly created audit_phvps2 schemas; the harness does not consume the application .env database target. Safety stops exist for low host RAM and excessive app RSS.

| Players | Baseline p95 ms | Optimized p50 ms | Optimized p95 / p99 ms | Optimized req/s | Application errors | App peak RSS MiB | Peak pool queue |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | 111.6 | 6.6 | 47.8 / 60.5 | 4.8 | 0 | 114.1 | 0 |
| 10 | 100.8 | 4.6 | 41.2 / 42.5 | 9.6 | 0 | 116.9 | 0 |
| 20 | 100.7 | 4.6 | 49.8 / 62.3 | 18.7 | 0 | 147.4 | 0 |
| 30 | 19.4 | 4.5 | 61.3 / 82.8 | 27.9 | 0 | 152.8 | 0 |
| 50 | 30.1 | 4.6 | 111.8 / 133.8 | 44.6 | 0 | 154.5 | 2 |

The baseline contained 117 sanitized service errors and 69 replay-shape assertion failures. Baseline fast failures make latency comparisons unsuitable as a speedup claim. A paired corpus benchmark also round-trips 400 identical receipts with a measured 55.18% payload-byte reduction (codec-corpus.json). Writes remain opt-in until rollback readers are compatible. The first tuning attempt still failed and is retained in [optimized-first-attempt.json](../../../audit/ph-vps-2/evidence/optimized-first-attempt.json). The final run had 0 application errors, 115 successful duplicate response checks, six pool connections maximum, and zero observed deadlocks. Confirmed conflicts now retry only after rollback; the pool contribution row is locked before the first snapshot. No isolation or durability was weakened. MariaDB 13's snapshot isolation setting differs from the intended Ubuntu 10.11 baseline and must be requalified there.

Every fixture balance equalled its initial balance plus the exact signed ledger sum. Open paid features were retained, not cleared to force success. The existing 18 HTTP groups independently check transfers, reservations, duplicate approvals, reward/jackpot settlement, payout caps, feature retention, seed/RBAC boundaries and restart persistence. [HTTP results](../../../audit/ph-vps-2/evidence/integration/integration.json).

The one-minute 30-player run recorded 1917 requests at 31.4 req/s, p95 32.0 ms, p99 194.7 ms, 0 errors and peak app RSS 162.3 MiB. This is a short observation, not a leak-free long-duration soak. Node CPU/event-loop samples, pool queues, lock counters, raw latencies and database snapshots are retained. The original main run used before/after database process snapshots. A separate observed 30-player window now retains 20 Windows samples: see resource-observations.json for DB CPU/working set/private commit and host IO/paging. These are Windows metrics, not native VPS measurements. Windows pagefile/paging is not Linux swap; unavailable metrics are not reported as zero.

Delivery: main JS 96091 gzip bytes; CSS 48655 gzip bytes. Fingerprinted assets retained public immutable caching; authenticated/financial responses retained private,no-store. No original public assets were removed or recompressed lossily.

Supervisor status: local Windows PM2 staging PASS (see staging.json). Financial drain/restart test PASS with no forced kill: [lifecycle.json](../../../audit/ph-vps-2/evidence/lifecycle.json). Encrypted fixture backup/restore PASS across 21 exact table hashes and a corrupted-ciphertext negative case: [backup-restore.json](../../../audit/ph-vps-2/evidence/backup-restore.json). Off-host restic transport and Ubuntu restore are NOT TESTED.

Reproduce on disposable infrastructure with the documented port and fixtures:

~~~sh
node scripts/perf/load.mjs baseline
node scripts/perf/load.mjs optimized
PERF_LEVELS=30 PERF_SECONDS=60 PERF_RUN_LABEL=steady node scripts/perf/load.mjs optimized
node scripts/perf/lifecycle.mjs
node scripts/perf/staging.mjs /explicit/path/to/pm2/bin/pm2
~~~

For a valid before/after rebuild comparison, preserve baseline artifacts before modifying code and compare equivalent seeded datasets. Existing baseline files are historical measurements; rerunning baseline against optimized code is not a baseline. The test driver and DB tooling also consume host resources. Native MariaDB 10.11 Ubuntu replays, all-seven fishing boss stress, long-duration memory/swap/IO tests and representative financial-history volumes remain gates.

<!-- PH-VPS-2 FINAL EVIDENCE -->

## Final verification

- Production build and TypeScript PASS; ESLint 0 errors / 115 warnings.
- 20 unit/QA commands and 10 targeted profile groups PASS.
- 18 real HTTP groups, 11 Chromium groups, 5 isolated PM2 staging groups and 3 financial drain groups PASS.
- Zero known dependency advisories; frozen lockfile dry-run PASS.
- Pinned portable import, standalone migration runner/control plane, Caddyfile adaptation and 21-table encrypted fixture restore PASS.

The additional Windows resource window contains 20 samples over 30.6 seconds. MariaDB averaged 6.9% of one CPU core; peak working set 71.8 MiB and private commit 775.4 MiB are different quantities. Host disk read/write peaks were 7.4 / 5.3 MiB/s and include unrelated host work. Windows pagefile use ranged 2288–2297 MiB; this does not establish Linux swap behavior. [Raw resource observations](../../../audit/ph-vps-2/evidence/resource-observations.json).

Paired comparison of 400 identical JSON payloads: 55.18% fewer stored bytes, exact decoded equality, mean encoding 0.027 ms / p95 0.123 ms on this desktop. Writes remain opt-in.

Intermediate failures were not counted as passes: snapshot conflicts and replay-shape failures were found in baseline runs; the first tuned run still failed; earlier PM2 startup-fault attempts exposed process/pointer ordering problems and are retained in staging-*-attempt.txt. The final controller quiesces before pointer changes/rollback, and the final fault fixture becomes unhealthy after readiness. Initial harness output-directory/UTC fixture/CLI-output parsing issues were corrected. The Windows collector required a process-scoped script launch setting; no global execution policy was changed. The PM2 version check briefly started an empty default daemon, which was stopped after confirming it contained no applications; real supervisor tests used isolated PM2_HOME values. No production changes were made.
