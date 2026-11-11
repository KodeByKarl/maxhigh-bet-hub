#!/usr/bin/env python3
"""One-shot resource evidence; no process environments, database rows or credentials."""
import argparse
import json
import shutil
from common import *


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--approve', required=True)
    args = parser.parse_args()
    gate(args.approve, 'MONITOR')
    require(ROOT.is_dir(), 'Staging root not provisioned')
    memory = {line.split(':')[0]: int(line.split()[1]) * 1024 for line in Path('/proc/meminfo').read_text().splitlines()
              if line.startswith(('MemAvailable:', 'SwapFree:'))}
    disk = shutil.disk_usage(ROOT)
    log_bytes = sum(p.stat().st_size for p in (ROOT / 'logs').glob('*') if p.is_file() and not p.is_symlink())
    info = {'memAvailableBytes': memory['MemAvailable'], 'swapFreeBytes': memory['SwapFree'],
            'diskFreeBytes': disk.free, 'logBytes': log_bytes,
            'warning': memory['MemAvailable'] < 768 * 1024**2 or memory['SwapFree'] < 512 * 1024**2
                       or disk.free < 8 * 1024**3 or log_bytes > 100 * 1024**2}
    # No raw service status, command lines, PM2 JSON or environments.
    info['service'] = run(['systemctl', 'show', SERVICE, '--property=ActiveState,MemoryCurrent,CPUUsageNSec,NRestarts', '--no-pager']).stdout.strip()
    for name in ('cpu', 'memory', 'io'):
        file = Path('/proc/pressure') / name
        if file.exists():
            info[name + 'Pressure'] = file.read_text().strip()
    print(json.dumps(info))
    if info['warning']:
        raise RuntimeError('Resource warning; stop preview if sustained30s or production is affected. No unrelated service stopped automatically')


if __name__ == '__main__':
    finish(main)
