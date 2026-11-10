"""Local policy/streaming tests only. No SSH, package manager, SQL or services."""
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import common
import recovery
import stage


class Controls(unittest.TestCase):
    def test_wrong_approval_stops_before_platform_or_io(self):
        with patch('common.Path.read_text', side_effect=AssertionError('must not read')):
            with self.assertRaisesRegex(RuntimeError, 'approve'):
                common.gate('START', 'MIGRATE-APPLY')

    def test_non_linux_platform_cannot_apply(self):
        with patch.object(common.sys, 'platform', 'win32'):
            with self.assertRaisesRegex(RuntimeError, 'Ubuntu administrator'):
                common.gate('START', 'START')

    def test_failure_never_exposes_subprocess_secret(self):
        completed = subprocess.CompletedProcess(['tool'], 1, 'PASSWORD_SECRET', 'mysql://SECRET')
        with patch('common.subprocess.run', return_value=completed):
            with self.assertRaises(RuntimeError) as error:
                common.run(['tool', 'SECRET_ARGUMENT'], data='SECRET_SQL')
        self.assertNotIn('SECRET', str(error.exception))

    def test_existing_control_file_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'config'
            file.write_text('existing')
            with self.assertRaisesRegex(RuntimeError, 'differs'):
                common.managed_file(file, 'replacement')
            self.assertEqual(file.read_text(), 'existing')

    @unittest.skipUnless(os.name == 'posix', 'POSIX mode semantics checked on Ubuntu')
    def test_explicit_mode_survives_restrictive_umask(self):
        with tempfile.TemporaryDirectory() as folder:
            previous = os.umask(0o077)
            try:
                file = Path(folder) / 'group-readable-config'
                common.managed_file(file, 'fixture', 0o640)
                self.assertEqual(file.stat().st_mode & 0o777, 0o640)
            finally:
                os.umask(previous)

    def inbox(self, folder):
        root = Path(folder)
        (root / 'release.tgz').write_bytes(b'fixture archive')
        (root / 'safe-extract.py').write_bytes(b'fixture extractor')
        archive_hash = common.digest(root / 'release.tgz')
        extractor_hash = common.digest(root / 'safe-extract.py')
        (root / 'metadata.json').write_text(json.dumps(dict(sha=common.SHA, manifestSha256=common.MANIFEST_HASH,
            archiveSha256=archive_hash, platform='linux', arch='x64', nodeVersion='24.22.2')))
        self.write_sums(root)
        return root, archive_hash, extractor_hash

    def write_sums(self, root):
        (root / 'SHA256SUMS').write_text(''.join(common.digest(root / name) + '  ' + name + '\n'
            for name in ('release.tgz', 'metadata.json', 'safe-extract.py')))

    @contextlib.contextmanager
    def fixture_pins(self, values):
        with patch.object(common, 'ARCHIVE_BYTES', 15), patch.object(common, 'ARCHIVE_HASH', values[1]), patch.object(common, 'EXTRACTOR_HASH', values[2]):
            yield

    def test_complete_inbox_hash_verification(self):
        with tempfile.TemporaryDirectory() as folder:
            values = self.inbox(folder)
            with self.fixture_pins(values):
                common.verify_inbox(values[0])

    def test_corrupted_archive_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            values = self.inbox(folder)
            (values[0] / 'release.tgz').write_bytes(b'corrupt archive')
            with self.fixture_pins(values), self.assertRaisesRegex(RuntimeError, 'SHA-256'):
                common.verify_inbox(values[0])

    def test_wrong_source_even_with_valid_checksums_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            values = self.inbox(folder)
            metadata = json.loads((values[0] / 'metadata.json').read_text())
            metadata['sha'] = '0' * 40
            (values[0] / 'metadata.json').write_text(json.dumps(metadata))
            self.write_sums(values[0])
            with self.fixture_pins(values), self.assertRaisesRegex(RuntimeError, 'Metadata'):
                common.verify_inbox(values[0])

    def test_missing_checksum_entry_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            values = self.inbox(folder)
            (values[0] / 'SHA256SUMS').write_text('')
            with self.fixture_pins(values), self.assertRaisesRegex(RuntimeError, 'Missing'):
                common.verify_inbox(values[0])

    def test_privileged_or_role_grant_rejected(self):
        with patch.object(stage, 'client_options', return_value=Path('/private.cnf')):
            for grant in ('GRANT ALL PRIVILEGES ON *.* TO x', 'GRANT `production_role` TO x',
                          'GRANT SELECT ON `maxhigh_staging`.* TO x WITH GRANT OPTION'):
                with patch.object(stage, 'sql', side_effect=['maxhigh_stage_preview@127.0.0.1\tmaxhigh_staging', grant]):
                    with self.assertRaisesRegex(RuntimeError, 'privileges'):
                        stage.verify_database()

    def test_client_options_cannot_target_production(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'client.cnf'
            file.write_text('[client]\nhost=127.0.0.1\nport=3306\nprotocol=tcp\ndatabase=maxhigh\nuser=readonly\npassword=fixture\n')
            with patch.object(common, 'secret_file', return_value=file):
                with self.assertRaisesRegex(RuntimeError, 'isolated schema'):
                    common.client_options(file, common.DB)

    def test_wrong_health_release_stops_before_probes(self):
        with patch.object(stage, 'http', return_value=(200, {'Cache-Control': 'no-store'}, b'{"ok":true,"release":"wrong"}')) as http:
            with self.assertRaisesRegex(RuntimeError, 'Health'):
                stage.smoke()
            self.assertEqual(http.call_count, 1)

    def test_startup_wait_accepts_delayed_readiness(self):
        ready = (200, {}, json.dumps(dict(ok=True, release=common.SHA)).encode())
        with patch.object(stage, 'http', side_effect=[ConnectionError(), (503, {}, b'{}'), ready]), \
             patch.object(stage.time, 'sleep'):
            stage.await_health()

    def test_startup_wait_never_masks_wrong_release(self):
        with patch.object(stage, 'http', return_value=(200, {}, b'{"ok":true,"release":"wrong"}')) as request:
            with self.assertRaisesRegex(RuntimeError, 'Unexpected release'):
                stage.await_health()
            self.assertEqual(request.call_count, 1)

    def test_startup_wait_is_bounded(self):
        with patch.object(stage.time, 'monotonic', side_effect=[0, 50]):
            with self.assertRaisesRegex(RuntimeError, 'bounded'):
                stage.await_health()

    def test_rollback_only_stops_dedicated_service(self):
        result = subprocess.CompletedProcess([], 0, '', '')
        with patch.object(stage, 'run', return_value=result) as run, patch.object(stage, 'preview_off'), contextlib.redirect_stdout(io.StringIO()):
            stage.rollback()
        calls = [call.args[0] for call in run.call_args_list]
        self.assertEqual(calls, [['systemctl', 'stop', 'maxhigh-staging-preview.service'], ['ss', '-H', '-lnt']])

    def test_streaming_pipeline_checks_upstream_failure(self):
        with self.assertRaisesRegex(RuntimeError, 'pipeline failed'):
            recovery.pipeline([[sys.executable, '-c', 'raise SystemExit(7)'],
                               [sys.executable, '-c', 'import sys;sys.stdin.buffer.read()']])

    def test_streaming_pipeline_bytes_preserved(self):
        with tempfile.TemporaryFile() as output:
            recovery.pipeline([[sys.executable, '-c', 'import sys;sys.stdout.buffer.write(b"abc"*50000)'],
                               [sys.executable, '-c', 'import sys;sys.stdout.buffer.write(sys.stdin.buffer.read())']], output)
            output.seek(0)
            self.assertEqual(hashlib.file_digest(output, 'sha256').hexdigest(), hashlib.sha256(b'abc' * 50000).hexdigest())

    @unittest.skipUnless(os.environ.get('MAXHIGH_LOCAL_TEST_NODE'), 'Set verified local Node path for independent payload-guard test')
    def test_payload_guard_accepts_exact_bytes_and_rejects_tampering(self):
        code = next(value for value in stage.verify_release.__code__.co_consts
                    if isinstance(value, str) and value.startswith("import fs from 'node:fs'"))
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / '.output').mkdir()
            asset = root / '.output/a.txt'
            asset.write_bytes(b'correct')
            (root / 'release-validation.json').write_text(json.dumps(dict(
                artifactDigest=hashlib.sha256(b'.output/a.txt\0correct').hexdigest())))
            command = [os.environ['MAXHIGH_LOCAL_TEST_NODE'], '--input-type=module', '-e', code, folder]
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 0)
            asset.write_bytes(b'tampered')
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 1)


if __name__ == '__main__':
    unittest.main()
