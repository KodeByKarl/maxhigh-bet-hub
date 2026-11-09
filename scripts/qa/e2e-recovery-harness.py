"""End-to-end local harness for deploy/vps-setup/recovery.py against a DISPOSABLE MariaDB server.

Runs the REAL recovery.backup / restore / compare functions with the reviewed production schema names
(maxhigh_staging, maxhigh_staging_restorecheck), the reviewed account names and grants, and real age encryption.
Only OS-specific seams are redirected: ADMIN/BACKUPS paths, the root-ownership/0600 check (not expressible on
Windows), systemctl/RAM gates, and process lookup (nice/ionice removed, tool paths mapped, restricted env dropped).
Disposable test keys only. Never touches the VPS, /root, a real credential or a real MaxHigh key.

Usage: python scripts/qa/e2e-recovery-harness.py <mariadb-bin-dir> <age-dir> <root-password>
Server must listen on 127.0.0.1:3306 (recovery.client_options hard-requires it) and be empty of maxhigh_* schemas.
"""
import hashlib
import inspect
import os
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'deploy' / 'vps-setup'))
import common  # noqa: E402
import recovery  # noqa: E402

MARIA, AGE_DIR, ROOT_PW = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
TMP = Path(tempfile.mkdtemp(prefix='e2e-recovery-'))
ADMIN, BACKUPS, KEYS = TMP / 'admin', TMP / 'backups', TMP / 'keys'
for folder in (ADMIN, BACKUPS, KEYS):
    folder.mkdir()
EXE = {'mariadb': str(MARIA / 'mariadb.exe'), 'mariadb-dump': str(MARIA / 'mariadb-dump.exe'),
       'age': str(AGE_DIR / 'age.exe'), 'gzip': shutil.which('gzip')}
AGE_KEYGEN = str(AGE_DIR / 'age-keygen.exe')
RESULTS, ARGV_LOG = [], []
real_run, real_popen = subprocess.run, subprocess.Popen


def translate(argv):
    argv = [str(x) for x in argv]
    ARGV_LOG.append(list(argv))
    if argv[0] == 'nice':
        argv = argv[argv.index('mariadb-dump'):]
    argv[0] = EXE.get(argv[0], argv[0])
    return argv


class ShimPopen(real_popen):
    def __init__(self, argv, *args, **kwargs):
        kwargs.pop('env', None)
        super().__init__(translate(argv), *args, **kwargs)


def shim_run(argv, *args, **kwargs):
    kwargs.pop('env', None)
    return real_run(translate(argv), *args, **kwargs)


def check(name, condition, detail=''):
    RESULTS.append((name, bool(condition)))
    print(('PASS ' if condition else 'FAIL ') + name + ((' - ' + str(detail)[:230]) if detail else ''))


def refuses(name, call, pattern):
    try:
        call()
    except RuntimeError as error:
        check(name, re.search(pattern, str(error)), str(error))
        return str(error)
    except Exception as error:  # noqa: BLE001
        check(name, False, 'wrong exception: ' + type(error).__name__ + ' ' + str(error))
        return ''
    check(name, False, 'did not refuse')
    return ''


def root(statement, database='', ok=True):
    result = real_run([EXE['mariadb'], '-h127.0.0.1', '-P3306', '-uroot', '-p' + ROOT_PW, '--batch', '--skip-column-names',
                       '--default-character-set=utf8mb4', *([database] if database else [])],
                      input=statement.encode('utf-8'), capture_output=True)
    if ok:
        assert result.returncode == 0, result.stderr.decode('utf-8', 'replace')[:300]
    return result.stdout.decode('utf-8', 'replace').strip()


def cnf(path, user, password, database):
    path.write_text(f'[client]\nhost=127.0.0.1\nport=3306\nprotocol=tcp\nuser={user}\npassword={password}\ndatabase={database}\n')


def keygen(name):
    result = real_run([AGE_KEYGEN, '-o', str(KEYS / name)], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    public = re.search(r'(age1[0-9a-z]+)', result.stderr).group(1)
    return public, KEYS / name


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def decrypt(identity, ciphertext):
    age = real_run([EXE['age'], '-d', '-i', str(identity), str(ciphertext)], capture_output=True)
    if age.returncode != 0:
        return age.returncode, b''
    unzip = real_run([EXE['gzip'], '-d'], input=age.stdout, capture_output=True)
    return unzip.returncode, unzip.stdout


def restore_args(backup, identity, digest=None):
    return type('A', (), {'peak_bytes': 1024 ** 3, 'dump_scope_reviewed': True, 'restore_grants_reviewed': True,
                          'backup': str(backup), 'sha256': digest or sha(backup), 'identity': str(identity)})()


def restore_schema_tables():
    return root("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='maxhigh_staging_restorecheck'")


# ---------------------------------------------------------------- seams (production logic untouched)
def lenient_secret_file(path):
    path = Path(path)
    common.no_links(path)
    common.require(path.is_file(), 'Required private file missing')
    return path


common.secret_file = recovery.secret_file = lenient_secret_file
recovery.preview_off = lambda: None
recovery.resources = lambda *a, **k: None
recovery.ADMIN, recovery.BACKUPS = ADMIN, BACKUPS
class seams:
    def __enter__(self):
        subprocess.run, subprocess.Popen = shim_run, ShimPopen

    def __exit__(self, *exc):
        subprocess.run, subprocess.Popen = real_run, real_popen


def do_backup(recipients):
    with seams():
        return recovery.backup(type('A', (), {'peak_bytes': 1024 ** 3, 'recipient': recipients})())


def do_restore(args):
    with seams():
        return recovery.restore(args)


def do_compare():
    with seams():
        return recovery.compare(type('A', (), {'dump_scope_reviewed': True})())


def do_sql(options, db, statement):
    with seams():
        return common.sql(options, db, statement)


try:
    # ------------------------------------------------------------ source schema: real migrations + varied data
    version = root('SELECT VERSION()')
    datadir = root('SELECT @@datadir')
    print('SERVER', version, datadir)
    if 'm1011' not in datadir and 'scratchpad' not in datadir.lower():
        raise SystemExit('Refusing to run: server datadir is not the disposable test instance')
    if root("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name LIKE 'maxhigh%' AND schema_name NOT IN ('maxhigh_staging','maxhigh_staging_restorecheck')") != '0':
        raise SystemExit('Refusing to run: unexpected maxhigh_* schemas exist on this server')
    root("DROP DATABASE IF EXISTS maxhigh_staging; DROP DATABASE IF EXISTS maxhigh_staging_restorecheck;"
         "CREATE DATABASE maxhigh_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
         "CREATE DATABASE maxhigh_staging_restorecheck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    env = {**os.environ, 'DATABASE_URL': f'mysql://root:{ROOT_PW}@127.0.0.1:3306/maxhigh_staging', 'CONFIRM_SCHEMA_MIGRATIONS': 'maxhigh_staging'}
    pre = real_run(['node', 'scripts/migrate.mjs', '--preflight'], cwd=REPO, env=env, capture_output=True, text=True)
    mig = real_run(['node', 'scripts/migrate.mjs', '--apply'], cwd=REPO, env=env, capture_output=True, text=True)
    check('migrations 0000-0004 apply on this server (preflight first)', pre.returncode in (0, 2) and mig.returncode == 0, mig.stdout.strip() or mig.stderr[:200])
    root("""INSERT INTO users(id,public_user_id,username,password_hash,balance,role,display_name) VALUES
      ('u-super','super','super','h',0,'superadmin','Sup\\\\er "Admin" ₱'),('u-agent','agent','agent','h',0,'agent','O\\'Brien');
      INSERT INTO users(id,public_user_id,username,password_hash,balance,role,upline_id) VALUES
      ('u-p1','p1','p1','h',1000.00,'player','u-agent'),('u-p2','p2','p2','h',250.55,'player','u-agent');
      INSERT INTO transactions(id,user_id,type,amount,balance_after,game,note) VALUES
      ('t1','u-p1','deposit',1000.00,1000.00,NULL,'seed ₱ "quoted" \\\\ back\\\\slash \U0001F600'),
      ('t2','u-p2','deposit',250.55,250.55,NULL,NULL),('t3','u-p1','bet',-5.00,995.00,'golden-panther','n'),('t4','u-p1','win',5.00,1000.00,'golden-panther','n');
      INSERT INTO play_sessions(id,user_id,game_id,status,bet) VALUES ('ps1','u-p1','golden-panther','open',5),('ps2','u-p1','golden-panther','closed',5),('ps3','u-p2','golden-panther','open',5);
      INSERT INTO provably_fair_seeds(id,user_id,server_seed,server_seed_hash,client_seed,status) VALUES ('s1','u-p1','a','b','c','active'),('s2','u-p1','a2','b2','c2','revealed');
      INSERT INTO audit_logs(id,actor_id,actor_username,action,summary,meta) VALUES ('a1','u-super','super','x.test','sum','{"k":"v₱"}');
      INSERT INTO wallet_requests(id,user_id,type,amount) VALUES ('w1','u-p2','withdraw',10.00);
      INSERT INTO reward_entitlements(id,user_id,title,amount) VALUES ('r1','u-p2','Reward',10.00);
      INSERT INTO financial_operations(id,user_id,action,input_hash,result,proof) VALUES ('f1','u-p1','spin','h','{"ok":true}',REPEAT('x',70000));
      INSERT INTO fishing_rooms(game_id,state) VALUES ('crab-cannon','{"fish":[1,2,3]}');""", 'maxhigh_staging')
    backup_pw, restore_pw = secrets.token_hex(16), secrets.token_hex(16)
    root(f"""DROP USER IF EXISTS 'maxhigh_stage_backup'@'127.0.0.1'; DROP USER IF EXISTS 'maxhigh_stage_restore'@'127.0.0.1';
      CREATE USER 'maxhigh_stage_backup'@'127.0.0.1' IDENTIFIED BY '{backup_pw}';
      CREATE USER 'maxhigh_stage_restore'@'127.0.0.1' IDENTIFIED BY '{restore_pw}' WITH MAX_USER_CONNECTIONS 4;
      GRANT SELECT,SHOW VIEW,TRIGGER ON `maxhigh_staging`.* TO 'maxhigh_stage_backup'@'127.0.0.1';
      GRANT SELECT,INSERT,CREATE,INDEX,REFERENCES ON `maxhigh\\_staging\\_restorecheck`.* TO 'maxhigh_stage_restore'@'127.0.0.1';""")
    cnf(ADMIN / 'backup-client.cnf', 'maxhigh_stage_backup', backup_pw, 'maxhigh_staging')
    cnf(ADMIN / 'restore-client.cnf', 'maxhigh_stage_restore', restore_pw, 'maxhigh_staging_restorecheck')
    tables = int(root("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='maxhigh_staging'"))
    fks = int(root("SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema='maxhigh_staging'"))
    checks = int(root("SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_schema='maxhigh_staging'"))
    gen = int(root("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='maxhigh_staging' AND generation_expression<>''"))
    check('source has full production schema', tables >= 20 and fks >= 10 and checks >= 2 and gen >= 2, f'{tables} tables, {fks} FKs, {checks} CHECKs, {gen} generated columns')
    source_sums = lambda: root("SELECT table_name FROM information_schema.tables WHERE table_schema='maxhigh_staging' ORDER BY 1").split()
    def source_state():
        out = []
        for table in source_sums():
            out.append(root(f'CHECKSUM TABLE `{table}`', 'maxhigh_staging'))
        return out
    state_before = source_state()
    names_before = source_sums()
    risk_before = root('SELECT * FROM risk_controls', 'maxhigh_staging')

    # ---------------------------------------------------------------- keys (disposable)
    pub_recovery, key_recovery = keygen('disposable-recovery.key')
    pub_verify, key_verify = keygen('disposable-verify.key')
    pub_other, key_other = keygen('disposable-other.key')
    recovery_secret = key_recovery.read_text()
    check('recovery.py accepts real age-keygen public keys', recovery.parse_recipients([pub_recovery, pub_verify]) == [pub_recovery, pub_verify])

    # ---------------------------------------------------------------- account guards
    for who, options, db, allowed in (('backup', ADMIN / 'backup-client.cnf', 'maxhigh_staging', recovery.BACKUP_PRIVILEGES),
                                      ('restore', ADMIN / 'restore-client.cnf', 'maxhigh_staging_restorecheck', recovery.RESTORE_PRIVILEGES)):
        lines = do_sql(options, db, 'SHOW GRANTS FOR CURRENT_USER;').splitlines()
        check(f'real SHOW GRANTS of the {who} account satisfies the reviewed minimum', recovery.grant_violations(lines, db, allowed) == [])
    check('restore account has no privilege on maxhigh_staging (information_schema)',
          root("SELECT COUNT(*) FROM information_schema.SCHEMA_PRIVILEGES WHERE grantee=\"'maxhigh_stage_restore'@'127.0.0.1'\" AND table_schema='maxhigh_staging'") == '0')

    # ---------------------------------------------------------------- backup: invalid recipients refused, nothing written
    backup_call = do_backup
    for label, bad in (('no recipient', None), ('malformed', ['age1notakey']), ('duplicate', [pub_recovery, pub_recovery]),
                       ('private key as recipient', [recovery_secret.splitlines()[-1].strip()])):
        refuses(f'backup refuses {label}', lambda bad=bad: backup_call(bad), r'recipient|age')
    check('refused backups wrote nothing', not list(BACKUPS.iterdir()))
    refuses('age itself rejects an invalid recipient and writes no output',
            lambda: (_ for _ in ()).throw(RuntimeError('age rejected')) if real_run([EXE['age'], '-r', 'age1invalid', '-o', str(TMP / 'x.age')], input=b'x', capture_output=True).returncode != 0 and not (TMP / 'x.age').exists() else None, 'age rejected')

    # ---------------------------------------------------------------- real backup, two recipients
    del ARGV_LOG[:]
    backup_call([pub_recovery, pub_verify])
    files = sorted(BACKUPS.glob('*.sql.gz.age'))
    check('one ciphertext + checksum file created', len(files) == 1 and (BACKUPS / (files[0].name + '.sha256')).exists())
    ct = files[0]
    check('stored checksum matches ciphertext', (BACKUPS / (ct.name + '.sha256')).read_text().split()[0] == sha(ct))
    raw = ct.read_bytes()
    header = raw[:600].decode('latin1')
    check('ciphertext is age format with exactly two X25519 recipient stanzas', header.startswith('age-encryption.org/v1') and header.count('-> X25519') == 2)
    check('ciphertext contains no plaintext SQL', b'CREATE TABLE' not in raw and b'maxhigh' not in raw and b'INSERT INTO' not in raw)
    dump_argv = next(a for a in ARGV_LOG if 'mariadb-dump' in a[0] or 'mariadb-dump' in a)
    check('dump ran with consistent lockless flags', all(f in dump_argv for f in ('--single-transaction', '--skip-lock-tables', '--skip-add-locks', '--skip-disable-keys')))

    # ---------------------------------------------------------------- either recipient decrypts independently
    rc1, plain1 = decrypt(key_recovery, ct)
    rc2, plain2 = decrypt(key_verify, ct)
    check('recovery recipient decrypts on its own', rc1 == 0 and len(plain1) > 1000)
    check('verification recipient decrypts on its own', rc2 == 0 and plain1 == plain2)
    check('a third (wrong) identity cannot decrypt', decrypt(key_other, ct)[0] != 0)

    # ---------------------------------------------------------------- inspect the generated SQL
    text = plain1.decode('utf-8')
    forbidden = [t for t in ('LOCK TABLES', 'UNLOCK TABLES', 'DISABLE KEYS', 'ENABLE KEYS', 'ALTER TABLE', 'CREATE DATABASE', 'DROP TABLE', 'DROP DATABASE',
                             'DEFINER', 'CREATE TRIGGER', 'CREATE PROCEDURE', 'CREATE FUNCTION', 'CREATE VIEW', 'CREATE EVENT', 'GRANT ', 'maxhigh_staging_restorecheck')
                 if t.lower() in text.lower()]
    check('dump has no LOCK/UNLOCK TABLES, ALTER, DISABLE KEYS, USE, CREATE DATABASE, DROP, DEFINER, routines', not forbidden and not re.search(r'^USE\s', text, re.M), forbidden)
    starters = sorted({re.match(r'\s*(/\*!\d+\s+)?([A-Za-z]+(?:\s+[A-Za-z@_=]+)?)', l).group(2).upper() for l in text.splitlines() if l.strip() and not l.startswith('--') and re.match(r'\s*(/\*!\d+\s+)?[A-Za-z]', l)})
    print('   statement kinds in dump:', ', '.join(starters))
    check('dump contains every table and the generated columns', text.count('CREATE TABLE') == tables and 'open_game_key' in text and 'GENERATED ALWAYS' in text.upper() or 'VIRTUAL' in text.upper())
    check('dump pins DB-unqualified objects only (no maxhigh_staging.* references)', 'maxhigh_staging`.' not in text)

    # ---------------------------------------------------------------- restore refusals (destination stays empty)
    check('restore schema is empty before any restore', restore_schema_tables() == '0')
    refuses('restore refuses a ciphertext whose SHA-256 differs from the approved one', lambda: do_restore(restore_args(ct, key_verify, '0' * 64)), r'ciphertext identity')
    wrong = refuses('restore refuses the wrong identity', lambda: do_restore(restore_args(ct, key_other)), r'Recovery pipeline failed')
    check('wrong-identity failure leaks no key or SQL text', recovery_secret.strip().splitlines()[-1] not in wrong and 'CREATE TABLE' not in wrong)
    flipped = bytearray(raw)
    flipped[len(flipped) // 2] ^= 0xFF
    bad = BACKUPS / 'staging-corrupt.sql.gz.age'
    bad.write_bytes(bytes(flipped))
    refuses('restore refuses corrupted ciphertext even when its hash was recomputed (authentication fails)', lambda: do_restore(restore_args(bad, key_verify)), r'Recovery pipeline failed')
    bad.write_bytes(raw[: len(raw) // 2])
    refuses('restore refuses truncated ciphertext', lambda: do_restore(restore_args(bad, key_verify)), r'Recovery pipeline failed')
    bad.unlink()
    check('no refused restore imported anything', restore_schema_tables() == '0')
    root('CREATE TABLE marker(id INT)', 'maxhigh_staging_restorecheck')
    refuses('restore refuses a NON-EMPTY destination', lambda: do_restore(restore_args(ct, key_verify)), r'EMPTY')
    check('non-empty destination left untouched', restore_schema_tables() == '1')
    root('DROP TABLE marker', 'maxhigh_staging_restorecheck')

    # ---------------------------------------------------------------- the restore can never be pointed at the source
    original_db = recovery.RESTORE_DB
    recovery.RESTORE_DB = 'maxhigh_staging'
    refuses('restore refuses RESTORE_DB == the live schema', lambda: do_restore(restore_args(ct, key_verify)), r'isolated pair')
    recovery.RESTORE_DB = original_db
    saved = (ADMIN / 'restore-client.cnf').read_text()
    cnf(ADMIN / 'restore-client.cnf', 'maxhigh_stage_restore', restore_pw, 'maxhigh_staging')
    refuses('restore refuses a client config whose database is the live schema', lambda: do_restore(restore_args(ct, key_verify)), r'exact isolated schema')
    cnf(ADMIN / 'restore-client.cnf', 'maxhigh_stage_backup', backup_pw, 'maxhigh_staging_restorecheck')
    refuses('restore refuses a different database identity', lambda: do_restore(restore_args(ct, key_verify)), r'Unexpected client identity')
    (ADMIN / 'restore-client.cnf').write_text(saved)
    root("GRANT SELECT ON `maxhigh_staging`.* TO 'maxhigh_stage_restore'@'127.0.0.1'")
    refuses('restore refuses an account that gained ANY privilege on the live schema', lambda: do_restore(restore_args(ct, key_verify)), r'grants differ')
    root("REVOKE SELECT ON `maxhigh_staging`.* FROM 'maxhigh_stage_restore'@'127.0.0.1'")
    root("GRANT LOCK TABLES ON `maxhigh\\_staging\\_restorecheck`.* TO 'maxhigh_stage_restore'@'127.0.0.1'")
    refuses('restore refuses an account with an extra privilege (LOCK TABLES) on its own schema', lambda: do_restore(restore_args(ct, key_verify)), r'grants differ')
    root("REVOKE LOCK TABLES ON `maxhigh\\_staging\\_restorecheck`.* FROM 'maxhigh_stage_restore'@'127.0.0.1'")
    check('all source-targeting attempts changed nothing', restore_schema_tables() == '0')

    # ---------------------------------------------------------------- real restore with the DISPOSABLE VERIFICATION key only
    do_restore(restore_args(ct, key_verify))
    check('restore imported every table into the restore-check schema', restore_schema_tables() == str(tables))
    check('restored row counts match', root('SELECT (SELECT COUNT(*) FROM users),(SELECT COUNT(*) FROM transactions),(SELECT COUNT(*) FROM audit_logs),(SELECT COUNT(*) FROM risk_controls)', 'maxhigh_staging')
          == root('SELECT (SELECT COUNT(*) FROM users),(SELECT COUNT(*) FROM transactions),(SELECT COUNT(*) FROM audit_logs),(SELECT COUNT(*) FROM risk_controls)', 'maxhigh_staging_restorecheck'))
    check('unicode, quotes, backslashes, emoji and a 70 KB blob survive', root("SELECT note FROM transactions WHERE id='t1'", 'maxhigh_staging_restorecheck') == root("SELECT note FROM transactions WHERE id='t1'", 'maxhigh_staging')
          and root("SELECT LENGTH(proof) FROM financial_operations WHERE id='f1'", 'maxhigh_staging_restorecheck') == '70000')

    # ---------------------------------------------------------------- compare
    do_compare()
    check('compare PASSES (data hash, ledger, schema fingerprint) on this server', True, version)
    def fresh_restore():
        root('DROP DATABASE maxhigh_staging_restorecheck; CREATE DATABASE maxhigh_staging_restorecheck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        do_restore(restore_args(ct, key_verify))
    tampers = (
        ('a changed balance', "UPDATE users SET balance = balance + 0.01, updated_at = updated_at WHERE id='u-p1'", r'data hash differs'),
        ('a changed audit-log row', "UPDATE audit_logs SET summary = 'tampered' WHERE id='a1'", r'data hash differs'),
        ('a deleted transaction', "DELETE FROM transactions WHERE id='t4'", r'data hash differs'),
        ('a dropped CHECK constraint', 'ALTER TABLE users DROP CONSTRAINT users_balance_nonnegative', r'schema fingerprint differs'),
        ('a dropped foreign key', 'ALTER TABLE transactions DROP FOREIGN KEY transactions_user_id_users_id_fk', r'schema fingerprint differs'),
        ('a dropped index', 'DROP INDEX tx_user_time_idx ON transactions', r'schema fingerprint differs'),
        ('a changed column type', 'ALTER TABLE users MODIFY display_name VARCHAR(200)', r'schema fingerprint differs'),
        ('a missing risk_controls row', "DELETE FROM risk_controls WHERE id='default'", r'data hash differs'),
    )
    for label, statement, pattern in tampers:
        fresh_restore()
        do_compare()
        root(statement, 'maxhigh_staging_restorecheck')
        refuses('compare detects ' + label, lambda: do_compare(), pattern)
    fresh_restore()
    do_compare()
    check('compare passes again on a clean re-restore', True)
    root("GRANT ALL ON `maxhigh\\_staging\\_restorecheck`.* TO 'maxhigh_stage_restore'@'127.0.0.1'")
    refuses('compare refuses a widened restore account', lambda: do_compare(), r'grants differ')
    root("REVOKE ALL ON `maxhigh\\_staging\\_restorecheck`.* FROM 'maxhigh_stage_restore'@'127.0.0.1'")
    root("GRANT SELECT,INSERT,CREATE,INDEX,REFERENCES ON `maxhigh\\_staging\\_restorecheck`.* TO 'maxhigh_stage_restore'@'127.0.0.1'")

    # ---------------------------------------------------------------- source untouched; key never on the "VPS side"
    check('SOURCE schema byte-identical after backup/restore/compare/refusals (CHECKSUM TABLE for every table)', source_state() == state_before)
    check('risk_controls row unchanged', root('SELECT * FROM risk_controls', 'maxhigh_staging') == risk_before)
    check('no objects were added to the source schema', source_sums() == names_before and len(names_before) == tables)
    secret_line = recovery_secret.strip().splitlines()[-1]
    leaked = [str(p) for folder in (ADMIN, BACKUPS) for p in folder.rglob('*') if p.is_file() and secret_line.encode() in p.read_bytes()]
    check('permanent recovery PRIVATE key never appears in admin/backup storage', not leaked, leaked)
    check('permanent recovery key file was never an argument of any process', not any(str(key_recovery) in ' '.join(a) for a in ARGV_LOG) and not any(secret_line in ' '.join(a) for a in ARGV_LOG))

    # ---------------------------------------------------------------- "after a Windows restart": only offline-media files, fresh processes
    offline = TMP / 'offline-media'
    offline.mkdir()
    shutil.copy(key_recovery, offline / 'recovery.key')
    shutil.copy(ct, offline / 'backup.sql.gz.age')
    key_verify.unlink()                      # the disposable verification key is gone for good
    root('DROP DATABASE IF EXISTS e2e_dr_restore; CREATE DATABASE e2e_dr_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    rc, plain = decrypt(offline / 'recovery.key', offline / 'backup.sql.gz.age')
    check('recovery key alone (offline copy, verification key deleted) decrypts the backup', rc == 0 and plain == plain1)
    imp = real_run([EXE['mariadb'], '-h127.0.0.1', '-P3306', '-uroot', '-p' + ROOT_PW, 'e2e_dr_restore'], input=plain, capture_output=True)
    check('disaster-recovery restore from the offline key succeeds locally (not on the VPS)', imp.returncode == 0, imp.stderr.decode()[:150])
    check('disaster-recovery copy matches the source row-for-row', root('SELECT COUNT(*),SUM(balance) FROM users', 'e2e_dr_restore') == root('SELECT COUNT(*),SUM(balance) FROM users', 'maxhigh_staging')
          and root('SELECT COUNT(*) FROM transactions', 'e2e_dr_restore') == root('SELECT COUNT(*) FROM transactions', 'maxhigh_staging'))
    try:
        p_enc = real_run([EXE['age'], '-p', '-o', str(TMP / 'k.age'), str(offline / 'recovery.key')], stdin=subprocess.DEVNULL,
                         capture_output=True, text=True, timeout=15)
        note = 'failed immediately: ' + p_enc.stderr.strip()[:90] if p_enc.returncode else 'ran'
    except subprocess.TimeoutExpired:
        note = 'interactive: waits for a console passphrase (cannot be automated); documented as a manual step'
    print('   age -p without a terminal:', note)
    check('passphrase-at-rest step is interactive-only (cannot silently run unattended)', 'interactive' in note or 'failed' in note, note)
finally:
    subprocess.run, subprocess.Popen = real_run, real_popen
    try:
        root("DROP DATABASE IF EXISTS e2e_dr_restore; DROP DATABASE IF EXISTS maxhigh_staging; DROP DATABASE IF EXISTS maxhigh_staging_restorecheck;"
             "DROP USER IF EXISTS 'maxhigh_stage_backup'@'127.0.0.1'; DROP USER IF EXISTS 'maxhigh_stage_restore'@'127.0.0.1';", ok=False)
    finally:
        shutil.rmtree(TMP, ignore_errors=True)

failed = [name for name, ok in RESULTS if not ok]
print(f'\n{len(RESULTS) - len(failed)}/{len(RESULTS)} checks passed' + (' | FAILED: ' + '; '.join(failed) if failed else ''))
sys.exit(1 if failed else 0)
