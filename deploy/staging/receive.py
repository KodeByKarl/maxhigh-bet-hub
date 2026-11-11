#!/usr/bin/env python3
"""Restricted SSH artifact receiver. Never loads production configuration."""
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path('/var/www/maxhigh-staging')
MAX_ARCHIVE = 1024 ** 3
MAX_EXPANDED = 2 * 1024 ** 3
MAX_FILES = 30000


def parse_command(command):
    match = re.fullmatch(r'deploy ([a-f0-9]{40}) ([a-f0-9]{64}) ([a-f0-9]{64})', command)
    if not match:
        raise ValueError('Only a pinned staging deployment is accepted')
    return match.groups()


def unpack(archive, destination):
    total = 0
    seen = set()
    with tarfile.open(archive, 'r:gz') as source:
        for member in source:
            if member.name in ('.', './') and member.isdir():
                continue
            relative = PurePosixPath(member.name)
            if (relative.is_absolute() or '..' in relative.parts or '\\' in member.name
                    or not relative.parts or relative.parts[0] not in ('.output', 'drizzle', 'release-validation.json')):
                raise ValueError('Disallowed artifact path')
            if not (member.isdir() or member.isfile()) or member.issparse():
                raise ValueError('Only regular files and directories are accepted')
            if relative in seen or len(seen) >= MAX_FILES or member.size < 0:
                raise ValueError('Duplicate path or archive limit exceeded')
            seen.add(relative)
            total += member.size
            if total > MAX_EXPANDED:
                raise ValueError('Expanded artifact too large')
            target = destination.joinpath(*relative.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True, mode=0o700)
            else:
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                with source.extractfile(member) as incoming, target.open('xb') as outgoing:
                    shutil.copyfileobj(incoming, outgoing, length=65536)
                target.chmod(0o600)


def run_node(args, env, timeout=180):
    # Never print inherited environments or captured SQL/client errors to CI.
    result = subprocess.run(['/usr/bin/node', str(ROOT / 'deploy/staging/control.mjs'), *args],
                            cwd=ROOT, env=env, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError('Staging release gate failed; operator must inspect local state (no automatic migrations)')
    return result.stdout


def main():
    sha, manifest_hash, archive_hash = parse_command(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    if os.geteuid() == 0 or ROOT.resolve() != ROOT:
        raise ValueError('Dedicated unprivileged staging identity required')
    marker = ROOT / 'STAGING_ONLY'
    # Parent directories, control code and configuration must be administrator-owned.
    # Only incoming/, releases/, logs/ and .pm2/ are writable by the staging identity.
    for protected in (ROOT, ROOT / 'deploy', ROOT / 'deploy/staging', marker,
                      ROOT / '.env', ROOT / 'deploy/staging/control.mjs'):
        details = protected.lstat()
        if details.st_uid != 0 or stat.S_ISLNK(details.st_mode) or details.st_mode & 0o022:
            raise ValueError('Staging control plane ownership is unsafe')
    if not marker.is_file() or marker.read_text().strip() != 'maxhigh_staging':
        raise ValueError('Staging marker missing')
    if shutil.disk_usage(ROOT).free < 5 * 1024 ** 3:
        raise ValueError('Staging requires at least 5 GiB free')
    # Separate receiver lock: serialize uploads/imports without deadlocking activation.lock.
    with (ROOT / 'deploy/releases/receiver.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with tempfile.TemporaryDirectory(prefix='receive-', dir=ROOT / 'incoming') as temporary:
            temporary = Path(temporary)
            archive = temporary / 'release.tgz'
            digest = hashlib.sha256()
            count = 0
            with archive.open('xb') as outgoing:
                while chunk := sys.stdin.buffer.read(65536):
                    count += len(chunk)
                    if count > MAX_ARCHIVE:
                        raise ValueError('Compressed artifact too large')
                    outgoing.write(chunk)
                    digest.update(chunk)
            if digest.hexdigest() != archive_hash:
                raise ValueError('Archive hash mismatch')
            release = temporary / 'release'
            release.mkdir(mode=0o700)
            unpack(archive, release)
            manifest_file = release / 'release-validation.json'
            if hashlib.sha256(manifest_file.read_bytes()).hexdigest() != manifest_hash:
                raise ValueError('Manifest hash mismatch')
            manifest = json.loads(manifest_file.read_text())
            if (manifest.get('artifactFormat') != 'portable-v1'
                    or manifest.get('sha') != sha or manifest.get('platform') != 'linux'
                    or manifest.get('arch') != 'x64' or manifest.get('nodeMajor') != 24):
                raise ValueError('Linux x64 Node 24 artifact required')
            # Clean fixed environment; no SSH-controlled PATH/NODE_OPTIONS/production .env.
            env = {'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': str(ROOT),
                   'PM2_HOME': str(ROOT / '.pm2'), 'DEPLOY_PROFILE': 'ph-vps-2',
                   'RELEASE_MANIFEST_SHA256': manifest_hash}
            existing = ROOT / 'deploy/releases' / sha
            if existing.exists():
                if hashlib.sha256((existing / 'release-validation.json').read_bytes()).hexdigest() != manifest_hash:
                    raise ValueError('Existing immutable revision differs')
            else:
                run_node(['--import', str(release)], env)
            # activateRelease revalidates all payload and migration digests, then performs
            # its read-only migration gate, candidate probe, drain and automatic app rollback.
            run_node(['--activate', sha], env, timeout=540)
            print(json.dumps({'staging': True, 'sha': sha, 'activated': True}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Staging deployment rejected: {type(error).__name__}', file=sys.stderr)
        sys.exit(1)
