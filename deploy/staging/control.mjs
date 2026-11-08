import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importRelease, activateRelease, validateRelease } from '../release-manager.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (process.platform !== 'linux' || process.arch !== 'x64' || Number(process.versions.node.split('.')[0]) !== 24)
  throw Error('Ubuntu staging requires Linux x64 Node 24');
if (root !== '/var/www/maxhigh-staging' || fs.realpathSync(root) !== root)
  throw Error('Staging control plane cannot target production');
process.loadEnvFile(path.join(root, '.env'));
if (process.env.DATABASE_URL || process.env.MYSQL_DATABASE !== 'maxhigh_staging' ||
    process.env.MYSQL_USER !== 'maxhigh_stage' || process.env.MYSQL_HOST !== '127.0.0.1' ||
    process.env.MYSQL_PORT !== '3306' || process.env.PORT !== '18080' ||
    process.env.DEPLOY_CANDIDATE_PORT !== '18081' || process.env.OPERATION_COMPRESSION !== '0')
  throw Error('Isolated staging database, ports and uncompressed receipt writes are required');
process.env.DEPLOY_PROFILE = 'ph-vps-2';
const [mode, value] = process.argv.slice(2);
if (!['--import', '--activate'].includes(mode)) throw Error('Only import or activation is allowed');
if (mode === '--activate' && !/^[a-f0-9]{40}$/.test(value ?? '')) throw Error('Invalid immutable revision');
const directory = mode === '--import' ? value : path.join(root, 'deploy/releases', value);
const manifest = validateRelease(directory);
if (manifest.artifactFormat !== 'portable-v1' || manifest.nodeVersion !== process.versions.node || manifest.os !== 'ubuntu-24.04')
  throw Error('Runtime Node patch must match the trusted Ubuntu artifact');
if (mode === '--import') console.log(JSON.stringify(importRelease(value, process.env.RELEASE_MANIFEST_SHA256)));
else if (mode === '--activate') console.log(JSON.stringify(await activateRelease(value)));
else throw Error('Only import or activation is allowed');
