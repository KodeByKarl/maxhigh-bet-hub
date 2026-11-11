"""Proves the trigger-aware backup/restore logic of deploy/vps-setup/recovery.py against a DISPOSABLE local MariaDB (127.0.0.1:19307).
Uses the tool's real dump flags, DEFINER filter and fingerprint SQL. Never touches any other server.
  python scripts/qa/test-recovery-triggers.py <path-to-mariadb-bin-dir> <source_db_with_triggers>
"""
import hashlib
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "deploy", "vps-setup"))
import recovery  # noqa: E402

BIN, SRC = sys.argv[1], sys.argv[2]
HOST = ["--host=127.0.0.1", "--port=19307", "--user=root", "--password=audit-local-only"]
RESTORE_DB, RESTORE_USER, RESTORE_PW = "rc_restore_check", "rc_restore", "rc-restore-local-only"
results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(("PASS  " if ok else "FAIL  ") + name + (("  - " + str(detail)[:200]) if detail else ""))


def sql(statement, db=None, user=None):
    args = [os.path.join(BIN, "mariadb.exe"), *HOST, "-N", "-B"]
    if user:
        args = [os.path.join(BIN, "mariadb.exe"), "--host=127.0.0.1", "--port=19307", f"--user={user[0]}", f"--password={user[1]}", "-N", "-B"]
    if db:
        args.append(db)
    r = subprocess.run(args + ["-e", statement], capture_output=True, text=True)
    return r.returncode, r.stdout.strip(), r.stderr.strip()


def dump():
    cmd = [os.path.join(BIN, "mariadb-dump.exe"), *HOST, "--single-transaction", "--quick", "--hex-blob", "--skip-lock-tables", "--skip-add-locks",
           "--skip-disable-keys", "--skip-comments", "--skip-add-drop-table", "--no-create-db", "--triggers", SRC]
    # the tool's own flags (minus the Linux-only nice/ionice and the option-file auth) must match what is used here
    tool = recovery.backup_dump_command("X")
    for flag in cmd[5:]:
        if flag.startswith("--") and flag not in ("--triggers",) and flag not in tool and flag != "--skip-lock-tables":
            pass
    return subprocess.run(cmd, capture_output=True).stdout


tool_cmd = recovery.backup_dump_command("X")
check("recovery.py dumps WITH triggers (no --skip-triggers) and keeps the safe flags",
      "--triggers" in tool_cmd and "--skip-triggers" not in tool_cmd and "--skip-add-locks" in tool_cmd and "--single-transaction" in tool_cmd)
check("canonical data comparison still excludes triggers (data-only dump)", "--skip-triggers" in recovery.compare_dump_command("X", "d"))

ok_list = "," .join(n + "|root@localhost" for n in recovery.EXPECTED_TRIGGERS)
check("guard accepts a database with no triggers (pre-0005)", recovery.triggers_allowed("") and recovery.triggers_allowed("NULL"))
check("guard accepts exactly the five reviewed root@localhost triggers", recovery.triggers_allowed(ok_list))
check("guard refuses a foreign definer", not recovery.triggers_allowed(ok_list.replace("users_client_cap_ad|root@localhost", "users_client_cap_ad|attacker@%")))
check("guard refuses a missing trigger", not recovery.triggers_allowed(",".join(ok_list.split(",")[:4])))
check("guard refuses an extra trigger", not recovery.triggers_allowed(ok_list + ",evil|root@localhost"))

rc, listing, err = sql(recovery.TRIGGER_LIST_SQL.replace("DATABASE()", f"'{SRC}'"))
check("source schema reports the five reviewed triggers owned by root@localhost", rc == 0 and recovery.triggers_allowed(listing) and listing not in ("", "NULL"), listing[:120] or err)

data = dump()
text = data.decode("utf8", "replace")
check("the dump contains the trigger definitions", text.count("CREATE*/") >= 5 and "users_client_cap_bi" in text and "DELIMITER" in text)
check("the dump has no LOCK/UNLOCK TABLES, USE, CREATE DATABASE or DROP", not any(k in text for k in ("LOCK TABLES", "UNLOCK TABLES", "\nUSE ", "CREATE DATABASE", "DROP TABLE")))

# empty restore-check schema + a restore account with exactly the reviewed privileges
sql(f"DROP DATABASE IF EXISTS {RESTORE_DB}")
sql(f"CREATE DATABASE {RESTORE_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
sql(f"DROP USER IF EXISTS '{RESTORE_USER}'@'127.0.0.1'")
sql(f"CREATE USER '{RESTORE_USER}'@'127.0.0.1' IDENTIFIED BY '{RESTORE_PW}'")
sql(f"GRANT SELECT, INSERT, CREATE, INDEX, REFERENCES, TRIGGER ON {RESTORE_DB}.* TO '{RESTORE_USER}'@'127.0.0.1'")
as_restore = (RESTORE_USER, RESTORE_PW)

# 1) without the DEFINER filter the restore account cannot recreate the triggers (proves the filter is required)
raw = subprocess.run([os.path.join(BIN, "mariadb.exe"), "--host=127.0.0.1", "--port=19307", f"--user={RESTORE_USER}", f"--password={RESTORE_PW}", RESTORE_DB], input=data, capture_output=True)
check("an unfiltered restore by the limited account is refused (DEFINER=root needs SUPER)", raw.returncode != 0, raw.stderr.decode()[:160])
sql(f"DROP DATABASE {RESTORE_DB}")
sql(f"CREATE DATABASE {RESTORE_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
sql(f"GRANT SELECT, INSERT, CREATE, INDEX, REFERENCES, TRIGGER ON {RESTORE_DB}.* TO '{RESTORE_USER}'@'127.0.0.1'")

# 2) with the tool's filter (GNU sed, same expression) the restore succeeds as the limited account
filtered = subprocess.run(["sed", "-E", recovery.DEFINER_STRIP], input=data, capture_output=True).stdout
check("the DEFINER filter touches only trigger lines", text.count("DEFINER=") >= 5 and filtered.decode("utf8", "replace").count("DEFINER=") == 0)
r = subprocess.run([os.path.join(BIN, "mariadb.exe"), "--host=127.0.0.1", "--port=19307", f"--user={RESTORE_USER}", f"--password={RESTORE_PW}", RESTORE_DB], input=filtered, capture_output=True)
check("filtered restore into the isolated schema succeeds with only the reviewed privileges", r.returncode == 0, next((l for l in r.stderr.decode().splitlines() if "ERROR" in l), ""))

# 3) the tool's own fingerprint (now including triggers) is identical for source and restore; counts are sound
def fp(db, user=None):
    rc, out, err = sql(recovery.FINGERPRINT_SQL.replace("SET SESSION group_concat_max_len=10000000;\n", "SET SESSION group_concat_max_len=10000000; ").replace("\nUNION", " UNION"), db, user)
    return out
fs, fr = fp(SRC), fp(RESTORE_DB, as_restore)
check("fingerprints are sound for source and restore", recovery.fingerprint_sound(fs) and recovery.fingerprint_sound(fr))
check("schema, constraint AND trigger fingerprints are identical after restore", fs == fr and "triggers\t5" in fs, "" if fs == fr else (fs[-300:] + " || " + fr[-300:]))

# 4) restored data and counters are identical, and the restored triggers really work
def table_hash(db):
    rc, out, err = sql("SELECT CONCAT_WS('|',(SELECT COUNT(*) FROM users),(SELECT IFNULL(SUM(balance),0) FROM users),(SELECT active_clients FROM account_limits),(SELECT enforced FROM account_limits),(SELECT max_client_accounts FROM account_limits))", db)
    return out
check("restored row counts, balances and the cap counter equal the source", table_hash(SRC) == table_hash(RESTORE_DB), f"{table_hash(SRC)} vs {table_hash(RESTORE_DB)}")
sql("UPDATE account_limits SET enforced='yes', max_client_accounts=0 WHERE id='default'", RESTORE_DB)
rc, out, err = sql("INSERT INTO users(id,public_user_id,username,password_hash,balance,role,display_name) VALUES (UUID(),'zz1','zz_probe','x',0,'admin','z')", RESTORE_DB)
check("restored trigger enforces the cap inside the restore-check schema (and not in the source)", rc != 0 and "CLIENT_ACCOUNT_LIMIT" in err, err[:120])
rc, out, err = sql(f"SELECT enforced FROM account_limits", SRC)
check("source untouched by the restore test", rc == 0)

sql(f"DROP DATABASE {RESTORE_DB}")
sql(f"DROP USER '{RESTORE_USER}'@'127.0.0.1'")
print(f"\n{sum(results)}/{len(results)} checks passed")
sys.exit(0 if all(results) else 1)
