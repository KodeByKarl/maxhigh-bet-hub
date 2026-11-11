import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
const directory = path.resolve(process.argv[2] ?? '.');
const output = process.env.PREVIEW_TEST_OUTPUT ?? 'audit/first-transfer/evidence';
fs.mkdirSync(output, { recursive: true });
const log = fs.openSync(path.join(output, 'preview-server.txt'), 'w');
const app = spawn(process.execPath, [path.join(directory, '.output/server/index.mjs')], {
  cwd: directory, windowsHide: true, env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '',
    NODE_ENV: 'production', STAGING_READ_ONLY: '1', HOST: '127.0.0.1', NITRO_HOST: '127.0.0.1',
    PORT: '18774', NITRO_PORT: '18774', RELEASE_SHA: 'f'.repeat(40),
    DOTENV_CONFIG_PATH: path.join(directory, 'no-credentials-here'),
    DATABASE_URL: 'mysql://root:audit-local-only@127.0.0.1:19307/audit_remediation_fresh',
  }, stdio: ['ignore', log, log, 'ipc'],
});
let healthy = false, forced = false;
try {
  for (let i=0; i<100; i++) {
    try { const res=await fetch('http://127.0.0.1:18774/api/health');
      if(res.ok && (await res.json()).release==='f'.repeat(40)) {healthy=true;break;} } catch {}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert.ok(healthy,'Preview must pass actual schema health');
  const base='http://127.0.0.1:18774';
  const root=await fetch(base);assert.equal(root.status,200);assert.equal(root.headers.get('x-maxhigh-preview'),'read-only');
  for(const target of ['/_serverFn/paid-round','/api/deposit','/api/withdraw','/admin'])
    for(const method of ['GET','POST']) {const response=await fetch(base+target,{method});assert.equal(response.status,423);assert.match(response.headers.get('cache-control'),/no-store/);}
  const asset=fs.readdirSync(path.join(directory,'.output/public/assets')).find(x=>x.endsWith('.css'));
  assert.ok(asset);assert.equal((await fetch(base+'/assets/'+asset)).status,200);
  fs.writeFileSync(path.join(output,'preview-smoke.json'),JSON.stringify({passed:true,platform:process.platform,healthy:true,financialRoutesBlocked:8,staticAsset:true},null,2));
  console.log('PASS actual preview health, static asset and eight blocked application/financial routes');
} finally {
  const exited = new Promise(resolve=>app.once('exit',resolve));
  if(app.exitCode===null) {
    if(app.connected) app.send('shutdown'); else app.kill();
    const timer=setTimeout(()=>{forced=true;app.kill();},15000);
    await exited;clearTimeout(timer);
  }
  fs.closeSync(log);
  if(forced) throw Error('Preview required a forced kill');
}
