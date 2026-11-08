param(
  [Parameter(Mandatory)][ValidatePattern('^[0-9]+$')][string]$RunId,
  [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{40}$')][string]$ExpectedSourceSha,
  [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{64}$')][string]$ExpectedArchiveSha256,
  [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{64}$')][string]$ExpectedManifestSha256,
  [Parameter(Mandatory)][string]$Destination
)
$ErrorActionPreference = 'Stop'
$repository = 'KodeByKarl/maxhigh-bet-hub'
$repoText = & gh.exe api "repos/$repository"
if ($LASTEXITCODE -ne 0) { throw 'Authenticated repository verification failed.' }
$repo = ($repoText | Out-String) | ConvertFrom-Json
if (!$repo.private) { throw 'Repository must be private before downloading a qualification artifact.' }
$runText = & gh.exe api "repos/$repository/actions/runs/$RunId"
if ($LASTEXITCODE -ne 0) { throw 'Cannot verify workflow run.' }
$run = ($runText | Out-String) | ConvertFrom-Json
if ($run.status -ne 'completed' -or $run.conclusion -ne 'success' -or $run.head_sha -ne $ExpectedSourceSha -or
    $run.path -ne '.github/workflows/validate.yml' -or $run.event -ne 'push' -or
    $run.head_branch -notmatch '^ci/staging-artifact-[A-Za-z0-9_-]+$') {
  throw 'Require a successful build-only push run for the approved immutable source SHA.'
}
$name = "linux-node24-$ExpectedSourceSha-$($run.run_attempt)"
$artifactText = & gh.exe api "repos/$repository/actions/runs/$RunId/artifacts?per_page=100"
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect run artifacts.' }
$artifacts = (($artifactText | Out-String) | ConvertFrom-Json).artifacts
$matchingArtifacts = @($artifacts | Where-Object { $_.name -eq $name -and !$_.expired })
if ($matchingArtifacts.Count -ne 1) { throw 'Expected one unexpired immutable artifact from this exact run.' }
if (Test-Path -LiteralPath $Destination) { throw 'Choose a new download directory; existing files are never overwritten.' }
& gh.exe run download $RunId --repo $repository --name $name --dir $Destination
if ($LASTEXITCODE -ne 0) { throw 'Artifact download failed.' }
$metadata = Get-Content -LiteralPath (Join-Path $Destination 'metadata.json') -Raw | ConvertFrom-Json
$archive = Join-Path $Destination 'release.tgz'
$actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($metadata.sha -ne $ExpectedSourceSha -or $metadata.platform -ne 'linux' -or $metadata.arch -ne 'x64' -or
    $metadata.nodeVersion -ne '24.22.2' -or $metadata.archiveSha256 -ne $ExpectedArchiveSha256 -or
    $metadata.manifestSha256 -ne $ExpectedManifestSha256 -or $actual -ne $ExpectedArchiveSha256) {
  throw 'Downloaded metadata/archive differs from approved builder outputs.'
}
$manifestText = & tar.exe -xOf $archive './release-validation.json'
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect the authenticated archive.' }
$manifest = ($manifestText | Out-String) | ConvertFrom-Json
if ($manifest.sha -ne $ExpectedSourceSha -or $manifest.platform -ne 'linux' -or
    $manifest.games -ne 100 -or $manifest.publicAssets -ne 3987 -or
    (Get-FileHash -LiteralPath (Join-Path $Destination 'safe-extract.py') -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.extractionToolSha256) {
  throw 'Artifact inventory or extractor verification failed.'
}
Write-Output "Verified Linux artifact for $ExpectedSourceSha; SHA-256 $actual"
Write-Output 'STOP before transfer. No SSH connection, upload, extraction or server change occurred.'
