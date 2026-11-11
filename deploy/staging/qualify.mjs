import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateRelease } from '../release-manager.mjs';

// Read-only preflight. It creates a private evidence file, never SQL rows or DDL.
const root = '/var/www/maxhigh-staging';
assert.equal(process.cwd(), root);
assert.equal(process.platform, 'linux');
assert.equal(process.arch, 'x64');
assert.match(fs.readFileSync('/etc/os-release', 'utf8'), /^VERSION_ID="24\.04"$/m);
const pointer = JSON.parse(fs.readFileSync(root + '/deploy/releases/current.json', 'utf8'));
assert.match(path.basename(pointer.directory), /^[a-f0-9]{40}$/);
assert.equal(path.dirname(pointer.directory), root + '/deploy/releases');
const manifest = validateRelease(pointer.directory);
assert.equal(manifest.nodeVersion, process.versions.node);
assert.equal(manifest.nodeMajor, 24);
const health = await fetch('http://127.0.0.1:18080/api/health', { signal: AbortSignal.timeout(3000) });
assert.equal(health.status, 200);
assert.match(health.headers.get('cache-control'), /no-store/);
assert.deepEqual(await health.json(), { ok: true, release: manifest.sha });
const pm2 = spawnSync('pm2', ['jlist', '--silent'], { encoding: 'utf8' });
assert.equal(pm2.status, 0, 'PM2 query failed');
const apps = JSON.parse(pm2.stdout);
assert.equal(apps.length, 1, 'Dedicated PM2 home must contain exactly one staging worker');
const app = apps[0];
assert.equal(app.name, 'maxhigh-app');
assert.equal(app.pm2_env.pm_cwd, root);
assert.equal(app.pm2_env.exec_mode, 'fork_mode');
assert.equal(app.pm2_env.status, 'online');
assert.equal(app.pm2_env.DB_POOL_LIMIT, '6');
assert.equal(app.pm2_env.MYSQL_DATABASE, 'maxhigh_staging');
assert.equal(app.pm2_env.MYSQL_USER, 'maxhigh_stage');
assert.equal(app.pm2_env.PORT, '18080');
assert.equal(app.pm2_env.NITRO_HOST, '127.0.0.1');
assert.equal(app.pm2_env.max_memory_restart, 1536 * 1024 ** 2);
assert.ok(app.pm2_env.node_args.includes('--max-old-space-size=1024'));
// A dedicated staging-only client defaults file, not the production connection file.
const sql = "SELECT DATABASE(),VERSION(),@@max_connections,@@innodb_buffer_pool_size,@@innodb_flush_log_at_trx_commit,@@sync_binlog,@@foreign_key_checks,@@bind_address,@@binlog_format;";
const query = spawnSync('mariadb', ['--defaults-extra-file=' + root + '/.mysql-readonly.cnf', '--batch', '--skip-column-names', '--execute', sql], { encoding: 'utf8' });
assert.equal(query.status, 0, 'Private staging read-only DB probe failed');
const [database, version, connections, bufferPool, flush, sync, foreignKeys, bind, format] = query.stdout.trim().split('\t');
assert.equal(database, 'maxhigh_staging');
assert.match(version, /^10\.11\./);
assert.equal(connections, '30');
assert.equal(bufferPool, String(512 * 1024 ** 2));
assert.equal(flush, '1'); assert.equal(sync, '1'); assert.equal(foreignKeys, '1');
assert.equal(bind, '127.0.0.1'); assert.equal(format, 'ROW');
const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
const available = Number(meminfo.match(/^MemAvailable:\s+(\d+)/m)[1]) * 1024;
const disk = fs.statfsSync(root);
assert.ok(available >= 768 * 1024 ** 2, 'Insufficient available memory');
assert.ok(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'Insufficient disk headroom');
const directory = root + '/evidence';
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const report = { verifiedAt: new Date().toISOString(), scope: 'Actual Linux staging read-only preflight',
  sha: manifest.sha, node: process.versions.node, platform: process.platform,
  database: { database, version, connections: Number(connections), bufferPool: Number(bufferPool), flush, sync, foreignKeys, bind, format },
  worker: { pid: app.pid, rss: app.monit.memory, restarts: app.pm2_env.restart_time, instances: 1 },
  availableMemoryBytes: available, diskFreeBytes: disk.bavail * disk.bsize,
  productionQualified: false, remaining: ['Financial regression and PM2 fault/drain rehearsal', 'Native load/soak and storage growth', 'Off-host restore/PITR', 'Live edge security', 'Historical financial reconciliation'] };
fs.writeFileSync(directory + '/preflight.json', JSON.stringify(report, null, 2), { mode: 0o600 });
console.log('PASS Linux staging preflight; production qualification remains blocked');
