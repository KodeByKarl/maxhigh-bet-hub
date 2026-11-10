#!/usr/bin/env python3
"""Finite authenticated staging continuation; never a root service or arbitrary-command runner."""
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

HERE = Path(__file__).resolve().parent
STATE = Path('/var/lib/maxhigh-bootstrap')


def empty_checkpoint_allowed(pending, table_count):
    require(not pending or table_count == 0, 'Pending migration on a nonempty/existing schema needs a tested backup and separate review')


def recovery_ready(value):
    return (isinstance(value, dict) and value.get('schema') == DB and value.get('applicationSha') == SHA
            and all(value.get(key) is True for key in ('restoreCompared', 'corruptionRejected', 'offHostRetrieved', 'keyRecoveryVerified'))
            and re.fullmatch(r'[a-f0-9]{64}', value.get('ciphertextSha256', '')) is not None)


def publish(report):
    no_links(STATE)
    require(STATE.is_dir() and STATE.stat().st_uid == 0 and STATE.stat().st_mode & 0o022 == 0, 'Trusted status directory required')
    fd, name = tempfile.mkstemp(prefix='.qualification-', dir=STATE)
    with os.fdopen(fd, 'w') as stream:
        json.dump(report, stream, indent=2)
    os.chmod(name, 0o644)
    os.replace(name, STATE / 'staging-qualification.json')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--approve', required=True)
    args = parser.parse_args()
    gate(args.approve, 'QUALIFY-PRIVATE-STAGING')
    report = dict(applicationSha=SHA, status='running', migrationApplied=False, previewStarted=False,
                  productionEnabled=False, financialOperationsEnabled=False, recoveryCertified=False)
    publish(report)
    try:
        require(run(['systemctl', 'is-active', 'caddy.service'], accepted=(0, 3, 4)).returncode != 0, 'Unexpected active public proxy; review first')
        require(not [line for line in run(['ss', '-H', '-lnt']).stdout.splitlines()
                     if re.search(r':(?:80|443)\s', line)], 'Unexpected HTTP/HTTPS listener')
        report['phase'] = 'pinned-release-preparation'
        publish(report)
        run(['python3', HERE / 'prepare_release.py', '--approve', 'PREPARE-PRIVATE-RELEASE'])
        prepared = json.loads((STATE / 'release-preparation.json').read_text())
        require(prepared.get('status') in ('prepared-awaiting-migration', 'prepared-schema-ready'), 'Preparation failed')
        pending = prepared['migrations']['pending']
        empty_checkpoint_allowed(pending, prepared['database']['tableCount'])
        if pending:
            # Only a brand-new empty synthetic staging schema is admitted automatically.
            # Existing/partial/data-bearing schemas are never reset, dropped or auto-restored.
            checkpoint = dict(schema=DB, applicationSha=SHA, kind='empty-schema-metadata', tableCount=0,
                              migrationFiles=pending, rollback='leave preview stopped; no destructive database rollback')
            managed_file(ADMIN / 'empty-schema-checkpoint.json', json.dumps(checkpoint, sort_keys=True) + '\n')
            report['phase'] = 'fresh-staging-migrations'
            report['migrationApplyAttempted'] = True
            report['migrationMayBePartial'] = True
            publish(report)
            with contextlib.redirect_stdout(io.StringIO()):
                stage.migration(SimpleNamespace(phase='migrate-apply', recovery_checkpoint_reviewed=True))
            report['migrationApplied'] = True
            report['migrationMayBePartial'] = False
        stage.verify_database()
        report['schemaVerified'] = True
        report['phase'] = 'recovery-gate'
        publish(report)
        # Never create/ask for a recovery private key or invent off-host backup success.
        certification = ADMIN / 'recovery-verified.json'
        if not certification.exists():
            report['status'] = 'blocked-recovery-configuration'
            report['blockers'] = ['No verified backup/isolated restore/off-host retrieval/key-recovery report',
                                  'Preview remains OFF; complete recovery procedures before the startup gate']
            publish(report)
            print('Schema prepared; recovery gate incomplete. No preview/public traffic started.')
            return
        secret_file(certification)
        recovery = json.loads(certification.read_text())
        require(recovery_ready(recovery), 'Recovery report incomplete or for a different schema/release')
        ciphertext = Path(recovery.get('backupPath', ''))
        require(ciphertext.parent == BACKUPS and ciphertext.name.endswith('.sql.gz.age'), 'Recovery ciphertext must be in private staging backups')
        secret_file(ciphertext)
        require(digest(ciphertext) == recovery['ciphertextSha256'], 'Recovery ciphertext hash no longer matches')
        report['recoveryCertified'] = True
        report['phase'] = 'private-preview-start'
        publish(report)
        stage.start(SimpleNamespace(isolation_reviewed=True, observation_reviewed=True))
        report['previewStarted'] = True
        report['status'] = 'private-preview-smoke-passed'
        report['next'] = 'Observe resources/logs and run workstation browser smoke; production remains blocked'
        publish(report)
    except Exception as error:
        # If this invocation reached startup, stop only its dedicated preview on failure.
        if report.get('previewStarted'):
            run(['systemctl', 'stop', SERVICE], accepted=(0, 5))
        report['status'] = 'failed'
        report['error'] = str(error) if isinstance(error, RuntimeError) else type(error).__name__
        publish(report)
        raise


if __name__ == '__main__':
    finish(main)
