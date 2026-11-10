// Installed as /var/www/maxhigh/staging/uat-run.mjs (root-owned). Writable UAT runtime, loopback only.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '/var/www/maxhigh/staging';
const sha = '07d670abe485e06292d8c3e624e7df4824ae80eb';
const release = path.join(root, 'releases', sha);
if (process.platform !== 'linux' || fs.realpathSync(root) !== root) throw Error('Wrong UAT target');
const manifest = JSON.parse(fs.readFileSync(path.join(release, 'release-validation.json')));
if (manifest.sha !== sha || manifest.nodeVersion !== process.versions.node) throw Error('Release/Node mismatch');
if (process.env.MYSQL_DATABASE !== 'maxhigh_staging' || process.env.MYSQL_USER !== 'maxhigh_uat_app' ||
    process.env.MYSQL_HOST !== '127.0.0.1' || process.env.DATABASE_URL) throw Error('UAT must use the staging-only DB identity');
Object.assign(process.env, {
  NODE_ENV: 'production', HOST: '127.0.0.1', NITRO_HOST: '127.0.0.1', PORT: '18080',
  NITRO_PORT: '18080', OPERATION_COMPRESSION: '0', RELEASE_SHA: sha,
});
delete process.env.STAGING_READ_ONLY;
await import(pathToFileURL(path.join(release, '.output/server/index.mjs')));
if (process.send) {
  let ok = false;
  for (let i = 0; i < 150 && !ok; i++) {
    try {
      const r = await fetch('http://127.0.0.1:18080/api/health', { signal: AbortSignal.timeout(1000) });
      const v = await r.json();
      ok = r.ok && v.ok && v.release === sha;
    } catch {}
    if (!ok) await new Promise((r) => setTimeout(r, 200));
  }
  if (ok) process.send('ready');
  else { process.exitCode = 1; process.emit('SIGTERM'); }
}
