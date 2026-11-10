#!/usr/bin/env python3
"""One-shot private release preparation: extraction/verification/SQL dry-run only."""
import argparse
import contextlib
import io
import json
import os
from pathlib import Path
import re
import tempfile
from types import SimpleNamespace

from common import *
import stage

STATE = Path('/var/lib/maxhigh-bootstrap')
INBOX = Path('/home/maxhigh-ops/maxhigh-release-e89359f')


def grants_readonly(grants):
    return bool(grants) and all('WITH GRANT OPTION' not in grant and re.match(
        r'^GRANT (USAGE ON \*\.\*|SELECT ON `maxhigh_staging`\.\*) TO ', grant) for grant in grants) \
        and any('SELECT ON `maxhigh_staging`.*' in grant for grant in grants)


def accepted_pending(pending, expected):
    require(isinstance(pending, list) and (pending == [] or pending == expected),
            'Unexpected partial migration plan; stop for schema review')


def publish(report):
    no_links(STATE)
    require(STATE.is_dir() and STATE.stat().st_uid == 0 and STATE.stat().st_mode & 0o022 == 0,
            'Expected root-controlled bootstrap status directory')
    fd, name = tempfile.mkstemp(prefix='.release-status-', dir=STATE)
    with os.fdopen(fd, 'w') as output:
        json.dump(report, output, indent=2)
    os.chmod(name, 0o644)
    os.replace(name, STATE / 'release-preparation.json')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--approve', required=True)
    args = parser.parse_args()
    gate(args.approve, 'PREPARE-PRIVATE-RELEASE')
    report = dict(status='running', applicationSha=SHA, archiveSha256=ARCHIVE_HASH,
                  migrationApplied=False, applicationStarted=False, publicTrafficEnabled=False)
    publish(report)
    try:
        bootstrap = json.loads((STATE / 'status.json').read_text())
        require(bootstrap.get('status') == 'complete-runtime-setup' and bootstrap.get('applicationSha') == SHA,
                'Successful matching runtime bootstrap required')
        stage.preview_off()
        resources(extra_bytes=2 * 1024**3)
        stage.extract(SimpleNamespace(inbox=str(INBOX)))
        report['payloadVerified'] = True
        report['games'] = 100
        report['publicAssets'] = 3987
        report['releaseDirectory'] = str(RELEASE)
        publish(report)
        stage.preview_environment()
        options = client_options(ADMIN / 'preview-client.cnf', DB, 'maxhigh_stage_preview')
        require(sql(options, DB, 'SELECT CURRENT_USER(),DATABASE();') == 'maxhigh_stage_preview@127.0.0.1\t' + DB,
                'Authenticated schema/account differs')
        require(grants_readonly(sql(options, DB, 'SHOW GRANTS FOR CURRENT_USER;').splitlines()),
                'Preview privileges are not SELECT-only')
        tables = sql(options, DB, 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE();')
        report['database'] = dict(connected=True, schema=DB, identity='maxhigh_stage_preview@127.0.0.1',
                                  selectOnly=True, tableCount=int(tables), previewEnvVerified=True)
        publish(report)
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            stage.migration(SimpleNamespace(phase='migrate-plan', recovery_checkpoint_reviewed=False))
        plan = json.loads(output.getvalue())
        expected = sorted(path.name for path in (RELEASE / 'drizzle').glob('[0-9][0-9][0-9][0-9]_*.sql'))
        accepted_pending(plan.get('pending'), expected)
        require(plan.get('apply') is False, 'Migration listing must not apply SQL')
        report['migrations'] = plan
        report['schemaReady'] = not plan['pending']
        if report['schemaReady']:
            stage.verify_database()
        report['status'] = 'prepared-awaiting-migration' if plan['pending'] else 'prepared-schema-ready'
        report['nextGate'] = 'Review migration plan and approve schema apply/backup before private preview startup'
        publish(report)
        print('Private release prepared. Pinned payload and staging SQL identity verified; no migration or startup applied.')
    except Exception as error:
        report['status'] = 'failed'
        report['error'] = str(error) if isinstance(error, RuntimeError) else type(error).__name__
        publish(report)
        raise


if __name__ == '__main__':
    finish(main)
