#!/usr/bin/env python3
"""Manual extraction only: no SSH, SQL, services, package install or activation."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile
import tempfile


def unpack(archive, destination):
    seen, total = set(), 0
    with tarfile.open(archive, 'r:gz') as source:
        for item in source:
            if item.name in ('.', './') and item.isdir():
                continue
            name = PurePosixPath(item.name)
            if (name.is_absolute() or '..' in name.parts or '\\' in item.name or not name.parts
                    or name.parts[0] not in ('.output', 'drizzle', 'release-validation.json')):
                raise ValueError('Forbidden archive path')
            if not (item.isfile() or item.isdir()) or item.issparse() or name in seen:
                raise ValueError('Links, devices, sparse files or duplicate paths are forbidden')
            seen.add(name)
            total += item.size
            if item.size < 0 or len(seen) > 30000 or total > 2 * 1024 ** 3:
                raise ValueError('Archive limits exceeded')
            target = destination.joinpath(*name.parts)
            if item.isdir():
                target.mkdir(parents=True, exist_ok=True, mode=0o700)
            else:
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                with source.extractfile(item) as incoming, target.open('xb') as outgoing:
                    shutil.copyfileobj(incoming, outgoing, 65536)
                target.chmod(0o600)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', required=True, type=Path)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    parser.add_argument('--destination', required=True, type=Path)
    args = parser.parse_args()
    if sys.platform != 'linux' or os.environ.get('CONFIRM_STAGING_EXTRACT') != 'maxhigh-staging-files-only':
        raise ValueError('Explicit Linux staging extraction confirmation is required')
    if args.destination != Path('/var/www/maxhigh/staging/releases') or args.destination.resolve() != args.destination:
        raise ValueError('Only the reviewed non-symlink staging releases directory is accepted')
    if not all(re.fullmatch('[a-f0-9]{64}', value) for value in (args.sha256, args.manifest_sha256)):
        raise ValueError('Approved builder hashes are required')
    if args.archive.stat().st_size > 1024 ** 3 or shutil.disk_usage(args.destination).free < 5 * 1024 ** 3:
        raise ValueError('Archive size or disk headroom gate failed')
    with args.archive.open('rb') as incoming:
        if hashlib.file_digest(incoming, 'sha256').hexdigest() != args.sha256:
            raise ValueError('Archive checksum mismatch')
    with tempfile.TemporaryDirectory(prefix='.extract-', dir=args.destination) as temporary:
        temporary = Path(temporary)
        release = temporary / 'release'
        release.mkdir(mode=0o700)
        unpack(args.archive, release)
        raw = (release / 'release-validation.json').read_bytes()
        if hashlib.sha256(raw).hexdigest() != args.manifest_sha256:
            raise ValueError('Manifest pin mismatch')
        manifest = json.loads(raw)
        if (not re.fullmatch('[a-f0-9]{40}', manifest.get('sha', ''))
                or manifest.get('platform') != 'linux' or manifest.get('arch') != 'x64'
                or manifest.get('nodeMajor') != 24 or manifest.get('games') != 100
                or manifest.get('publicAssets') != 3989 or manifest.get('artifactFormat') != 'portable-v1'):
            raise ValueError('Artifact identity/inventory mismatch')
        target = args.destination / manifest['sha']
        if target.exists():
            raise ValueError('Immutable release already exists; no overwrite allowed')
        release.rename(target)
        print(json.dumps({'extracted': str(target), 'started': False, 'databaseChanged': False}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Extraction rejected: {error}', file=sys.stderr)
        sys.exit(1)
