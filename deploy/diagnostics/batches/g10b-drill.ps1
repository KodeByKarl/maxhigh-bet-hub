<#
  MaxHigh UAT - G10b: prove the PERMANENT recovery key opens the real backup, on Windows only.

  Run by the owner (the passphrase prompt is interactive). The private key and passphrase never leave this machine.
  Inputs are all non-secret values printed by the VPS batch G8G9/G10a.

  What it does:
    1. verifies the downloaded ciphertext's SHA-256;
    2. decrypts the passphrase-protected recovery key into a pipe (passphrase prompt) and uses it to decrypt the backup
       to a temporary .gz file;
    3. decompresses it in memory, computing the SHA-256 and byte count of the plaintext SQL (no plaintext SQL file is written);
    4. compares with the fingerprint the VPS recorded when it made the backup;
    5. deletes the temporary file and prints the exact value to hand to the G11 batch.
#>
param(
  [Parameter(Mandatory)] [string]$Ciphertext,
  [Parameter(Mandatory)] [ValidatePattern('^[0-9a-f]{64}$')] [string]$ExpectedCiphertextSha256,
  [Parameter(Mandatory)] [ValidatePattern('^[0-9a-f]{64}$')] [string]$ExpectedPlaintextSha256,
  [string]$KeyFile = "$env:USERPROFILE\maxhigh-keys\maxhigh-uat-recovery.key.age",
  [string]$EvidenceDir = "$env:USERPROFILE\maxhigh-evidence",
  [string]$TestWrapperIdentity   # TEST ONLY: decrypt the key file with this identity instead of a passphrase prompt
)
$ErrorActionPreference = 'Stop'
function Fail($m) { Write-Host "FAIL  $m" -ForegroundColor Red; exit 1 }
function Pass($m) { Write-Host "PASS  $m" -ForegroundColor Green }

foreach ($t in 'age') { if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Fail "$t not found on PATH" } }
if (-not (Test-Path -LiteralPath $Ciphertext)) { Fail "ciphertext not found: $Ciphertext" }
if (-not (Test-Path -LiteralPath $KeyFile)) { Fail "encrypted recovery key not found: $KeyFile" }
$project = 'D:\Porjects\maxhigh-bet-hub'
if ((Resolve-Path $KeyFile).Path.StartsWith($project, [StringComparison]::OrdinalIgnoreCase)) { Fail 'recovery key file must be outside the project' }

# 1. ciphertext integrity
$ctSha = (Get-FileHash -LiteralPath $Ciphertext -Algorithm SHA256).Hash.ToLower()
if ($ctSha -ne $ExpectedCiphertextSha256) { Fail "ciphertext SHA-256 $ctSha does not match the VPS value $ExpectedCiphertextSha256" }
Pass 'ciphertext SHA-256 matches the VPS record'

# 2. decrypt with the permanent key (passphrase prompt happens here, in this console)
$tmp = Join-Path $env:TEMP ("maxhigh-drill-" + [guid]::NewGuid().ToString('N') + '.sql.gz')
try {
  if ($TestWrapperIdentity) {
    cmd /c "age -d -i ""$TestWrapperIdentity"" ""$KeyFile"" | age -d -i - ""$Ciphertext"" > ""$tmp"""
  } else {
    Write-Host "Enter the recovery-key passphrase when prompted (it is typed only into this console)." -ForegroundColor Yellow
    cmd /c "age -d ""$KeyFile"" | age -d -i - ""$Ciphertext"" > ""$tmp"""
  }
  if ($LASTEXITCODE -ne 0) { Fail "decryption failed (wrong passphrase, wrong key, or damaged ciphertext)" }
  if (-not (Test-Path -LiteralPath $tmp) -or (Get-Item -LiteralPath $tmp).Length -eq 0) { Fail 'decryption produced no data' }
  Pass 'the PERMANENT recovery key decrypted the real backup'

  # 3. decompress in memory, hash and count
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $fs = [System.IO.File]::OpenRead($tmp)
  try {
    $gz = New-Object System.IO.Compression.GZipStream($fs, [System.IO.Compression.CompressionMode]::Decompress)
    $buf = New-Object byte[] 1048576; $bytes = 0L
    while (($n = $gz.Read($buf, 0, $buf.Length)) -gt 0) { [void]$sha.TransformBlock($buf, 0, $n, $null, 0); $bytes += $n }
    [void]$sha.TransformFinalBlock($buf, 0, 0)
  } finally { if ($gz) { $gz.Dispose() }; $fs.Dispose() }
  $ptSha = -join ($sha.Hash | ForEach-Object { $_.ToString('x2') })
  Write-Host "plaintext sha256 : $ptSha"; Write-Host "plaintext bytes  : $bytes"

  # 4. compare with the fingerprint recorded on the VPS at backup time
  if ($ptSha -ne $ExpectedPlaintextSha256) { Fail "plaintext fingerprint differs from the VPS record ($ExpectedPlaintextSha256) - do NOT proceed to G11" }
  Pass 'plaintext SQL fingerprint is identical to the one recorded when the backup was made'
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
}
if (Test-Path -LiteralPath $tmp) { Fail 'temporary file was not removed' } else { Pass 'temporary decrypted file removed' }

# 5. evidence + the value for G11
New-Item -ItemType Directory -Force $EvidenceDir | Out-Null
$ev = Join-Path $EvidenceDir ("g10b-drill-" + (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ') + '.txt')
@("G10b permanent-key drill PASS", "utc=$((Get-Date).ToUniversalTime().ToString('o'))", "ciphertext_sha256=$ctSha", "plaintext_sha256=$ptSha", "plaintext_bytes=$bytes",
  "key_file=$KeyFile (encrypted; private key and passphrase never left this machine)") | Set-Content -Encoding utf8 $ev
Write-Host ""
Write-Host "G10b PASS. Evidence: $ev" -ForegroundColor Green
Write-Host "Give this to the VPS batch G11 (it is a hash, not a secret):"
Write-Host "  --g10-plaintext-sha256 $ptSha"
