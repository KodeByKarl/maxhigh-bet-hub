#!/usr/bin/env python3
"""MaxHigh production release kit: upgrade an ALREADY-RUNNING production root to a new verified artifact.

Successor to the one-time 29656ce kit (which moved production from /var/www/maxhigh/staging to
/var/www/maxhigh/production). Nothing about the candidate is hardcoded here:

  * The candidate is described by candidate.json, installed root-owned next to this file:
        {"sha": "<40 hex>", "archiveSha256": "<64 hex>", "manifestSha256": "<64 hex>",
         "publicAssets": 3989, "games": 100, "attempt": "<short label>"}
    The kit directory must be /usr/local/libexec/maxhigh-release-<sha[:7]>, binding one reviewed kit to one candidate.
  * The previous release is DISCOVERED and PROVEN from the live system (target.json, backend health, release
    manifest, and SHA-256 of every public entry asset), recorded in the verified backup, and rollback returns to
    exactly that recorded release. The UAT baseline is recorded the same way and must not change.

Gates (unchanged in spirit from the 29656ce kit): verified backup with isolated restore + full data checksum ->
stage (archive/manifest checksums, migration journal must already match, read-only probe on 18780) ->
activate (atomic target switch + restart, automatic rollback on failed verification) -> verify.
No migrations are applied, no source-database writes are made, UAT is never restarted.
"""
import argparse
import gzip
import grp
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import signal
import subprocess
import tarfile
import tempfile
import time
import urllib.request

ROOT = Path('/var/www/maxhigh/production')
LEGACY = Path('/var/www/maxhigh/staging')  # Holds the shared .env.uat and the UAT (uat2) runtime; never modified.
INBOX = Path('/home/maxhigh-ops/maxhigh-production-release')
BACKUP_BASE = Path('/var/backups/maxhigh-production')
DROPIN = Path('/etc/systemd/system/maxhigh-uat.service.d/90-production-release.conf')
SERVICE = 'maxhigh-uat.service'  # Service behind production port 18080 (historical name). UAT is maxhigh-uat2 on 18082.
PROD_PORT, UAT_PORT, PROBE_PORT = 18080, 18082, 18780
PUBLIC_URL = 'https://maxhigh.online'
NODE = '/opt/maxhigh-node-24.22.2/bin/node'
GROUP = 'maxhigh-stage-preview'
ENV = {'PATH': '/usr/bin:/bin', 'HOME': '/root', 'LANG': 'C.UTF-8'}
KIT = Path(__file__).resolve().parent
HEX40, HEX64 = re.compile(r'[0-9a-f]{40}'), re.compile(r'[0-9a-f]{64}')


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def load_candidate(path=None):
    value = json.loads(Path(path or KIT / 'candidate.json').read_text())
    require(HEX40.fullmatch(value.get('sha', '')) is not None, 'candidate.json: sha must be a full 40-hex commit')
    for key in ('archiveSha256', 'manifestSha256'):
        require(HEX64.fullmatch(value.get(key, '')) is not None, f'candidate.json: {key} must be 64 hex (successful builder output)')
    require(isinstance(value.get('publicAssets'), int) and value['publicAssets'] > 0, 'candidate.json: publicAssets required')
    require(value.get('games') == 100, 'candidate.json: the contracted catalog is 100 games')
    require(re.fullmatch(r'[a-z0-9-]{1,32}', value.get('attempt', '')) is not None, 'candidate.json: attempt label required')
    return value


# Candidate identity: loaded once at start-up by main(); tests inject their own.
CANDIDATE = None
SHA = BACKUP = RELEASE = SCRATCH_DB = None


def bind(candidate):
    global CANDIDATE, SHA, BACKUP, RELEASE, SCRATCH_DB
    CANDIDATE, SHA = candidate, candidate['sha']
    BACKUP = BACKUP_BASE / f"{SHA}-{candidate['attempt']}"  # never reused: backup() refuses an existing directory
    RELEASE = ROOT / 'releases' / SHA
    SCRATCH_DB = f"maxhigh_prod_verify_{SHA[:12]}_{re.sub('[^a-z0-9]', '', candidate['attempt'])[:16]}"


def run(args, *, cwd=None, env=None, input=None, timeout=120):
    result = subprocess.run(args, cwd=cwd, env=env or ENV, input=input,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    # Deliberately do not echo stderr, command payloads, or credential-bearing environment.
    require(result.returncode == 0, f'Command failed: {Path(args[0]).name} (exit {result.returncode}); no secrets printed')
    return result.stdout.decode()


def sql(statement, database=None, input=None):
    args = ['/usr/bin/mariadb', '--no-defaults', '--protocol=socket', '--user=root', '--batch', '--skip-column-names']
    if database:
        args.append(database)
    if input is None:
        args += ['--execute', statement]
    return run(args, input=input, timeout=300)


def sha256(file):
    with Path(file).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def health(port):
    with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=5) as response:
        value = json.load(response)
    require(value.get('ok') is True, 'Backend health failed')
    return value['release']


def healthy(port, expected):
    for _ in range(45):
        try:
            if health(port) == expected:
                return
        except Exception:
            pass
        time.sleep(2)
    raise RuntimeError(f'Health failed on port {port}')


def protected_write(path, data, mode=0o640, group=True):
    """Write via a temporary file and rename, so readers never see a partial file."""
    path = Path(path)
    require(not path.is_symlink(), 'Refusing symlink destination')
    temp = path.with_name('.' + path.name + '.tmp')
    require(not temp.exists() or not temp.is_symlink(), 'Refusing symlink temporary file')
    temp.write_text(data)
    temp.chmod(mode)
    os.chown(temp, 0, grp.getgrnam(GROUP).gr_gid if group else 0)
    os.replace(temp, path)


def public_entry_assets():
    with urllib.request.urlopen(PUBLIC_URL + '/', timeout=20) as response:
        require(response.status == 200, 'Production HTTPS homepage failed')
        html = response.read().decode()
    paths = sorted(set(re.findall(r'(?:src|href)="(/assets/[^" ]+\.(?:js|css))"', html)))
    require(paths, 'No production entry assets found')
    return paths


def served_release_matches(release_dir):
    """True when EVERY public entry asset is byte-identical to the given release directory."""
    for asset in public_entry_assets():
        local = Path(release_dir) / '.output/public' / asset.lstrip('/')
        if not local.is_file():
            return False
        live = urllib.request.urlopen(PUBLIC_URL + asset, timeout=20).read()
        if hashlib.sha256(live).hexdigest() != sha256(local):
            return False
    return True


def main_pid_cwd():
    pid = run(['/usr/bin/systemctl', 'show', SERVICE, '-p', 'MainPID', '--value']).strip()
    require(pid.isdigit() and pid != '0', 'Production service has no running main process')
    return Path(os.readlink(f'/proc/{pid}/cwd'))


def discover_live():
    """Prove which release production actually serves. Every independent source must agree."""
    require(ROOT.resolve() == ROOT and ROOT.is_dir(), 'Unexpected production layout; stop for review')
    require(DROPIN.is_file(), 'Production override missing: not the layout this kit upgrades; stop for review')
    target = json.loads((ROOT / 'target.json').read_text())
    previous = target.get('sha', '')
    require(HEX40.fullmatch(previous) is not None, 'target.json has no valid release SHA')
    release = ROOT / 'releases' / previous
    require(json.loads((release / 'release-validation.json').read_text()).get('sha') == previous,
            'Live release directory manifest does not match target.json')
    require(health(PROD_PORT) == previous, 'Backend health disagrees with target.json')
    require(main_pid_cwd() == ROOT, 'Production process is not running from the production root')
    require(served_release_matches(release), 'Public site does not serve the release named in target.json; stop for review')
    require(previous != SHA, 'Candidate is already the live release')
    return {'sha': previous, 'database': target['database'], 'uat': health(UAT_PORT)}


def identity(live):
    # Database identity comes from the production runtime environment; values are compared, never printed.
    code = "console.log(JSON.stringify(Object.fromEntries(['MYSQL_HOST','MYSQL_PORT','MYSQL_DATABASE','MYSQL_USER','DATABASE_URL','MAXHIGH_POLICY_TEST_FILE','MAXHIGH_POLICY_TEST_OVERRIDE'].map(k=>[k,process.env[k]||'']))))"
    values = json.loads(run([NODE, '--env-file=' + str(ROOT / '.env.production'), '--input-type=module', '-e', code]))
    require(not any(values.get(k) for k in ['DATABASE_URL', 'MAXHIGH_POLICY_TEST_FILE', 'MAXHIGH_POLICY_TEST_OVERRIDE']), 'Unexpected URL or policy override; stop for review')
    require(values['MYSQL_HOST'] == '127.0.0.1' and values['MYSQL_PORT'] == '3306', 'Unexpected database endpoint')
    require(re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', values['MYSQL_DATABASE']) is not None, 'Invalid database identifier')
    db = {k: values[k] for k in ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_DATABASE', 'MYSQL_USER']}
    require(db == live['database'], 'Runtime environment and target.json name different databases')
    return db


def ledger(database):
    text = sql("START TRANSACTION WITH CONSISTENT SNAPSHOT; "
               "SELECT 'users',COUNT(*),COALESCE(SUM(balance),0) FROM users; "
               "SELECT 'transactions',COUNT(*),COALESCE(SUM(amount),0) FROM transactions; "
               "SELECT 'negative',COUNT(*) FROM users WHERE balance<0; "
               "SELECT 'orphans',COUNT(*) FROM transactions t LEFT JOIN users u ON u.id=t.user_id WHERE u.id IS NULL; "
               "SELECT 'chain_breaks',COUNT(*) FROM (SELECT amount,balance_after,LAG(balance_after) OVER(PARTITION BY user_id ORDER BY seq) prev FROM transactions) x WHERE prev IS NOT NULL AND ROUND(prev+amount-balance_after,2)<>0; COMMIT;", database)
    rows = {r.split('\t')[0]: r.split('\t')[1:] for r in text.strip().splitlines()}
    require(all(rows[k][0] == '0' for k in ['negative', 'orphans', 'chain_breaks']), 'Existing ledger violation; stop for review')
    return rows


def protected_files():
    """UAT/shared configuration that this kit must never change."""
    paths = [LEGACY / '.env.uat', LEGACY / 'uat2-run.mjs', LEGACY / 'pm2-uat2.config.cjs',
             Path('/etc/systemd/system/maxhigh-uat2.service'), Path('/etc/caddy/Caddyfile'), DROPIN]
    return {str(p): sha256(p) for p in paths if p.exists()}


def plan():
    live = discover_live()
    require(run([NODE, '--version']).strip() == 'v24.22.2', 'Unsupported runtime')
    require(run(['/usr/bin/systemctl', 'show', SERVICE, '-p', 'User', '--value']).strip() == GROUP, 'Service identity changed')
    require(not RELEASE.exists(), 'Candidate release directory already exists; stop for review')
    require(shutil.disk_usage('/var/www').free > 4 * 1024 ** 3, 'Insufficient disk for the release')
    db = identity(live)
    print(json.dumps({'productionUrl': PUBLIC_URL, 'productionService': SERVICE, 'liveRelease': live['sha'],
                      'liveReleaseProof': ['target.json', 'backend health', 'release manifest', 'process cwd', 'all public entry assets'],
                      'candidate': SHA, 'uatRelease': live['uat'], 'database': db, 'uatChanged': False,
                      'ledger': ledger(db['MYSQL_DATABASE'])}, indent=2))
    return live, db


def backup():
    live, db = plan()
    require(not BACKUP.exists(), 'Backup directory already exists; never overwrite it')
    require(shutil.disk_usage(BACKUP_BASE).free > 4 * 1024 ** 3, 'Insufficient disk for backup and isolated restore')
    BACKUP.mkdir(parents=True, mode=0o700)
    BACKUP.chmod(0o700)
    name = db['MYSQL_DATABASE']
    require(sql(f"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='{name}' AND table_type='BASE TABLE' AND engine<>'InnoDB'").strip() == '0', 'Nontransactional tables require a different backup procedure')
    require(sql(f"SELECT (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='{name}')+(SELECT COUNT(*) FROM information_schema.events WHERE event_schema='{name}')").strip() == '0', 'Routines/events require isolated restore review')
    # Exact copies of the switchable runtime files, used by rollback.
    for filename in ['target.json', 'run.mjs', 'pm2.config.cjs']:
        shutil.copy2(ROOT / filename, BACKUP / f'previous-{filename}')
    with tarfile.open(BACKUP / 'application.tar.gz', 'w:gz', compresslevel=3) as archive:
        for p in [ROOT / 'target.json', ROOT / 'run.mjs', ROOT / 'pm2.config.cjs', ROOT / '.env.production',
                  Path('/etc/systemd/system/maxhigh-uat.service'), Path('/etc/systemd/system/maxhigh-uat.service.d'),
                  Path('/etc/caddy/Caddyfile')]:
            if p.exists():
                archive.add(p, arcname=str(p).lstrip('/'))
    with tarfile.open(BACKUP / 'application.tar.gz', 'r:gz') as archive:
        for item in archive:
            if item.isfile():
                with archive.extractfile(item) as stream:
                    while stream.read(1024 * 1024):
                        pass
    with gzip.open(BACKUP / 'application.tar.gz', 'rb') as stream:
        while stream.read(1024 * 1024):
            pass  # Full gzip CRC/trailer validation.
    args = ['/usr/bin/mariadb-dump', '--no-defaults', '--protocol=socket', '--user=root',
            '--single-transaction', '--quick', '--hex-blob', '--triggers', '--routines', '--events',
            '--skip-comments', '--skip-dump-date', '--skip-extended-insert', '--order-by-primary', name]
    dump = BACKUP / 'database.sql.gz'
    with (BACKUP / 'dump-errors.private').open('wb') as errors:
        process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=errors, env=ENV)
        with gzip.open(dump, 'wb', compresslevel=3) as output:
            shutil.copyfileobj(process.stdout, output)
        process.stdout.close()
        require(process.wait(timeout=600) == 0, 'Database dump failed; no activation permitted')
    data_hash = hashlib.sha256()
    with gzip.open(dump, 'rb') as payload:
        for line in payload:
            require(not re.search(rb'(?i)^\s*(?:USE\s|CREATE\s+DATABASE\b)', line), 'Dump changes schema context; isolated restore requires review')
            require(('`' + name + '`.').encode() not in line, 'Qualified source-schema references require restore review')
            if line.startswith(b'INSERT INTO '):
                data_hash.update(line)
    scratch = SCRATCH_DB
    require(not sql(f"SHOW DATABASES LIKE '{scratch}'").strip(), 'Isolated verification database already exists')
    sql(f'CREATE DATABASE `{scratch}`')
    with (BACKUP / 'restore-errors.private').open('wb') as errors:
        process = subprocess.Popen(['/usr/bin/mariadb', '--no-defaults', '--protocol=socket', '--user=root', '--binary-mode', scratch],
                                   stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=errors, env=ENV)
        with gzip.open(dump, 'rb') as payload:
            shutil.copyfileobj(payload, process.stdin)
        process.stdin.close()
        require(process.wait(timeout=600) == 0, 'Isolated restore failed; no activation permitted')
    restored_hash = hashlib.sha256()
    with (BACKUP / 'restore-export-errors.private').open('wb') as errors:
        process = subprocess.Popen(args[:-1] + ['--no-create-info', '--skip-triggers', '--skip-routines', '--skip-events', scratch],
                                   stdout=subprocess.PIPE, stderr=errors, env=ENV)
        for line in process.stdout:
            if line.startswith(b'INSERT INTO '):
                restored_hash.update(line)
        process.stdout.close()
        require(process.wait(timeout=600) == 0, 'Restored data export failed')
    require(data_hash.hexdigest() == restored_hash.hexdigest(), 'Restored records differ from backup snapshot')
    tables = sql(f"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='{name}' AND table_type='BASE TABLE'").strip()
    restored = sql(f"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='{scratch}' AND table_type='BASE TABLE'").strip()
    require(tables == restored and int(tables) > 0, 'Restored table inventory mismatch')
    record = {'sha': SHA, 'candidate': CANDIDATE, 'verified': True,
              'previousRelease': live['sha'], 'uatRelease': live['uat'], 'database': db,
              'protectedFiles': protected_files(), 'restoreDatabase': scratch, 'restoredTables': int(restored),
              'snapshotLedger': ledger(scratch), 'restoredDataSha256': restored_hash.hexdigest(),
              'hashes': {p.name: sha256(p) for p in [BACKUP / 'application.tar.gz', dump] +
                         [BACKUP / f'previous-{f}' for f in ['target.json', 'run.mjs', 'pm2.config.cjs']]}}
    write_record('verified.json', record)
    print(json.dumps({'backupVerified': True, 'path': str(BACKUP), 'previousRelease': live['sha'],
                      'restoredTables': int(restored), 'sourceDatabaseWritten': False}))


def write_record(name, value):
    path = BACKUP / name
    require(not path.is_symlink(), 'Refusing symlink record')
    path.write_text(json.dumps(value, indent=2))
    path.chmod(0o600)


def state():
    value = json.loads((BACKUP / 'verified.json').read_text())
    require(value['verified'] is True and value['sha'] == SHA, 'Verified backup required')
    for name, expected in value['hashes'].items():
        require(sha256(BACKUP / name) == expected, 'Backup checksum changed')
    require(value['protectedFiles'] == protected_files(), 'UAT/shared configuration, Caddy or the service override changed')
    require(HEX40.fullmatch(value['previousRelease']) is not None, 'Backup does not record the previous release')
    return value


def unpack(archive, destination):
    seen, total = set(), 0
    with tarfile.open(archive, 'r:gz') as source:
        for item in source:
            if item.name in ('.', './') and item.isdir():
                continue
            name = PurePosixPath(item.name)
            require(not name.is_absolute() and '..' not in name.parts and '\\' not in item.name and name.parts
                    and name.parts[0] in ('.output', 'drizzle', 'release-validation.json'), 'Forbidden archive path')
            require((item.isfile() or item.isdir()) and not item.issparse() and name not in seen, 'Forbidden archive entry')
            seen.add(name)
            total += item.size
            require(item.size >= 0 and len(seen) <= 30000 and total <= 2 * 1024 ** 3, 'Archive size limits exceeded')
            target = destination.joinpath(*name.parts)
            if item.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with source.extractfile(item) as incoming, target.open('xb') as outgoing:
                    shutil.copyfileobj(incoming, outgoing)


def stage():
    value = state()
    require(health(PROD_PORT) == value['previousRelease'] and health(UAT_PORT) == value['uatRelease'], 'Backend baseline changed')
    require(sha256(INBOX / 'release.tgz') == CANDIDATE['archiveSha256'], 'Archive checksum mismatch')
    require(not RELEASE.exists(), 'Candidate release directory exists; stop instead of overwriting')
    with tempfile.TemporaryDirectory(prefix='.extract-', dir=ROOT / 'releases') as temporary:
        temp = Path(temporary)
        unpack(INBOX / 'release.tgz', temp)
        manifest_file = temp / 'release-validation.json'
        require(sha256(manifest_file) == CANDIDATE['manifestSha256'], 'Manifest checksum mismatch')
        manifest = json.loads(manifest_file.read_text())
        require(manifest['sha'] == SHA and manifest['platform'] == 'linux' and manifest['arch'] == 'x64'
                and manifest['nodeVersion'] == '24.22.2' and manifest['publicAssets'] == CANDIDATE['publicAssets']
                and manifest['games'] == 100, 'Unexpected release identity/runtime/inventory')
        dbname = value['database']['MYSQL_DATABASE']
        completed = dict(row.split('\t') for row in sql('SELECT version,checksum FROM _maxhigh_migrations', dbname).strip().splitlines())
        for file in sorted((temp / 'drizzle').glob('[0-9][0-9][0-9][0-9]_*.sql')):
            require(completed.get(file.name) == sha256(file), 'Pending/changed migration; no automatic application permitted')
        for file in temp.rglob('*'):
            file.chmod(0o750 if file.is_dir() else 0o640)
            os.chown(file, 0, grp.getgrnam(GROUP).gr_gid)
        temp.chmod(0o750)
        os.chown(temp, 0, grp.getgrnam(GROUP).gr_gid)
        temp.rename(RELEASE)
    run([NODE, str(RELEASE / '.output/staging/verify.mjs')], env={**ENV, 'RELEASE_MANIFEST_SHA256': CANDIDATE['manifestSha256']}, timeout=300)
    # Read-only probe of the CANDIDATE on 18780 using the kit's run.mjs; the live target.json is not touched.
    with (BACKUP / 'candidate.private.log').open('wb') as log:
        process = subprocess.Popen(['/usr/sbin/runuser', '-u', GROUP, '--', NODE, '--max-old-space-size=256',
                                    '--env-file=' + str(ROOT / '.env.production'), str(KIT / 'run.mjs')],
                                   cwd=ROOT, env={**ENV, 'PRODUCTION_PROBE': '1', 'PRODUCTION_PROBE_SHA': SHA},
                                   stdout=log, stderr=log, start_new_session=True)
        try:
            healthy(PROBE_PORT, SHA)
            with urllib.request.urlopen(f'http://127.0.0.1:{PROBE_PORT}/', timeout=15) as response:
                require(response.status == 200 and response.headers.get('x-maxhigh-preview') == 'read-only', 'Candidate must enforce read-only probing')
        finally:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=60)
    write_record('staged.json', {'sha': SHA, 'previousRelease': value['previousRelease'], 'verified': True})
    print(json.dumps({'staged': SHA, 'candidateReadOnlyHealth': True, 'productionChanged': False, 'uatChanged': False}))


def restart():
    run(['/usr/bin/systemctl', 'restart', SERVICE])


def rollback():
    """Return to the release PROVEN live at backup time (verified.json), restoring the exact previous runtime files."""
    value = json.loads((BACKUP / 'verified.json').read_text())
    require(value['verified'] is True and value['sha'] == SHA, 'Verified release record required')
    previous = value['previousRelease']
    require(HEX40.fullmatch(previous) is not None, 'Verified record has no previous release')
    for filename in ['target.json', 'run.mjs', 'pm2.config.cjs']:
        copy = BACKUP / f'previous-{filename}'
        require(sha256(copy) == value['hashes'][copy.name], f'Backup copy of {filename} changed')
    require(json.loads((BACKUP / 'previous-target.json').read_text())['sha'] == previous, 'Backup target does not name the previous release')
    require(json.loads((ROOT / 'releases' / previous / 'release-validation.json').read_text())['sha'] == previous,
            'Previous release directory is missing or altered')
    for filename in ['run.mjs', 'pm2.config.cjs', 'target.json']:  # target.json last: the switch itself
        protected_write(ROOT / filename, (BACKUP / f'previous-{filename}').read_text())
    restart()
    healthy(PROD_PORT, previous)
    require(health(UAT_PORT) == value['uatRelease'], 'UAT health changed independently')
    print(json.dumps({'rolledBack': previous, 'databaseRestoredOverLive': False, 'uatChanged': False}))


def activate():
    value = state()
    staged = json.loads((BACKUP / 'staged.json').read_text())
    require(staged['sha'] == SHA and staged['previousRelease'] == value['previousRelease'], 'Staging/backup gate required')
    live = discover_live()  # re-proves the baseline right before switching
    require(live['sha'] == value['previousRelease'] and live['uat'] == value['uatRelease'], 'Baseline changed since backup')
    require(json.loads((RELEASE / 'release-validation.json').read_text())['sha'] == SHA, 'Staged release missing')
    try:
        for filename in ['run.mjs', 'pm2.config.cjs']:
            protected_write(ROOT / filename, (KIT / filename).read_text())
        protected_write(ROOT / 'target.json', json.dumps({'sha': SHA, 'database': value['database']}))
        restart()
        verify()
    except BaseException:
        rollback()
        raise RuntimeError('Activation failed; previous production runtime restored')


def verify():
    value = state()
    healthy(PROD_PORT, SHA)
    require(health(UAT_PORT) == value['uatRelease'], 'UAT release changed')
    require(served_release_matches(RELEASE), 'Production serves a different release asset')
    require(main_pid_cwd() == ROOT, 'Production process is not running from the production root')
    active = run(['/usr/bin/systemctl', 'is-active', SERVICE]).strip()
    require(active == 'active', 'Production systemd service is not active')
    error_log = ROOT / 'logs/production-error.log'
    errors = ''
    if error_log.exists():
        with error_log.open('rb') as stream:
            stream.seek(max(0, error_log.stat().st_size - 1024 * 1024))
            errors = stream.read().decode('utf-8', errors='replace')
    summary = {'release': SHA, 'previousRelease': value['previousRelease'], 'url': PUBLIC_URL, 'backendHealth': True,
               'allPublicEntryAssetsMatchRelease': True, 'uatUnchanged': True,
               'ledger': ledger(value['database']['MYSQL_DATABASE']), 'systemdActive': active,
               'errorLogSuspectLines': len(re.findall(r'(?im)^.*(?:unhandled|ECONNREFUSED|Failed query|fatal).*$', errors)),
               'gamesVerifiedByThisCommand': 0,
               'separateAcceptance': 'Authenticated non-developer verification of all 100 games (verify-games.mjs)'}
    write_record('postdeploy.json', summary)
    print(json.dumps(summary, indent=2))


def deploy():
    backup()
    stage()
    activate()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['plan', 'backup', 'stage', 'activate', 'deploy', 'verify', 'rollback'])
    args = parser.parse_args()
    require(os.geteuid() == 0 and os.name == 'posix', 'Administrator must run this reviewed kit as root')
    bind(load_candidate())
    require(KIT == Path('/usr/local/libexec') / ('maxhigh-release-' + SHA[:7]),
            'Install the reviewed kit in /usr/local/libexec/maxhigh-release-<candidate sha7> first')
    for item in [KIT] + [KIT / f for f in ['operate.py', 'run.mjs', 'pm2.config.cjs', 'candidate.json']]:
        require(not item.is_symlink() and item.stat().st_uid == 0 and not item.stat().st_mode & 0o022,
                'Operator kit must be root-owned and not writable by other identities')
    os.umask(0o077)
    globals()[args.action]()


if __name__ == '__main__':
    main()
