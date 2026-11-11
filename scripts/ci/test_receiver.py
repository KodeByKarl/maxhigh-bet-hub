"""Exercise archive handling with hostile payloads before enabling any SSH key."""
import hashlib
import importlib.util
import io
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest

# fcntl is Linux-only. Archive parser tests can still execute on Windows.
if sys.platform == 'win32':
    from types import SimpleNamespace
    sys.modules.setdefault('fcntl', SimpleNamespace())
spec = importlib.util.spec_from_file_location('receiver', Path(__file__).resolve().parents[2] / 'deploy/staging/receive.py')
receiver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receiver)


class ReceiverTests(unittest.TestCase):
    def extract(self, entries):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'artifact.tgz'
            with tarfile.open(archive, 'w:gz') as output:
                for name, kind, payload in entries:
                    member = tarfile.TarInfo(name)
                    member.type = kind
                    member.size = len(payload)
                    member.linkname = '/etc/passwd' if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE) else ''
                    output.addfile(member, io.BytesIO(payload))
            target = Path(directory) / 'release'
            target.mkdir()
            receiver.unpack(archive, target)
            return {str(file.relative_to(target)).replace('\\', '/'): file.read_bytes()
                    for file in target.rglob('*') if file.is_file()}

    def test_exact_command_and_shell_injection(self):
        self.assertEqual(receiver.parse_command('deploy ' + 'a'*40 + ' ' + 'b'*64 + ' ' + 'c'*64)[0], 'a'*40)
        for command in ('bash', 'deploy '+ 'a'*40 + '; id', 'deploy ../../prod', 'scp -t incoming', ''):
            with self.subTest(command=command), self.assertRaises(ValueError):
                receiver.parse_command(command)

    def test_regular_payload_preserved(self):
        self.assertEqual(self.extract([('./.output/server/index.mjs', tarfile.REGTYPE, b'hello'),
                                       ('drizzle/0000_init.sql', tarfile.REGTYPE, b'SELECT 1;')]),
                         {'.output/server/index.mjs': b'hello', 'drizzle/0000_init.sql': b'SELECT 1;'})

    def test_traversal_absolute_and_secret_paths(self):
        for name in ('../.env', '/etc/passwd', '.output/../../.env', '.env', '.output\\..\\.env', 'deploy/serve.mjs'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.extract([(name, tarfile.REGTYPE, b'x')])

    def test_links_devices_and_fifo_rejected(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.CHRTYPE, tarfile.FIFOTYPE):
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                self.extract([('.output/evil', kind, b'')])

    def test_duplicate_payload_rejected(self):
        with self.assertRaises(ValueError):
            self.extract([('.output/x', tarfile.REGTYPE, b'a'), ('.output/x', tarfile.REGTYPE, b'b')])

    def test_expansion_limit(self):
        original = receiver.MAX_EXPANDED
        receiver.MAX_EXPANDED = 4
        try:
            with self.assertRaises(ValueError):
                self.extract([('.output/x', tarfile.REGTYPE, b'12345')])
        finally:
            receiver.MAX_EXPANDED = original


if __name__ == '__main__':
    unittest.main()
