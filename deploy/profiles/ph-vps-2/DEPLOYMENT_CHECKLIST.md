# Deployment checklist

Reporting date: 2026-11-09 (Asia/Shanghai). Evidence files retain their machine-generated UTC timestamps. No production deployment, real player changes, live Cloudflare changes or credential rotation were performed.

All commands below are operator steps requiring separate deployment approval; no live checks are marked complete.

- [x] One fork worker, bounded pool/admission, readiness, shutdown and restart settings implemented.
- [x] All 100 lazy game mappings verified; original assets retained.
- [x] Local 5/10/20/30/50-player scenarios and financial conservation pass.
- [x] Existing regression, RBAC and once-only financial checks executed; see final evidence for counts.
- [x] Compressed static delivery and private/no-store policies retained.
- [x] Local encrypted fixture restore and ciphertext-corruption rejection pass.
- [ ] Run the profile on an isolated Ubuntu 24.04 VM with **2 vCPUs, 4 GB RAM and 50 GB disk**; do not treat this Windows run as that test. Match the trusted builder's supported Node major/patch and native dependencies.
- [ ] Verify actual MariaDB 10.11 startup/effective settings, 512 MiB buffer pool, 30 connections, UTC sessions, foreign_key_checks=ON, flush-at-commit=1 and sync_binlog=1. Rehearse all checksum/pending/legacy-feature migration guards against a production-like copy.
- [ ] Reconcile legacy open-feature base credits and duplicate/cyclic records without resetting legitimate balances or entitlements. Obtain the owner's payout-limit policy for already-paid features.
- [ ] Re-run controlled levels with equivalent seeded data, realistic think times, native process RSS/CPU, steal time, pool queue, lock waits/deadlocks, disk utilization/latency and swap-in/out. Stop on memory/disk pressure or integrity errors. Extend the soak to hours; verify no restart growth or memory slope.
- [ ] Verify real Ubuntu PM2 readiness, inflight transaction shutdown, healthy/failed activation, rollback and first-release bootstrap. Keep one verified compatible rollback artifact.
- [ ] Review current Cloudflare IP ranges, Full(strict) origin certificate, origin firewall/IPv6, verified client IP trust, WAF/bot limits and per-zone origin authentication. Verify direct-origin requests fail and no credentials/financial responses cache at the edge.
- [ ] Install bounded log rotation and monitoring timers; verify private file permissions and operational alert delivery. Caddy syntax adaptation is not a live TLS/origin test.
- [ ] Provision external encrypted restic credentials, upload a real backup, perform isolated restore validation and recover the binlog chain. Record snapshot ID/RPO/RTO and retain recovery credentials separately.
- [ ] Forecast live ledger/receipt/binlog growth. 50 GB is finite; approved archival or expansion is needed before the headroom threshold. Never prune essential financial/audit records.
- [ ] Verify no public listener for MariaDB, Node, PM2 admin/metrics, updater or Caddy admin. Permit only intended TLS ingress and restricted administration.
- [ ] Keep OPERATION_COMPRESSION=0 for the first two compatible reader releases. Enable only through the release manager after compatibility verification; retain storage-requirements.json.
- [ ] Import a pinned Linux artifact, review migration gates and obtain explicit production activation approval. No automatic activation or demo seeding.

Archive evidence and get signoff before marking production ready. Outstanding AUD-018/AUD-034/AUD-036 limitations are not closed by repository configuration alone.
