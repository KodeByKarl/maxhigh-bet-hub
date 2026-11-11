# Monitoring and storage operations

Reporting date: 2026-11-09 (Asia/Shanghai). Evidence files retain their machine-generated UTC timestamps. No production deployment, real player changes, live Cloudflare changes or credential rotation were performed.

Install monitor.service/monitor.timer only after reviewing the application user and /srv/maxhigh path. deploy/monitor.mjs reports available memory, disk headroom, Linux swap counters, current app RSS/heap/CPU and pool depth; nonempty alerts exit 2 so systemd records a failed check. The application overwrites a small private metrics file every 30 seconds. Interrupted marked incoming artifact copies older than seven days, with no live owner PID, are included in the reviewed temporary cleanup plan; active/rollback releases remain protected. It creates no public metrics port and records no SQL, tokens, passwords or seed material. Timer failure reaches the journal; external pager/email delivery needs an operator-configured destination and was not tested.

| Signal | Initial action threshold |
|---|---|
| Disk free | Warn below 20% or 5 GiB; critical below 10% or 2 GiB |
| Available RAM | Warn below 768 MiB; critical below 384 MiB |
| App total RSS | Investigate sustained >1,200 MiB; restart safeguard 1,536 MiB, not a hard ceiling |
| Pool | Investigate sustained queue >10 and any repeated admission rejection |
| Swap/paging | Investigate positive sustained Linux pswpin/pswpout deltas and IO wait; used swap alone is not thrashing |
| Latency/errors | Compare native staging p95/p99 baseline; any conservation/duplicate-settlement failure stops the test |
| Locks/restarts | Alert on increasing deadlocks, lock waits, repeated restarts or a stale metrics file >90 s |
| Backups | Alert on failed pipeline/check, missing daily snapshot or overdue verified restore |

Use /proc, pidstat, vmstat, iostat and MariaDB SHOW GLOBAL STATUS/slow logs on Ubuntu; record CPU steal and disk await/utilization. Pool limits alone do not establish capacity. Windows performance snapshots/pagefile metrics are labeled separately and cannot prove Linux swap behavior. Do not publish PM2 jlist output: it can include the environment. Record only selected PID/status/restart and resource fields.

logrotate.conf handles operational PM2 and MariaDB text logs hourly with size thresholds; Caddy rotates its own JSON access log. Directories must be private, and headers/URIs are filtered in the profile Caddy log. Copytruncate can lose a small interval of operational lines; essential financial audit records remain in the database and are never in this cleanup path. Binlogs use MariaDB-managed rotation/expiry and require verified off-host recovery coverage.

~~~sh
node deploy/monitor.mjs
node deploy/retention.mjs   # plan only; inspect current/previous and all paths
systemctl --failed
journalctl -u maxhigh-monitor.service
~~~

Retain at least the approved rollback artifact, keep activation locks/policy metadata and review any unrecognized/incomplete release directory manually. No automated DB/ledger/feature/audit pruning exists. Build temporary directories stay on the external builder; verified imports stage in marked incoming directories and are atomically promoted. No development watcher runs in this production profile.
