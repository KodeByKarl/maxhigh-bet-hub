#!/bin/sh
# READ-ONLY. Shows the state of the earlier recovery batches before a fresh backup. Run as root.
set -u
echo "== markers"; ls -la /root/maxhigh-evidence/*.pass 2>&1
echo "== batch dir"; ls -la /root/maxhigh-staging-batches 2>&1
echo "== backups"; ls -la /var/backups/maxhigh-staging 2>&1
echo "== shm key"; ls -la /dev/shm/maxhigh-verify.key 2>&1
echo "== restorecheck"; mariadb -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='maxhigh_staging_restorecheck'; SELECT schema_name,default_character_set_name,default_collation_name FROM information_schema.schemata WHERE schema_name LIKE 'maxhigh_staging%'; SELECT user,host FROM mysql.user WHERE user LIKE 'maxhigh%'"
echo "== counts"; mariadb -N -e "SELECT 'users',COUNT(*) FROM maxhigh_staging.users UNION ALL SELECT 'tx',COUNT(*) FROM maxhigh_staging.transactions UNION ALL SELECT 'audit',COUNT(*) FROM maxhigh_staging.audit_logs"
echo "== controls dir"; ls -la /root/maxhigh-vps-controls 2>&1 | head; ls /root/maxhigh-staging-admin 2>&1
echo "== active conns"; mariadb -N -e "SELECT COUNT(*) FROM information_schema.processlist WHERE user='maxhigh_uat_app'"
