# Visible, live Buy Bonus QA runner (LOOPBACK clone only). Resumes: games already PASS in the progress file are not rerun.
#   . scripts/qa/clone-env.ps1 <credsDir>; ./scripts/qa/run-buy-bonus-live.ps1 [-Viewport desktop|mobile] [-TimeoutSec 120] [-StuckSec 60]
param(
  [string]$Evidence = "C:\Users\Keydi\maxhigh-evidence\buy-bonus\all",
  [string]$Viewport = "desktop", [int]$TimeoutSec = 120, [int]$StuckSec = 60
)
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
New-Item -ItemType Directory -Force $Evidence | Out-Null
$games = @(Get-Content "C:\Users\Keydi\maxhigh-evidence\buy-bonus\buy-games.txt")
$progressFile = "$Evidence\progress-$Viewport.json"
$logFile = "$Evidence\live-$Viewport-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$results = [ordered]@{}
# resume: keep earlier results (from the progress file, then from the old csv runner)
if (Test-Path $progressFile) { (Get-Content $progressFile -Raw | ConvertFrom-Json).games.PSObject.Properties | % { $results[$_.Name] = $_.Value } }
$csv = "$Evidence\all-summary-$Viewport.csv"
if (Test-Path $csv) { Import-Csv $csv | ? { $_.failed -eq '0' -and $_.checks -ne 'ERROR' -and -not $results.Contains($_.game) } | % { $results[$_.game] = [pscustomobject]@{ status = 'PASS'; seconds = 0; checks = $_.checks; note = 'from earlier run' } } }
$start = Get-Date
function Log($m) { $l = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $m; Write-Host $l; Add-Content $logFile $l }
function Save($cur, $step, $status) {
  $p = ($results.Values | ? { $_.status -eq 'PASS' }).Count; $f = ($results.Values | ? { $_.status -eq 'FAIL' }).Count; $t = ($results.Values | ? { $_.status -eq 'TIMEOUT' }).Count
  [pscustomobject]@{ total = $games.Count; completed = $results.Count; passed = $p; failed = $f; timeout = $t; current = $cur; step = $step; status = $status; updated = (Get-Date).ToString('o'); elapsedSec = [int]((Get-Date) - $start).TotalSeconds; games = $results } | ConvertTo-Json -Depth 5 | Set-Content $progressFile
}
$host.UI.RawUI.WindowTitle = "MaxHigh Buy Bonus QA ($Viewport)"
Log "MaxHigh Buy Bonus QA - $Viewport - total games: $($games.Count) - already done: $($results.Count) - per-game timeout ${TimeoutSec}s"
$durations = New-Object System.Collections.Generic.List[double]
for ($i = 0; $i -lt $games.Count; $i++) {
  $g = $games[$i]; $idx = "{0:00}/{1}" -f ($i + 1), $games.Count
  if ($results.Contains($g) -and $results[$g].status -eq 'PASS') { Log "[$idx] ${g}: PASS (kept from earlier run)"; continue }
  node scripts/qa/clone-topup.mjs 100000
  $env:GAME = $g; $env:BUY_BET = '5'
  if ($Viewport -eq 'mobile') { $env:VW = '390'; $env:VH = '844' } else { Remove-Item Env:VW, Env:VH -ErrorAction SilentlyContinue }
  $dir = "$Evidence\$Viewport-$g"; $con = "$dir-console.txt"; $err = "$dir-stderr.txt"
  Remove-Item $con, $err -ErrorAction SilentlyContinue
  $t0 = Get-Date; $lastAct = $t0; $lastBeat = $t0; $seen = 0; $step = 'starting'; $warned = $false
  Save $g $step 'RUNNING'
  Log "[$idx] ${g}: RUNNING"
  $p = Start-Process -FilePath node -ArgumentList @('scripts/qa/browser-buy-bonus.mjs', $dir) -RedirectStandardOutput $con -RedirectStandardError $err -NoNewWindow -PassThru
  $timedOut = $false
  while (-not $p.HasExited) {
    Start-Sleep -Milliseconds 1000
    $lines = if (Test-Path $con) { @(Get-Content $con -Encoding UTF8) } else { @() }
    if ($lines.Count -gt $seen) {
      $lines[$seen..($lines.Count - 1)] | % { $step = ($_ -replace '^\s*(PASS|FAIL)\s+\[[^\]]+\]\s*', '$1 ' ); Log "  step: $step" }
      $seen = $lines.Count; $lastAct = Get-Date; $warned = $false
    }
    $now = Get-Date
    if (($now - $lastBeat).TotalSeconds -ge 5) {
      $lastBeat = $now
      $eta = if ($durations.Count) { $rem = ($games.Count - $results.Count - 1); "{0:N0}m" -f ((($durations | Measure-Object -Average).Average * [math]::Max($rem, 0)) / 60) } else { 'n/a' }
      $pp = ($results.Values | ? { $_.status -eq 'PASS' }).Count; $ff = ($results.Values | ? { $_.status -ne 'PASS' }).Count
      Write-Host ("  ♥ {0:HH:mm:ss} | {1} | game {2}s | idle {3}s | done {4}/{5} pass {6} fail {7} | elapsed {8:N0}m | ETA {9} | step: {10}" -f $now, $g, [int]($now - $t0).TotalSeconds, [int]($now - $lastAct).TotalSeconds, $results.Count, $games.Count, $pp, $ff, ($now - $start).TotalMinutes, $eta, $step)
      Save $g $step 'RUNNING'
    }
    if (-not $warned -and ($now - $lastAct).TotalSeconds -ge $StuckSec) {
      $warned = $true
      Log "WARNING: POSSIBLE STUCK TEST | game: $g | step: $step | last activity: $($lastAct.ToString('HH:mm:ss')) | idle: $([int]($now - $lastAct).TotalSeconds)s"
    }
    if (($now - $t0).TotalSeconds -ge $TimeoutSec) { $timedOut = $true; break }
  }
  $secs = [int]((Get-Date) - $t0).TotalSeconds
  if ($timedOut) {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ? { $_.CommandLine -match 'ms-playwright' } | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    $results[$g] = [pscustomobject]@{ status = 'TIMEOUT'; seconds = $secs; checks = ''; note = "step: $step (see $con, $err and the screenshots in $dir)" }
    Log "[$idx] ${g}: TIMEOUT after ${secs}s at step: $step (console + stderr + screenshots in $dir)"
  } else {
    $txt = (Get-Content $con -Raw -Encoding UTF8) + (Get-Content $err -Raw -ErrorAction SilentlyContinue)
    $m = [regex]::Match($txt, '(\d+) checks, (\d+) failed')
    if ($m.Success -and $m.Groups[2].Value -eq '0') { $st = 'PASS' } else { $st = 'FAIL' }
    $results[$g] = [pscustomobject]@{ status = $st; seconds = $secs; checks = $m.Groups[1].Value; note = $(if ($st -eq 'FAIL') { (($txt -split "`n" | ? { $_ -match '^FAIL|Error|Timeout' } | Select -First 3) -join ' | ') } else { '' }) }
    $durations.Add($secs)
    Log "[$idx] ${g}: $st (${secs}s)"
    if ($st -eq 'FAIL') { ($txt -split "`n" | ? { $_ -match '^FAIL|Error|Timeout' } | Select -First 4) | % { Log "    $_" } }
  }
  Save $g $step 'RUNNING'
}
Remove-Item Env:VW, Env:VH -ErrorAction SilentlyContinue
$vals = @($results.Values)
$pass = ($vals | ? { $_.status -eq 'PASS' }).Count; $fail = ($vals | ? { $_.status -eq 'FAIL' }).Count; $to = ($vals | ? { $_.status -eq 'TIMEOUT' }).Count
$skipped = $games.Count - $vals.Count
$dur = (Get-Date) - $start
$final = if ($pass -eq $games.Count) { 'COMPLETE' } else { 'INCOMPLETE' }
Save '' 'finished' $final
Log "TOTAL: $($games.Count)"; Log "PASSED: $pass"; Log "FAILED: $fail"; Log "TIMEOUT: $to"; Log "SKIPPED: $skipped"; Log ("DURATION: {0:hh\:mm\:ss}" -f $dur); Log "STATUS: $final"
Write-Host "`nRun finished. This window stays open. Log: $logFile  Progress: $progressFile"
