"""Disposable-database rehearsal of the recovery.py workflow (dump -> gzip -> restore -> compare -> fingerprint).

Runs the REAL command builders, grant parser and fingerprint SQL from deploy/vps-setup/recovery.py against a
loopback test server. It never touches /root, /var/backups, the VPS or any real credential. age encryption is not
exercised here (no age binary is run); recipient handling is covered by test_recovery.py.

Usage: python scripts/qa/rehearse-recovery.py <mariadb-bin-dir> <port> <root-password> <source-schema>
The source schema must already exist on the disposable server and use only InnoDB tables.
"""
import gzip
import hashlib
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'deploy' / 'vps-setup'))
import recovery  # noqa: E402

bin_dir, port, root_password, source = Path(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
restore = source + '_restorecheck'
exe = lambda name: str(bin_dir / (name + '.exe'))
work = Path(tempfile.mkdtemp(prefix='rehearsal-'))
results = []


def check(name, condition, detail=''):
    results.append((name, bool(condition), detail))
    print(('PASS ' if condition else 'FAIL ') + name + (' - ' + detail if detail else ''))


def cnf(name, user, password, database):
    path = work / (name + '.cnf')
    path.write_text(f'[client]\nhost=127.0.0.1\nport={port}\nprotocol=tcp\nuser={user}\npassword={password}\ndatabase={database}\n')
    return path


def run(argv, data=None, ok=(0,)):
    result = subprocess.run(argv, input=data, capture_output=True)
    return result


def sql(options, statement, ok=True):
    result = run([exe('mariadb'), f'--defaults-extra-file={options}', '--batch', '--skip-column-names'], data=statement.encode())
    if ok:
        assert result.returncode == 0, result.stderr.decode()[:300]
    return result.stdout.decode().strip(), result.returncode, result.stderr.decode()


root = cnf('root', 'root', root_password, '')
sql(root, f"DROP DATABASE IF EXISTS `{restore}`; CREATE DATABASE `{restore}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
          "DROP USER IF EXISTS 'rh_backup'@'127.0.0.1'; DROP USER IF EXISTS 'rh_restore'@'127.0.0.1';"
          "CREATE USER 'rh_backup'@'127.0.0.1' IDENTIFIED BY 'bk-test'; CREATE USER 'rh_restore'@'127.0.0.1' IDENTIFIED BY 'rs-test';"
          f"GRANT {', '.join(sorted(recovery.BACKUP_PRIVILEGES))} ON `{source}`.* TO 'rh_backup'@'127.0.0.1';"
          f"GRANT {', '.join(sorted(recovery.RESTORE_PRIVILEGES))} ON `{restore.replace('_', chr(92) + '_')}`.* TO 'rh_restore'@'127.0.0.1';")
backup_cnf = cnf('backup', 'rh_backup', 'bk-test', source)
restore_cnf = cnf('restore', 'rh_restore', 'rs-test', restore)

try:
    # Grants as reported by the real server must satisfy the production grant parser.
    for label, options, database, allowed in (('backup', backup_cnf, source, recovery.BACKUP_PRIVILEGES),
                                              ('restore', restore_cnf, restore, recovery.RESTORE_PRIVILEGES)):
        lines = sql(options, 'SHOW GRANTS FOR CURRENT_USER;')[0].splitlines()
        check(f'{label} account grants pass the reviewed-minimum parser', recovery.grant_violations(lines, database, allowed) == [])
    wide = sql(root, "SHOW GRANTS FOR 'rh_restore'@'127.0.0.1';")[0].splitlines()
    check('parser rejects a deliberately widened grant set', recovery.grant_violations(wide + ['GRANT ALL PRIVILEGES ON *.* TO `x`@`y`'], restore, recovery.RESTORE_PRIVILEGES) != [])
    check('restore account has NO privilege on the source schema',
          sql(restore_cnf, f'SELECT 1 FROM `{source}`.users LIMIT 1;', ok=False)[1] != 0 and
          sql(restore_cnf, f'DROP TABLE `{source}`.users;', ok=False)[1] != 0 and
          sql(restore_cnf, f"INSERT INTO `{source}`.risk_controls(id) VALUES ('x');", ok=False)[1] != 0)
    check('backup account cannot write the source schema', sql(backup_cnf, f"INSERT INTO `{source}`.risk_controls(id) VALUES ('x');", ok=False)[1] != 0)

    # Backup: the production dump command (host-specific nice/ionice prefix removed), gzip -1.
    command = recovery.backup_dump_command(backup_cnf)
    command = [exe('mariadb-dump')] + command[command.index('mariadb-dump') + 1:]
    command[-1] = source
    dump = run(command)
    check('backup dump succeeds with the SELECT/SHOW VIEW/TRIGGER account', dump.returncode == 0, dump.stderr.decode()[:200])
    text = dump.stdout.decode('utf-8', 'replace')
    check('dump has no LOCK TABLES / ALTER / USE / CREATE DATABASE', not any(token in text.upper() for token in ('LOCK TABLES', 'ALTER TABLE', '\nUSE ', 'CREATE DATABASE')))
    archive = work / 'backup.sql.gz'
    archive.write_bytes(gzip.compress(dump.stdout, 1))
    check('gzip integrity', gzip.decompress(archive.read_bytes()) == dump.stdout)

    # Restore only into the empty restore schema, with the restore account.
    check('restore target starts empty', sql(restore_cnf, 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE();')[0] == '0')
    imported = run([exe('mariadb'), f'--defaults-extra-file={restore_cnf}', restore], data=gzip.decompress(archive.read_bytes()))
    check('restore succeeds WITHOUT LOCK TABLES or ALTER privilege', imported.returncode == 0, imported.stderr.decode()[:300])

    # Compare: production compare command, both sides, including the locking-free requirement.
    def canonical(options, database):
        cmd = recovery.compare_dump_command(options, database)
        cmd[0] = exe('mariadb-dump')
        result = run(cmd)
        return result.returncode, hashlib.sha256(result.stdout).hexdigest()
    (rc1, h1), (rc2, h2) = canonical(backup_cnf, source), canonical(restore_cnf, restore)
    check('compare dumps run with the minimal accounts (no LOCK TABLES needed)', rc1 == 0 and rc2 == 0)
    check('canonical data hash equal', h1 == h2)
    old = ['--compact', '--no-create-info', '--skip-triggers', '--skip-add-locks', '--skip-disable-keys', '--skip-extended-insert',
           '--order-by-primary', '--hex-blob', source]
    check('ORIGINAL compare flags are rejected for the backup account (defect reproduced)',
          run([exe('mariadb-dump'), f'--defaults-extra-file={backup_cnf}'] + old).returncode != 0)
    f1, f2 = sql(backup_cnf, recovery.FINGERPRINT_SQL)[0], sql(restore_cnf, recovery.FINGERPRINT_SQL)[0]
    check('schema fingerprints equal', f1 == f2 and len(f1.splitlines()) == 6, f'{len(f1.splitlines())} rows')
    check('ledger equal', sql(backup_cnf, 'SELECT version,checksum FROM _maxhigh_migrations ORDER BY version;')[0] ==
          sql(restore_cnf, 'SELECT version,checksum FROM _maxhigh_migrations ORDER BY version;')[0])

    # Corruption / drift must be detected.
    sql(root, f"UPDATE `{restore}`.users SET balance = balance + 0.01, updated_at = updated_at LIMIT 1;")
    check('data corruption changes the canonical hash', canonical(restore_cnf, restore)[1] != h1)
    sql(root, f"UPDATE `{restore}`.users SET balance = balance - 0.01, updated_at = updated_at LIMIT 1;")
    check('restoring the value restores equality', canonical(restore_cnf, restore)[1] == h1)
    sql(root, f"ALTER TABLE `{restore}`.users DROP CONSTRAINT users_balance_nonnegative;")
    check('a missing CHECK constraint changes the schema fingerprint', sql(restore_cnf, recovery.FINGERPRINT_SQL)[0] != f1)
finally:
    sql(root, f"DROP DATABASE IF EXISTS `{restore}`; DROP USER IF EXISTS 'rh_backup'@'127.0.0.1'; DROP USER IF EXISTS 'rh_restore'@'127.0.0.1';", ok=False)
    for file in work.iterdir():
        file.unlink()
    work.rmdir()

failed = [name for name, passed, _ in results if not passed]
print(f'{len(results) - len(failed)}/{len(results)} checks passed')
sys.exit(1 if failed else 0)
