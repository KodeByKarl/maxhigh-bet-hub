# Final approval gates - release `release/uat-phase2`

Nothing has been deployed, pushed, restarted or activated. UAT is unchanged (release 2294d79). Both restrictions are implemented and **inactive**.

## Gate summary
| Gate | Status | What it needs |
|---|---|---|
| READY FOR UAT DEPLOYMENT REVIEW | **YES, subject to the VPS preflight below** | Owner reviews RELEASE_MANIFEST + DEPLOYMENT_AND_ROLLBACK, runs the read-only preflight, decides on the binary-log item |
| PENDING CONTRACT CONFIRMATION | **PENDING** | Written confirmation that the signed agreement authorizes activating (a) game locks and (b) the 2-client cap on UAT. No agreement text exists in the repository |
| PENDING 50-GAME LIST APPROVAL | **PENDING** | The exact 50 games to keep available. `PROPOSED_GAME_ALLOCATION.md` is arbitrary by design (category mix + catalog order) and is not active |
| PENDING CLIENT ACCOUNT IDENTIFICATION | **PENDING** | Which two accounts are the client accounts (new or existing) and how a client-owned superadmin is classified |
| PENDING SIGNING-KEY CUSTODY DECISION | **PENDING** | Who generates, holds and backs up the offline Ed25519 grant-signing key. No key exists |
| PENDING PHYSICAL ANDROID VALIDATION | **PENDING** | Real-device pass of CLIENT_ACCEPTANCE_CHECKLIST section C and Color Game smoothness; all mobile results so far are browser emulation |
| PENDING PRODUCTION APPROVAL | **PENDING / OUT OF SCOPE** | Production deployment, real-money operation, public routing and credentials were never part of this work and are not approved |

## Why "ready for review" and not "ready to deploy"
1. The VPS database preflight has **not** been run (my SSH key access was lost when the Windows machine restarted; unlocking it needs your passphrase). Local reproduction shows migration 0005 **fails for a non-SUPER account when binary logging is ON** (error 1419) - see `binlog-trigger-results.json`. Whether the VPS is in that state is unknown until the preflight output exists.
2. A fresh encrypted backup after the last UAT change is required before the migration (procedure in the manifest).
3. Gameplay change (Wild Panther) needs the client's acceptance.

## Owner-run commands (nothing below changes data; the sudo script contains only SELECT/SHOW)
Verify the scripts first (SHA-256, from the release tree):
```
209ffa0732bc52ee658db85d3a8f7d43fba9e4a9f220b70b327591b9d0f80b2b  deploy/diagnostics/vps-db-preflight-nonsudo.sh
cbf1081d6d49a5f4bad31bc353aa5fd34ee3fd7086e0bea95ab8747047cc5747  deploy/diagnostics/vps-db-preflight-sudo.sh
```
**0. Unlock SSH on your Windows machine** (needs your key passphrase; do this yourself): `ssh-add $env:USERPROFILE\.ssh\maxhigh_vps2` then `ssh maxhigh-ops@151.242.136.34 echo ok`.
**1. Non-sudo host check** (PowerShell):
`(Get-Content D:\Porjects\maxhigh-bet-hub-release\deploy\diagnostics\vps-db-preflight-nonsudo.sh -Raw) -replace "`r","" | ssh maxhigh-ops@151.242.136.34 'bash -s' | Tee-Object C:\Users\Keydi\maxhigh-evidence\phase2\vps-nonsudo-preflight.txt`
**2. Copy the sudo script and run it** (you type your sudo password):
`scp D:\Porjects\maxhigh-bet-hub-release\deploy\diagnostics\vps-db-preflight-sudo.sh maxhigh-ops@151.242.136.34:~/`
then on the VPS: `sha256sum ~/vps-db-preflight-sudo.sh` (must equal the value above) and
`sudo bash ~/vps-db-preflight-sudo.sh 2>&1 | tee ~/db-preflight-$(date -u +%Y%m%dT%H%M%SZ).txt`
**3. Bring the output back and compare offline:**
`scp maxhigh-ops@151.242.136.34:~/db-preflight-*.txt C:\Users\Keydi\maxhigh-evidence\phase2\` then
`node D:\Porjects\maxhigh-bet-hub\scripts\qa\compare-ledger.mjs C:\Users\Keydi\maxhigh-evidence\phase2\db-preflight-<stamp>.txt D:\Porjects\maxhigh-bet-hub-release`
Expected: `OK` for 0000-0004 ledger checksums, `PENDING` for 0005, 0005 objects absent, no unexpected triggers. A `RISK` line about binary logging means a decision is needed (below). Any `BLOCKER` means do not migrate.

## Decision if the preflight reports `RISK` (binary logging ON, trust_function_creators OFF)
Tested locally (MariaDB 10.11.14 with --log-bin): the migration succeeds with **either**
* (A) a migration account that has `SUPER` (no server setting changed), or
* (B) `log_bin_trust_function_creators=1` set by the owner for the duration of the migration (non-persistent `SET GLOBAL`, restored afterwards).
Both change privileges or server variables, so **neither is done by me; owner approval is required.** My recommendation: (A) if a SUPER-capable admin account already exists for migrations; otherwise (B) during a short quiet window, then `SET GLOBAL log_bin_trust_function_creators=0`. The migration is re-runnable, so a failed first attempt leaves nothing stuck.

## Not done on purpose
Deploy, push, restart, activation of restrictions, any change to UAT, creation of signing keys or credentials, any production access.
