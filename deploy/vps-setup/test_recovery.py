"""Local policy tests for recovery.py. No SSH, package manager, SQL, key material or services."""
import inspect
import sys
import unittest
from unittest.mock import patch

import recovery

RECOVERY_KEY = 'age1' + 'q' * 58
VERIFY_KEY = 'age1' + 'p' * 58


class Recipients(unittest.TestCase):
    def test_repeatable_recipient_flag_collects_every_key(self):
        captured = {}
        with patch.object(sys, 'argv', ['recovery.py', 'backup', '--approve', 'BACKUP', '--peak-bytes', '1',
                                        '--recipient', RECOVERY_KEY, '--recipient', VERIFY_KEY]), \
                patch.object(recovery, 'gate'), patch.object(recovery, 'finish', lambda main: main()), \
                patch.object(recovery, 'backup', lambda args: captured.update(recipients=args.recipient)):
            recovery.main()
        self.assertEqual(captured['recipients'], [RECOVERY_KEY, VERIFY_KEY])

    def test_valid_recipients_become_one_age_command(self):
        self.assertEqual(recovery.age_encrypt_command(recovery.parse_recipients([RECOVERY_KEY, VERIFY_KEY])),
                         ['age', '-r', RECOVERY_KEY, '-r', VERIFY_KEY])

    def test_invalid_recipient_sets_are_rejected(self):
        for bad in (None, [], [RECOVERY_KEY, RECOVERY_KEY], ['age1short'], [RECOVERY_KEY + 'x'],
                    ['AGE1' + 'q' * 58], ['age1yubikey1' + 'q' * 50], ['age1' + 'b' * 58],
                    [RECOVERY_KEY, 'age-secret-key-1' + 'Q' * 59],
                    ['age1' + chr(97 + n) * 58 for n in range(5)], ['age1' + 'q' * 58 + '\n']):
            with self.subTest(bad=bad):
                with self.assertRaises(RuntimeError):
                    recovery.parse_recipients(bad)

    def test_invalid_recipient_stops_backup_before_any_database_work(self):
        args = type('A', (), {'peak_bytes': 1024 ** 3, 'recipient': ['not-a-key']})()
        with patch.object(recovery, 'preview_off'), patch.object(recovery, 'resources'), \
                patch.object(recovery, 'client_options', side_effect=AssertionError('must not read database config')):
            with self.assertRaisesRegex(RuntimeError, 'age'):
                recovery.backup(args)


class DumpCommands(unittest.TestCase):
    def test_backup_dump_is_consistent_lockless_and_restore_needs_no_lock_or_alter_privilege(self):
        command = recovery.backup_dump_command('/root/maxhigh-staging-admin/backup-client.cnf')
        for flag in ('--single-transaction', '--skip-lock-tables', '--skip-add-locks', '--skip-disable-keys',
                     '--triggers', '--no-create-db', '--skip-add-drop-table'):
            self.assertIn(flag, command)
        self.assertNotIn('--skip-triggers', command)
        self.assertEqual(command[-1], 'maxhigh_staging')
        self.assertNotIn('--add-locks', command)
        self.assertNotIn('--databases', command)

    def test_compare_dump_never_locks_the_live_schema(self):
        for schema in ('maxhigh_staging', 'maxhigh_staging_restorecheck'):
            command = recovery.compare_dump_command('/root/x.cnf', schema)
            self.assertIn('--single-transaction', command)
            self.assertIn('--skip-lock-tables', command)
            self.assertEqual(command[-1], schema)
            self.assertNotIn('--lock-all-tables', command)
            self.assertNotIn('--master-data', command)

    def test_fingerprint_is_read_only_and_schema_agnostic(self):
        statements = [part.strip() for part in recovery.FINGERPRINT_SQL.split(';') if part.strip()]
        self.assertTrue(statements[0].startswith('SET SESSION group_concat_max_len'))
        self.assertTrue(statements[1].startswith('SELECT'))
        for forbidden in ('INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT'):
            self.assertNotIn(forbidden + ' ', recovery.FINGERPRINT_SQL.upper().replace('CREATE ', 'CREATE_'))
        self.assertIn('DATABASE()', recovery.FINGERPRINT_SQL)
        self.assertNotIn('maxhigh_staging', recovery.FINGERPRINT_SQL)


class Fingerprint(unittest.TestCase):
    GOOD = '\n'.join(f'{name}\t{count}\tabc' for name, count in
                     (('tables', 21), ('columns', 181), ('constraints', 45), ('fk-rules', 14), ('checks', 2), ('indexes', 70)))

    def test_complete_fingerprint_is_sound(self):
        self.assertTrue(recovery.fingerprint_sound(self.GOOD))

    def test_blind_or_partial_fingerprints_never_count_as_a_match(self):
        blind = self.GOOD.replace('constraints\t45', 'constraints\t0').replace('fk-rules\t14', 'fk-rules\t0')
        for bad in ('', blind, '\n'.join(self.GOOD.splitlines()[:4]), self.GOOD.replace('tables\t21', 'tables\t0'),
                    self.GOOD.replace('indexes\t70', 'indexes\t3'), 'tables\tx\ty'):
            with self.subTest(bad=bad[:40]):
                self.assertFalse(recovery.fingerprint_sound(bad))

    def test_compare_requires_a_sound_fingerprint_before_equality(self):
        source = inspect.getsource(recovery.compare)
        self.assertLess(source.index('fingerprint_sound'), source.index('source_shape == restored_shape'))


class Isolation(unittest.TestCase):
    def test_reviewed_pair_passes(self):
        recovery.assert_isolated_names()

    def test_live_schema_can_never_be_the_restore_target(self):
        for source, target in (('maxhigh_staging', 'maxhigh_staging'), ('maxhigh_staging_restorecheck', 'maxhigh_staging_restorecheck'),
                               ('maxhigh_staging', 'maxhigh_prod_restorecheck'), ('maxhigh_staging', 'maxhigh_staging_restore'),
                               ('maxhigh_staging', 'Maxhigh_Staging_restorecheck'), ('maxhigh_prod', 'maxhigh_staging_restorecheck')):
            with self.subTest(source=source, target=target), patch.object(recovery, 'DB', source), patch.object(recovery, 'RESTORE_DB', target):
                with self.assertRaisesRegex(RuntimeError, 'isolated pair'):
                    recovery.assert_isolated_names()

    def test_every_phase_checks_names_before_touching_a_client_config(self):
        for phase in (recovery.backup, recovery.restore, recovery.compare):
            source = inspect.getsource(phase)
            self.assertIn('assert_isolated_names()', source, phase.__name__)
            self.assertLess(source.index('assert_isolated_names()'), source.index('client_options('), phase.__name__)

    def test_every_phase_pins_the_database_account_and_checks_its_grants(self):
        self.assertIn('BACKUP_ACCOUNT', inspect.getsource(recovery.backup))
        self.assertIn('RESTORE_ACCOUNT', inspect.getsource(recovery.restore))
        self.assertIn('require_minimal_account', inspect.getsource(recovery.backup))
        self.assertIn('require_minimal_account', inspect.getsource(recovery.restore))
        self.assertIn('require_minimal_account', inspect.getsource(recovery.compare))


def grants(*lines):
    return list(lines)


class Grants(unittest.TestCase):
    RESTORE = "GRANT SELECT, INSERT, CREATE, INDEX, REFERENCES ON `maxhigh_staging_restorecheck`.* TO `maxhigh_stage_restore`@`127.0.0.1`"
    USAGE = "GRANT USAGE ON *.* TO `maxhigh_stage_restore`@`127.0.0.1` IDENTIFIED BY PASSWORD '*0123456789ABCDEF'"

    def check(self, lines, database='maxhigh_staging_restorecheck', allowed=recovery.RESTORE_PRIVILEGES):
        return recovery.grant_violations(lines, database, allowed)

    def test_reviewed_restore_account_passes_and_escaped_underscores_are_understood(self):
        self.assertEqual(self.check([self.USAGE, self.RESTORE]), [])
        escaped = self.RESTORE.replace('maxhigh_staging_restorecheck', r'maxhigh\_staging\_restorecheck')
        self.assertEqual(self.check([self.USAGE, escaped]), [])
        # mariadb --batch (used by common.sql) doubles the backslash in SHOW GRANTS output.
        doubled = self.RESTORE.replace('maxhigh_staging_restorecheck', r'maxhigh\\_staging\\_restorecheck')
        self.assertEqual(self.check([self.USAGE, doubled]), [])
        self.assertTrue(self.check([self.USAGE, doubled.replace('restorecheck', 'restorechec')]))

    def test_reviewed_backup_account_passes(self):
        line = "GRANT SELECT, TRIGGER, SHOW VIEW ON `maxhigh_staging`.* TO `maxhigh_stage_backup`@`127.0.0.1`"
        self.assertEqual(self.check([self.USAGE, line], 'maxhigh_staging', recovery.BACKUP_PRIVILEGES), [])

    def test_restore_account_with_any_privilege_on_the_live_schema_is_rejected(self):
        live = "GRANT SELECT ON `maxhigh_staging`.* TO `maxhigh_stage_restore`@`127.0.0.1`"
        self.assertTrue(self.check([self.USAGE, self.RESTORE, live]))
        self.assertTrue(self.check([self.USAGE, live]))

    def test_excess_global_table_and_grant_option_privileges_are_rejected(self):
        for bad in ("GRANT ALL PRIVILEGES ON *.* TO `u`@`h`",
                    "GRANT SELECT ON *.* TO `u`@`h`",
                    "GRANT SELECT, INSERT, CREATE, INDEX, REFERENCES, DROP ON `maxhigh_staging_restorecheck`.* TO `u`@`h`",
                    "GRANT SELECT, LOCK TABLES ON `maxhigh_staging_restorecheck`.* TO `u`@`h`",
                    "GRANT ALL PRIVILEGES ON `maxhigh_staging_restorecheck`.* TO `u`@`h`",
                    "GRANT SELECT ON `maxhigh_staging_restorecheck`.`users` TO `u`@`h`",
                    "GRANT SELECT ON `%`.* TO `u`@`h`",
                    self.RESTORE + " WITH GRANT OPTION"):
            with self.subTest(bad=bad):
                self.assertTrue(self.check([self.USAGE, bad]))

    def test_account_without_the_reviewed_schema_grant_is_rejected(self):
        self.assertTrue(self.check([self.USAGE]))
        self.assertTrue(self.check([]))

    def test_violation_text_never_echoes_grant_lines_or_hashes(self):
        reasons = ' '.join(self.check([self.USAGE.replace('0123456789ABCDEF', 'SECRETHASH'), 'GRANT ALL PRIVILEGES ON *.* TO `u`@`h`']))
        self.assertNotIn('SECRETHASH', reasons)
        self.assertNotIn('GRANT', reasons)


class ReviewedTriggers(unittest.TestCase):
    OK = ','.join(name + '|root@localhost' for name in recovery.EXPECTED_TRIGGERS)

    def test_pre_migration_database_without_triggers_is_allowed(self):
        self.assertTrue(recovery.triggers_allowed(''))
        self.assertTrue(recovery.triggers_allowed('NULL'))

    def test_exactly_the_five_reviewed_root_triggers_are_allowed(self):
        self.assertTrue(recovery.triggers_allowed(self.OK))

    def test_anything_else_is_refused(self):
        self.assertFalse(recovery.triggers_allowed(self.OK.replace('users_client_cap_ad|root@localhost', 'users_client_cap_ad|mallory@%')))
        self.assertFalse(recovery.triggers_allowed(','.join(self.OK.split(',')[:4])))
        self.assertFalse(recovery.triggers_allowed(self.OK + ',other|root@localhost'))

    def test_restore_filter_removes_only_the_definer_of_trigger_lines(self):
        self.assertIn("\\1", recovery.DEFINER_STRIP)
        self.assertIn('DEFINER=', recovery.DEFINER_STRIP)
        self.assertTrue(recovery.DEFINER_STRIP.startswith('s/^'))      # anchored: data rows are never rewritten

    def test_trigger_fingerprint_is_part_of_the_schema_comparison(self):
        self.assertIn("'triggers'", recovery.FINGERPRINT_SQL)
        self.assertIn('TRIGGER', recovery.RESTORE_PRIVILEGES)
        self.assertNotIn('TRIGGER', recovery.RESTORE_PRIVILEGES - {'TRIGGER'})


if __name__ == '__main__':
    unittest.main()
