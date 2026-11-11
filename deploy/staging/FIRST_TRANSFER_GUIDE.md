# First manual Ubuntu staging transfer — confirmation gates

**Detailed next-stage plan:** [VERIFIED_ARTIFACT_EXECUTION_PLAN.md](VERIFIED_ARTIFACT_EXECUTION_PLAN.md) pins the approved artifact and adds measured shared-host admission, root-owned releases, cgroup controls, staging migrations and backup/restore/rollback gates. Its stricter resource/ownership requirements take precedence over older examples below. It is a plan only; no host work is authorized or performed.

**Current gate (2026-11-09):** Linux artifact successfully built and independently verified for approved commit `2294d79afb2b900f13a9cd05c427dc9857b89de1`. [Use the exact successful run, archive hashes, evidence and fresh-download command here](../../audit/first-transfer/UBUNTU_ARTIFACT_VERIFIED.md). Earlier source-publication/build-pending statements below are historical. **Stop before any host access, transfer or deployment; none has been authorized or performed in this artifact-build task.** The separate preflight/transfer/extraction gates below still apply after explicit approval.

Prepared 2026-11-08 (Asia/Shanghai). Target: **maxhigh@151.242.136.34**, SSH port **22**, staging path **/var/www/maxhigh/staging**. This user-specified manual preview path supersedes the older `/var/www/maxhigh-staging` CI qualification path **for this transfer only**. Do not run the older automatic activation/receiver procedure against this nested path. No SSH connection, upload, extraction, remote configuration, database change or startup has occurred.

**Current stop: source publication approval.** GitHub Actions on Ubuntu24.04 is the selected builder and GitHub CLI authentication is verified. The owner will make the repository private; privacy must be reverified before any approved push. A real Linux archive and SHA-256 do **not** exist until the reviewed source is published and the Linux job passes. Do not rename/package Windows `.output` as a Linux artifact or infer Linux compatibility from local tests. The local audit evidence is intentionally excluded from the source publication candidate.

## Gate 0 — confirm read-only host preflight

The existing key is in the standard Windows `.ssh` folder. PowerShell syntax is `$env:USERPROFILE`, not `$env.ssh`. The transfer script defaults to `$env:USERPROFILE\.ssh\maxhigh_vps2`; it never reads/copies the private key into an archive. Override `-SshKey` if a different actual path was intended.

Run these **only after confirming the read-only SSH preflight stage**. Verify the server host-key fingerprint through its console/provider first. An unverified `ssh-keyscan` result is not authentication; do not disable host-key checking or accept a changed host key automatically.

```powershell
Set-Location 'D:\Porjects\maxhigh-bet-hub'
$SshKey = Join-Path $env:USERPROFILE '.ssh\maxhigh_vps2'
$KnownHosts = Join-Path $env:USERPROFILE '.ssh\known_hosts'
if (!(Test-Path -LiteralPath $SshKey -PathType Leaf)) { throw 'SSH key not found' }
ssh-keygen.exe -F 151.242.136.34 -f $KnownHosts
if ($LASTEXITCODE -ne 0) { throw 'Independently verify and install the host key first' }
$Preflight = @'
set -eu
id -un
cat /etc/os-release
uname -m
node --version
command -v node
command -v pm2
mariadb --version
free -h
df -h /var/www/maxhigh
ss -lnt
if test -e /var/www/maxhigh/staging; then printf 'STAGING_PATH_ALREADY_EXISTS\n'; else printf 'STAGING_PATH_ABSENT\n'; fi
'@
$Preflight = $Preflight -replace "`r`n", "`n"
ssh.exe -F NUL -T -p 22 -i $SshKey -o BatchMode=yes -o IdentitiesOnly=yes `
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" -o GlobalKnownHostsFile=NUL `
  maxhigh@151.242.136.34 $Preflight
if ($LASTEXITCODE -ne 0) { throw 'Read-only preflight failed; stop' }
```

**STOP and confirm the inventory.** Require Ubuntu 24.04/x86_64, matching Node **24.22.2**, MariaDB 10.11, sufficient headroom, unused loopback 18080 and a reviewed staging path. A different Node patch/architecture requires a reviewed matching rebuild or separately approved runtime change, not an automatic production upgrade. Do not print production `.env.database` or raw PM2 environments. The preflight deliberately does not invoke PM2, which could start a daemon in a production home.

The nested staging directory must not be served by any existing Caddy `file_server` root or production static-file handler. An operator must inspect that locally without publishing credentials. If this cannot be established with filesystem isolation, **stop**; do not modify Caddy to make this transfer work. Production and staging on the same VPS still share CPU/RAM/kernel; no load/fault/financial tests are authorized there.

## Gate 1 — confirm the Linux build stage

Review the current working-tree changes and choose an Ubuntu 24.04 x64 builder. The prepared `.github/workflows/validate.yml` uses pinned Node24, a fresh frozen Linux dependency install, unit/QA, lint/typecheck/build, MariaDB10.11 migration/HTTP fixtures, Chromium, exact game/public inventory, secret/native-file checks and a portable cold start outside the source checkout. Its build job has no VPS credential. GitHub authentication is now verified. Publishing the reviewed source still requires your explicit approval; no push or Linux workflow execution has occurred. Do not push the entire dirty workspace blindly or commit secrets just to satisfy the clean-source gate.

The approved publication plan uses a dedicated `ci/staging-artifact-*` review branch. Its push event runs the existing validation builder only, with a private-repository guard; it does not change `main` or invoke the deployment workflow. The separate staging workflow now defaults `build_only=true`. A manual `workflow_dispatch` requires the workflow to be on the default branch, so a first review-branch push is used instead of pretending an unpublished workflow can already be dispatched.

After a reviewed commit is on the chosen trusted builder, run `npm ci --include=dev`, provision the workflow's **disposable** loopback19307 MariaDB10.11/browser tooling and execute `node deploy/ci/build-artifact.mjs` as defined in the workflow. Do not build on the four-GB production VPS. Any failed check prevents export. The artifact is tied to the full committed revision and payload/migration hashes; repeated builds are not claimed byte-reproducible.

The completed Linux CI artifact supplies:

- `release.tgz`: `.output`, `drizzle`, `release-validation.json` only, including all 100 game mappings and 3,987 original public files;
- `metadata.json`: exact revision, Linux/x64/Node version, archive and manifest SHA-256;
- `SHA256SUMS`: archive, metadata and standalone extractor hashes;
- `safe-extract.py`: bounded manual extractor, authenticated against the pinned archive manifest;
- `artifact-contents.txt` and `public-assets.json`: reviewable member list and per-file public inventory.

The manifest pins the standalone extractor hash; the archive also contains the same extractor. No `.git`, `.env`, SSH key, credential file, development cache or root dependency tree is exported. **Linux runtime dependencies traced inside `.output/server/node_modules` are intentional**; Windows modules/PE binaries are rejected. A cold start outside the checkout is required to prove no root `node_modules` is needed. No `npm install`/`npm ci` is required on the VPS for this artifact. If a runtime dependency is missing, stop and rebuild; do not copy Windows modules or install floating dependencies to patch the artifact.

Download the approved Linux CI artifact and expand its outer GitHub ZIP into `D:\Porjects\maxhigh-bet-hub\audit\first-transfer\runtime\downloaded`. This is not the deployment archive extraction. Review the member list and get the archive/manifest SHA-256 values from the approved builder outputs through a trusted channel. **STOP and confirm the exact revision, inventory and hashes before transfer.** No actual hash value is supplied here because no Linux archive has been built.

Alternatively, after the approved branch build succeeds, use the authenticated CLI helper below. It requires the actual run ID and hashes from the successful builder; it verifies privacy, exact source SHA, workflow/event, artifact name/attempt, checksum and inventory. It performs no SSH action:

```powershell
Set-Location 'D:\Porjects\maxhigh-bet-hub'
$RunId = Read-Host 'Successful approved build run ID'
$SourceSha = Read-Host 'Approved 40-character source commit SHA'
$ArchiveHash = Read-Host 'Approved builder archive SHA-256'
$ManifestHash = Read-Host 'Approved builder manifest SHA-256'
& .\deploy\staging\DOWNLOAD_ARTIFACT.ps1 -RunId $RunId -ExpectedSourceSha $SourceSha `
  -ExpectedArchiveSha256 $ArchiveHash -ExpectedManifestSha256 $ManifestHash `
  -Destination 'D:\Porjects\maxhigh-bet-hub\audit\first-transfer\runtime\downloaded'
```

## Gate 2 — confirm inbox creation and file transfer

After explicit approval, create only a private inbox in the existing SSH user's home:

```powershell
# Reuse $SshKey / $KnownHosts from Gate 0.
if ((Read-Host 'Type PREPARE INBOX to create ~/maxhigh-staging-inbox only') -cne 'PREPARE INBOX') { throw 'Not confirmed' }
ssh.exe -F NUL -T -p 22 -i $SshKey -o BatchMode=yes -o IdentitiesOnly=yes `
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" -o GlobalKnownHostsFile=NUL `
  maxhigh@151.242.136.34 'umask 077; test ! -e "$HOME/maxhigh-staging-inbox"; mkdir -m 700 "$HOME/maxhigh-staging-inbox"'
if ($LASTEXITCODE -ne 0) { throw 'Inbox exists or preparation failed; inspect it, do not overwrite' }
$ArchiveHash = Read-Host 'Paste approved Linux builder archive SHA-256 (64 lowercase hex)'
$ManifestHash = Read-Host 'Paste approved Linux builder manifest SHA-256 (64 lowercase hex)'
& .\deploy\staging\TRANSFER_ONLY.ps1 `
  -ArtifactDirectory 'D:\Porjects\maxhigh-bet-hub\audit\first-transfer\runtime\downloaded' `
  -ExpectedArchiveSha256 $ArchiveHash -ExpectedManifestSha256 $ManifestHash -SshKey $SshKey
```

The script verifies Linux metadata/archive hash and authenticates the external extractor against the pinned archive before prompting `TRANSFER FILES ONLY`. It copies four files using SCP and the existing key, with strict host verification. It does not extract, migrate, install, start PM2 or touch Caddy. **STOP after SCP; confirm its result and the server checksum separately.** A local success message is not remote application validation.

## Gate 3 — confirm Ubuntu checksum verification

Open an operator SSH session using the same key/host verification. The following commands inspect only the private inbox. Paste the **approved builder** hashes, not values calculated from the uploaded files themselves:

```bash
set -euo pipefail
umask 077
cd "$HOME/maxhigh-staging-inbox"
read -r -p 'Approved archive SHA-256: ' ARCHIVE_SHA256
read -r -p 'Approved manifest SHA-256: ' MANIFEST_SHA256
[[ "$ARCHIVE_SHA256" =~ ^[a-f0-9]{64}$ && "$MANIFEST_SHA256" =~ ^[a-f0-9]{64}$ ]]
export ARCHIVE_SHA256 MANIFEST_SHA256
printf '%s  release.tgz\n' "$ARCHIVE_SHA256" | sha256sum --check --strict
sha256sum --check --strict SHA256SUMS
# Authenticate the extractor before executing it. No archive member is executed.
python3 - <<'PY'
import hashlib, json, os, pathlib, tarfile
archive = pathlib.Path('release.tgz')
with archive.open('rb') as incoming:
    assert hashlib.file_digest(incoming, 'sha256').hexdigest() == os.environ['ARCHIVE_SHA256']
with tarfile.open(archive, 'r:gz') as source:
    member = source.getmember('./release-validation.json')
    assert member.isfile() and member.size < 65536
    raw = source.extractfile(member).read()
assert hashlib.sha256(raw).hexdigest() == os.environ['MANIFEST_SHA256']
manifest = json.loads(raw)
assert manifest['platform'] == 'linux' and manifest['arch'] == 'x64'
assert manifest['games'] == 100 and manifest['publicAssets'] == 3987
assert hashlib.sha256(pathlib.Path('safe-extract.py').read_bytes()).hexdigest() == manifest['extractionToolSha256']
print('Verified archive, manifest and extractor; no extraction/startup performed')
PY
```

**STOP and confirm checksums match.** Do not run a mismatched extractor, fall back to an unverified tar command, or change the expected hash to match a damaged upload.

## Gate 4 — confirm staging-only provisioning and extraction

Use the SSH identity `maxhigh` only as the operator. Prefer a **separate runtime identity** `maxhigh-stage-preview`; do not give application code the operator's SSH key or production DB access. A local administrator must approve/provision it if absent, with no sudo, no production groups and no read access to `/var/www/maxhigh/.env.database`. These are new staging resources only; if the path/user already exists, stop for inspection rather than changing its owner or overwriting it.

```bash
# Administrator, only after Gate 4 approval. Do not execute if either exists.
set -euo pipefail
if getent passwd maxhigh-stage-preview >/dev/null || test -e /var/www/maxhigh/staging; then
  printf 'Existing resources require review; no overwrite performed.\n' >&2
  exit 2
fi
sudo adduser --disabled-password --gecos '' --no-create-home --home /var/www/maxhigh/staging maxhigh-stage-preview
sudo install -d -o maxhigh-stage-preview -g maxhigh-stage-preview -m 0700 /var/www/maxhigh/staging
for item in releases logs .pm2 incoming; do
  sudo install -d -o maxhigh-stage-preview -g maxhigh-stage-preview -m 0700 "/var/www/maxhigh/staging/$item"
done
sudo -u maxhigh-stage-preview test ! -r /var/www/maxhigh/.env.database
# Stage only the already checksum-authenticated archive/extractor for the runtime user.
sudo install -o maxhigh-stage-preview -g maxhigh-stage-preview -m 0600 release.tgz safe-extract.py /var/www/maxhigh/staging/incoming/
sudo -u maxhigh-stage-preview env CONFIRM_STAGING_EXTRACT=maxhigh-staging-files-only \
  python3 /var/www/maxhigh/staging/incoming/safe-extract.py \
  --archive /var/www/maxhigh/staging/incoming/release.tgz \
  --sha256 "$ARCHIVE_SHA256" --manifest-sha256 "$MANIFEST_SHA256" \
  --destination /var/www/maxhigh/staging/releases
```

The extractor bounds sizes/member count, rejects traversal, links/devices/sparse files/duplicates, refuses symlinked target paths and existing immutable releases, and renames the new release into `releases/FULL_SHA`. It does not execute code or SQL. Five GiB free is a minimum extraction gate; budget additional space for the inbox/copy/extracted release and financial DB growth. Do not delete production history to create headroom.

Set `RELEASE_SHA` to the confirmed 40-character revision printed in the builder, then verify the exact payload, migrations and all public asset hashes using the bundled dependency-free verifier:

```bash
read -r -p 'Approved full release SHA: ' RELEASE_SHA
[[ "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]]
RELEASE_DIR="/var/www/maxhigh/staging/releases/$RELEASE_SHA"
sudo -u maxhigh-stage-preview env RELEASE_MANIFEST_SHA256="$MANIFEST_SHA256" \
  node "$RELEASE_DIR/.output/staging/verify.mjs"
```

**STOP and confirm extraction/verification.** Nothing is running. There is no production dependency-install step: all required Linux application runtime dependencies must already be inside the verified `.output`. Node24, Python3 and the existing PM2 installation must be verified. If they are missing/mismatched, request a separate operator-approved installation plan; do not upgrade a live shared Node/PM2 installation automatically.

## Gate 5 — confirm private read-only preview configuration/startup

Before startup, the DBA must separately provision an isolated `maxhigh_staging` schema (fresh/approved sanitized data) and `maxhigh_stage_preview@127.0.0.1` with **SELECT only** on that schema. It must have no DML, DDL, global or production grants. No production dump, migration, seed, financial fixture or data reconciliation is run by these commands. If the staging schema is not already ready, stop and approve a separate staging-schema setup; do not point the preview at `maxhigh` or copy the production `.env.database`.

```bash
# Administrator configures the new staging-only file; never type its secret into CI/chat.
sudo install -o root -g maxhigh-stage-preview -m 0640 \
  "$RELEASE_DIR/.output/staging/runtime.example" /var/www/maxhigh/staging/.env.preview
sudoedit /var/www/maxhigh/staging/.env.preview
# Verify the selected account has SELECT-only grants using the DBA's private client.
# Then, only after explicit START READ-ONLY PREVIEW confirmation:
sudo -u maxhigh-stage-preview env HOME=/var/www/maxhigh/staging \
  PM2_HOME=/var/www/maxhigh/staging/.pm2 \
  pm2 start "$RELEASE_DIR/.output/staging/pm2.config.cjs" --only maxhigh-staging-preview
```

The wrapper requires the exact staging path, Linux/Node match, staging schema/user and private loopback ports; it forces `STAGING_READ_ONLY=1`. One fork uses the PH-VPS-2 heap/RSS/pool/drain limits. All RPCs, authentication/staff operations, betting, deposits, withdrawals and other non-static application routes are blocked **before** application handlers. The root displays a preview-only notice, health performs schema SELECTs, and static assets can be checked. It is intentionally not a playable preview. Do not start `.output/server/index.mjs` directly or use the normal production ecosystem file.

No Caddy changes, public hostname, firewall opening, production PM2 restart, reboot persistence, automatic rollback/activation or watcher is configured. Do not save/resurrect a default PM2 home. Production remains untouched and financially unqualified.

## Gate 6 — confirm preview health results

```bash
curl --fail --silent --show-error http://127.0.0.1:18080/api/health
curl --silent --show-error --include http://127.0.0.1:18080/
test "$(curl --silent --output /dev/null --write-out '%{http_code}' \
  http://127.0.0.1:18080/_serverFn/paid-round)" = 423
test "$(curl --silent --output /dev/null --write-out '%{http_code}' -X POST \
  http://127.0.0.1:18080/api/deposit)" = 423
test "$(curl --silent --output /dev/null --write-out '%{http_code}' -X POST \
  http://127.0.0.1:18080/api/withdraw)" = 423
ss -lnt | grep '127.0.0.1:18080'
```

Health must be HTTP200 with `ok:true` and the exact approved SHA. Missing schema, wrong Node version or missing Linux dependency is a failure, not permission to bypass checks. Root must say read-only preview; blocked probes must return423/no-store without financial handlers. Do not use authenticated accounts or send real betting/payment requests. Inspect private staging logs locally; do not publish credentials or PM2 dump files. No load/fault testing is authorized on this shared production host.

To stop only this preview, after confirmation:

```bash
sudo -u maxhigh-stage-preview env HOME=/var/www/maxhigh/staging \
  PM2_HOME=/var/www/maxhigh/staging/.pm2 pm2 stop maxhigh-staging-preview
```

Do not run `sudo pm2 kill`, alter the production Caddy configuration, restart MariaDB, apply production migrations, enable betting/payment services or assume a successful transfer/startup. Report each gate's actual result and wait for the next explicit confirmation. Historical financial reconciliation, live security and off-host restore/PITR gates remain open even after a healthy private preview.
