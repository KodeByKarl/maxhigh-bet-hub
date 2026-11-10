#!/usr/bin/env python3
"""Encrypted synthetic staging backup/restore; no production or schema-drop operation."""
import argparse
from datetime import datetime, timezone
import os
from pathlib import Path
import re
import subprocess
from common import *

# age X25519 recipients only (bech32: "age1" prefix + 58 data chars). Plugin recipients are rejected.
RECIPIENT = re.compile(r'age1[02-9ac-hj-np-z]{58}')
BACKUP_ACCOUNT = 'maxhigh_stage_backup'
RESTORE_ACCOUNT = 'maxhigh_stage_restore'
BACKUP_PRIVILEGES = frozenset({'SELECT', 'SHOW VIEW', 'TRIGGER'})
RESTORE_PRIVILEGES = frozenset({'SELECT', 'INSERT', 'CREATE', 'INDEX', 'REFERENCES'})
# Identical statements run against the source and the restore schema (each client pins its own DATABASE()).
FINGERPRINT_SQL = """SET SESSION group_concat_max_len=10000000;
SELECT 'tables',COUNT(*),MD5(GROUP_CONCAT(CONCAT_WS('|',table_name,engine,table_collation) ORDER BY table_name)) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'
UNION ALL SELECT 'columns',COUNT(*),MD5(GROUP_CONCAT(CONCAT_WS('|',table_name,ordinal_position,column_name,column_type,is_nullable,IFNULL(column_default,'<null>'),IFNULL(generation_expression,''),IFNULL(collation_name,''),extra) ORDER BY table_name,ordinal_position)) FROM information_schema.columns WHERE table_schema=DATABASE()
UNION ALL SELECT 'constraints',COUNT(*),MD5(GROUP_CONCAT(CONCAT_WS('|',table_name,constraint_name,constraint_type) ORDER BY table_name,constraint_name)) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE()
UNION ALL SELECT 'fk-rules',COUNT(*),MD5(GROUP_CONCAT(CONCAT_WS('|',table_name,constraint_name,delete_rule,update_rule,referenced_table_name) ORDER BY table_name,constraint_name)) FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE()
UNION ALL SELECT 'checks',COUNT(*),MD5(GROUP_CONCAT(CONCAT_WS('|',table_name,constraint_name,check_clause) ORDER BY table_name,constraint_name)) FROM information_schema.check_constraints WHERE constraint_schema=DATABASE()
UNION ALL SELECT 'indexes',COUNT(*),MD5(GROUP_CONCAT(CONCAT_WS('|',table_name,index_name,seq_in_index,column_name,non_unique) ORDER BY table_name,index_name,seq_in_index)) FROM information_schema.statistics WHERE table_schema=DATABASE();"""


def fingerprint_sound(text):
    """A blind fingerprint (zero rows because the account lacks a privilege beyond SELECT) must never count as a match."""
    counts = {}
    for line in text.splitlines():
        parts = line.split('\t')
        if len(parts) == 3 and parts[1].isdigit():
            counts[parts[0]] = int(parts[1])
    return (set(counts) >= {'tables', 'columns', 'constraints', 'fk-rules', 'checks', 'indexes'} and counts['tables'] > 0
            and counts['columns'] >= counts['tables'] and counts['constraints'] >= counts['tables']
            and counts['indexes'] >= counts['tables'])


def assert_isolated_names():
    """The live schema and the restore-check schema are a fixed, distinct, reviewed pair."""
    require(DB == 'maxhigh_staging' and RESTORE_DB == 'maxhigh_staging_restorecheck' and RESTORE_DB != DB
            and re.fullmatch(r'[a-z0-9_]+_restorecheck', RESTORE_DB) is not None and not DB.endswith('_restorecheck'),
            'Source/restore schema names are not the reviewed isolated pair')


def parse_recipients(values):
    values = list(values or [])
    require(1 <= len(values) <= 4 and len(set(values)) == len(values), 'One to four distinct age recipients required')
    require(all(RECIPIENT.fullmatch(value) for value in values), 'Each recipient must be an age X25519 public key')
    return values


def age_encrypt_command(recipients):
    return ['age', *[part for recipient in recipients for part in ('-r', recipient)]]


def backup_dump_command(options):
    # --skip-add-locks keeps LOCK/UNLOCK TABLES out of the dump so the restore account never needs LOCK TABLES;
    # --skip-disable-keys keeps ALTER TABLE out of it so the restore account never needs ALTER.
    return ['nice', '-n', '19', 'ionice', '-c', '3', 'mariadb-dump', '--defaults-extra-file=' + str(options),
            '--single-transaction', '--quick', '--hex-blob', '--skip-lock-tables', '--skip-add-locks',
            '--skip-disable-keys', '--skip-comments', '--skip-add-drop-table', '--no-create-db', '--skip-triggers', DB]


def compare_dump_command(options, database):
    # Consistent snapshot, no table locks: the live UAT/staging service is never blocked.
    return ['mariadb-dump', '--defaults-extra-file=' + str(options), '--single-transaction', '--skip-lock-tables',
            '--compact', '--no-create-info', '--skip-triggers', '--skip-add-locks', '--skip-disable-keys',
            '--skip-extended-insert', '--order-by-primary', '--hex-blob', database]


def grant_violations(lines, database, allowed):
    """Reasons an account's OWN grants exceed the reviewed minimum. Never echoes grant text (may contain hashes)."""
    problems = []
    on_schema = False
    for line in (line.strip() for line in lines):
        if not line:
            continue
        if 'WITH GRANT OPTION' in line:
            problems.append('grant option present')
        if re.match(r'^GRANT USAGE ON \*\.\* TO ', line):
            continue
        match = re.match(r'^GRANT ([A-Z, ]+) ON `([^`]+)`\.\* TO ', line)
        if match is None or re.sub(r'\\+_', '_', match[2]) != database:
            problems.append('privilege outside the reviewed schema')
            continue
        on_schema = True
        if not {item.strip() for item in match[1].split(',')} <= allowed:
            problems.append('privilege beyond the reviewed minimum')
    if not on_schema:
        problems.append('no privileges on the reviewed schema')
    return problems


def require_minimal_account(options, database, allowed):
    lines = sql(options, database, 'SHOW GRANTS FOR CURRENT_USER;').splitlines()
    problems = grant_violations(lines, database, allowed)
    require(not problems, 'Account grants differ from the reviewed minimum (' + ', '.join(sorted(set(problems))) + '); DBA review required')


def pipeline(commands, output=None):
    # Bounded-memory streaming. No shell, plaintext SQL file or logged argv/stdin.
    children = []
    previous = None
    try:
        for number, command in enumerate(commands):
            last = number == len(commands) - 1
            child = subprocess.Popen([str(x) for x in command], stdin=previous,
                                     stdout=output if last and output is not None else (subprocess.DEVNULL if last else subprocess.PIPE),
                                     stderr=subprocess.DEVNULL, env={'PATH': '/usr/bin:/bin', 'HOME': '/root', 'LC_ALL': 'C.UTF-8'})
            if previous is not None:
                previous.close()
            previous = None if last else child.stdout
            children.append(child)
        require(all(code == 0 for code in [p.wait() for p in children]), 'Recovery pipeline failed; partial output is not a backup/verified restore')
    finally:
        if previous is not None:
            previous.close()
        for child in children:
            if child.poll() is None:
                child.terminate()
                child.wait()


def backup(args):
    preview_off()
    resources(extra_bytes=args.peak_bytes)
    require(args.peak_bytes >= 1024**3, 'Approve measured peak disk requirement, at least1GiB for tiny staging')
    assert_isolated_names()
    recipients = parse_recipients(args.recipient)
    options = client_options(ADMIN / 'backup-client.cnf', DB, BACKUP_ACCOUNT)
    require(sql(options, DB, 'SELECT DATABASE();') == DB, 'Wrong backup target')
    require_minimal_account(options, DB, BACKUP_PRIVILEGES)
    require(sql(options, DB, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' AND engine<>'InnoDB';") == '0', 'Non-InnoDB staging table requires separate backup plan')
    require(sql(options, DB, "SELECT (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema=DATABASE())+(SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema=DATABASE())+(SELECT COUNT(*) FROM information_schema.events WHERE event_schema=DATABASE())+(SELECT COUNT(*) FROM information_schema.views WHERE table_schema=DATABASE());") == '0', 'Views/triggers/routines/events require reviewed expanded backup/restore')
    require(BACKUPS.is_dir(), 'Provision root-private backup directory first')
    path = BACKUPS / ('staging-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.sql.gz.age')
    with path.open('xb') as output:
        pipeline([
            backup_dump_command(options),
            ['gzip', '-1'], age_encrypt_command(recipients),
        ], output)
    require(path.stat().st_size > 0, 'Empty backup')
    managed_file(str(path) + '.sha256', digest(path) + '  ' + path.name + '\n')
    print('Encrypted staging backup created: ' + path.name + '; NOT recovery-qualified until decrypt/restore/comparison/off-host retrieval passes')


def restore(args):
    preview_off()
    require(args.peak_bytes >= 1024**3 and args.dump_scope_reviewed, 'Approve peak footprint and schema-neutral SQL inspection first')
    resources(extra_bytes=args.peak_bytes)
    path = secret_file(args.backup)
    require(path.parent == BACKUPS and path.name.endswith('.sql.gz.age') and digest(path) == args.sha256, 'Explicit approved ciphertext identity required')
    identity = secret_file(args.identity)
    assert_isolated_names()
    options = client_options(ADMIN / 'restore-client.cnf', RESTORE_DB, RESTORE_ACCOUNT)
    require_minimal_account(options, RESTORE_DB, RESTORE_PRIVILEGES)
    actual = sql(options, RESTORE_DB, 'SELECT DATABASE(); SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE();')
    require(actual == RESTORE_DB + '\n0', 'Restorecheck target must be precreated and EMPTY; no drop/overwrite')
    require(args.restore_grants_reviewed, 'Approve restore identity has no production or source-staging grants')
    decrypt = [['age', '-d', '-i', identity, path], ['gzip', '-d']]
    # Complete authenticated decryption/decompression validation before any import.
    pipeline([['age', '-d', '-i', identity, path], ['gzip', '-t']])
    pipeline([*decrypt, ['mariadb', '--defaults-extra-file=' + str(options), RESTORE_DB]])
    print('Imported only isolated restorecheck. NOT verified: compare complete schema, ledger, counts and canonical data hashes; no promotion/drop performed.')


def compare(args):
    import hashlib
    preview_off()
    require(args.dump_scope_reviewed, 'Approve canonical schema-neutral comparison and primary-key inventory first')
    assert_isolated_names()
    source = client_options(ADMIN / 'backup-client.cnf', DB, BACKUP_ACCOUNT)
    restored = client_options(ADMIN / 'restore-client.cnf', RESTORE_DB, RESTORE_ACCOUNT)
    require_minimal_account(source, DB, BACKUP_PRIVILEGES)
    require_minimal_account(restored, RESTORE_DB, RESTORE_PRIVILEGES)
    fingerprints = []
    for options, database in ((source, DB), (restored, RESTORE_DB)):
        # Hash a streaming data-only dump in memory-bounded chunks; no plaintext SQL file.
        require(sql(options, database, "SELECT COUNT(*) FROM information_schema.tables t WHERE t.table_schema=DATABASE() AND t.table_type='BASE TABLE' AND NOT EXISTS(SELECT 1 FROM information_schema.table_constraints c WHERE c.table_schema=t.table_schema AND c.table_name=t.table_name AND c.constraint_type='PRIMARY KEY');") == '0', 'Canonical order needs reviewed handling of tables without PK')
        process = subprocess.Popen(compare_dump_command(options, database), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                  env={'PATH': '/usr/bin:/bin', 'HOME': '/root', 'LC_ALL': 'C.UTF-8'})
        try:
            value = hashlib.sha256()
            while chunk := process.stdout.read(65536):
                value.update(chunk)
            process.stdout.close()
            require(process.wait() == 0, 'Canonical comparison dump failed')
            fingerprints.append(value.hexdigest())
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait()
    require(fingerprints[0] == fingerprints[1], 'Restored staging data hash differs (re-check for UAT writes since the backup before suspecting corruption)')
    source_shape, restored_shape = sql(source, DB, FINGERPRINT_SQL), sql(restored, RESTORE_DB, FINGERPRINT_SQL)
    require(fingerprint_sound(source_shape) and fingerprint_sound(restored_shape),
            'Schema fingerprint is empty or incomplete; the account cannot see constraint metadata')
    require(source_shape == restored_shape, 'Restored schema fingerprint differs')
    require(sql(source, DB, 'SELECT version,checksum FROM _maxhigh_migrations ORDER BY version;')
            == sql(restored, RESTORE_DB, 'SELECT version,checksum FROM _maxhigh_migrations ORDER BY version;'), 'Restored migration ledger differs')
    print('PASS canonical staging data, ledger and schema/constraint fingerprints. Corruption rejection, off-host key/retrieval and RTO checks remain manual gates.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['backup', 'restore', 'compare'])
    parser.add_argument('--approve', required=True)
    parser.add_argument('--recipient', action='append', help='age X25519 public key; repeat for the offline recovery key and a disposable verification key')
    parser.add_argument('--peak-bytes', type=int, default=0)
    parser.add_argument('--backup')
    parser.add_argument('--sha256')
    parser.add_argument('--identity')
    parser.add_argument('--dump-scope-reviewed', action='store_true')
    parser.add_argument('--restore-grants-reviewed', action='store_true')
    args = parser.parse_args()
    gate(args.approve, args.phase.upper())
    globals()[args.phase](args)


if __name__ == '__main__':
    finish(main)
