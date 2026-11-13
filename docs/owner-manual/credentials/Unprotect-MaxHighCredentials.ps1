#requires -Version 7
<#
.SYNOPSIS
  Opens MAXHIGH_OWNER_CREDENTIALS.enc on the owner's own computer and shows it on screen only.
  Nothing is written to disk. Close the window when finished.
#>
param([string]$File = (Join-Path (Split-Path $PSScriptRoot -Parent) 'MAXHIGH_OWNER_CREDENTIALS.enc'))
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'MaxHighCredentials.psm1') -Force
$pass = Read-Host -AsSecureString 'Passphrase'
$plain = Unprotect-MaxHighPayload -Blob ([IO.File]::ReadAllBytes($File)) -Passphrase $pass
try { $doc = [Text.Encoding]::UTF8.GetString($plain) | ConvertFrom-Json } finally { [Array]::Clear($plain, 0, $plain.Length) }
Write-Host "`n$($doc.title)  ($($doc.created))`n$($doc.instructions)`n"
$doc.accounts | Format-Table role, username, loginUrl, @{n = 'password'; e = { if ($_.password) { $_.password } else { '(requires secure reset)' } } }, status -AutoSize -Wrap
