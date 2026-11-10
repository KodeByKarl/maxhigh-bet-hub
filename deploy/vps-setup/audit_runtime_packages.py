#!/usr/bin/env python3
"""Public npm advisory lookup for traced release package metadata; never executes release code."""
import argparse
import json
from pathlib import Path
import re
import tarfile
import urllib.request
from common import ARCHIVE_HASH, digest, require


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    require(digest(args.archive) == ARCHIVE_HASH, 'Only the pinned archive may be audited')
    bom = {}
    with tarfile.open(args.archive, 'r:gz') as source:
        for item in source:
            if '/node_modules/' not in item.name or not item.name.endswith('/package.json'):
                continue
            require(item.isfile() and item.size <= 2 * 1024**2, 'Invalid package metadata')
            value = json.loads(source.extractfile(item).read())
            name, version = value.get('name', ''), value.get('version', '')
            if re.fullmatch(r'(?:@[a-z0-9_.-]+/)?[a-z0-9_.-]+', name) and re.fullmatch(r'\d+\.\d+\.\d+(?:[-+][A-Za-z0-9_.-]+)?', version):
                bom.setdefault(name, set()).add(version)
    payload = {name: sorted(versions) for name, versions in sorted(bom.items())}
    if not payload:
        print(json.dumps(dict(assessed=False, reason='No traced package metadata; do not infer no vulnerabilities')))
        return
    request = urllib.request.Request('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk',
        data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.loads(response.read(5 * 1024**2))
    findings = []
    for name, advisories in result.items():
        require(name in payload and isinstance(advisories, list), 'Unexpected advisory response')
        for advisory in advisories:
            findings.append(dict(package=name, versions=payload[name], id=advisory.get('id'),
                severity=advisory.get('severity'), affectedRange=advisory.get('vulnerable_versions')))
    print(json.dumps(dict(assessed=True, scope='traced runtime package.json versions only; not complete bundled-client/OS audit',
        registry='https://registry.npmjs.org', packageNames=len(payload), packageVersions=sum(map(len, payload.values())),
        bom=payload, advisoryCount=len(findings), findings=findings)))
    # No npm install/audit fix or application update is permitted here.


if __name__ == '__main__':
    main()
