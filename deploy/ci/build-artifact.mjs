import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { artifactDigest, bundleMigration, exportRelease, validateRelease } from '../release-manager.mjs';

// Trusted, ephemeral Linux builder only. No environment/database credentials needed.
const pinnedNode = fs.readFileSync('.node-version', 'utf8').trim();
if (process.platform !== 'linux' || process.arch !== 'x64' || process.versions.node !== pinnedNode)
  throw Error(`Build requires Linux x64 and Node ${pinnedNode}; never relabel a Windows build`);
if (!/^VERSION_ID="24\.04"$/m.test(fs.readFileSync('/etc/os-release', 'utf8')))
  throw Error('Build requires Ubuntu 24.04');
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
  if (result.error || result.status !== 0) throw Error(`${command} ${args.join(' ')} failed`);
}
const sha = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
if (!/^[a-f0-9]{40}$/.test(sha) || (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== sha))
  throw Error('Checkout identity mismatch');
const clean = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
if (clean.status !== 0 || clean.stdout.trim()) throw Error('Builder requires a clean committed checkout');
for (const name of fs.readdirSync('.').filter(name => /^\.env(?:\.|$)/.test(name) && name !== '.env.example'))
  throw Error('Builder must not contain application credential/environment files: '+name);
const checks = ['typecheck', 'lint', 'test:unit', 'build'];
for (const check of checks) run('npm', ['run', check]);
run(process.execPath, ['scripts/ci/test-deployment.mjs']);
await bundleMigration(process.cwd());
// These harnesses are fixed to the disposable CI database on loopback:19307.
// They never consume the production .env.database or the staging database.
run('npm', ['run', 'test:migrations']);
run('npm', ['run', 'test:integration']);
if (!process.env.PLAYWRIGHT_MODULE) throw Error('Pinned CI browser tooling required');
run(process.execPath, ['scripts/test-browser.mjs', process.env.PLAYWRIGHT_MODULE]);
checks.push('linux:migrations', 'linux:http', 'linux:browser', 'deployment:security');
if (spawnSync('git', ['diff', '--quiet', 'HEAD'], { stdio: 'ignore' }).status !== 0)
  throw Error('Validation/build modified tracked source; review and commit generated changes first');

// Exact per-file preservation, including assets omitted by an accidental build change.
const assets = [];
function visit(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    const source = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) throw Error('Unexpected public asset symlink');
    if (entry.isDirectory()) visit(source);
    else {
      const relative = path.relative('public', source).replaceAll('\\', '/');
      const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      const hash = digest(source);
      if (hash !== digest(path.join('.output/public', relative))) throw Error(`Public asset changed: ${relative}`);
      assets.push({ path: relative, sha256: hash, bytes: fs.statSync(source).size });
    }
  }
}
visit('public');
if (assets.length !== 3987) throw Error('Expected all 3,987 original public assets');
const catalog = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/ci/catalog-count.ts'], { encoding: 'utf8' });
if (catalog.status !== 0 || catalog.stdout.trim() !== '100') throw Error('All 100 playable mappings are required');
const output = path.resolve('audit/ubuntu-staging/runtime/ci');
if (fs.existsSync(output)) throw Error('Use a fresh checkout; CI output already exists');
fs.mkdirSync(output, { recursive: true });
const migrations = createHash('sha256');
for (const file of fs.readdirSync('drizzle').filter(x => /^\d{4}_.*\.sql$/.test(x)).sort())
  migrations.update(file).update('\0').update(fs.readFileSync(path.join('drizzle', file)));
const inventory = JSON.stringify(assets);
fs.writeFileSync(path.join(output, 'public-assets.json'), inventory);
const preview = path.resolve('.output/staging');
fs.mkdirSync(preview, { recursive: true });
for (const [source, name] of [['preview-run.mjs','run.mjs'], ['preview-pm2.config.cjs','pm2.config.cjs'],
  ['preview-verify.mjs','verify.mjs'], ['preview-runtime.example','runtime.example'], ['safe-extract.py','safe-extract.py']])
  fs.copyFileSync(path.join('deploy/staging', source), path.join(preview, name));
fs.writeFileSync(path.join(preview, 'public-assets.json'), inventory);

// Reject secrets, development caches and Windows native binaries anywhere in the export.
function inspect(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) throw Error('Non-regular export entry');
    if (/^(\.git|\.env(?:\..*)?|\.cache|\.vite|\.nitro|__pycache__|\.npmrc|\.netrc|id_rsa|id_ed25519|maxhigh_vps2)$/i.test(entry.name) ||
        /\.(exe|dll|pdb|pem|key|ppk|p12|pfx|sqlite|db)$/i.test(entry.name)) throw Error('Forbidden secret/cache/Windows file: '+entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (entry.name.endsWith('.node')) {
      const fd=fs.openSync(file,'r'), magic=Buffer.alloc(4);fs.readSync(fd,magic,0,4,0);fs.closeSync(fd);
      if (!magic.equals(Buffer.from([0x7f,0x45,0x4c,0x46]))) throw Error('Native module is not Linux ELF');
    }
  }
}
inspect('.output'); inspect('drizzle');
const manifest = {
  sha, checks, artifactFormat: 'portable-v1', artifactDigest: artifactDigest(process.cwd()),
  migrationDigest: migrations.digest('hex'), storageCodecs: ['json', 'gz1'],
  platform: process.platform, arch: process.arch, nodeMajor: 24, nodeVersion: process.versions.node,
  os: 'ubuntu-24.04', publicAssets: assets.length, games: 100, previewCapable: true,
  extractionToolSha256: createHash('sha256').update(fs.readFileSync('deploy/staging/safe-extract.py')).digest('hex'),
  publicInventoryDigest: createHash('sha256').update(inventory).digest('hex'),
  validatedAt: new Date().toISOString(),
};
fs.writeFileSync('release-validation.json', JSON.stringify(manifest, null, 2));
validateRelease(process.cwd());
// A cold start outside the checkout must resolve all runtime dependencies using
// only the portable output. No root/Windows node_modules are available there.
const smokeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'maxhigh-portable-'));
try {
  exportRelease(process.cwd(), path.join(smokeRoot, 'release'));
  run(process.execPath, ['scripts/ci/test-preview.mjs', path.join(smokeRoot, 'release')]);
} finally {
  if (path.dirname(smokeRoot) !== path.resolve(os.tmpdir())) throw Error('Unsafe temporary cleanup');
  fs.rmSync(smokeRoot, { recursive: true, force: true });
}
const exported = exportRelease(process.cwd(), path.join(output, 'release'));
run('tar', ['-czf', path.join(output, 'release.tgz'), '-C', exported.directory, '.']);
const listing = spawnSync('tar', ['-tzf', path.join(output, 'release.tgz')], { encoding: 'utf8', maxBuffer: 16 * 1024 ** 2 });
if (listing.status !== 0) throw Error('Final archive listing failed');
fs.writeFileSync(path.join(output, 'artifact-contents.txt'), listing.stdout);
const archiveSha256 = createHash('sha256').update(fs.readFileSync(path.join(output, 'release.tgz'))).digest('hex');
const metadata = { sha, manifestSha256: exported.manifestSha256, archiveSha256, nodeVersion: pinnedNode, platform: 'linux', arch: 'x64' };
fs.writeFileSync(path.join(output, 'metadata.json'), JSON.stringify(metadata, null, 2));
fs.copyFileSync('deploy/staging/safe-extract.py', path.join(output, 'safe-extract.py'));
fs.writeFileSync(path.join(output, 'SHA256SUMS'), ['release.tgz','metadata.json','safe-extract.py'].map(file =>
  `${createHash('sha256').update(fs.readFileSync(path.join(output,file))).digest('hex')}  ${file}\n`).join(''));
if (process.env.GITHUB_OUTPUT)
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(metadata).map(([k,v]) => `${k}=${v}\n`).join(''));
console.log(JSON.stringify({ ...metadata, publicAssets: assets.length }));
