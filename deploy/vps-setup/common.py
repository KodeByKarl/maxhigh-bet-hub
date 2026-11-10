"""Operator controls, not application payload. Importing this module performs no I/O."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

SHA = '75cc41980c70a2d188a9a8263ed56d4eb580d7a1'
ARCHIVE_HASH = '75c9ae791bd6cdb7ce08e152263d251f6ad08d66181c112133c86bb2505b57bc'
MANIFEST_HASH = 'b759b5dd75b2dda89eb78c1a514c172c250641e2ee7f50421678a6b946b48fc9'
EXTRACTOR_HASH = '522c5627dfdd2400f8b4237b671016e8be623a9894765029f816b40c3d9a8804'
ARCHIVE_BYTES = 457442659
ROOT = Path('/var/www/maxhigh/staging')
RELEASE = ROOT / 'releases' / SHA
ADMIN = Path('/root/maxhigh-staging-admin')
BACKUPS = Path('/var/backups/maxhigh-staging')
RUNTIME = 'maxhigh-stage-preview'
SERVICE = 'maxhigh-staging-preview.service'
DB = 'maxhigh_staging'
RESTORE_DB = 'maxhigh_staging_restorecheck'
NODE = Path('/opt/maxhigh-node-24.22.2/bin/node')
PM2 = Path('/opt/maxhigh-pm2/node_modules/.bin/pm2-runtime')


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def gate(actual, expected):
    require(actual == expected, 'Explicit --approve ' + expected + ' required')
    require(sys.platform == 'linux' and hasattr(os, 'geteuid') and os.geteuid() == 0,
            'Approved Ubuntu administrator session required')
    require('VERSION_ID="24.04"' in Path('/etc/os-release').read_text(), 'Ubuntu24.04 required')
    require(os.uname().machine == 'x86_64', 'x86_64 required')
    os.umask(0o077)


def run(argv, data=None, accepted=(0,), cwd=None):
    # Never print arguments, stdin, environment or raw stderr: they can contain secrets.
    clean = {'PATH': str(NODE.parent) + ':/usr/sbin:/usr/bin:/sbin:/bin',
             'HOME': '/root', 'LANG': 'C.UTF-8', 'LC_ALL': 'C.UTF-8'}
    result = subprocess.run([str(x) for x in argv], input=data, text=True,
                            capture_output=True, env=clean, cwd=cwd, check=False)
    require(result.returncode in accepted, 'Command failed; stop phase and inspect privately: ' + Path(argv[0]).name)
    return result


def no_links(path):
    path = Path(path)
    require(path.is_absolute(), 'Absolute path required')
    for part in (path, *path.parents):
        require(not part.is_symlink(), 'Symlinked control/storage path rejected')


def secret_file(path):
    path = Path(path)
    no_links(path)
    require(path.is_file(), 'Required private file missing')
    stat = path.stat()
    require(stat.st_uid == 0 and stat.st_mode & 0o077 == 0, 'Administrator-only0600 file required')
    return path


def managed_file(path, text, mode=0o600):
    """Idempotent for identical content; refuses overwrite of a different configuration."""
    path = Path(path)
    no_links(path)
    if path.exists():
        require(path.is_file() and path.read_text() == text, 'Existing file differs; review instead of overwrite')
        require(path.stat().st_uid == 0 and path.stat().st_mode & 0o777 == mode,
                'Existing file owner/mode differs; review required')
        return False
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    if hasattr(os, 'fchmod'):
        os.fchmod(fd, mode)  # Explicit reviewed mode must not be narrowed by bootstrap umask077.
    with os.fdopen(fd, 'w') as output:
        output.write(text)
    return True


def digest(path):
    with Path(path).open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def verify_inbox(directory):
    directory = Path(directory)
    no_links(directory)
    for name in ('release.tgz', 'metadata.json', 'safe-extract.py', 'SHA256SUMS'):
        no_links(directory / name)
        require((directory / name).is_file(), 'Incomplete approved artifact inbox')
    require((directory / 'release.tgz').stat().st_size == ARCHIVE_BYTES, 'Archive byte size mismatch')
    require(digest(directory / 'release.tgz') == ARCHIVE_HASH, 'Archive SHA-256 mismatch')
    require(digest(directory / 'safe-extract.py') == EXTRACTOR_HASH, 'Extractor SHA-256 mismatch')
    metadata = json.loads((directory / 'metadata.json').read_text())
    require(metadata.get('sha') == SHA and metadata.get('manifestSha256') == MANIFEST_HASH
            and metadata.get('archiveSha256') == ARCHIVE_HASH and metadata.get('platform') == 'linux'
            and metadata.get('arch') == 'x64' and metadata.get('nodeVersion') == '24.22.2', 'Metadata mismatch')
    seen = set()
    for line in (directory / 'SHA256SUMS').read_text().splitlines():
        match = re.fullmatch(r'([a-f0-9]{64})  (release\.tgz|metadata\.json|safe-extract\.py)', line)
        require(match is not None, 'Unexpected checksum entry')
        require(match[2] not in seen, 'Duplicate checksum entry')
        seen.add(match[2])
        require(digest(directory / match[2]) == match[1], 'Checksum entry mismatch')
    require(seen == {'release.tgz', 'metadata.json', 'safe-extract.py'}, 'Missing checksum entries')


def resources(start=False, extra_bytes=0):
    import shutil
    memory = {line.split(':')[0]: int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines()
              if line.startswith(('MemAvailable:', 'SwapFree:'))}
    require(memory.get('MemAvailable', 0) >= (2560 if start else 1280) * 1024, 'Insufficient host RAM headroom')
    require(memory.get('SwapFree', 0) >= 512 * 1024, 'Insufficient existing swap headroom')
    filesystem = ROOT if ROOT.exists() else Path('/var/www/maxhigh')
    require(shutil.disk_usage(filesystem).free >= 8 * 1024**3 + extra_bytes, '8GiB post-peak disk reserve not satisfied')


def node_ok():
    require(run([NODE, '--version']).stdout.strip() == 'v24.22.2', 'Exact private Node24.22.2 required')


def preview_off():
    status = run(['systemctl', 'is-active', SERVICE], accepted=(0, 3, 4)).stdout.strip()
    require(status not in ('active', 'activating', 'reloading'), 'Stop only the staging unit before this phase')


def client_options(path, database, user=None):
    import configparser
    path = secret_file(path)
    config = configparser.RawConfigParser()
    config.read(path)
    require(config.has_section('client'), 'INI client options required')
    values = dict(config['client'])
    require(set(values) <= {'host', 'port', 'protocol', 'user', 'password', 'database'}, 'Unexpected client option')
    require(values.get('host') == '127.0.0.1' and values.get('port') == '3306'
            and values.get('protocol') == 'tcp' and values.get('database') == database,
            'Client target is not the exact isolated schema')
    require(user is None or values.get('user') == user, 'Unexpected client identity')
    return path


def sql(options, database, statement):
    return run(['mariadb', '--defaults-extra-file=' + str(options), '--batch', '--skip-column-names', database],
               data=statement).stdout.strip()


def finish(main):
    try:
        main()
    except Exception as error:
        # Exception messages here are operator-authored, not subprocess stderr/URLs.
        print('STOP: ' + (str(error) if isinstance(error, RuntimeError) else type(error).__name__), file=sys.stderr)
        sys.exit(1)
