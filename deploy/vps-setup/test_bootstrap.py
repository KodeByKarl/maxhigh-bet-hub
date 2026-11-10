"""One-shot bootstrap policy tests; never invokes apt, sudo, SSH or services."""
import subprocess
import unittest
from unittest.mock import patch
import bootstrap_install as bootstrap


class Bootstrap(unittest.TestCase):
    def test_rejects_other_database_series(self):
        for version in ('1:11.4.7-ubuntu', '1:10.6.24-ubuntu', '(none)'):
            with self.assertRaises(RuntimeError):
                bootstrap.candidate('mariadb-server', '  Candidate: ' + version)

    def test_preserves_full_distro_revision(self):
        self.assertEqual(bootstrap.candidate('mariadb-server', '  Candidate: 1:10.11.14-0ubuntu0.24.04.1\n'),
                         '1:10.11.14-0ubuntu0.24.04.1')

    def test_rejects_malformed_package_candidate(self):
        with self.assertRaises(RuntimeError):
            bootstrap.candidate('caddy', '  Candidate: x;false')

    def test_refuses_existing_service_start_policy(self):
        with patch.object(bootstrap.Path, 'exists', return_value=True), patch.object(bootstrap, 'run') as run:
            with self.assertRaisesRegex(RuntimeError, 'Existing policy'):
                bootstrap.install_packages(['caddy'])
            run.assert_not_called()

    def test_temporary_policy_removed_on_apt_failure(self):
        with patch.object(bootstrap.Path, 'exists', return_value=False), patch.object(bootstrap.Path, 'is_symlink', return_value=False), \
             patch.object(bootstrap.Path, 'is_file', return_value=True), patch.object(bootstrap.Path, 'read_text', return_value=bootstrap.POLICY_TEXT), \
             patch.object(bootstrap.Path, 'unlink') as unlink, patch.object(bootstrap, 'managed_file'), \
             patch.object(bootstrap, 'run', side_effect=RuntimeError('apt failed')):
            with self.assertRaisesRegex(RuntimeError, 'apt failed'):
                bootstrap.install_packages(['caddy'])
            unlink.assert_called_once()


if __name__ == '__main__':
    unittest.main()
