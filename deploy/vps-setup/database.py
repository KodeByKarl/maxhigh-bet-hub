#!/usr/bin/env python3
"""Provision fresh synthetic staging only. Never imports or repairs production data."""
import argparse
import grp
import os
import secrets
from common import *


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--approve', required=True)
    parser.add_argument('--admin-client', required=True)
    parser.add_argument('--secret-logging-reviewed', action='store_true')
    args = parser.parse_args()
    gate(args.approve, 'PROVISION-STAGING-DATABASE')
    require(args.secret_logging_reviewed, 'Approve secret-safe DBA provisioning/audit-log handling first')
    preview_off()
    resources(extra_bytes=1024**3)
    options = secret_file(args.admin_client)
    require(ADMIN.is_dir() and ROOT.is_dir(), 'Provision OS isolation first')
    # Admin client is privileged, but every statement and identifier here is fixed.
    def admin(statement):
        return run(['mariadb', '--defaults-extra-file=' + str(options), '--batch', '--skip-column-names'], data=statement).stdout.strip()

    marker = ADMIN / 'schema-owned-by-this-setup'
    exists = admin("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='maxhigh_staging';") == '1'
    users = admin("SELECT COUNT(*) FROM mysql.user WHERE user IN ('maxhigh_stage_preview','maxhigh_stage_migrate','maxhigh_stage_backup');")
    if not marker.exists():
        require(not exists and users == '0', 'Existing staging schema/accounts require DBA review; no adoption/reset')
        managed_file(marker, DB + '\n')
    else:
        secret_file(marker)
        require(marker.read_text() == DB + '\n', 'Ownership marker mismatch')

    passwords = {}
    for label in ('preview', 'migrate', 'backup'):
        path = ADMIN / (label + '.secret')
        if not path.exists():
            managed_file(path, secrets.token_hex(32) + '\n')
        secret_file(path)
        password = path.read_text().strip()
        require(len(password) == 64 and all(c in '0123456789abcdef' for c in password), 'Unexpected local credential format')
        passwords[label] = password
    statements = ["CREATE DATABASE IF NOT EXISTS `maxhigh_staging` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"]
    for label, password in passwords.items():
        statements.append("CREATE USER IF NOT EXISTS 'maxhigh_stage_%s'@'127.0.0.1' IDENTIFIED BY '%s';" % (label, password))
    statements.extend([
        "GRANT SELECT ON `maxhigh_staging`.* TO 'maxhigh_stage_preview'@'127.0.0.1';",
        "GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,DROP,INDEX,REFERENCES ON `maxhigh_staging`.* TO 'maxhigh_stage_migrate'@'127.0.0.1';",
        "GRANT SELECT,SHOW VIEW,TRIGGER ON `maxhigh_staging`.* TO 'maxhigh_stage_backup'@'127.0.0.1';",
        "ALTER USER 'maxhigh_stage_preview'@'127.0.0.1' WITH MAX_USER_CONNECTIONS 6;",
    ])
    # Stdin is never printed; explicit approval must address database audit/general-log secrets.
    admin('\n'.join(statements))
    for label in passwords:
        text = '[client]\nhost=127.0.0.1\nport=3306\nprotocol=tcp\ndatabase=maxhigh_staging\nuser=maxhigh_stage_%s\npassword=%s\n' % (label, passwords[label])
        managed_file(ADMIN / (label + '-client.cnf'), text)
        client_options(ADMIN / (label + '-client.cnf'), DB, 'maxhigh_stage_' + label)
        require(sql(ADMIN / (label + '-client.cnf'), DB, 'SELECT CURRENT_USER(),DATABASE();')
                == 'maxhigh_stage_' + label + '@127.0.0.1\t' + DB, 'Existing account password/identity differs; no credential reset')
    migration = '\n'.join(['MYSQL_HOST=127.0.0.1', 'MYSQL_PORT=3306', 'MYSQL_DATABASE=maxhigh_staging',
                           'MYSQL_USER=maxhigh_stage_migrate', 'MYSQL_PASSWORD=' + passwords['migrate'],
                           'CONFIRM_SCHEMA_MIGRATIONS=maxhigh_staging', ''])
    managed_file(ADMIN / '.env.migration', migration)
    preview = '\n'.join(['MYSQL_HOST=127.0.0.1', 'MYSQL_PORT=3306', 'MYSQL_DATABASE=maxhigh_staging',
                         'MYSQL_USER=maxhigh_stage_preview', 'MYSQL_PASSWORD=' + passwords['preview'],
                         'STAGING_READ_ONLY=1', 'OPERATION_COMPRESSION=0', 'PUBLIC_URL=http://127.0.0.1:18080', ''])
    managed_file(ROOT / '.env.preview', preview, 0o640)
    os.chown(ROOT / '.env.preview', 0, grp.getgrnam(RUNTIME).gr_gid)
    print('Fresh staging schema/accounts prepared; credentials stored privately. No migration/fixtures/startup run. DBA must review effective grants, roles and charset before proceeding.')


if __name__ == '__main__':
    finish(main)
