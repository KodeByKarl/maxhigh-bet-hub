#requires -Version 7
<#
.SYNOPSIS
  Creates MAXHIGH_OWNER_CREDENTIALS.enc for the owner. Run it yourself, interactively.
.DESCRIPTION
  Reads the account list from accounts.template.json. For each account you type the password
  (input is hidden), or press Enter on an empty password to mark it "requires secure reset".
  You then choose a passphrase (14+ characters). Give that passphrase to the owner separately,
  in person or by phone. Nothing secret is printed, logged or written unencrypted.
#>
param(
    [string]$Accounts = (Join-Path $PSScriptRoot 'accounts.template.json'),
    [string]$OutFile = (Join-Path (Split-Path $PSScriptRoot -Parent) 'MAXHIGH_OWNER_CREDENTIALS.enc')
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'MaxHighCredentials.psm1') -Force
if (Test-Path $OutFile) { throw "$OutFile already exists. Move or delete it first; it will not be overwritten." }

$list = Get-Content $Accounts -Raw | ConvertFrom-Json
$entries = foreach ($a in $list.accounts) {
    if (-not $a.username) { Write-Host "Skipping '$($a.role)': no username in the account list."; continue }
    $sec = Read-Host -AsSecureString "Password for $($a.username) ($($a.role)); leave empty if unknown"
    $pw = [Text.Encoding]::UTF8.GetString((ConvertFrom-SecureToBytes $sec))
    [ordered]@{
        role = $a.role; username = $a.username; loginUrl = $list.loginPages.($a.loginPage)
        password = if ($pw) { $pw } else { $null }
        status = if ($pw) { 'supplied by administrator' } else { 'requires secure reset' }
    }
    $pw = $null
}
$p1 = Read-Host -AsSecureString 'Choose the file passphrase (14+ characters)'
$p2 = Read-Host -AsSecureString 'Repeat the passphrase'
$b1 = ConvertFrom-SecureToBytes $p1; $b2 = ConvertFrom-SecureToBytes $p2
$same = [Linq.Enumerable]::SequenceEqual([byte[]]$b1, [byte[]]$b2); [Array]::Clear($b1, 0, $b1.Length); [Array]::Clear($b2, 0, $b2.Length)
if (-not $same) { throw 'Passphrases do not match. Nothing was written.' }

$doc = [ordered]@{ title = 'MAXHIGH OWNER CREDENTIALS'; created = (Get-Date).ToString('u'); site = 'https://maxhigh.online'
    instructions = 'Change every password after first sign-in. Accounts marked "requires secure reset" must be reset in the admin panel.'
    accounts = @($entries) }
$plain = [Text.Encoding]::UTF8.GetBytes(($doc | ConvertTo-Json -Depth 5))
try { [IO.File]::WriteAllBytes($OutFile, (Protect-MaxHighPayload -Plain $plain -Passphrase $p1)) }
finally { [Array]::Clear($plain, 0, $plain.Length) }
Write-Host "Encrypted credential file written: $OutFile"
Write-Host 'Give the passphrase to the owner through a different channel (in person or by phone).'
