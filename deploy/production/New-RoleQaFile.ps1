<#
.SYNOPSIS
  Builds role-qa.tsv for deploy/production/verify-roles.mjs from your EXISTING local QA credential files.
  Run it yourself, locally. Passwords are never printed, logged or placed in the repository.

.DESCRIPTION
  Source files are tab-separated; column 1 = username, column 3 = password (the layout deploy/production/live-client.mjs reads).

  Step 1 (inspect, prints usernames only, no passwords):
      pwsh deploy/production/New-RoleQaFile.ps1 -List

  Step 2 (convert): name the username to use for each role. Roles you omit are reported PENDING by the test.
      pwsh deploy/production/New-RoleQaFile.ps1 `
          -Superadmin client_owner -MasterAgent <ma_user> -Agent <agent_user> -Player uat_player5

  Only usernames YOU supply are copied, and only if found in the source files. The tool does not assume UAT accounts
  work on production: if a sign-in fails, verify-roles.mjs reports FAIL for that role (it never retries or creates accounts).
  Caution: each role signs in about 4 times (2 viewports x sign-in + logout re-sign-in); a wrong password could trip the
  failed-sign-in lock on that account. Confirm the account is valid on production first (a lock can be reset in /admin).
#>
[CmdletBinding()]
param(
  [switch]$List,
  [string]$Superadmin, [string]$MasterAgent, [string]$Agent, [string]$Player,
  [string[]]$Source = @("$env:USERPROFILE\maxhigh-uat-secrets\uat-qa-credentials.txt", "$env:USERPROFILE\maxhigh-uat-secrets\uat-final-credentials.txt"),
  [string]$Output = "$env:USERPROFILE\maxhigh-uat-secrets\role-qa.tsv"
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Read-Rows([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return @() }
  Get-Content -LiteralPath $path | Where-Object { $_.Trim() } | ForEach-Object {
    $c = $_ -split "`t"
    [pscustomobject]@{ User = $c[0].Trim(); Cols = $c.Count; Pass = $(if ($c.Count -ge 3) { $c[2] } else { $null }); File = (Split-Path $path -Leaf) }
  }
}

if ($List) {
  foreach ($s in $Source) {
    Write-Host "== $s" -ForegroundColor Cyan
    $rows = Read-Rows $s
    if (-not $rows) { Write-Host "   (missing or empty)"; continue }
    $rows | ForEach-Object { '   {0}   (columns: {1}, password present: {2})' -f $_.User, $_.Cols, [bool]$_.Pass }
  }
  return
}

$map = [ordered]@{ superadmin = $Superadmin; master_agent = $MasterAgent; agent = $Agent; player = $Player }
if (-not ($map.Values | Where-Object { $_ })) { throw 'Name at least one role/username (or use -List to inspect).' }

$outFull = [IO.Path]::GetFullPath($Output)
$rel = [IO.Path]::GetRelativePath($repo, $outFull)
if (-not ($rel.StartsWith('..') -or [IO.Path]::IsPathRooted($rel))) { throw "Refusing to write inside the repository: $outFull" }

$allRows = $Source | ForEach-Object { Read-Rows $_ }
$lines = New-Object System.Collections.Generic.List[string]
$report = foreach ($role in $map.Keys) {
  $u = $map[$role]
  if (-not $u) { [pscustomobject]@{ Role = $role; Username = '-'; Result = 'omitted -> PENDING' }; continue }
  $hit = @($allRows | Where-Object { $_.User -eq $u -and $_.Pass } | Select-Object -First 1)
  if ($hit.Count -eq 0) { [pscustomobject]@{ Role = $role; Username = $u; Result = 'NOT FOUND in source files -> PENDING' }; continue }
  $lines.Add("$role`t$u`t$($hit[0].Pass)")
  [pscustomobject]@{ Role = $role; Username = $u; Result = "copied from $($hit[0].File)" }
}

New-Item -ItemType Directory -Force -Path (Split-Path $outFull) | Out-Null
[IO.File]::WriteAllText($outFull, (($lines -join "`n") + "`n"), (New-Object Text.UTF8Encoding($false)))
& icacls.exe $outFull /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null   # current user only
$report | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "Wrote $($lines.Count) account(s) to $outFull (passwords not shown; file readable by your user only)."
Write-Host "Next: `$env:ROLE_QA_CREDENTIALS_FILE = '$outFull'; node deploy/production/verify-roles.mjs; Remove-Item Env:ROLE_QA_CREDENTIALS_FILE"
Write-Host "Delete the file afterwards if you no longer need it."
