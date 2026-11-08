# Resource budget

Reporting date: 2026-11-09 (Asia/Shanghai). Evidence files retain their machine-generated UTC timestamps. No production deployment, real player changes, live Cloudflare changes or credential rotation were performed.

These are planning allocations, not measured upper bounds or guaranteed capacity.

| Consumer | Initial reservation |
|---|---:|
| OS, kernel, services, filesystem cache | 768 MiB |
| MariaDB including 512 MiB buffer pool, caches, connections and temporary buffers | 1,024 MiB |
| Main Node process including native/young heap/buffers | 1,280 MiB working target |
| PM2 manager | 96 MiB |
| Caddy | 128 MiB |
| Candidate health process, transient | 384 MiB |
| Unallocated safety margin during candidate check | 416 MiB |

The alternative transient backup job has a 384 MiB soft memory target and a 512 MiB service ceiling with half a CPU quota. Do not overlap backup and release/import/candidate work. These unqualified Linux limits can cause a large backup to fail visibly rather than exhaust the financial service; measure repository/index memory and RPO on staging.

The main V8 old-space target is 1,024 MiB, not total RSS. PM2's restart threshold is 1,536 MiB RSS and is sampled rather than a hard limit. Do not activate near that ceiling. Import requires 5 GiB free disk; activation requires 2 GiB disk and 768 MiB available RAM. A candidate uses a 256 MiB old-space limit and two database connections, and exits before the serving worker is restarted. A fork restart is not a zero-downtime cluster reload.

MariaDB allows 30 server connections, leaving headroom around the six application connections, two candidate connections and operator/backup sessions. Idle pool connections are bounded to three and expire after 60 seconds; server wait_timeout is 120 seconds. Queue limit is 30, application admission is 64. These bounds do not guarantee that 50 simultaneous expensive transactions fit without queuing. Temporary query tables are capped at 8 MiB each; a query may allocate multiple buffers. Reserve real native memory and measure RSS.

## Storage

| Item | Initial planning envelope |
|---|---:|
| OS/packages/tools and security updates | 6 GiB |
| Verified current/rollback artifacts, incoming transfer and retained candidates | 3 GiB |
| Live DB, indexes, redo/undo and receipt growth | 22 GiB initial operating envelope |
| Binlogs and bounded operational logs | 4 GiB monitored envelope |
| Free space / temporary restore and upgrade headroom | 8 GiB |

This 43 GiB planning envelope leaves additional slack within a nominal 50 GB plan, not a claim of 50 GiB usable space. Adjust after df reports actual provisioned bytes. The public asset inventory is 477,802,830 bytes, not a per-page download. Production packages omit dev dependencies/source. Retention keeps at least two newest artifacts plus current and previous pointers, potentially four protected artifacts. Pruning defaults to a plan and never touches databases, ledgers, features or audit tables. Incomplete artifacts and git worktrees require manual review. Builds run externally, so production has no routine build temporary tree.

Measured operation payload average: 7797 bytes before and 3637 bytes with lossless compression. These are different random samples, not an exact paired corpus comparison. At 3637 bytes, 1 / 10 / 30 operations per second would add approximately 0.31 / 3.14 / 9.43 GB/day in receipt payload alone, before indexes, ledger and binlogs. **Indefinite financial history cannot fit a fixed 50 GB disk at sustained high traffic.** Forecast growth, expand storage or design an owner-approved external historical store that preserves record access. No live financial records are deleted for space.

Binlogs retain seven days and rotate at 64 MiB per file; this is not a hard aggregate size cap. Export an encrypted recovery chain off-host and alert before the envelope is exceeded. Operational logs rotate hourly when over 10 MiB, with five app rotations and seven DB rotations; growth between checks is possible. Database binary/financial records never enter logrotate.

1 TB over 30 days is only about 3.1 Mbit/s averaged across the month. Count actual egress, compressed assets, DB backups and artifacts; cached/fingerprinted public assets help, but no edge hit rate was measured.

<!-- PH-VPS-2 FINAL EVIDENCE -->

The paired retained corpus confirms 55.18% byte savings with exact JSON round trips. This requires compatible-reader rollout and opt-in writes. The observed Windows private database commit was approximately 775 MiB; do not budget from the much smaller working set alone. The nominal RAM/storage envelopes still require native Linux validation.
