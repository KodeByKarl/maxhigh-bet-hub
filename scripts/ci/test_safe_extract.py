import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('safe_extract', Path(__file__).resolve().parents[2] / 'deploy/staging/safe-extract.py')
safe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(safe)


class ManualExtractionTests(unittest.TestCase):
    def extract(self, name, kind=tarfile.REGTYPE):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'artifact.tgz'
            with tarfile.open(archive, 'w:gz') as output:
                item = tarfile.TarInfo(name)
                item.type = kind
                item.size = 1 if kind == tarfile.REGTYPE else 0
                item.linkname = '/etc/passwd'
                output.addfile(item, io.BytesIO(b'x'))
            root = Path(directory) / 'output'
            root.mkdir()
            safe.unpack(archive, root)
            return (root / '.output/server/test.mjs').read_bytes()

    def test_regular_file(self):
        self.assertEqual(self.extract('./.output/server/test.mjs'), b'x')

    def test_forbidden_entries(self):
        for name, kind in [('../.env', tarfile.REGTYPE), ('/etc/passwd', tarfile.REGTYPE),
                           ('.output/../../.env', tarfile.REGTYPE), ('.env', tarfile.REGTYPE),
                           ('.output/test', tarfile.SYMTYPE), ('.output/test', tarfile.LNKTYPE),
                           ('.output/test', tarfile.FIFOTYPE)]:
            with self.subTest(name=name, kind=kind), self.assertRaises(ValueError):
                self.extract(name, kind)


if __name__ == '__main__':
    unittest.main()
