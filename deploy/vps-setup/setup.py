#!/usr/bin/env python3
"""Explicitly approved local-server phases only; never initiates SSH."""
import argparse
import base64
import grp
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import tarfile
import tempfile

from common import (ADMIN, BACKUPS, NODE, PM2, ROOT, RUNTIME, SHA, gate, require,
                    run, managed_file, no_links, resources, digest, finish)

HERE = Path(__file__).resolve().parent


def preflight():
    commands = {
        'os': ['cat', '/etc/os-release'], 'clock': ['timedatectl', 'show', '-p', 'NTPSynchronized', '-p', 'Timezone'],
        'cpu': ['getconf', '_NPROCESSORS_ONLN'], 'ram': ['free', '-m'],
        'swap': ['swapon', '--show', '--bytes'], 'disk': ['df', '-B1', '/var/www', '/var/lib'],
        'inodes': ['df', '-i', '/var/www', '/var/lib'], 'listeners': ['ss', '-lnt'],
        'services': ['systemctl', 'list-units', '--type=service', '--state=running', '--no-pager', '--plain'],
        'packages': ['dpkg-query', '-W', '-f=${Package} ${Version}\n', 'openssh-server', 'sudo', 'ufw',
                     'mariadb-server', 'caddy', 'unattended-upgrades', 'fail2ban'],
        'firewall': ['ufw', 'status', 'verbose'],
        'cached_updates': ['apt', 'list', '--upgradable'],
    }
    for name, command in commands.items():
        if shutil.which(command[0]):
            result = run(command, accepted=(0, 1))
            print(json.dumps({'check': name, 'exit': result.returncode, 'result': result.stdout.strip()}))
        else:
            print(json.dumps({'check': name, 'missing': True}))
    # Do not print key contents or comments; only count entries and show fingerprints.
    for account in ('root', 'maxhigh'):
        try:
            home = Path(pwd.getpwnam(account).pw_dir)
        except KeyError:
            continue
        keys = home / '.ssh/authorized_keys'
        if keys.is_file():
            output = run(['ssh-keygen', '-lf', keys], accepted=(0, 255)).stdout
            fingerprints = [line.split()[1] for line in output.splitlines() if len(line.split()) > 1]
            print(json.dumps({'account': account, 'keyFingerprints': fingerprints}))
    print(json.dumps({'rebootRequired': Path('/var/run/reboot-required').exists(),
                      'updatesUseCachedIndexes': True, 'hostNotModified': True}))


def admin(args):
    require(re.fullmatch(r'[a-z][a-z0-9-]{2,30}', args.user or '') is not None
            and args.user not in ('root', 'maxhigh', 'maxhigh-stage-preview'), 'Choose a distinct sudo administrator')
    key_path = Path(args.public_key or '')
    require(key_path.is_absolute() and key_path.suffix == '.pub', 'Explicit public .pub file only')
    key = key_path.read_text().strip()
    parts = key.split()
    require(len(key.splitlines()) == 1 and len(parts) in (2, 3) and parts[0] == 'ssh-ed25519', 'Single ed25519 public key required')
    try:
        require(len(base64.b64decode(parts[1], validate=True)) > 32, 'Malformed public key')
    except ValueError:
        raise RuntimeError('Malformed public key') from None
    run(['ssh-keygen', '-lf', key_path])
    try:
        entry = pwd.getpwnam(args.user)
        require(args.existing_admin_reviewed, 'Existing administrator requires explicit ownership/access review')
        require(entry.pw_uid >= 1000 and entry.pw_shell in ('/bin/bash', '/bin/sh'), 'Existing user needs review')
        require(entry.pw_dir == '/home/' + args.user, 'Unexpected administrator home')
    except KeyError:
        run(['adduser', '--disabled-password', '--gecos', '', args.user])
        entry = pwd.getpwnam(args.user)
    run(['usermod', '-aG', 'sudo', args.user])
    ssh = Path(entry.pw_dir) / '.ssh'
    no_links(ssh)
    ssh.mkdir(mode=0o700, exist_ok=True)
    require(ssh.stat().st_uid in (0, entry.pw_uid), 'Unexpected SSH directory owner')
    authorized = ssh / 'authorized_keys'
    no_links(authorized)
    normalized = ' '.join(parts[:2])
    existing = authorized.read_text() if authorized.exists() else ''
    if not any(normalized == ' '.join(line.split()[:2]) for line in existing.splitlines()):
        require(not authorized.exists(), 'Existing authorized_keys differs; review rather than append/overwrite')
        authorized.write_text(normalized + '\n')
    os.chown(ssh, entry.pw_uid, entry.pw_gid)
    os.chmod(ssh, 0o700)
    os.chown(authorized, entry.pw_uid, entry.pw_gid)
    os.chmod(authorized, 0o600)
    print('Administrator key prepared. Root SSH unchanged. Set sudo password privately with passwd; verify a second login and sudo -v.')


def node(args):
    archive = Path(args.archive or '')
    require(re.fullmatch('[a-f0-9]{64}', args.sha256 or '') is not None, 'Approve official signed Linux archive hash first')
    require(archive.name == 'node-v24.22.2-linux-x64.tar.xz' and digest(archive) == args.sha256, 'Node archive/hash mismatch')
    destination = NODE.parent.parent
    no_links(destination)
    if destination.exists():
        require(destination.stat().st_uid == 0 and destination.stat().st_mode & 0o022 == 0,
                'Existing private runtime prefix is not root-controlled')
        stamp = destination / '.approved-archive-and-node'
        require(stamp.is_file() and stamp.stat().st_uid == 0
                and stamp.read_text() == args.sha256 + '\n' + digest(NODE) + '\n',
                'Existing private runtime lacks matching approved provenance; no automatic adoption')
        require(run([NODE, '--version']).stdout.strip() == 'v24.22.2', 'Existing private runtime differs')
        print('Matching private runtime already present; unchanged')
        return
    with tempfile.TemporaryDirectory(prefix='.maxhigh-node-', dir='/opt') as temporary:
        with tarfile.open(archive, 'r:xz') as source:
            members = source.getmembers()
            require(len(members) < 20000 and sum(x.size for x in members) < 700 * 1024**2, 'Node archive bounds exceeded')
            for member in members:
                name = Path(member.name)
                require(not name.is_absolute() and '..' not in name.parts
                        and name.parts[0] == 'node-v24.22.2-linux-x64', 'Unexpected Node archive path')
                require(member.isfile() or member.isdir() or member.issym(), 'Unexpected Node archive entry')
            source.extractall(temporary, filter='data')
        extracted = Path(temporary) / 'node-v24.22.2-linux-x64'
        # No archive program executes until its owner-reviewed vendor checksum passes.
        for item in [extracted, *extracted.rglob('*')]:
            if not item.is_symlink():
                os.chmod(item, (0o755 if item.is_dir() or item.stat().st_mode & 0o111 else 0o644))
        extracted.rename(destination)
    managed_file(destination / '.approved-archive-and-node', args.sha256 + '\n' + digest(NODE) + '\n', 0o644)
    require(run([NODE, '--version']).stdout.strip() == 'v24.22.2', 'Runtime validation failed')
    print('Private Node installed; no global symlink, production PATH or production service changed')


def packages(args):
    allowed = {'sudo', 'openssh-server', 'ufw', 'ca-certificates', 'curl', 'xz-utils', 'python3',
               'tar', 'gzip', 'logrotate', 'age', 'unattended-upgrades', 'fail2ban',
               'mariadb-server', 'mariadb-client', 'caddy'}
    require(args.packages and set(args.packages) <= allowed, 'Explicit reviewed package allowlist required')
    require(args.maintenance_approved, 'Package operations can start/restart shared services; maintenance approval required')
    require(args.simulation_reviewed, 'Review apt simulation and candidate MariaDB10.11/Caddy versions first')
    run(['apt-get', 'install', '--no-install-recommends', '--yes', *args.packages])
    print('Requested package transaction completed; re-inventory services/reboot need. No upgrade-all or reboot performed.')


def pm2(args):
    require(re.fullmatch(r'7\.\d+\.\d+', args.version or '') is not None, 'Exact approved PM2 major7 patch required')
    require(run([NODE, '--version']).stdout.strip() == 'v24.22.2', 'Private Node missing')
    destination = Path('/opt/maxhigh-pm2')
    no_links(destination)
    if destination.exists():
        require(destination.stat().st_uid == 0 and destination.stat().st_mode & 0o022 == 0,
                'Existing private PM2 prefix is not root-controlled')
        require((destination / 'node_modules/pm2/package.json').is_file()
                and json.loads((destination / 'node_modules/pm2/package.json').read_text())['version'] == args.version,
                'Existing private PM2 differs; no overwrite')
        return
    destination.mkdir(mode=0o755)
    run([NODE, NODE.parent.parent / 'lib/node_modules/npm/bin/npm-cli.js', 'install',
         '--prefix', destination, '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', 'pm2@' + args.version])
    for item in [destination, *destination.rglob('*')]:
        if not item.is_symlink():
            os.chmod(item, 0o755 if item.is_dir() or item.stat().st_mode & 0o111 else 0o644)
    # npm's lockfile is retained for reviewed future reinstalls; never use latest or global npm -g.
    require(PM2.is_file(), 'Private PM2 install incomplete; inspect before retry')
    print('Private PM2 installed without starting a daemon; retain package-lock.json and review dependency audit separately')


def directories():
    marker = ADMIN / 'directories-owned-by-this-setup'
    no_links(ADMIN)
    no_links(marker)
    owned = marker.is_file() and marker.stat().st_uid == 0 and marker.read_text() == str(ROOT) + '\n'
    if not owned:
        require(not ROOT.exists(), 'Existing staging path has no ownership marker; no adoption')
        try:
            pwd.getpwnam(RUNTIME)
        except KeyError:
            pass
        else:
            raise RuntimeError('Existing runtime account has no ownership marker; review required')
        if not ADMIN.exists():
            ADMIN.mkdir(mode=0o700)
        require(ADMIN.is_dir() and ADMIN.stat().st_uid == 0 and ADMIN.stat().st_mode & 0o777 == 0o700,
                'Administrator controls directory must be root0700')
        managed_file(marker, str(ROOT) + '\n')
    try:
        entry = pwd.getpwnam(RUNTIME)
        require(entry.pw_shell == '/usr/sbin/nologin' and entry.pw_dir == str(ROOT), 'Existing runtime identity differs')
        require(not [g for g in grp.getgrall() if RUNTIME in g.gr_mem], 'Runtime has supplementary groups; review')
    except KeyError:
        run(['useradd', '--system', '--user-group', '--home-dir', ROOT, '--no-create-home', '--shell', '/usr/sbin/nologin', RUNTIME])
        entry = pwd.getpwnam(RUNTIME)
    for path in (ROOT, ROOT / 'releases', ROOT / 'incoming', ROOT / 'evidence', ADMIN, BACKUPS):
        no_links(path)
        if path.exists():
            require(path.is_dir() and path.stat().st_uid == 0, 'Existing directory not administrator-owned')
        else:
            path.mkdir(mode=0o750 if path in (ROOT, ROOT / 'releases') else 0o700)
        if path in (ROOT, ROOT / 'releases'):
            os.chown(path, 0, entry.pw_gid)
            os.chmod(path, 0o750)
    for path in (ROOT / '.pm2', ROOT / 'logs'):
        no_links(path)
        if not path.exists():
            path.mkdir(mode=0o700)
            os.chown(path, entry.pw_uid, entry.pw_gid)
        require(path.stat().st_uid == entry.pw_uid and path.stat().st_mode & 0o777 == 0o700, 'Runtime directory ownership/mode mismatch')
    test = run(['runuser', '-u', RUNTIME, '--', 'test', '-r', '/var/www/maxhigh/.env.database'], accepted=(0, 1))
    require(test.returncode == 1, 'Runtime can read production credentials; STOP')
    test = run(['runuser', '-u', RUNTIME, '--', 'test', '-w', '/var/www/maxhigh'], accepted=(0, 1))
    require(test.returncode == 1, 'Runtime can modify production parent; STOP')
    print('Staging directories prepared. No release, database, environment file or service created.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['preflight', 'admin', 'node', 'packages', 'pm2', 'directories'])
    parser.add_argument('--approve', required=True)
    parser.add_argument('--user')
    parser.add_argument('--public-key')
    parser.add_argument('--archive')
    parser.add_argument('--sha256')
    parser.add_argument('--version')
    parser.add_argument('--packages', nargs='+')
    parser.add_argument('--maintenance-approved', action='store_true')
    parser.add_argument('--simulation-reviewed', action='store_true')
    parser.add_argument('--existing-admin-reviewed', action='store_true')
    args = parser.parse_args()
    gate(args.approve, args.phase.upper())
    if args.phase == 'preflight':
        preflight()
    elif args.phase == 'directories':
        resources(extra_bytes=2 * 1024**3)
        directories()
    else:
        globals()[args.phase](args)


if __name__ == '__main__':
    finish(main)
