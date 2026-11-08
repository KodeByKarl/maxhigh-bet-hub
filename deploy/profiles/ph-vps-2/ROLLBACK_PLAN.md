# Rollback plan

Reporting date: 2026-11-09 (Asia/Shanghai). Evidence files retain their machine-generated UTC timestamps. No production deployment, real player changes, live Cloudflare changes or credential rotation were performed.

Use approved immutable artifacts, never git pull/reset in the serving tree and never a schema downgrade as a routine rollback. The active pointer is deploy/releases/current.json; previous.json retains the last healthy pointer. Activation and retention share an exclusive lock. Health verifies both schema availability and the expected revision. The candidate exits before a fork-mode serving restart to bound overlap memory.

For an approved rollback, inspect current/previous manifests and storage-requirements.json, recheck checksum/schema compatibility and resource headroom, then run the existing explicit activation command for the previous SHA. Its migration gate is read-only; pending or changed SQL blocks activation. The healthy pointer is restored automatically if post-switch health fails. A rollback release must retain all security fixes and understand every persisted receipt codec. Disabling compression does not make old gz1 records readable by an older decoder.

~~~sh
DEPLOY_PROFILE=ph-vps-2 node deploy/auto-update.mjs --activate PREVIOUS_APPROVED_40_CHARACTER_SHA
~~~

Do not bypass a failed compatibility gate by editing a pointer or deleting the codec policy. First deploy readers with compression off; opt in only after a compatible rollback reader exists. Keep at least two verified releases. Retention defaults to dry-run, protects current/previous even when older, refuses activation overlap and excludes git worktrees/incomplete artifacts. Review every absolute prune path before the separately confirmed apply command.

Financial operations have durable actor/key/input identities. An uncertain client response must retry the same key; do not issue replacement credits manually without ledger review. During graceful shutdown new work is rejected, active handlers drain, and the DB pool closes after settlement. A hard process loss leaves InnoDB to roll back incomplete transactions; committed keys remain replayable. No balance, paid feature or ledger reset is part of rollback.

If activation.lock remains after a crash, stop and inspect current/previous pointers, serving SHA, candidate PIDs and DB state before any further operation. A first deployment without a prior healthy artifact has no verified rollback target; rehearse bootstrap separately. Backups and binlogs are a disaster-recovery path, not a substitute for artifact rollback. Never overwrite live player data from a test backup.

Local supervisor evidence: PASS under isolated Windows PM2, with real MaxHigh healthy artifacts and explicit injected failure fixtures. Ubuntu PM2 and the actual origin remain unverified. Fork restarts can briefly interrupt HTTP; retries rely on idempotency rather than a zero-downtime promise.

<!-- PH-VPS-2 FINAL EVIDENCE -->

Final local Windows PM2 staging passed five scenarios, including healthy switching, candidate rejection, rollback after post-readiness failure and codec downgrade refusal. Ten profile tests additionally cover quiesce ordering, failed-pointer-write recovery, protected retention and temporary cleanup planning. This does not close Ubuntu/VPS or live-origin gates.
