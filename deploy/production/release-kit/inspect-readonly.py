#!/usr/bin/env python3
"""READ-ONLY production/UAT discovery for MaxHigh. Changes nothing: no writes, restarts, or database modifications.

Answers: which release does the public site ACTUALLY serve, what do systemd / the running process / target.json /
backend health each claim, do they agree, what deployment and rollback records exist, do production and UAT share a
database, and does the database block any contracted game (game-access-readonly-check.sql, READ ONLY transaction).

Secrets are never printed: environment files are reduced to an allowlist of non-secret keys, credential URLs are
redacted, and database access uses the root unix socket (no password handling).

Run as root on the VPS from the directory holding this file and game-access-readonly-check.sql:
    sudo /usr/bin/python3 -I inspect-readonly.py > inspect-$(date +%Y%m%d-%H%M).json
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request

PUBLIC = 'https://maxhigh.online'
UAT_PUBLIC = 'https://uat.maxhigh.online'
ROOTS = [Path('/var/www/maxhigh/production'), Path('/var/www/maxhigh/staging')]
SERVICES = ['maxhigh-uat.service', 'maxhigh-uat2.service']
PORTS = {'production': 18080, 'uat': 18082, 'probe': 18780}
BACKUPS = Path('/var/backups/maxhigh-production')
SAFE_KEYS = ('MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_DATABASE', 'MYSQL_USER', 'PUBLIC_URL', 'NODE_ENV', 'PORT', 'NITRO_PORT', 'RELEASE_SHA')
HERE = Path(__file__).resolve().parent
report = {'readOnly': True, 'errors': []}


def cmd(args, timeout=30):
    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=False)
    return r.stdout if r.returncode == 0 else f'[exit {r.returncode}]'


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha256_file(path):
    with open(path, 'rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def fetch(url, timeout=20):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.status, r.read()


def safe_env(path):
    out = {}
    try:
        text = Path(path).read_text()
    except OSError as e:
        return {'unreadable': type(e).__name__}
    for key in SAFE_KEYS:
        m = re.search(r'^\s*(?:export\s+)?' + key + r'\s*=\s*(.*?)\s*$', text, re.M)
        if m:
            v = m.group(1).strip('"\'')
            out[key] = '[redacted]' if ('@' in v or ('://' in v and key != 'PUBLIC_URL')) else v
    out['DATABASE_URL_present'] = bool(re.search(r'^\s*(?:export\s+)?DATABASE_URL\s*=', text, re.M))
    out['MYSQL_PASSWORD_present'] = bool(re.search(r'^\s*(?:export\s+)?MYSQL_PASSWORD\s*=', text, re.M))
    return out


def step(name, fn):
    try:
        report[name] = fn()
    except Exception as e:  # keep going; every section is independent
        report['errors'].append({name: f'{type(e).__name__}: {str(e)[:200]}'})


# 1. Release directories and pointers
def releases():
    out = {}
    for root in ROOTS:
        info = {'exists': root.exists(), 'isSymlink': root.is_symlink()}
        if root.exists():
            target = root / 'target.json'
            if target.exists():
                t = json.loads(target.read_text())
                info['target.json'] = {'sha': t.get('sha'), 'database': t.get('database', {}).get('MYSQL_DATABASE'),
                                       'mtime': int(target.stat().st_mtime)}
            rel = root / 'releases'
            info['releases'] = {}
            if rel.is_dir():
                for d in sorted(rel.iterdir()):
                    m = d / 'release-validation.json'
                    manifest = json.loads(m.read_text()) if m.exists() else {}
                    info['releases'][d.name] = {'manifestSha': manifest.get('sha'), 'validatedAt': manifest.get('validatedAt'),
                                                'games': manifest.get('games'), 'mtime': int(d.stat().st_mtime),
                                                'manifestSha256': sha256_file(m) if m.exists() else None}
            info['envFiles'] = {p.name: safe_env(p) for p in sorted(root.glob('.env*')) if p.is_file()}
            info['runtimeFiles'] = {p.name: sha256_file(p) for p in sorted(root.glob('*.mjs')) + sorted(root.glob('*.cjs'))}
        out[str(root)] = info
    return out


# 2. systemd units, drop-ins and the actual running processes
def services():
    out = {}
    for s in SERVICES:
        show = cmd(['/usr/bin/systemctl', 'show', s, '-p', 'ActiveState,SubState,MainPID,User,WorkingDirectory,ExecStart,DropInPaths,ActiveEnterTimestamp,NRestarts'])
        props = dict(line.split('=', 1) for line in show.strip().splitlines() if '=' in line)
        pid = props.get('MainPID', '0')
        proc = {}
        if pid.isdigit() and pid != '0':
            proc['cwd'] = os.readlink(f'/proc/{pid}/cwd')
            proc['cmdline'] = Path(f'/proc/{pid}/cmdline').read_bytes().replace(b'\0', b' ').decode()[:400]
            children = cmd(['/usr/bin/pgrep', '-P', pid]).split()
            proc['children'] = []
            for c in children[:10]:
                try:
                    env = Path(f'/proc/{c}/environ').read_bytes().split(b'\0')
                    rel = [e.decode() for e in env if e.startswith(b'RELEASE_SHA=') or e.startswith(b'PORT=')]
                    proc['children'].append({'pid': c, 'cwd': os.readlink(f'/proc/{c}/cwd'),
                                             'cmdline': Path(f'/proc/{c}/cmdline').read_bytes().replace(b'\0', b' ').decode()[:300],
                                             'env': rel})
                except OSError:
                    pass
        unit_text = cmd(['/usr/bin/systemctl', 'cat', s])
        out[s] = {'properties': props, 'process': proc,
                  'unitAndDropIns': re.sub(r'(?im)^(\s*Environment=.*(?:PASSWORD|SECRET|TOKEN|KEY)[^=]*=).*$', r'\1[redacted]', unit_text)}
    return out


# 3. Listeners and Caddy upstreams
def network():
    listeners = [l for l in cmd(['/usr/bin/ss', '-ltnpH']).splitlines() if re.search(r':(1808[02]|18780|443|80)\b', l)]
    caddy = Path('/etc/caddy/Caddyfile')
    text = caddy.read_text() if caddy.exists() else ''
    return {'listeners': listeners, 'caddyfileSha256': sha256_bytes(text.encode()),
            'caddySiteBlocks': re.findall(r'(?m)^([^\s#{][^{]*)\{', text),
            'caddyUpstreams': sorted(set(re.findall(r'reverse_proxy\s+([^\s{]+)', text))),
            'caddyRoots': sorted(set(re.findall(r'root\s+\*?\s*([^\s]+)', text)))}


# 4. Backend identity claims
def health():
    out = {}
    for name, port in PORTS.items():
        try:
            status, body = fetch(f'http://127.0.0.1:{port}/api/health', 5)
            out[name] = {'port': port, 'status': status, 'body': json.loads(body)}
        except Exception as e:
            out[name] = {'port': port, 'unreachable': type(e).__name__}
    return out


# 5. Which release directory the PUBLIC site really serves (checksum of every entry asset)
def served(url):
    status, html = fetch(url + '/')
    assets = sorted(set(re.findall(r'(?:src|href)="(/assets/[^" ]+\.(?:js|css))"', html.decode())))
    live = {a: sha256_bytes(fetch(url + a)[1]) for a in assets}
    matches = {}
    for root in ROOTS:
        rel = root / 'releases'
        if not rel.is_dir():
            continue
        for d in sorted(rel.iterdir()):
            pub = d / '.output/public'
            hits = sum(1 for a, h in live.items() if (pub / a.lstrip('/')).is_file() and sha256_file(pub / a.lstrip('/')) == h)
            matches[str(d)] = f'{hits}/{len(live)}'
    full = [d for d, m in matches.items() if m == f'{len(live)}/{len(live)}']
    return {'status': status, 'entryAssets': len(live), 'releaseDirMatches': matches, 'fullyMatchingReleaseDirs': full}


# 6. Deployment history and rollback records
def history():
    out = {'backups': {}}
    if BACKUPS.is_dir():
        for d in sorted(BACKUPS.iterdir()):
            entry = {'mtime': int(d.stat().st_mtime), 'files': sorted(p.name for p in d.iterdir() if not p.name.endswith('.private'))}
            for rec in ['verified.json', 'staged.json', 'postdeploy.json']:
                if (d / rec).exists():
                    v = json.loads((d / rec).read_text())
                    entry[rec] = {k: v.get(k) for k in ['sha', 'release', 'previousRelease', 'verified', 'backendHealth', 'restoreDatabase']}
            out['backups'][d.name] = entry
    out['kits'] = sorted(p.name for p in Path('/usr/local/libexec').glob('maxhigh-*'))
    out['serviceJournal'] = [l for l in cmd(['/usr/bin/journalctl', '-u', 'maxhigh-uat.service', '-u', 'maxhigh-uat2.service',
                                             '--since', '2026-11-10', '--no-pager', '-o', 'short-iso']).splitlines()
                             if re.search(r'(?i)Started|Stopped|Stopping|Starting|Reloading|Failed|Deactivated', l)][-80:]
    out['caddyJournal'] = [l for l in cmd(['/usr/bin/journalctl', '-u', 'caddy', '--since', '2026-11-10', '--no-pager', '-o', 'short-iso']).splitlines()
                           if re.search(r'(?i)reload|config|started|stopped', l)][-30:]
    return out


# 7. Database sharing and the read-only game-access audit
def database():
    names = {}
    for root in ROOTS:
        for env in root.glob('.env*') if root.exists() else []:
            v = safe_env(env)
            if 'MYSQL_DATABASE' in v:
                names[str(env)] = {'MYSQL_DATABASE': v['MYSQL_DATABASE'], 'MYSQL_USER': v.get('MYSQL_USER')}
    distinct = sorted({v['MYSQL_DATABASE'] for v in names.values()})
    out = {'databaseByEnvFile': names, 'distinctDatabases': distinct}
    sql_file = HERE / 'game-access-readonly-check.sql'
    for db in distinct:
        if re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', db) is None:
            continue
        r = subprocess.run(['/usr/bin/mariadb', '--no-defaults', '--protocol=socket', '--user=root', '--table', db],
                           stdin=sql_file.open('rb'), capture_output=True, timeout=120, check=False)
        out[f'gameAccessCheck:{db}'] = r.stdout.decode() if r.returncode == 0 else f'[exit {r.returncode}] {r.stderr.decode()[:200]}'
        journal = subprocess.run(['/usr/bin/mariadb', '--no-defaults', '--protocol=socket', '--user=root', '--batch', '--skip-column-names', db,
                                  '--execute', 'SET SESSION TRANSACTION READ ONLY; START TRANSACTION; SELECT version FROM _maxhigh_migrations ORDER BY version; ROLLBACK;'],
                                 capture_output=True, timeout=60, check=False)
        out[f'migrationJournal:{db}'] = journal.stdout.decode().split() if journal.returncode == 0 else f'[exit {journal.returncode}]'
    return out


for name, fn in [('releases', releases), ('services', services), ('network', network), ('health', health),
                 ('publicProduction', lambda: served(PUBLIC)), ('publicUat', lambda: served(UAT_PUBLIC)),
                 ('history', history), ('database', database)]:
    step(name, fn)

# Agreement summary: facts that must line up for "production = X" to hold.
try:
    prod_target = report['releases']['/var/www/maxhigh/production'].get('target.json', {}).get('sha')
    report['agreement'] = {
        'targetJsonSha': prod_target,
        'productionHealthSha': report['health']['production'].get('body', {}).get('release'),
        'productionMainPidCwd': report['services']['maxhigh-uat.service']['process'].get('cwd'),
        'publicSiteServesReleaseDirs': report['publicProduction']['fullyMatchingReleaseDirs'],
        'productionAndUatShareDatabase': len(report['database']['distinctDatabases']) == 1,
    }
except Exception as e:
    report['errors'].append({'agreement': f'{type(e).__name__}: {e}'})
print(json.dumps(report, indent=2, default=str))
