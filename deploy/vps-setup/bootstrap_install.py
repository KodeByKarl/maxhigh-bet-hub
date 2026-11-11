#!/usr/bin/env python3
"""One-shot approved runtime installer. No socket, runner service or root command endpoint."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request

from common import *

HERE = Path(__file__).resolve().parent
STATE = Path('/var/lib/maxhigh-bootstrap')
NODE_ARCHIVE_HASH = '48cc0e21e048790e54c0cf5749c2725005313d652651c40b7a21feb9697aaf75'
PM2_VERSION = '7.1.2'
POLICY = Path('/usr/sbin/policy-rc.d')
POLICY_TEXT = '#!/bin/sh\n# Temporary MaxHigh package transaction start suppression\nexit 101\n'


def candidate(name, text):
    match = re.search(r'^\s*Candidate:\s*(\S+)\s*$', text, re.M)
    require(match is not None and match[1] != '(none)', 'Missing reviewed distro package candidate: ' + name)
    version = match[1]
    require(re.fullmatch(r'[A-Za-z0-9:.+~_-]+', version) is not None, 'Invalid package version')
    if name.startswith('mariadb-'):
        require(re.match(r'^(?:\d+:)?10\.11\.', version) is not None, 'Refuse a different MariaDB major series')
    return version


def publish(state):
    # Only sanitized metadata, never credentials or raw command errors. Root-controlled path.
    state['updatedAt'] = datetime.now(timezone.utc).isoformat()
    fd, name = tempfile.mkstemp(prefix='.status-', dir=STATE)
    with os.fdopen(fd, 'w') as output:
        json.dump(state, output, indent=2)
    os.chmod(name, 0o644)
    os.replace(name, STATE / 'status.json')


def download_node():
    target = HERE / 'node-v24.22.2-linux-x64.tar.xz'
    if target.exists():
        require(digest(target) == NODE_ARCHIVE_HASH, 'Existing Node archive differs; no overwrite')
        return target
    fd, temporary = tempfile.mkstemp(prefix='.node-download-', dir=HERE)
    with os.fdopen(fd, 'wb') as output:
        with urllib.request.urlopen('https://nodejs.org/dist/v24.22.2/node-v24.22.2-linux-x64.tar.xz', timeout=60) as source:
            total = 0
            while chunk := source.read(65536):
                total += len(chunk)
                require(total <= 100 * 1024**2, 'Unexpected Node download size')
                output.write(chunk)
    require(digest(temporary) == NODE_ARCHIVE_HASH, 'Official Node archive pinned SHA-256 mismatch')
    Path(temporary).rename(target)
    return target


def install_packages(arguments):
    # No auto-start/restart of packages' services; never replace a preexisting policy.
    require(not POLICY.exists() and not POLICY.is_symlink(), 'Existing policy-rc.d requires review; no overwrite')
    managed_file(POLICY, POLICY_TEXT, 0o755)
    try:
        run(['env', 'DEBIAN_FRONTEND=noninteractive', 'NEEDRESTART_MODE=l',
             'apt-get', '-o', 'DPkg::Lock::Timeout=60', 'install', '--yes', '--no-install-recommends', *arguments])
    finally:
        require(POLICY.is_file() and POLICY.read_text() == POLICY_TEXT, 'Package start policy changed unexpectedly; preserve for review')
        POLICY.unlink()  # Exact temporary file owned by this transaction, never an existing policy.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--approve', required=True)
    args = parser.parse_args()
    gate(args.approve, 'INSTALL-APPROVED-RUNTIMES')
    require(HERE.stat().st_uid == 0 and HERE.stat().st_mode & 0o022 == 0, 'Run only from verified root-controlled snapshot')
    no_links(STATE)
    fresh = not STATE.exists()
    if fresh:
        require(not Path('/var/lib/mysql').exists() and not Path('/etc/mysql').exists()
                and not Path('/etc/caddy').exists(), 'Existing DB/proxy configuration requires review; no adoption')
        STATE.mkdir(mode=0o755)
        os.chmod(STATE, 0o755)  # Sanitized status must be readable by the operator/agent.
    require(STATE.stat().st_uid == 0 and STATE.stat().st_mode & 0o022 == 0, 'Untrusted bootstrap state directory')
    status_file = STATE / 'status.json'
    no_links(status_file)
    if status_file.exists():
        require(status_file.stat().st_uid == 0, 'Untrusted prior bootstrap status')
        state = json.loads(status_file.read_text())
        require(state.get('purpose') == 'maxhigh-runtime-only' and state.get('applicationSha') == SHA, 'Unrelated bootstrap state')
    else:
        state = dict(purpose='maxhigh-runtime-only', applicationSha=SHA, completed=[], deployment=False,
                     financialOperationsEnabled=False, status='running')
    state['status'] = 'running'
    publish(state)

    def phase(name, function):
        state['phase'] = name
        publish(state)
        print('PHASE ' + name, flush=True)
        value = function()  # Fail closed; don't run later phases after any exception.
        if name not in state['completed']:
            state['completed'].append(name)
        if value is not None:
            state[name] = value
        publish(state)

    try:
        def security():
            run(['/usr/sbin/sshd', '-t'])
            state['sshEffective'] = {}
            for account in ('root', 'maxhigh-ops'):
                value = run(['/usr/sbin/sshd', '-T', '-C', 'user=' + account + ',host=localhost,addr=127.0.0.1']).stdout.splitlines()
                state['sshEffective'][account] = dict(line.split(' ', 1) for line in value
                    if line.split(' ', 1)[0] in {'port', 'permitrootlogin', 'passwordauthentication',
                                               'kbdinteractiveauthentication', 'pubkeyauthentication'})
                publish(state)
                require(all(x in value for x in ('permitrootlogin no', 'passwordauthentication no',
                                                'kbdinteractiveauthentication no', 'pubkeyauthentication yes')), 'Effective SSH hardening mismatch; no SSH changes made')
            ufw = run(['ufw', 'status', 'verbose']).stdout
            state['ufwInspection'] = ufw.strip()
            publish(state)
            require('Status: active' in ufw, 'UFW not active; no firewall changes made')
            require('deny (incoming)' in ufw and 'allow (outgoing)' in ufw, 'Unexpected UFW defaults; no firewall changes made')
            for port in (22, 80, 443):
                require(re.search(r'^' + str(port) + r'(?:/tcp)?\s.*ALLOW', ufw, re.M) is not None, 'Required UFW rule missing')
            require(re.search(r'^(?:3306|18080)(?:/tcp)?\s.*ALLOW', ufw, re.M) is None, 'Public DB/preview rule requires investigation')
            return {'sshdSyntax': 'PASS', 'sshHardening': 'PASS checked context localhost/127.0.0.1', 'ufw': 'PASS basic rules; unchanged'}
        phase('privileged-security', security)
        memory = {line.split(':')[0]: int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith(('MemAvailable:', 'SwapFree:'))}
        require(memory.get('MemAvailable', 0) >= 2560 * 1024 and memory.get('SwapFree', 0) >= 512 * 1024,
                'Initial RAM/swap admission failed')
        require(shutil.disk_usage('/var').free >= 10 * 1024**3, 'Initial disk reserve failed')
        phase('package-index-refresh', lambda: run(['apt-get', '-o', 'APT::Update::Error-Mode=any', 'update']) and None)
        names = ['mariadb-server', 'mariadb-client', 'mariadb-common', 'caddy', 'age']
        versions = {name: candidate(name, run(['apt-cache', 'policy', name]).stdout) for name in names}
        require(len({versions[n] for n in names if n.startswith('mariadb-')}) == 1, 'Incoherent MariaDB package versions')
        state['packageVersions'] = versions
        state['mariaDbPatchParityWithCi'] = versions['mariadb-server'].startswith('1:10.11.19-')
        publish(state)
        packages = [name + '=' + versions[name] for name in names] + ['ca-certificates', 'curl', 'xz-utils', 'python3', 'logrotate']
        simulation = run(['apt-get', '-s', 'install', '--no-install-recommends', *packages]).stdout
        require(re.search(r'^Remv ', simulation, re.M) is None, 'Package simulation removes existing packages; STOP')
        # Caddy is installed but may not serve a default public site, now or at reboot.
        pending = Path('/etc/systemd/system/caddy.service.d')
        no_links(pending)
        pending.mkdir(mode=0o755, exist_ok=True)
        require(not Path('/etc/caddy/MAXHIGH_PROXY_APPROVED').exists(), 'Unexpected proxy approval marker')
        managed_file(pending / '60-maxhigh-awaiting-proxy.conf', '[Unit]\nConditionPathExists=/etc/caddy/MAXHIGH_PROXY_APPROVED\n', 0o644)
        phase('runtime-packages', lambda: install_packages(packages))
        import setup
        from types import SimpleNamespace
        def node_install():
            archive = download_node()
            setup.node(SimpleNamespace(archive=str(archive), sha256=NODE_ARCHIVE_HASH))
            return {'version': run([NODE, '--version']).stdout.strip(), 'archiveSha256': NODE_ARCHIVE_HASH}
        phase('private-node', node_install)
        phase('private-pm2', lambda: setup.pm2(SimpleNamespace(version=PM2_VERSION)))
        state['pm2Version'] = PM2_VERSION
        npm = NODE.parent.parent / 'lib/node_modules/npm/bin/npm-cli.js'
        phase('pm2-security-audit', lambda: run([NODE, npm, 'audit', '--prefix', '/opt/maxhigh-pm2', '--audit-level=high']) and None)
        config = (HERE / 'templates/mariadb-review-only.cnf').read_text()
        phase('fresh-mariadb-config', lambda: managed_file('/etc/mysql/mariadb.conf.d/60-maxhigh-staging.cnf', config, 0o644) and None)
        run(['systemctl', 'daemon-reload'])
        phase('mariadb-start', lambda: run(['systemctl', 'start', 'mariadb.service']) and None)
        def database_verify():
            values = run(['mariadb', '--protocol=socket', '--user=root', '--batch', '--skip-column-names', '-e',
                          'SELECT VERSION(),@@global.innodb_flush_log_at_trx_commit,@@global.sync_binlog,@@global.innodb_buffer_pool_size,@@global.max_connections;']).stdout.strip()
            fields = values.split('\t')
            require(len(fields) == 5 and fields[0].startswith('10.11.') and fields[1:] == ['1', '1', '536870912', '30'], 'MariaDB version/durability/resource settings differ')
            listeners = [line for line in run(['ss', '-H', '-lnt']).stdout.splitlines() if ':3306 ' in line]
            require(listeners and all('127.0.0.1:3306' in line for line in listeners), 'MariaDB must bind only127.0.0.1')
            return {'version': fields[0], 'durableFlush': 1, 'syncBinlog': 1, 'bufferPoolMiB': 512, 'maxConnections': 30, 'loopback': True}
        phase('mariadb-verification', database_verify)
        for parent in (Path('/var/www'), Path('/var/www/maxhigh')):
            no_links(parent)
            if not parent.exists():
                parent.mkdir(mode=0o755)
                os.chmod(parent, 0o755)
            require(parent.is_dir() and parent.stat().st_uid == 0 and parent.stat().st_mode & 0o022 == 0, 'Existing web parent is not root-controlled')
        phase('staging-directories', setup.directories)
        def staging_database():
            # New isolated staging only. Password statements must not enter shared query/audit logs.
            value = run(['mariadb', '--protocol=socket', '--user=root', '--batch', '--skip-column-names', '-e',
                         "SELECT @@global.general_log; SELECT COUNT(*) FROM information_schema.plugins WHERE plugin_status='ACTIVE' AND plugin_name LIKE '%audit%';"]).stdout.strip()
            require(value == '0\n0', 'DB query/audit logging needs secret-safe review before staging credential creation')
            options = ADMIN / 'bootstrap-admin.cnf'
            managed_file(options, '[client]\nprotocol=socket\nuser=root\n')
            run(['python3', HERE / 'database.py', '--approve', 'PROVISION-STAGING-DATABASE',
                 '--admin-client', options, '--secret-logging-reviewed'])
            preview = client_options(ADMIN / 'preview-client.cnf', DB, 'maxhigh_stage_preview')
            require(sql(preview, DB, 'SELECT CURRENT_USER(),DATABASE();') == 'maxhigh_stage_preview@127.0.0.1\t' + DB,
                    'Staging read-only authenticated identity mismatch')
            grants = sql(preview, DB, 'SHOW GRANTS FOR CURRENT_USER;').splitlines()
            require(all('WITH GRANT OPTION' not in grant and re.match(r'^GRANT (USAGE ON \*\.\*|SELECT ON `maxhigh_staging`\.\*) TO ', grant)
                        for grant in grants), 'Unexpected preview privilege')
            require(any('SELECT ON `maxhigh_staging`.*' in grant for grant in grants), 'Preview SELECT missing')
            return {'schema': DB, 'runtimeSelectOnly': True, 'credentialsPrinted': False, 'migrated': False}
        phase('isolated-staging-database', staging_database)
        require(run(['systemctl', 'is-active', 'caddy.service'], accepted=(0, 3, 4)).returncode != 0, 'Caddy unexpectedly active')
        state['caddy'] = {'version': run(['caddy', 'version']).stdout.strip(), 'active': False, 'reason': 'proxy configuration not approved; no public default site'}
        state['staging'] = {'directories': True, 'runtimeAccount': RUNTIME, 'schemaCreated': True,
                            'migrationApplied': False, 'applicationTransferred': False, 'applicationStarted': False}
        state['status'] = 'complete-runtime-setup'
        state['phase'] = 'done'
        publish(state)
        print('Runtime and isolated staging setup complete. No application deployment/migration/public staging. Sanitized result: /var/lib/maxhigh-bootstrap/status.json')
    except Exception as error:
        state['status'] = 'failed'
        state['error'] = str(error) if isinstance(error, RuntimeError) else type(error).__name__
        publish(state)
        raise


if __name__ == '__main__':
    finish(main)
