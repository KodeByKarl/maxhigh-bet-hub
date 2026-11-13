# Getting authorized QA credentials for Superadmin, Admin, Master Agent, Agent (administrator-operated)

Status 2026-11-13: only the player QA account (`uat_player5`) exists in the local credential files and works on production.
UAT accounts are not assumed to exist in production (they share one database, but each account must still be proven by a real sign-in).

## Rules
- Never recover passwords from hashes or SQL files. Never reset or unlock a live customer/staff account without the owner's approval.
- Do not touch balances, transactions or game configuration. QA staff accounts hold no money and are never given balance adjustments.
- Credentials stay in a local file outside the repository (`%USERPROFILE%\maxhigh-uat-secrets\role-qa.tsv`). Claude never sees them.

## Step 0 — Check whether usable staff accounts already exist (read-only, no passwords)
Sign in as the owner at https://maxhigh.online/superadmin/login (the owner account in the handover, `client_owner`) and open
`/superadmin/admins`. Note which usernames exist for roles admin, master_agent, agent. If you already own QA-designated staff
accounts, put them in `role-qa.tsv` with `New-RoleQaFile.ps1` (only if they appear in your local credential files) or add lines by hand.
If `client_owner`'s password is not known or the account is marked "requires secure reset", the OWNER must complete that reset
themselves (or approve it explicitly in writing); nobody else should reset it.

## Step 1 — (needs owner approval) Create dedicated QA staff accounts
This writes new account rows to the live database (no balances involved). Create exactly three, in `/superadmin/admins` → Create:
| Username | Role | Notes |
|---|---|---|
| `qa_admin` | admin | no parent |
| `qa_master_agent` | master_agent | no parent |
| `qa_agent` | agent | parent = `qa_master_agent` |
Use the owner's own session. The Superadmin account itself is the fifth role to test and needs no new account.

Generate passwords locally without displaying them (copy one to the clipboard at a time, paste into the form, then clear it):
```powershell
$dir = "$env:USERPROFILE\maxhigh-uat-secrets"; $out = "$dir\role-qa.tsv"
$roles = @{ admin='qa_admin'; master_agent='qa_master_agent'; agent='qa_agent' }
foreach ($r in $roles.Keys) {
  $pw = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
  Add-Content -LiteralPath $out -Value "$r`t$($roles[$r])`t$pw" -Encoding utf8
  Set-Clipboard $pw; Read-Host "Paste the password for $($roles[$r]) into the form, then press Enter" | Out-Null
}
Set-Clipboard ' '   # clear clipboard
icacls $out /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null
```
Add the `superadmin` and `player` lines with `New-RoleQaFile.ps1` (or by hand) before running; the script appends, so build the file once.
If the password policy rejects a generated value, rerun that account only.

## Step 2 — Run the acceptance test
```powershell
$env:ROLE_QA_CREDENTIALS_FILE = "$env:USERPROFILE\maxhigh-uat-secrets\role-qa.tsv"
node deploy/production/verify-roles.mjs
Remove-Item Env:ROLE_QA_CREDENTIALS_FILE
```
Send `output/production-role-acceptance/report.json` (it lists blocked request kinds by method + path only).

## Step 3 — Afterwards
Lock or disable the `qa_*` accounts in `/superadmin/admins` (do not delete: audit/ledger history must stay intact), or keep them with the
passwords in the encrypted handover for future regression runs. Delete `role-qa.tsv` if no longer needed.
