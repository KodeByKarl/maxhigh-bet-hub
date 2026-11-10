"""Local stand-in for `python3 -B recovery.py <phase> ...` on a Windows test machine.

It runs the REAL, unmodified recovery.py from the approved packet (extracted into the test tree) and only redirects the
OS-specific seams: ADMIN/BACKUPS locations, the root-ownership check, systemctl/RAM gates, nice/ionice and tool paths.
Test use only. Environment: MAXHIGH_TEST_TREE, MARIA_BIN, AGE_DIR.   `--eval CODE` runs CODE with the same seams.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

TREE = Path(os.environ['MAXHIGH_TEST_TREE'])
sys.path.insert(0, str(TREE / 'root' / 'maxhigh-staging-385ed041'))
import common  # noqa: E402
import recovery  # noqa: E402

EXE = {'mariadb': os.environ['MARIA_BIN'] + '/mariadb.exe', 'mariadb-dump': os.environ['MARIA_BIN'] + '/mariadb-dump.exe',
       'age': os.environ['AGE_DIR'] + '/age.exe', 'gzip': shutil.which('gzip')}
real_run, real_popen = subprocess.run, subprocess.Popen


def translate(argv):
    argv = [str(x) for x in argv]
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


def lenient_secret_file(path):
    path = Path(path)
    common.no_links(path)
    common.require(path.is_file(), 'Required private file missing')
    return path


common.secret_file = recovery.secret_file = lenient_secret_file
recovery.preview_off = lambda: None
recovery.gate = lambda actual, expected: common.require(actual == expected, 'Explicit --approve ' + expected + ' required')
recovery.resources = lambda *a, **k: None
recovery.ADMIN, recovery.BACKUPS = TREE / 'root' / 'maxhigh-staging-admin', TREE / 'var-backups' / 'maxhigh-staging'
subprocess.run, subprocess.Popen = shim_run, ShimPopen

if len(sys.argv) > 2 and sys.argv[1] == '--eval':
    exec(compile(sys.argv[2], '<eval>', 'exec'))
else:
    sys.argv[0] = 'recovery.py'
    recovery.finish(recovery.main)
