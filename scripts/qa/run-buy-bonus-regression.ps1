# Runs the Buy Bonus browser sequence test for representative games of every visual family (desktop for all, phone size for a subset)
# against the LOOPBACK clone. Requires UAT_BASE/DB_URL/PW_* in the environment. Writes <evidence>\summary.csv.
param([string]$Evidence = "C:\Users\Keydi\maxhigh-evidence\buy-bonus\regression")
New-Item -ItemType Directory -Force $Evidence | Out-Null
$games = @(
  @{ id = 'wild-panther'; confirm = '^yes$'; mobile = $true },
  @{ id = 'golden-panther'; confirm = 'buy & play'; mobile = $false },
  @{ id = 'buffalo-reign'; confirm = 'buy & play'; mobile = $true },
  @{ id = 'fortune-ox'; confirm = 'buy & play'; mobile = $true },
  @{ id = 'cleopatra-gold'; confirm = 'buy & play'; mobile = $true },
  @{ id = 'zeus-strike'; confirm = 'buy & play'; mobile = $true },
  @{ id = 'jade-jaguar'; confirm = 'buy & play'; mobile = $false },
  @{ id = 'honey-hive'; confirm = 'buy & play'; mobile = $false },
  @{ id = 'maya-gold'; confirm = 'buy & play'; mobile = $false },
  @{ id = 'enchanted-grove'; confirm = 'buy & play'; mobile = $false },
  @{ id = 'abyssal-pearls'; confirm = 'buy & play'; mobile = $true },
  @{ id = 'sirens-lagoon'; confirm = 'buy & play'; mobile = $true },
  @{ id = 'tidecaller-hoard'; confirm = 'buy & play'; mobile = $false }
)
"game,viewport,checks,failed,counter" | Set-Content "$Evidence\summary.csv"
foreach ($g in $games) {
  foreach ($vp in @(@('desktop', $null, $null), @('mobile', '390', '844'))) {
    if ($vp[0] -eq 'mobile' -and -not $g.mobile) { continue }
    $env:GAME = $g.id; $env:CONFIRM = $g.confirm
    if ($vp[1]) { $env:VW = $vp[1]; $env:VH = $vp[2] } else { Remove-Item Env:VW, Env:VH -ErrorAction SilentlyContinue }
    $dir = "$Evidence\$($vp[0])-$($g.id)"
    $o = node scripts/qa/browser-buy-bonus.mjs $dir 2>&1 | Out-String
    $o | Set-Content "$dir-console.txt"
    $m = [regex]::Match($o, '(\d+) checks, (\d+) failed; counter seen: (.*)')
    $line = if ($m.Success) { "$($g.id),$($vp[0]),$($m.Groups[1].Value),$($m.Groups[2].Value),$($m.Groups[3].Value.Trim().Split(' ')[0])..$($m.Groups[3].Value.Trim().Split(' ')[-1])" } else { "$($g.id),$($vp[0]),ERROR,ERROR,$(($o -split "`n" | Select-Object -Last 3) -join ' ')" }
    Add-Content "$Evidence\summary.csv" $line
    Write-Host $line
  }
}
Remove-Item Env:VW, Env:VH -ErrorAction SilentlyContinue
Write-Host "DONE"
