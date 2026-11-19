"""Safety checks for the release kit. Local only: no real services, credentials or databases are touched."""
import importlib.util
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import types
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('release_operate', Path(__file__).with_name('operate.py'))
operate = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {'grp': types.ModuleType('grp')}):
    spec.loader.exec_module(operate)

PREV = '29656ce35e84b8d74c430fea9bd5ccbc6d9434d8'
CAND = 'd22dfd99ef47afdf26d60eaf69ab1244adab910f'
UAT = '2d439ac38d8afaea2a93866b8b897b715bc1dae9'
GOOD = {'sha': CAND, 'archiveSha256': 'a' * 64, 'manifestSha256': 'b' * 64, 'publicAssets': 3989, 'games': 100, 'attempt': 'r1'}
operate.bind(GOOD)


def plain_write(path, data, *args):
    Path(path).write_text(data)


class Layout:
    """A fake production root + backup directory reflecting a verified backup of the PREV release."""

    def __init__(self, directory):
        base = Path(directory).resolve()
        self.root, self.backup = base / 'production', base / 'backup'
        (self.root / 'releases' / PREV).mkdir(parents=True)
        (self.root / 'releases' / CAND).mkdir(parents=True)
        for sha in (PREV, CAND):
            (self.root / 'releases' / sha / 'release-validation.json').write_text(json.dumps({'sha': sha}))
        self.backup.mkdir()
        self.prev_target = json.dumps({'sha': PREV, 'database': {'MYSQL_DATABASE': 'live_db'}})
        files = {'target.json': self.prev_target, 'run.mjs': '// previous run', 'pm2.config.cjs': '// previous pm2'}
        for name, text in files.items():
            (self.root / name).write_text(text)
            (self.backup / f'previous-{name}').write_text(text)
        hashes = {f'previous-{n}': operate.sha256(self.backup / f'previous-{n}') for n in files}
        (self.backup / 'verified.json').write_text(json.dumps({'sha': CAND, 'verified': True, 'previousRelease': PREV,
                                                              'uatRelease': UAT, 'hashes': hashes}))

    def patches(self):
        return [patch.object(operate, 'ROOT', self.root), patch.object(operate, 'BACKUP', self.backup),
                patch.object(operate, 'RELEASE', self.root / 'releases' / CAND),
                patch.object(operate, 'protected_write', side_effect=plain_write)]


class ReleaseKitSafetyTests(unittest.TestCase):
    def test_candidate_requires_real_builder_pins(self):
        for bad in [{**GOOD, 'archiveSha256': 'pending'}, {**GOOD, 'sha': CAND[:7]}, {**GOOD, 'games': 50},
                    {**GOOD, 'manifestSha256': ''}, {**GOOD, 'attempt': '../x'}]:
            with self.subTest(bad=bad), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / 'candidate.json'
                path.write_text(json.dumps(bad))
                with self.assertRaises(RuntimeError):
                    operate.load_candidate(path)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'candidate.json'
            path.write_text(json.dumps(GOOD))
            self.assertEqual(operate.load_candidate(path)['sha'], CAND)

    def test_backup_location_is_per_candidate_and_attempt(self):
        self.assertEqual(operate.BACKUP, operate.BACKUP_BASE / f'{CAND}-r1')
        self.assertRegex(operate.SCRATCH_DB, r'^[A-Za-z0-9_]{1,64}$')

    def test_archive_rejects_escape_links_and_duplicate_paths(self):
        for name, kind, duplicate in [('../outside', tarfile.REGTYPE, False), ('/etc/passwd', tarfile.REGTYPE, False),
                                       ('.output/link', tarfile.SYMTYPE, False), ('.output/link', tarfile.LNKTYPE, False),
                                       ('.output/file', tarfile.REGTYPE, True), ('etc/cron.d/x', tarfile.REGTYPE, False)]:
            with self.subTest(name=name, duplicate=duplicate), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                archive = root / 'release.tgz'
                with tarfile.open(archive, 'w:gz') as output:
                    for _ in range(2 if duplicate else 1):
                        item = tarfile.TarInfo(name)
                        item.type = kind
                        item.linkname = '/etc/passwd'
                        item.size = 1 if kind == tarfile.REGTYPE else 0
                        output.addfile(item, io.BytesIO(b'x'))
                (root / 'target').mkdir()
                with self.assertRaises(RuntimeError):
                    operate.unpack(archive, root / 'target')
                self.assertFalse((root / 'outside').exists())

    def test_rollback_returns_to_recorded_previous_release_and_files(self):
        with tempfile.TemporaryDirectory() as directory:
            layout = Layout(directory)
            (layout.root / 'target.json').write_text(json.dumps({'sha': CAND, 'database': {}}))  # as after activation
            (layout.root / 'run.mjs').write_text('// new run')
            healthy_calls, restarts = [], []
            patches = layout.patches() + [
                patch.object(operate, 'restart', side_effect=lambda: restarts.append(1)),
                patch.object(operate, 'healthy', side_effect=lambda port, sha: healthy_calls.append((port, sha))),
                patch.object(operate, 'health', side_effect=lambda port: UAT)]
            for p in patches:
                p.start()
            try:
                operate.rollback()
            finally:
                patch.stopall()
            self.assertEqual((layout.root / 'target.json').read_text(), layout.prev_target)
            self.assertEqual((layout.root / 'run.mjs').read_text(), '// previous run')
            self.assertEqual(healthy_calls, [(operate.PROD_PORT, PREV)])
            self.assertEqual(len(restarts), 1)

    def test_rollback_refuses_tampered_backup_copy(self):
        with tempfile.TemporaryDirectory() as directory:
            layout = Layout(directory)
            (layout.backup / 'previous-target.json').write_text(json.dumps({'sha': 'f' * 40, 'database': {}}))
            for p in layout.patches() + [patch.object(operate, 'restart')]:
                p.start()
            try:
                with self.assertRaisesRegex(RuntimeError, 'changed'):
                    operate.rollback()
            finally:
                patch.stopall()
            self.assertEqual(json.loads((layout.root / 'target.json').read_text())['sha'], PREV)

    def test_failed_postswitch_verification_restores_previous_runtime(self):
        with tempfile.TemporaryDirectory() as directory:
            layout = Layout(directory)
            kit = Path(directory) / 'kit'
            kit.mkdir()
            (kit / 'run.mjs').write_text('// new run')
            (kit / 'pm2.config.cjs').write_text('// new pm2')
            (layout.backup / 'staged.json').write_text(json.dumps({'sha': CAND, 'previousRelease': PREV}))
            verified = json.loads((layout.backup / 'verified.json').read_text())
            verified['database'] = {'MYSQL_DATABASE': 'live_db'}
            seen_targets, healthy_calls = [], []
            patches = layout.patches() + [
                patch.object(operate, 'KIT', kit),
                patch.object(operate, 'state', return_value=verified),
                patch.object(operate, 'discover_live', return_value={'sha': PREV, 'uat': UAT, 'database': {}}),
                patch.object(operate, 'restart', side_effect=lambda: seen_targets.append(json.loads((layout.root / 'target.json').read_text())['sha'])),
                patch.object(operate, 'verify', side_effect=RuntimeError('injected verification failure')),
                patch.object(operate, 'healthy', side_effect=lambda port, sha: healthy_calls.append((port, sha))),
                patch.object(operate, 'health', side_effect=lambda port: UAT)]
            for p in patches:
                p.start()
            try:
                with self.assertRaisesRegex(RuntimeError, 'previous production runtime restored'):
                    operate.activate()
            finally:
                patch.stopall()
            self.assertEqual(seen_targets, [CAND, PREV])  # switched, then restored
            self.assertEqual((layout.root / 'target.json').read_text(), layout.prev_target)
            self.assertEqual((layout.root / 'pm2.config.cjs').read_text(), '// previous pm2')
            self.assertEqual(healthy_calls, [(operate.PROD_PORT, PREV)])

    def test_activation_refuses_when_live_baseline_moved(self):
        with tempfile.TemporaryDirectory() as directory:
            layout = Layout(directory)
            (layout.backup / 'staged.json').write_text(json.dumps({'sha': CAND, 'previousRelease': PREV}))
            verified = json.loads((layout.backup / 'verified.json').read_text())
            restarts = []
            patches = layout.patches() + [
                patch.object(operate, 'state', return_value=verified),
                patch.object(operate, 'discover_live', return_value={'sha': 'e' * 40, 'uat': UAT, 'database': {}}),
                patch.object(operate, 'restart', side_effect=lambda: restarts.append(1))]
            for p in patches:
                p.start()
            try:
                with self.assertRaisesRegex(RuntimeError, 'Baseline changed'):
                    operate.activate()
            finally:
                patch.stopall()
            self.assertEqual(restarts, [])
            self.assertEqual((layout.root / 'target.json').read_text(), layout.prev_target)

    def test_discovery_requires_public_assets_to_match_target_release(self):
        with tempfile.TemporaryDirectory() as directory:
            layout = Layout(directory)
            dropin = Path(directory) / 'override.conf'
            dropin.write_text('[Service]')
            common = layout.patches() + [patch.object(operate, 'DROPIN', dropin),
                                         patch.object(operate, 'health', side_effect=lambda port: PREV if port == operate.PROD_PORT else UAT),
                                         patch.object(operate, 'main_pid_cwd', return_value=layout.root)]
            for p in common + [patch.object(operate, 'served_release_matches', return_value=False)]:
                p.start()
            try:
                with self.assertRaisesRegex(RuntimeError, 'Public site does not serve'):
                    operate.discover_live()
            finally:
                patch.stopall()
            for p in common + [patch.object(operate, 'served_release_matches', return_value=True)]:
                p.start()
            try:
                self.assertEqual(operate.discover_live()['sha'], PREV)
            finally:
                patch.stopall()

    def test_discovery_refuses_when_health_label_disagrees(self):
        with tempfile.TemporaryDirectory() as directory:
            layout = Layout(directory)
            dropin = Path(directory) / 'override.conf'
            dropin.write_text('[Service]')
            for p in layout.patches() + [patch.object(operate, 'DROPIN', dropin),
                                         patch.object(operate, 'health', return_value='a' * 40)]:
                p.start()
            try:
                with self.assertRaisesRegex(RuntimeError, 'health disagrees'):
                    operate.discover_live()
            finally:
                patch.stopall()

    def test_backup_never_reuses_existing_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            existing = Path(directory) / 'attempt'
            existing.mkdir()
            (existing / 'application.tar.gz').write_bytes(b'partial')
            with patch.object(operate, 'BACKUP', existing), \
                    patch.object(operate, 'plan', return_value=({'sha': PREV, 'uat': UAT}, {'MYSQL_DATABASE': 'x'})):
                with self.assertRaisesRegex(RuntimeError, 'never overwrite'):
                    operate.backup()
            self.assertEqual((existing / 'application.tar.gz').read_bytes(), b'partial')

    def test_missing_verified_record_blocks_stage(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(operate, 'BACKUP', Path(directory)):
                with self.assertRaises(FileNotFoundError):
                    operate.stage()


if __name__ == '__main__':
    unittest.main()
