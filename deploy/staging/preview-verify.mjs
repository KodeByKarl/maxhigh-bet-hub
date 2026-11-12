import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const release = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifestFile = path.join(release, 'release-validation.json');
const sha256 = value => createHash('sha256').update(value).digest('hex');
if (!/^[a-f0-9]{64}$/.test(process.env.RELEASE_MANIFEST_SHA256 ?? '') ||
    sha256(fs.readFileSync(manifestFile)) !== process.env.RELEASE_MANIFEST_SHA256)
  throw Error('Pin the manifest SHA-256 from the approved builder before verification');
const manifest = JSON.parse(fs.readFileSync(manifestFile));
if (process.platform !== 'linux' || process.arch !== manifest.arch || manifest.platform !== 'linux' ||
    manifest.nodeVersion !== process.versions.node || manifest.artifactFormat !== 'portable-v1' ||
    manifest.games !== 100 || manifest.publicAssets !== 3989)
  throw Error('Linux runtime or game/asset inventory mismatch');
const hash = createHash('sha256'), buffer = Buffer.allocUnsafe(65536);
function visit(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    const file = path.join(folder, entry.name);
    if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) throw Error('Non-regular artifact entry');
    if (entry.isDirectory()) visit(file);
    else {
      hash.update(path.relative(release, file).replaceAll('\\', '/')).update('\0');
      const fd = fs.openSync(file, 'r');
      try { let count; while ((count = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, count)); }
      finally { fs.closeSync(fd); }
    }
  }
}
visit(path.join(release, '.output'));
if (hash.digest('hex') !== manifest.artifactDigest) throw Error('Artifact payload digest mismatch');
const migration = createHash('sha256');
for (const file of fs.readdirSync(path.join(release, 'drizzle')).filter(x => /^\d{4}_.*\.sql$/.test(x)).sort())
  migration.update(file).update('\0').update(fs.readFileSync(path.join(release, 'drizzle', file)));
if (migration.digest('hex') !== manifest.migrationDigest) throw Error('Migration digest mismatch');
const inventory = fs.readFileSync(path.join(release, '.output/staging/public-assets.json'));
if (sha256(inventory) !== manifest.publicInventoryDigest) throw Error('Asset inventory digest mismatch');
for (const asset of JSON.parse(inventory)) {
  if (path.isAbsolute(asset.path) || asset.path.split('/').includes('..')) throw Error('Unsafe inventory path');
  if (sha256(fs.readFileSync(path.join(release, '.output/public', asset.path))) !== asset.sha256)
    throw Error('Public asset mismatch');
}
console.log(JSON.stringify({ verified: true, sha: manifest.sha, games: 100, publicAssets: 3989, nodeVersion: manifest.nodeVersion, dependencies: 'Linux runtime dependencies are traced inside .output/server; no VPS npm install required' }));
