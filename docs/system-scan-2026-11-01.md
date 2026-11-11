# System scan — 2026-11-01

Scope: repository-wide inventory and configuration review, targeted inspection of authentication, authorization, wallet accounting, game settlement, provably-fair services, and deployment. This is a first-pass source review, not an exhaustive audit of every game or a live penetration test. No application source fixes or database mutations were made. Existing working-tree changes were preserved.

## System map

- TanStack Start, React 19, TypeScript, Vite, Tailwind; Node server deployment through Nitro.
- MySQL/MariaDB through Drizzle and mysql2.
- Player, agent, master-agent, admin, and superadmin roles.
- 1,533 files under src, 40 route files, and 53 files under server/games at scan time.
- Server-side game settlement, wallet requests and ledger, session cookies, permission mapping, agent network scope, and administrative reporting.
- PM2/Caddy deployment with polling and optional HTTP webhooks.

## Findings

### High: provably-fair endpoints do not enforce user ownership

`src/functions/provably-fair.ts` accepts caller-supplied userId for getActiveSeedPairFn, updateClientSeedFn, and rotateProvablyFairSeedPairFn. Neither those handlers nor their service implementations authenticate the caller or compare the ID with the current session. Rotation returns the previous server seed. A caller who knows another user's ID can mutate or rotate that user's seed pair and retrieve the revealed previous seed. CSRF middleware does not establish account ownership.

Resolve the user ID from requireUser() at the endpoint, and use a separate explicitly authorized administrative path if needed. Live exploitability and effects on settled games were not tested.

### High, configuration-dependent: deployment triggers accept unauthenticated requests without a secret

`deploy/watcher.mjs` enables the webhook listener by default, binds to 0.0.0.0, and accepts unsigned GitHub webhook requests when DEPLOY_WEBHOOK_SECRET is empty. The manual /hooks/deploy route also skips authentication in that configuration. Remote reachability depends on firewall/proxy configuration. Requests can trigger the configured deployment workflow; they do not supply arbitrary deployment code.

Disable HTTP triggers unless a nonempty secret is configured, and authenticate both routes. Bound request-body sizes as well.

### High: weekly withdrawal limit is not enforced by the approval path

`src/server/wallet.server.ts:56` returns early for nonpositive deltas, while writeLedgerDelta passes opts.delta for withdrawals. A withdrawal debit therefore bypasses that guard. More directly, `src/server/superadmin/services.server.ts:3231` approves withdrawals by updating users and inserting transactions without invoking the weekly-limit helper. `createWalletRequest` also does not check the weekly limit.

Validate positive withdrawal magnitude in the transactional approval path. The weekly usage helper also catches all database errors and substitutes zero usage, weakening enforcement during failures.

### Medium: heartbeat can revive an idle-expired session

`src/server/services.server.ts:243` calls touchPresence directly. `src/server/session.ts:115` updates lastSeenAt for any token whose expiresAt remains in the future, without validating the previous idle timestamp first. A session idle for over one hour but younger than twelve hours can send a heartbeat before getSessionUser invalidates it, resetting its idle clock.

Validate idle expiry before extending presence, preferably in a conditional atomic update.

### Medium: concurrent withdrawal requests can over-reserve funds

`src/server/services.server.ts:316` reads balance and pending withdrawals, then inserts the new request outside a transaction and without a user-row lock. Two concurrent requests can both observe enough available funds and together reserve more than the balance. Approval checks prevent an immediate negative balance, but pending requests become inconsistent and can block spending.

Serialize reservation checks and inserts under a shared user-row lock used by wallet writers.

### Additional review notes

- reviewWalletRequest uses requireAdmin(), which includes agents and master agents, whereas WALLET_REVIEW in the permission map permits only admin and superadmin. No caller was found under src/functions, so current network exposure was not established. Align the service guard before exposing it.
- generateOutcomeFloat divides by 4294967295, allowing the endpoint value 1 despite its documented [0,1) contract. Use 4294967296 and check downstream selection assumptions.
- Provably-fair nonce increment uses read/modify/write without a row lock or atomic increment; concurrent callers can reuse a nonce. Game integration and live impact remain unverified.
- Failed login attempts use read/modify/write and permanently lock accounts after three failures until staff intervention. Review concurrency and resistance to account-lockout abuse.

## Verification

| Check | Result |
| --- | --- |
| TypeScript tsc --noEmit | Pass |
| ESLint src | 0 errors, 115 warnings |
| Production npm run build | Pass |
| scripts/test-pool-cap.ts | Pass |
| scripts/qa-realms-engine-parity.ts | 20,000 spins; 0 mismatches |
| scripts/test-gentle-audio.ts | Pass |

Lint warnings comprise 72 react-refresh/only-export-components and 43 react-hooks/exhaustive-deps. Full machine-readable diagnostics are in output/system-scan-eslint.json. ESLint was run on src, not the entire generated output and tooling tree. Build emitted a redundant tsconfig-path plugin notice.

## Limits and next work

No live database tests, balance-changing integration scripts, external deployment actions, browser walkthroughs, dependency vulnerability audit, or production infrastructure inspection were performed. Passing compilation and selected offline tests does not establish correctness of all games or administrative flows. Start remediation with endpoint ownership, deployment authentication, and transactional withdrawal enforcement; then run role-boundary and concurrent-wallet integration tests against an isolated database.
