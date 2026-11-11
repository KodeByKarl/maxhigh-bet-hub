param(
  [Parameter(Mandatory)][string]$ArtifactDirectory,
  [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{64}$')][string]$ExpectedArchiveSha256,
  [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{64}$')][string]$ExpectedManifestSha256,
  [string]$SshKey = (Join-Path $env:USERPROFILE '.ssh\maxhigh_vps2')
)
$ErrorActionPreference = 'Stop'
$artifactRoot = (Resolve-Path -LiteralPath $ArtifactDirectory).Path
$knownHosts = Join-Path $env:USERPROFILE '.ssh\known_hosts'
if (!(Test-Path -LiteralPath $SshKey -PathType Leaf) -or !(Test-Path -LiteralPath $knownHosts -PathType Leaf)) {
  throw 'Existing SSH key and independently verified known_hosts entry are required.'
}
& ssh-keygen.exe -F '151.242.136.34' -f $knownHosts | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Verify the server host key through its console before transfer; no TOFU bypass.' }
$metadata = Get-Content -LiteralPath (Join-Path $artifactRoot 'metadata.json') -Raw | ConvertFrom-Json
if ($metadata.platform -ne 'linux' -or $metadata.arch -ne 'x64' -or $metadata.nodeVersion -ne '24.22.2' -or
    $metadata.manifestSha256 -ne $ExpectedManifestSha256 -or $metadata.sha -notmatch '^[a-f0-9]{40}$') {
  throw 'Approved Linux build metadata is required; Windows builds cannot be transferred.'
}
$archive = Join-Path $artifactRoot 'release.tgz'
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ExpectedArchiveSha256 -or
    $metadata.archiveSha256 -ne $ExpectedArchiveSha256) { throw 'Archive checksum mismatch.' }
# Authenticate the standalone extraction helper against the already pinned archive.
$archiveManifestText = & tar.exe -xOf $archive './release-validation.json'
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect the pinned archive manifest.' }
$archiveManifest = ($archiveManifestText | Out-String) | ConvertFrom-Json
if ($archiveManifest.sha -ne $metadata.sha -or $archiveManifest.platform -ne 'linux' -or
    $archiveManifest.nodeVersion -ne '24.22.2' -or $archiveManifest.games -ne 100 -or $archiveManifest.publicAssets -ne 3987 -or
    $archiveManifest.extractionToolSha256 -notmatch '^[a-f0-9]{64}$' -or
    (Get-FileHash -LiteralPath (Join-Path $artifactRoot 'safe-extract.py') -Algorithm SHA256).Hash.ToLowerInvariant() -ne $archiveManifest.extractionToolSha256) {
  throw 'Standalone extraction helper differs from the authenticated artifact.'
}
$files = @('release.tgz','metadata.json','SHA256SUMS','safe-extract.py') | ForEach-Object { Join-Path $artifactRoot $_ }
foreach ($file in $files) { if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing transfer file: $file" } }
if ((Read-Host 'Type TRANSFER FILES ONLY to copy to maxhigh@151.242.136.34:~/maxhigh-staging-inbox') -cne 'TRANSFER FILES ONLY') {
  throw 'Transfer not confirmed.'
}
# The inbox must already exist following the separately approved preparation step.
# This script never extracts, installs, starts an application or changes server config.
& scp.exe -F NUL -P 22 -i $SshKey -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes `
  -o "UserKnownHostsFile=$knownHosts" -o GlobalKnownHostsFile=NUL -- @files 'maxhigh@151.242.136.34:maxhigh-staging-inbox/'
if ($LASTEXITCODE -ne 0) { throw 'SCP failed; no successful transfer is claimed.' }
Write-Output 'SCP returned success. STOP: confirm the Ubuntu checksum before extraction or startup.'
