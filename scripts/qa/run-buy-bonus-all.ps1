# Drives the complete Buy Bonus flow in a real browser for EVERY buy-enabled game (list from list-buy-games.mjs). LOOPBACK clone only.
# Requires clone-env.ps1 to have been dot-sourced. Writes <Evidence>\all-summary.csv (game,viewport,checks,failed,counter).
param([string]$Evidence = "C:\Users\Keydi\maxhigh-evidence\buy-bonus\all", [string]$Viewport = "desktop")
New-Item -ItemType Directory -Force $Evidence | Out-Null
$games = Get-Content "C:\Users\Keydi\maxhigh-evidence\buy-bonus\buy-games.txt"
$sumFile = "$Evidence\all-summary-$Viewport.csv"
"game,viewport,checks,failed,counter" | Set-Content $sumFile
foreach ($g in $games) {
  node scripts/qa/clone-topup.mjs 100000
  $env:GAME = $g; $env:BUY_BET = '5'
  if ($Viewport -eq 'mobile') { $env:VW = '390'; $env:VH = '844' } else { Remove-Item Env:VW, Env:VH -ErrorAction SilentlyContinue }
  $dir = "$Evidence\$Viewport-$g"
  $o = node scripts/qa/browser-buy-bonus.mjs $dir 2>&1 | Out-String
  $o | Set-Content "$dir-console.txt"
  $m = [regex]::Match($o, '(\d+) checks, (\d+) failed; counter seen: (.*)')
  $line = if ($m.Success) { "$g,$Viewport,$($m.Groups[1].Value),$($m.Groups[2].Value),$($m.Groups[3].Value.Trim().Split(' ')[0])..$($m.Groups[3].Value.Trim().Split(' ')[-1])" } else { "$g,$Viewport,ERROR,ERROR,$((($o -split "`n") | Select-Object -Last 2) -join ' ' -replace ',',';')" }
  Add-Content $sumFile $line
  Write-Host $line
}
Write-Host "DONE $Viewport"
