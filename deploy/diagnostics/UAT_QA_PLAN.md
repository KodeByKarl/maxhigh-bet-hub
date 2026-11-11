# MaxHigh UAT functional QA plan - unrestricted testing across all 100 games (synthetic accounts and test credits only)

Status: **PROPOSAL - no database write has been made.** This plan withdraws the earlier fixed UAT thresholds (1,000 / 100,000 / 100,000 / yes / 10,000).
Environment: `maxhigh_staging` on the UAT service only. Nothing here applies to production or to real money.

## 1. What stays enforced (nothing is bypassed or disabled)
- `risk_controls` availability check: still **fail-closed** (no row = no wager, no payout). It is not touched by this plan.
- All four risk checks keep executing on every wager/payout: single-bet ceiling, per-user daily payout, per-user rolling 7-day wins+withdrawals, large-win audit flag.
- Balance validation (`users_balance_nonnegative` CHECK, row lock `FOR UPDATE`, insufficient-balance rejection), transaction atomicity (a failed request rolls back with no debit),
  idempotency (`financial_operations`), the append-only ledger, audit logging, provably-fair seeds/receipts, maintenance mode, RBAC and login rate limiting.
- Per-game controls: each game keeps its own min/max bet (lowest min 0.10, highest max 500; distinct maxima 25, 35, 50, 100, 200, 500) and its engine caps (round pool cap,
  max-win multiplier, free-spin caps). A "POOL_CAP_CLAMP" log line is expected behaviour, not a failure. Changing `game_controls` would be a separate write and is **not** part of this plan.

## 2. Can the schema express an "unlimited" synthetic-testing mode? **No - evidence**
| Fact | Where | Consequence |
|---|---|---|
| All five columns are `NOT NULL`, `DECIMAL(14,2)` (max `999,999,999,999.99`), no NULL / sentinel / "disabled" flag | `drizzle/0000_init-from-schema.sql`, `schema.ts` | no way to store "unlimited" |
| Limits are read in exactly four places and always compared numerically: `bet > max_single_bet`, `todays_wins + win > max_daily_payout`, `7d(wins+withdrawals) + delta > max_weekly_limit`, `win >= large_win_threshold` | `wallet.server.ts` lines 34-35, 117, 219-221 | there is no bypass branch to enable |
| The admin form and server validate `positive().finite()`; `0`, negatives and `Infinity` are rejected | `risk-controls.ts` | cannot be configured away through the UI either |
| `0` stored directly would make `bet > 0` and `win > 0` always true | wallet code | every spin would fail - the opposite of unlimited |
| `minorUnits` accepts up to 99,999,999,999,999 cents = the column maximum | `money.ts` | values up to the column maximum are valid; nothing larger can exist |

Conclusion: an explicit unlimited mode would need a **code change to financial enforcement**, which this plan does not propose. Large finite values do **not** disable enforcement - they only move the
ceiling beyond anything the test can reach, so the checks still run and still reject anything above the ceiling.

## 3. Proposed UAT-only configuration (finite) - awaiting your approval
| Column | Proposed value | Applies to | Rationale |
|---|---|---|---|
| `max_single_bet` | `100000.00` | one wager | 200x the highest game maximum (500). Never binds in normal QA; per-game limits remain the real bet limits |
| `max_daily_payout` | `100000000.00` | per user, per Manila day, wins + jackpots | 5,000 maximum-bet rounds a day wager only 2.5M; 100M is 40x that |
| `max_weekly_limit` | `1000000000.00` | per user, rolling 7 days, wins + withdrawals | 0.1% of the column maximum; wins also count against it, so it must not bind during QA |
| `auto_flag_large_wins` | `yes` | - | keeps the audit path exercised |
| `large_win_threshold` | `10000.00` | flag only, **non-blocking** | each win at or above this writes a `risk.large_win` audit row, which the reconciliation below checks |

Why not larger: values stay three orders of magnitude below the DECIMAL(14,2) ceiling so sums and balances can never overflow the columns (`users.balance`, `transactions.amount` are also DECIMAL(14,2),
so test credits must stay far below 999,999,999,999.99).
Optional **Phase B** (separate approval, end of night): to prove enforcement still bites, set `max_single_bet` temporarily to `1.00` through the audited superadmin screen, confirm a 5.00 wager is
rejected with no debit and no ledger row, then restore the values above. Otherwise rely on the automated suite (18 of 18 integration groups, including the missing/low-limit cases).

## 4. Keeping this configuration out of real-money production
1. The values live only as a data row in `maxhigh_staging`. They are in no migration, seed, or code: migration 0004 seeds different placeholders, and `risk-controls-remediation.sql` contains **no values** at all.
2. The UAT service refuses to start unless `MYSQL_DATABASE=maxhigh_staging`, user `maxhigh_uat_app`, host `127.0.0.1` and no `DATABASE_URL` (`uat-run.mjs`).
3. The write script aborts unless `DATABASE()` equals the `@target_db` you set; for tonight that must be `maxhigh_staging`.
4. `recovery.py` can only restore into `maxhigh_staging_restorecheck` under a fixed-name guard; a UAT backup can never be restored over another database by this tooling.
5. New read-only guard (`readonly-db-diagnostics.sql` section 02b) reports **`UAT-SCALE VALUES PRESENT - NOT SAFE FOR REAL MONEY`** whenever `max_single_bet >= 100,000`, `max_daily_payout >= 10,000,000` or `max_weekly_limit >= 100,000,000`.
   Tested: placeholder defaults -> `below UAT scale`; the proposed values -> the warning; no row -> `row missing`.
6. Production go-live checklist (to add): a separate database and credentials; its own risk row set from explicitly approved real-money limits (never copied from this file); run section 02b and require `below UAT scale`;
   proposal for review (not implemented): make the release pipeline fail when 02b reports the UAT-scale verdict.
7. Isolation from payment and withdrawal systems: the server code contains **no outbound payment or payout integration** (no HTTP client calls, no provider SDKs, no payment keys in the env the server reads).
   Deposits and withdrawals are `wallet_requests` rows approved by staff and only move the internal ledger. The UAT app listens on `127.0.0.1:18080` only. One cosmetic risk: the support-chat FAQ text claims instant GCash/PayMaya
   withdrawals - tell testers it is placeholder copy.

## 5. Order of work tonight (nothing in `risk_controls` is written before step 4)
1. G1 permanent-key generation, G4 extraction, G5 read-only checks, G6 restore-check schema, G7 verification key (see `UAT_RECOVERY_RUNBOOK.md`).
2. G8 backup in a quiet window, G9 restore + compare **PASS**, G10 key removal and the permanent-key decrypt drill. These are the "backup and restore verification" that must complete first.
3. You approve the configuration in section 3 (and the write path below).
4. Dry run (`ROLLBACK`), review the output, then the real write.
5. Section 8 reconciliation query (baseline), then fund synthetic accounts, then QA.
6. Section 8 again after each batch of games and at the end. Final diagnostics run including 02b (it will, by design, show the UAT-scale warning).

### Write path - choose one
- **A. SQL (already uploaded, SHA-256 `33a5e7ca...695f51`).** Guarded, transactional, inserts only if the row is missing. Dry run:
```sh
( printf "SET @target_db='maxhigh_staging'; SET @max_single_bet=100000.00; SET @max_daily_payout=100000000.00; SET @max_weekly_limit=1000000000.00; SET @auto_flag='yes'; SET @large_win_threshold=10000.00;\n"; cat ~/risk-controls-remediation.sql; printf 'ROLLBACK;\n' ) | sudo mariadb --defaults-extra-file=/root/maxhigh-staging-admin/migrate-client.cnf --force -t maxhigh_staging
```
  Expected: `inputs_valid=1`, `rows_inserted_expect_1=1`, four `*_unchanged=1`, then the row with exactly the five values. Real run: same with `COMMIT;`. It writes **no `audit_logs` row**.
- **B. Superadmin screen (`/superadmin/risk`).** Same validation (`positive().finite()`), and the app writes an audit entry automatically. Note: the screen shows built-in defaults while the row is missing, and the first Save creates the row.
  It needs a synthetic UAT superadmin login (confirm one exists first; creating one is a separate write).
Recommendation: A for the exact, reviewed insert, then record the change in the QA log; choose B if you want the audit trail of the change in the database. Either needs your approval.

## 6. Accounts and credits (separate approval; ledger-visible only)
Use the existing `uat_player1` (1,000.00) plus four synthetic players created through the app's own flows, each funded with 100,000.00 test credits through staff deposit/adjust so every credit is a ledger row.
Never edit `users.balance` directly. Worst case for high-bet testing is 100 games x 5 rounds x 500 = 250,000 across all accounts.

## 7. QA matrix (all 100 games; catalog with id, category, min and max bet: `uat-game-catalog.tsv`)
Categories: 82 slots, 7 fishing, 11 cards. For every game, record pass/fail for:
1. Opens from the lobby; no console/HTTP errors.
2. Minimum, default and maximum permitted bet each play one round; balance after = before - bet + win; exactly one `bet` row (and a `win` row if it paid).
3. Feature flows where present (free spins, buy bonus, tumble/cascade, jackpot): complete, resume after reload, no stuck `open` session.
4. Anti-exploit: double-click/duplicate submit, same operation key replay, two tabs at once, logout mid-round, stale session reuse, tampered requests (negative, zero, fractional, non-numeric, above game max, below game min, above balance),
   disabled game, another user's session id. Every rejection must leave balance and ledger unchanged.
5. Fishing/cards rounds settle and replay (round receipt) with no orphan debit.
Global signals: UAT error log must show **zero** "Financial risk controls unavailable"; any "Financial service unavailable" is a defect to triage with the receipt; `maxhigh-uat` restarts stay at 0.
Stop immediately on: any reconciliation problem row, a double debit, a balance change without a ledger row, a negative balance, or an unexplained service restart. Preserve logs; do not edit data.

## 8. Reconciliation (read-only; tested on MariaDB 10.11.14 with a clean ledger and with injected corruption)
Detection verified: a wrong `balance_after` chain, balance drift, a wrong-sign wager, duplicate rows, and large wins without audit rows are all reported. The negative-balance check is a backstop (the database CHECK already refuses it).
Run with the preview (SELECT-only) account or root; every "problems" section must return no rows.
```sh
sudo mariadb --defaults-extra-file=/root/maxhigh-staging-admin/preview-client.cnf --default-character-set=utf8mb4 -t maxhigh_staging <<'SQL'
-- MaxHigh UAT QA reconciliation. READ-ONLY (SELECT only). Run against maxhigh_staging with the preview or root account.
-- Every "problems" query must return ZERO rows. Counts/summaries are informational.
SET SESSION TRANSACTION READ ONLY;

SELECT '1 ledger chain: every row must equal previous balance_after + amount (problems)' AS check_name;
SELECT user_id, seq, type, amount, balance_after, prev_after
FROM (SELECT t.*, LAG(t.balance_after) OVER (PARTITION BY t.user_id ORDER BY t.seq) AS prev_after FROM transactions t) x
WHERE prev_after IS NOT NULL AND ROUND(prev_after + amount, 2) <> balance_after;

SELECT '2 users.balance must equal the last ledger balance_after (problems)' AS check_name;
SELECT u.id AS user_id, u.username, u.balance, l.balance_after AS last_balance_after
FROM users u JOIN (SELECT t.user_id, t.balance_after, ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.seq DESC) AS rn FROM transactions t) l
  ON l.user_id = u.id AND l.rn = 1
WHERE u.balance <> l.balance_after;

SELECT '3 negative balances (problems)' AS check_name;
SELECT id, username, balance FROM users WHERE balance < 0;

SELECT '4 wagers must debit and payouts must credit (problems)' AS check_name;
SELECT seq, user_id, type, amount FROM transactions
WHERE (type = 'bet' AND amount >= 0) OR (type IN ('win','jackpot') AND amount <= 0) OR (type = 'deposit' AND amount <= 0) OR (type = 'withdraw' AND amount >= 0);

SELECT '5 duplicate ledger rows (same user, type, game, amount and created_at) (problems)' AS check_name;
SELECT user_id, type, game, amount, created_at, COUNT(*) AS copies FROM transactions
WHERE type IN ('bet','win') GROUP BY user_id, type, game, amount, created_at HAVING COUNT(*) > 1;

SELECT '6 more than one open session per user and game (problems; also enforced by a unique key)' AS check_name;
SELECT user_id, game_id, COUNT(*) AS open_sessions FROM play_sessions WHERE status = 'open' GROUP BY user_id, game_id HAVING COUNT(*) > 1;

SELECT '7 large wins at or above the flag threshold must each have a risk.large_win audit row (problems = difference)' AS check_name;
SELECT (SELECT COUNT(*) FROM transactions t JOIN risk_controls r ON r.id = 'default'
         WHERE t.type IN ('win','jackpot') AND r.auto_flag_large_wins = 'yes' AND t.amount >= r.large_win_threshold) AS large_wins,
       (SELECT COUNT(*) FROM audit_logs WHERE action = 'risk.large_win') AS audit_rows;

SELECT '8 risk_controls row present and what is configured (informational)' AS check_name;
SELECT * FROM risk_controls;

SELECT '9 activity per transaction type (informational)' AS check_name;
SELECT type, COUNT(*) AS rows_, ROUND(SUM(amount), 2) AS total_amount FROM transactions GROUP BY type ORDER BY type;

SELECT '10 coverage: distinct slot game ids wagered (from the note prefix, informational) vs catalog of 100' AS check_name;
SELECT COUNT(DISTINCT SUBSTRING_INDEX(note, ' · ', 1)) AS distinct_game_ids_with_bets FROM transactions WHERE type = 'bet' AND note LIKE '% · %';

SELECT '11 audit trail volume by action (informational)' AS check_name;
SELECT action, COUNT(*) AS n FROM audit_logs GROUP BY action ORDER BY n DESC LIMIT 25;
SQL
```

## 9. Explicitly out of scope tonight
Real payment rails (none exist in this codebase), production, load/performance, per-game limit overrides (`game_controls`), third-party RNG certification, and any change to engine caps.

## 10. Decisions needed from you
1. Approve or amend the five values in section 3.
2. Write path A (SQL) or B (superadmin screen).
3. Phase B enforcement check: yes/no.
4. Number of synthetic accounts and credit size (section 6), and when each of them may be created.
