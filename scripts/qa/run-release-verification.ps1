# Visible, live release-candidate verification (LOCAL / disposable loopback only). Nothing is pushed, deployed or sent anywhere.
#   ./scripts/qa/run-release-verification.ps1 [-Evidence <dir>] [-StepTimeoutSec 1800] [-StuckSec 120]
# Steps run in order; a failing step is recorded and the run continues (never silently skipped). Output is streamed live, timestamped, with a
# 5 s heartbeat. Progress is written to <Evidence>\progress.json and a timestamped log. The window stays open at the end.
param(
  [string]$Evidence = "C:\Users\Keydi\maxhigh-evidence\release-candidate-7535c52",
  [int]$StepTimeoutSec = 1800, [int]$StuckSec = 120
)
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Set-Location "D:\Porjects\maxhigh-bet-hub-release"
New-Item -ItemType Directory -Force $Evidence | Out-Null
$logFile = "$Evidence\verification-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$progressFile = "$Evidence\progress.json"
$start = Get-Date
$steps = [ordered]@{}
$host.UI.RawUI.WindowTitle = "MaxHigh release verification"
function Log($m) { $l = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $m; Write-Host $l; Add-Content $logFile $l }
function Save($cur, $status) {
  [pscustomobject]@{ commit = (git rev-parse HEAD); current = $cur; status = $status; elapsedSec = [int]((Get-Date) - $start).TotalSeconds; updated = (Get-Date).ToString('o'); steps = $steps } | ConvertTo-Json -Depth 5 | Set-Content $progressFile
}
$cmd = @{ node = (Get-Command node).Source; npm = (Get-Command npm.cmd).Source; npx = (Get-Command npx.cmd).Source }

function Step([string]$Name, [string]$Exe, [string[]]$ArgList, [int]$Timeout = $StepTimeoutSec) {
  $n = $steps.Count + 1
  $out = "$Evidence\step-$('{0:00}' -f $n)-$($Name -replace '[^A-Za-z0-9]+','-').txt"
  $t0 = Get-Date; $last = $t0; $beat = $t0; $seen = 0; $line = 'starting'; $warned = $false
  Log "[STEP $n] ${Name}: RUNNING"
  Save $Name 'RUNNING'
  $p = Start-Process -FilePath $Exe -ArgumentList $ArgList -RedirectStandardOutput $out -RedirectStandardError "$out.err" -NoNewWindow -PassThru
  $timedOut = $false
  while (-not $p.HasExited) {
    Start-Sleep -Milliseconds 1000
    $lines = if (Test-Path $out) { @(Get-Content $out -Encoding UTF8 -ErrorAction SilentlyContinue) } else { @() }
    if ($lines.Count -gt $seen) {
      $lines[$seen..($lines.Count - 1)] | Select -Last 4 | % { $line = $_; if ($_ -match 'FAIL|ERROR|Error|WARN') { Log "  ! $($_.Substring(0, [math]::Min(170, $_.Length)))" } }
      $seen = $lines.Count; $last = Get-Date; $warned = $false
    }
    $now = Get-Date
    if (($now - $beat).TotalSeconds -ge 5) {
      $beat = $now
      $pass = ($steps.Values | ? { $_.status -eq 'PASS' }).Count; $fail = ($steps.Values | ? { $_.status -ne 'PASS' }).Count
      Write-Host ("  ♥ {0:HH:mm:ss} | {1} | step {2}s | idle {3}s | steps done {4} (pass {5} fail {6}) | elapsed {7:N1}m | {8}" -f $now, $Name, [int]($now - $t0).TotalSeconds, [int]($now - $last).TotalSeconds, $steps.Count, $pass, $fail, ($now - $start).TotalMinutes, ($line.Substring(0, [math]::Min(80, $line.Length))))
      Save $Name 'RUNNING'
    }
    if (-not $warned -and ($now - $last).TotalSeconds -ge $StuckSec) { $warned = $true; Log "WARNING: POSSIBLE STUCK STEP | $Name | last output $($last.ToString('HH:mm:ss')) | idle $([int]($now - $last).TotalSeconds)s | last line: $line" }
    if (($now - $t0).TotalSeconds -ge $Timeout) { $timedOut = $true; break }
  }
  $secs = [int]((Get-Date) - $t0).TotalSeconds
  if ($timedOut) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue; $st = 'TIMEOUT'; $code = -1 } else { $p.WaitForExit(); $code = $p.ExitCode; $st = if ($code -eq 0) { 'PASS' } else { 'FAIL' } }
  $tail = (Get-Content $out -Tail 3 -Encoding UTF8 -ErrorAction SilentlyContinue) -join ' | '
  $steps[$Name] = [pscustomobject]@{ status = $st; exitCode = $code; seconds = $secs; log = $out; tail = $tail }
  Log "[STEP $n] ${Name}: $st (${secs}s) exit=$code"
  if ($st -ne 'PASS') { Log "    last output: $tail" ; $e = Get-Content "$out.err" -Tail 6 -ErrorAction SilentlyContinue; if ($e) { Log "    stderr: $($e -join ' | ')" } }
  Save $Name 'RUNNING'
}
function Inline([string]$Name, [scriptblock]$Block) {
  $t0 = Get-Date; Log "[STEP $($steps.Count + 1)] ${Name}: RUNNING"
  try { $r = & $Block; $ok = [bool]$r.ok; $note = $r.note } catch { $ok = $false; $note = $_.Exception.Message }
  $steps[$Name] = [pscustomobject]@{ status = $(if ($ok) { 'PASS' } else { 'FAIL' }); exitCode = [int](-not $ok); seconds = [int]((Get-Date) - $t0).TotalSeconds; log = ''; tail = $note }
  Log "[STEP $($steps.Count)] ${Name}: $($steps[$Name].status) - $note"; Save $Name 'RUNNING'
}

Log "MaxHigh release verification | commit $(git rev-parse HEAD) | branch $(git branch --show-current) | evidence $Evidence"
Log "Local, disposable loopback only. Nothing is pushed, merged or deployed by this run."
$env:CLONE_ROOT_PW = 'audit-local-only'
$env:NODE_OPTIONS = ''

# Stops only leftover local test apps (built server started from .output) on the loopback test ports, so a previous run cannot collide with this one.
function Clear-TestPorts {
  foreach ($port in 18081, 18765, 18766) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | % {
      $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" -ErrorAction SilentlyContinue
      if ($proc -and $proc.CommandLine -match 'server[\\/]index\.mjs') { Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue; Log "cleanup: stopped leftover test app on port $port (pid $($proc.ProcessId))" }
    }
  }
  Start-Sleep -Seconds 2
}
Clear-TestPorts
Inline 'clean-committed-tree' { $s = git status --porcelain; @{ ok = (-not $s); note = $(if ($s) { "dirty: $($s | Select -First 3)" } else { 'working tree clean at the release commit' }) } }
Step 'typecheck'            $cmd.npm @('run', 'typecheck')
Step 'eslint'               $cmd.npm @('run', 'lint')
Step 'unit-tests'           $cmd.npm @('run', 'test:unit')
Step 'production-build'     $cmd.npm @('run', 'build')
Step 'deployment-tests'     $cmd.node @('scripts/ci/test-deployment.mjs')
Step 'migrations-fresh-and-upgrade (MariaDB 10.11)' $cmd.node @('scripts/test-migrations.mjs')
Step 'integration-api-wallet' $cmd.node @('scripts/test-integration.mjs')
Step 'restrictions-database-layer' $cmd.node @('scripts/test-restrictions-db.mjs')
Step 'game-catalog-100'     $cmd.npx @('tsx', 'scripts/ci/catalog-count.ts')
Step 'permissions-and-game-locks-e2e' $cmd.node @('scripts/qa/test-restrictions-app.mjs') 3000

# ---- disposable clone of the built app for API / Buy Bonus / security / wallet checks
Clear-TestPorts
# Buy Bonus / pricing / security probes need every game playable: the disposable clone app runs with the TEST-ONLY locks-off policy file
# (lock enforcement itself is verified by the permissions-and-game-locks-e2e step above against the real release policy).
$env:CLONE_POLICY_FILE = 'C:\Users\Keydi\maxhigh-evidence\tools\off-policy.json'
$env:SEC_PLAYER = 'uat_player'
Step 'clone-setup' $cmd.node @('scripts/qa/local-clone.mjs', 'setup')
$setupOut = Get-Content "$Evidence\step-$('{0:00}' -f $steps.Count)-clone-setup.txt" -Raw -ErrorAction SilentlyContinue
$m = [regex]::Match($setupOut, '"UAT_CREDS_FILE":"([^"]+)"')
if ($m.Success) {
  $credsDir = Split-Path ($m.Groups[1].Value -replace '\\\\', '\')
  . "D:\Porjects\maxhigh-bet-hub-release\scripts\qa\clone-env.ps1" $credsDir
  Step 'api-regression-buy-bonus-all-80' $cmd.node @('scripts/qa/test-buy-bonus-api.mjs', "$Evidence\api-buy-bonus") 2400
  Step 'buy-bonus-dynamic-pricing-80' $cmd.node @('scripts/qa/test-buy-bonus-pricing.mjs', "$Evidence\pricing.json", '1,5,20') 1800
  Step 'security-probes' $cmd.node @('scripts/qa/uat-security.mjs', '--confirm', '--evidence', "$Evidence\security")
  Inline 'wallet-ledger-reconciliation' {
    $o = node scripts/qa/clone-ledger-check.mjs 2>&1 | Out-String; @{ ok = ($LASTEXITCODE -eq 0); note = $o.Trim() }
  }
  Step 'clone-teardown' $cmd.node @('scripts/qa/local-clone.mjs', 'teardown')
} else { $steps['clone-dependent-checks'] = [pscustomobject]@{ status = 'FAIL'; exitCode = 1; seconds = 0; log = ''; tail = 'clone setup did not report credentials; API/Buy Bonus/security/wallet checks NOT RUN' }; Log 'clone setup failed: dependent checks NOT RUN' }

# ---- secrets/configuration and artifact integrity
Inline 'secrets-and-environment-config' {
  $bad = @(git ls-files | ? { $_ -match '(^|/)\.env($|\.(?!example))|\.pem$|id_rsa|\.age-key|credentials\.txt$' })
  @{ ok = ($bad.Count -eq 0); note = $(if ($bad.Count) { "tracked secret-like files: $($bad -join ', ')" } else { 'no tracked .env / key / credentials files' }) }
}
Inline 'build-integrity-manifest (local, non-deployable)' {
  $root = (Resolve-Path .output).Path; $files = @(Get-ChildItem -LiteralPath $root -Recurse -File -Force); $sha = [System.Security.Cryptography.SHA256]::Create()
  $lines = $files | % { $h = [BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($_.FullName))).Replace('-', '').ToLower(); "$h  $($_.FullName.Substring($root.Length + 1).Replace([string][char]92, '/'))" } | Sort-Object { $_.Substring(66) }
  $lines | Set-Content "$Evidence\local-build-manifest.sha256"
  $digest = (Get-FileHash "$Evidence\local-build-manifest.sha256" -Algorithm SHA256).Hash.ToLower()
  $games = (Get-ChildItem .output/public/games -Directory -ErrorAction SilentlyContinue).Count
  @{ ok = ($files.Count -gt 100); note = "$($files.Count) files, manifest sha256 $digest (Windows build: for verification only; the deployable artifact must be CI-built on Linux)" }
}

$vals = @($steps.Values)
$pass = ($vals | ? { $_.status -eq 'PASS' }).Count; $fail = ($vals | ? { $_.status -eq 'FAIL' }).Count; $to = ($vals | ? { $_.status -eq 'TIMEOUT' }).Count
$final = if ($pass -eq $vals.Count) { 'COMPLETE' } else { 'INCOMPLETE' }
Save '' $final
Log "TOTAL STEPS: $($vals.Count)"; Log "PASSED: $pass"; Log "FAILED: $fail"; Log "TIMEOUT: $to"; Log ("DURATION: {0:hh\:mm\:ss}" -f ((Get-Date) - $start)); Log "STATUS: $final"
$steps.GetEnumerator() | % { Write-Host ("  {0,-8} {1}" -f $_.Value.status, $_.Key) }
Write-Host "`nFinished. This window stays open. Log: $logFile  Progress: $progressFile"
