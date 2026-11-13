# MaxHigh credential handover: AES-256-GCM encryption with a PBKDF2-SHA256 key (600,000 iterations).
# No password or passphrase is ever written to disk unencrypted, logged, or printed.
# Requires PowerShell 7+ (.NET AesGcm).

$script:Magic = [Text.Encoding]::ASCII.GetBytes('MHCRED1')
$script:Iterations = 600000

function ConvertFrom-SecureToBytes([Security.SecureString]$Secure) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($Secure)
    try { [Text.Encoding]::UTF8.GetBytes([Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($ptr) }
}

function Get-Key([Security.SecureString]$Passphrase, [byte[]]$Salt) {
    $pw = ConvertFrom-SecureToBytes $Passphrase
    try { [Security.Cryptography.Rfc2898DeriveBytes]::Pbkdf2($pw, $Salt, $script:Iterations, [Security.Cryptography.HashAlgorithmName]::SHA256, 32) }
    finally { [Array]::Clear($pw, 0, $pw.Length) }
}

function Protect-MaxHighPayload {
    param([Parameter(Mandatory)][byte[]]$Plain, [Parameter(Mandatory)][Security.SecureString]$Passphrase)
    if ($Passphrase.Length -lt 14) { throw 'Passphrase must be at least 14 characters.' }
    $salt = [Security.Cryptography.RandomNumberGenerator]::GetBytes(16)
    $nonce = [Security.Cryptography.RandomNumberGenerator]::GetBytes(12)
    $key = Get-Key $Passphrase $salt
    $cipher = [byte[]]::new($Plain.Length); $tag = [byte[]]::new(16)
    $gcm = [Security.Cryptography.AesGcm]::new($key, 16)
    try { $gcm.Encrypt($nonce, $Plain, $cipher, $tag, $script:Magic) } finally { $gcm.Dispose(); [Array]::Clear($key, 0, 32) }
    , ([byte[]]($script:Magic + $salt + $nonce + $tag + $cipher))
}

function Unprotect-MaxHighPayload {
    param([Parameter(Mandatory)][byte[]]$Blob, [Parameter(Mandatory)][Security.SecureString]$Passphrase)
    $m = $script:Magic.Length
    if ($Blob.Length -lt $m + 44 -or -not [Linq.Enumerable]::SequenceEqual([byte[]]$Blob[0..($m - 1)], $script:Magic)) { throw 'Not a MaxHigh credential file.' }
    $salt = [byte[]]$Blob[$m..($m + 15)]; $nonce = [byte[]]$Blob[($m + 16)..($m + 27)]; $tag = [byte[]]$Blob[($m + 28)..($m + 43)]
    $cipher = if ($Blob.Length -gt $m + 44) { [byte[]]$Blob[($m + 44)..($Blob.Length - 1)] } else { [byte[]]::new(0) }
    $key = Get-Key $Passphrase $salt
    $plain = [byte[]]::new($cipher.Length)
    $gcm = [Security.Cryptography.AesGcm]::new($key, 16)
    try { $gcm.Decrypt($nonce, $cipher, $tag, $plain, $script:Magic) }
    catch { throw 'Wrong passphrase or the file was changed.' }
    finally { $gcm.Dispose(); [Array]::Clear($key, 0, 32) }
    , $plain
}

Export-ModuleMember -Function Protect-MaxHighPayload, Unprotect-MaxHighPayload, ConvertFrom-SecureToBytes
