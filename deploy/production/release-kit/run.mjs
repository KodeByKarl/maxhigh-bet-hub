import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '/var/www/maxhigh/production';
if (process.platform !== 'linux' || fs.realpathSync(root) !== root) throw Error('Wrong production root');
const target = JSON.parse(fs.readFileSync(path.join(root, 'target.json')));
for (const key of ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_DATABASE', 'MYSQL_USER'])
  if (process.env[key] !== target.database[key]) throw Error('Production database target mismatch');
if (process.env.DATABASE_URL || process.env.MAXHIGH_POLICY_TEST_FILE || process.env.MAXHIGH_POLICY_TEST_OVERRIDE)
  throw Error('Unexpected database URL or test policy override');
const probe = process.env.PRODUCTION_PROBE === '1';
// A read-only probe may start a STAGED candidate (operate.py stage) without touching target.json.
// Outside probe mode the override is refused, so the live service always serves target.json.
const probeSha = process.env.PRODUCTION_PROBE_SHA;
if (probeSha !== undefined && (!probe || !/^[0-9a-f]{40}$/.test(probeSha))) throw Error('Invalid probe release override');
const sha = probeSha ?? target.sha;
const release = path.join(root, 'releases', sha);
const manifest = JSON.parse(fs.readFileSync(path.join(release, 'release-validation.json')));
if (manifest.sha !== sha || manifest.nodeVersion !== process.versions.node || manifest.platform !== 'linux')
  throw Error('Production artifact/runtime mismatch');
const port = probe ? '18780' : '18080';
Object.assign(process.env, {
  NODE_ENV: 'production', PUBLIC_URL: 'https://maxhigh.online',
  HOST: '127.0.0.1', NITRO_HOST: '127.0.0.1', PORT: port, NITRO_PORT: port,
  OPERATION_COMPRESSION: '0', RELEASE_SHA: sha,
  DOTENV_CONFIG_PATH: path.join(root, '.env.production'),
});
if (probe) process.env.STAGING_READ_ONLY = '1';
else delete process.env.STAGING_READ_ONLY;
await import(pathToFileURL(path.join(release, '.output/server/index.mjs')));
if (process.send) {
  let ready = false;
  for (let i = 0; i < 150 && !ready; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1000) });
      const v = await r.json();
      ready = r.ok && v.ok && v.release === sha;
    } catch {}
    if (!ready) await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (ready) process.send('ready');
  else process.exit(1);
}
