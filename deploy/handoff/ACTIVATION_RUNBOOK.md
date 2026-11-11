# Activation runbook - 50 playable / 50 locked games and 2 client staff accounts

**State today (2026-11-10):** UAT runs `e89359f` (all 100 games open, restrictions inactive). The next release `8066092cc16ee8f990cdbf6d5bced89cd186fb5b` is built by CI, verified and **staged on the VPS inbox, not deployed**. Nothing has been activated.

## What release 8066092 adds (still shipped inactive)
* Final notifications, identical on every surface, with stable error codes and audit rows:
  * Game: "Game Locked. Please settle the remaining project payment to activate this game." (`GAME_LOCKED`; audit `game.locked_attempt`, `game.activation_rejected`)
  * Accounts: "Account Limit Reached. Please settle the remaining project payment to add more client accounts." (`ACCOUNT_LIMIT_REACHED`; audit `account.create_rejected`)
* Admin catalog (superadmin Games): restricted games show a **Locked** badge, a visible notice in the game dialog (mobile friendly), the Enable toggle is refused server-side, bulk actions skip locked games.
* Cap counts **staff accounts only** (any role other than `player`); ordinary players are never counted or limited; promoting a player to staff while full is refused. Migration `0006_staff_accounts_only_cap.sql` (replaces the 5 triggers, recounts; additive).
* `recovery.py` now backs up and restores the schema **with** the five reviewed triggers (guarded set, DEFINER filter, trigger fingerprint in the comparison).
* Evidence: DB tests 18/18, policy unit tests, kit tests (recovery 25), trigger backup/restore proof 18/18 (log_bin OFF, like the VPS), end-to-end restrictions test **56/56** (100/100 with restrictions off; proposed 50 available 50/50; proposed 50 locked all refuse; cap, promotion block, admin-catalog lock, bulk skip, grants), full unit suite 23/23, lint 0 errors, typecheck clean, CI green.

## Owner decisions still needed before activation (I will not guess these)
1. **Contract:** written confirmation that the signed agreement (or a client acknowledgement) authorizes the 50-game lock and the 2-staff-account cap on this testing system. No agreement text is in the repository.
2. **The exact 50 playable / 50 locked games.** `PROPOSED_GAME_ALLOCATION.md/.json` is a deterministic proposal only (category mix + catalog order).
3. **Which two accounts are the client's staff accounts.** Under the staff-only cap they are created after activation by the owner; the owner superadmin and the QA players are not counted.
4. **Grant-signing key custody** (offline Ed25519 key) or an explicit decision that no key exists, in which case unlocking a game always needs a new reviewed release.

## Step 1 - deploy 8066092 inactive (3 owner sudo runs, I do everything else)
All files are already in `/home/maxhigh-ops`. Hashes: `vps-extract-plan-8066092-sudo.sh` 3653d325...a7c9, `uat-r2.sh` 70a9f9c8...b45ea, `vps-apply-activate-8066092-sudo.sh` 32b35aaf...f7e5.
1. `ssh -t maxhigh-ops@151.242.136.34 "sudo sh ~/vps-extract-plan-8066092-sudo.sh 2>&1 | tee ~/extract-plan-8066092.txt"` - installs the kit, extracts the pinned release, read-only migration plan (must show only `0006` pending).
2. Trigger-aware backup R2: install `uat-r2.sh` as root (hash-checked) and run it (same runner pattern as R1 in `batches/RUN.md`). It proves backup + restore + compare **with the 5 triggers** on the real VPS. Then the Windows permanent-key drill (`g10b-drill.ps1`, your passphrase).
3. `sudo sh ~/vps-apply-activate-8066092-sudo.sh` - applies 0006 through the root socket, switches only `maxhigh-uat`, rolls the application back automatically to `e89359f` if the health check fails.
4. I then run the 100-game regression, security probes, browser checks and the ledger reconciliation on 8066092 (restrictions still inactive).

## Step 2 - activation (after decisions 1-4)
1. I fill `lockedGames` (the approved 50), set both `enforcement` fields to `"on"`, add the public grant key if one exists, rebuild through the private CI branch, verify the artifact, update the kit pins.
2. Fresh trigger-aware backup (R2 pattern), deploy as in Step 1.
3. Dry run: `node scripts/dev/activate-restrictions.mjs --max-clients 2 --enforce yes` (writes nothing), then `--apply` with `CONFIRM_ACTIVATE_RESTRICTIONS=maxhigh_staging`. Players need no classification any more; the owner superadmin stays class `admin`.
4. Verify: lobby shows exactly 50 Locked; each locked game refuses; the 50 available games play; admin catalog shows Locked and refuses to enable; the owner creates two client staff accounts, a third is refused with the notification (desktop and mobile); players can still be created; ledger reconciles; both rejection paths are in the audit log.
5. Deliver credentials to the client through a separate secure channel chosen by the owner. Nothing is sent automatically.

## Rollback
Application: reinstall `uat-run.rollback-<previous sha>.mjs` and restart `maxhigh-uat` (previous release directories are kept). Database changes (0005/0006) are additive; `ACCOUNT_AND_GAME_RESTRICTIONS_SPEC.md` section 5 has the tested full rollback. Never restore over UAT; restore into the isolated check schema and compare.
