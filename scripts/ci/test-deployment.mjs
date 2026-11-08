import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { switchRelease, probeHealth, validateRelease } from '../../deploy/release-manager.mjs';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'maxhigh-ci-'));
let passed = 0;
try {
  // Real helper behavior; rollback must restore the old pointer and prove it healthy.
  const pointer = path.join(temporary, 'current.json');
  const old = JSON.stringify({ directory: 'prior' });
  fs.writeFileSync(pointer, old);
  const events = [];
  let calls = 0;
  await assert.rejects(switchRelease({ pointer, directory: 'candidate',
    quiesce: async () => events.push('drain'), reload: async () => events.push('start'),
    health: async () => { if (++calls === 1) throw Error('injected health failure'); assert.equal(fs.readFileSync(pointer, 'utf8'), old); },
  }), /injected health failure/);
  assert.deepEqual(events, ['drain', 'start', 'drain', 'start']);
  assert.equal(calls, 2); passed++;
  await assert.rejects(probeHealth('http://invalid', { expectedSha: 'a'.repeat(40), attempts: 1,
    fetcher: async () => Response.json({ ok: true, release: 'b'.repeat(40) }),
  }), /health check failed/); passed++;
  const root = path.join(temporary, 'artifact');
  fs.mkdirSync(path.join(root, '.output'), { recursive: true });
  fs.mkdirSync(path.join(root, 'drizzle'));
  // A self-claimed manifest without an exact payload digest must never pass.
  fs.writeFileSync(path.join(root, 'release-validation.json'), JSON.stringify({ sha: 'a'.repeat(40), artifactDigest: '0'.repeat(64), checks: ['typecheck', 'lint', 'test:unit', 'build'] }));
  assert.throws(() => validateRelease(root), /validation incomplete/); passed++;
  // Only exercise its platform rejection here; on Linux the full builder is run by CI.
  if (process.platform !== 'linux') {
    const builder = spawnSync(process.execPath, ['deploy/ci/build-artifact.mjs'], { encoding: 'utf8' });
    assert.notEqual(builder.status, 0); assert.match(builder.stderr, /never relabel a Windows build/); passed++;
  }
} finally {
  assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith('maxhigh-ci-'));
  fs.rmSync(temporary, { recursive: true, force: true });
}
console.log(`PASS ${passed} deployment security/rollback checks (${process.platform}; not Ubuntu VPS qualification)`);
