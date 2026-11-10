#!/usr/bin/env python3
"""Pinned release extraction, migration, verification and private preview control."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import tarfile
import time
import urllib.error
import urllib.request

from common import *

HERE = Path(__file__).resolve().parent


def verify_release():
    node_ok()
    no_links(RELEASE)
    require(digest(RELEASE / 'release-validation.json') == MANIFEST_HASH, 'Manifest pin mismatch')
    for item in [RELEASE, *RELEASE.rglob('*')]:
        no_links(item)
        require((item.is_dir() or item.is_file()) and item.stat().st_uid == 0
                and item.stat().st_mode & 0o022 == 0, 'Release is not immutable/root-controlled')
    # Independent control code hashes payload BEFORE executing any bundled verifier.
    # Use Node's localeCompare ordering exactly as the artifact builder does.
    code = '''import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';
const r=process.argv[1],m=JSON.parse(fs.readFileSync(path.join(r,'release-validation.json'))),h=createHash('sha256'),b=Buffer.allocUnsafe(65536);
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(d,e.name);if(e.isSymbolicLink()||(!e.isDirectory()&&!e.isFile()))throw Error('entry');if(e.isDirectory())walk(p);else{h.update(path.relative(r,p).replaceAll('\\\\','/')).update('\\0');const f=fs.openSync(p,'r');try{let n;while((n=fs.readSync(f,b,0,b.length,null))>0)h.update(b.subarray(0,n));}finally{fs.closeSync(f);}}}}
walk(path.join(r,'.output'));if(h.digest('hex')!==m.artifactDigest)process.exit(1);'''
    run([NODE, '--input-type=module', '-e', code, RELEASE])
    run(['runuser', '-u', RUNTIME, '--', 'env', 'RELEASE_MANIFEST_SHA256=' + MANIFEST_HASH,
         NODE, RELEASE / '.output/staging/verify.mjs'])


def extract(args):
    import grp
    preview_off()
    resources(extra_bytes=2 * 1024**3)
    inbox = Path(args.inbox or '')
    verify_inbox(inbox)
    with tarfile.open(inbox / 'release.tgz', 'r:gz') as archive:
        member = archive.getmember('./release-validation.json')
        require(member.isfile() and member.size < 65536, 'Invalid manifest member')
        import hashlib
        require(hashlib.sha256(archive.extractfile(member).read()).hexdigest() == MANIFEST_HASH, 'Untrusted archive manifest')
    if not RELEASE.exists():
        require((ROOT / 'releases').is_dir() and (ROOT / 'releases').stat().st_uid == 0, 'Provision root-owned release parent first')
        run(['env', 'CONFIRM_STAGING_EXTRACT=maxhigh-staging-files-only', 'python3', inbox / 'safe-extract.py',
             '--archive', inbox / 'release.tgz', '--sha256', ARCHIVE_HASH,
             '--manifest-sha256', MANIFEST_HASH, '--destination', ROOT / 'releases'])
        gid = grp.getgrnam(RUNTIME).gr_gid
        for item in [RELEASE, *RELEASE.rglob('*')]:
            no_links(item)
            require(item.is_dir() or item.is_file(), 'Nonregular extracted payload')
            os.chown(item, 0, gid)
            os.chmod(item, 0o750 if item.is_dir() else 0o640)
    verify_release()
    resources()
    print('Pinned release extracted/verified; no SQL or startup performed')


def migration(args):
    preview_off()
    verify_release()
    resources(extra_bytes=1024**3)
    settings = secret_file(ADMIN / '.env.migration')
    command = ['env', 'DOTENV_CONFIG_PATH=/dev/null', NODE, '--env-file=' + str(settings)]
    guard = '''const e=process.env;if(e.DATABASE_URL||e.MYSQL_HOST!=="127.0.0.1"||e.MYSQL_PORT!=="3306"||e.MYSQL_DATABASE!=="maxhigh_staging"||e.MYSQL_USER!=="maxhigh_stage_migrate"||e.CONFIRM_SCHEMA_MIGRATIONS!=="maxhigh_staging")process.exit(1)'''
    run([*command, '--input-type=module', '-e', guard], cwd=RELEASE)
    if args.phase == 'migrate-apply':
        require(args.recovery_checkpoint_reviewed, 'Approve empty-schema checkpoint or tested pre-migration restore point first')
    # Mandatory read-only preflight: any data issue (or checksum mismatch) stops here, before any DDL.
    gate = run([*command, RELEASE / '.output/migrate.mjs', '--preflight'], accepted=(0, 2), cwd=RELEASE)
    gate_report = json.loads(gate.stdout.strip())
    gate_issues = gate_report.get('issues')
    require(isinstance(gate_issues, list), 'Unexpected preflight result')
    require(gate.returncode == 0 and not gate_issues,
            'Migration preflight failed; no database change was made: ' + '; '.join(str(i) for i in gate_issues))
    if args.phase == 'migrate-apply':
        print(json.dumps({'preflight': 'clean'}))
    result = run([*command, RELEASE / '.output/migrate.mjs', *(['--apply'] if args.phase == 'migrate-apply' else [])],
                 accepted=(0,) if args.phase == 'migrate-apply' else (0, 2), cwd=RELEASE)
    value = json.loads(result.stdout.strip())
    require(isinstance(value.get('pending'), list), 'Unexpected migration result')
    print(json.dumps({'apply': value.get('apply'), 'pending': value['pending'], 'exit': result.returncode}))
    if args.phase == 'migrate-apply':
        require(run([*command, RELEASE / '.output/migrate.mjs'], cwd=RELEASE).returncode == 0, 'Pending migrations remain')
        print('Staging migration applied and no pending migrations remain; inspect ledger/constraints before startup')


def verify_database():
    options = client_options(ADMIN / 'preview-client.cnf', DB, 'maxhigh_stage_preview')
    require(sql(options, DB, 'SELECT CURRENT_USER(), DATABASE();') == 'maxhigh_stage_preview@127.0.0.1\t' + DB,
            'Authenticated database identity mismatch')
    grants = sql(options, DB, 'SHOW GRANTS FOR CURRENT_USER;').splitlines()
    for grant in grants:
        require('WITH GRANT OPTION' not in grant and re.match(
            r'^GRANT (USAGE ON \*\.\*|SELECT ON `maxhigh_staging`\.\*) TO ', grant) is not None,
            'Unexpected global/schema/role privileges; DBA review required')
    require(any('SELECT ON `maxhigh_staging`.*' in grant for grant in grants), 'SELECT grant missing')
    sql(options, DB, 'SELECT id,proof FROM financial_operations LIMIT 0; SELECT base_credited,open_game_key FROM play_sessions LIMIT 0;')
    ledger = sql(options, DB, 'SELECT version,checksum FROM _maxhigh_migrations ORDER BY version;')
    import hashlib
    expected = ['%s\t%s' % (p.name, hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted((RELEASE / 'drizzle').glob('[0-9][0-9][0-9][0-9]_*.sql'))]
    require(ledger.splitlines() == expected, 'Migration ledger differs from pinned SQL')
    print('PASS staging identity, SELECT-only grants, health columns and exact migration ledger; secrets not printed')


def preview_environment():
    import grp
    path = ROOT / '.env.preview'
    no_links(path)
    info = path.stat()
    require(info.st_uid == 0 and info.st_gid == grp.getgrnam(RUNTIME).gr_gid
            and info.st_mode & 0o777 == 0o640, 'Preview env owner/group/mode mismatch')
    guard = '''const e=process.env;if(e.DATABASE_URL||e.MYSQL_HOST!=="127.0.0.1"||e.MYSQL_PORT!=="3306"||e.MYSQL_DATABASE!=="maxhigh_staging"||e.MYSQL_USER!=="maxhigh_stage_preview"||e.STAGING_READ_ONLY!=="1"||e.OPERATION_COMPRESSION!=="0"||e.PUBLIC_URL!=="http://127.0.0.1:18080"||!e.MYSQL_PASSWORD)process.exit(1)'''
    run([NODE, '--env-file=' + str(path), '--input-type=module', '-e', guard])


def start(args):
    require(args.isolation_reviewed and args.observation_reviewed, 'Approve Caddy/file isolation and native resource observations first')
    resources(start=True)
    preview_off()
    require(':18080 ' not in run(['ss', '-H', '-lnt']).stdout, 'Port18080 already occupied; do not disturb another process')
    verify_release()
    verify_database()
    preview_environment()
    require(PM2.is_file(), 'Private pinned PM2 runtime missing')
    require(Path('/sys/fs/cgroup/cgroup.controllers').exists(), 'cgroupv2 required')
    protected = run(['runuser', '-u', RUNTIME, '--', 'test', '-r', '/var/www/maxhigh/.env.database'], accepted=(0, 1))
    require(protected.returncode == 1, 'Production credentials readable')
    template = (HERE / 'templates' / SERVICE).read_text()
    require(str(RELEASE) in template and str(PM2) in template, 'Unexpected service template')
    draft = ADMIN / SERVICE
    managed_file(draft, template, 0o600)
    run(['systemd-analyze', 'verify', draft])
    managed_file(Path('/etc/systemd/system') / SERVICE, template, 0o644)
    run(['systemctl', 'daemon-reload'])
    try:
        run(['systemctl', 'start', SERVICE])
        await_health()
        smoke()
    except Exception:
        run(['systemctl', 'stop', SERVICE], accepted=(0, 5))
        raise RuntimeError('Preview failed; only staging unit stopped. Preserve private logs; no release/schema rollback attempted') from None
    print('Preview started and initial smoke passed; NOT enabled at boot. Observe10–15min and stop if resource gates fail.')


def http(path, method='GET'):
    request = urllib.request.Request('http://127.0.0.1:18080' + path, method=method)
    try:
        response = urllib.request.urlopen(request, timeout=5)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read(1024**2)


def await_health(timeout=45):
    """Type=simple returns before PM2's worker is ready; wait without hiding wrong-release responses."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            status, _, raw = http('/api/health')
            if status == 200:
                value = json.loads(raw)
                require(value.get('release') == SHA, 'Unexpected release answering health; stop staging')
                require(value.get('ok') is True, 'Health200 did not assert readiness')
                return
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            pass
        time.sleep(0.5)
    raise RuntimeError('Private preview did not become healthy within bounded startup window')


def smoke():
    status, headers, body = http('/api/health')
    value = json.loads(body)
    require(status == 200 and value.get('ok') is True and value.get('release') == SHA
            and 'no-store' in headers.get('Cache-Control', ''), 'Health/version/no-store failed')
    status, headers, body = http('/')
    require(status == 200 and headers.get('X-Maxhigh-Preview') == 'read-only'
            and b'Application and financial actions are disabled.' in body, 'Read-only notice missing')
    for path, method in [('/_serverFn/paid-round', 'GET'), ('/api/auth/login', 'GET'), ('/admin', 'GET'),
                         ('/api/deposit', 'POST'), ('/api/withdraw', 'POST'), ('/api/health', 'POST'),
                         ('/assets/%2fblocked', 'GET'), ('/api/transfer', 'POST')]:
        status, headers, _ = http(path, method)
        require(status == 423 and 'no-store' in headers.get('Cache-Control', ''), 'Application/financial route not blocked')
    assets = json.loads((RELEASE / '.output/staging/public-assets.json').read_text())
    asset = next(x for x in assets if x['path'].startswith(('images/', 'assets/')) and x['bytes'] < 1024**2
                 and re.fullmatch(r'[A-Za-z0-9_./-]+', x['path']))
    import hashlib
    from urllib.parse import quote
    status, _, raw = http('/' + quote(asset['path'], safe='/'))
    require(status == 200 and hashlib.sha256(raw).hexdigest() == asset['sha256'], 'Static asset HTTP hash mismatch')
    listeners = run(['ss', '-H', '-lnt']).stdout
    matching = [line for line in listeners.splitlines() if ':18080 ' in line]
    require(matching and all('127.0.0.1:18080' in line for line in matching), 'Non-loopback/missing preview listener')
    print('PASS health/version/no-store, read-only notice, eight blocked routes, static hash and loopback binding')


def rollback():
    # First install has no previous release. OFF is its only automatic rollback.
    run(['systemctl', 'stop', SERVICE], accepted=(0, 5))
    preview_off()
    require(':18080 ' not in run(['ss', '-H', '-lnt']).stdout, 'Port18080 still occupied; inspect owner, do not kill unrelated process')
    print('First-deployment rollback complete: staging OFF. No SQL, production process, Caddy or release deletion touched.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['extract', 'verify', 'migrate-plan', 'migrate-apply', 'database-check', 'start', 'smoke', 'rollback'])
    parser.add_argument('--approve', required=True)
    parser.add_argument('--inbox')
    parser.add_argument('--recovery-checkpoint-reviewed', action='store_true')
    parser.add_argument('--isolation-reviewed', action='store_true')
    parser.add_argument('--observation-reviewed', action='store_true')
    args = parser.parse_args()
    gate(args.approve, args.phase.upper())
    if args.phase in ('migrate-plan', 'migrate-apply'):
        migration(args)
    elif args.phase == 'verify':
        verify_release()
    elif args.phase == 'database-check':
        verify_database()
    elif args.phase in ('smoke', 'rollback'):
        globals()[args.phase]()
    else:
        globals()[args.phase](args)


if __name__ == '__main__':
    finish(main)
