import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const release = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.resolve(release, '../..');
if (process.platform !== 'linux' || root !== '/var/www/maxhigh/staging' || fs.realpathSync(root) !== root)
  throw Error('Preview requires the reviewed Linux staging path');
const manifest = JSON.parse(fs.readFileSync(path.join(release, 'release-validation.json')));
if (manifest.platform !== 'linux' || manifest.arch !== process.arch || manifest.nodeVersion !== process.versions.node)
  throw Error('Preview runtime must match the Linux artifact');
if (process.env.MYSQL_DATABASE !== 'maxhigh_staging' || process.env.MYSQL_USER !== 'maxhigh_stage_preview' ||
    process.env.MYSQL_HOST !== '127.0.0.1' || process.env.MYSQL_PORT !== '3306' || process.env.DATABASE_URL)
  throw Error('A separate staging-only read-only database identity is required');
Object.assign(process.env, {
  NODE_ENV: 'production', HOST: '127.0.0.1', NITRO_HOST: '127.0.0.1', PORT: '18080', NITRO_PORT: '18080',
  STAGING_READ_ONLY: '1', OPERATION_COMPRESSION: '0', RELEASE_SHA: manifest.sha,
  DOTENV_CONFIG_PATH: path.join(root, '.env.preview'),
});
await import(pathToFileURL(path.join(release, '.output/server/index.mjs')));
if (process.send) {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch('http://127.0.0.1:18080/api/health', { signal: AbortSignal.timeout(1000) });
      const value = await response.json();
      if (response.ok && value.ok && value.release === manifest.sha) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!ready) { process.exitCode = 1; process.emit('SIGTERM'); }
  else process.send('ready');
}
