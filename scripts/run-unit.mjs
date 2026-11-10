import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
const output=process.env.TEST_OUTPUT??'output/unit-tests';fs.mkdirSync(output,{recursive:true});
const jobs=['pool-cap','risk-controls','golden-panther','wild-panther','staging-preview','buffalo-reign','fire-spike','fortune-ox','ace-high','baccarat','threecardpoker','lucky9','lucky-nine-plus','deep-bass','gentle-audio','security-regressions','ph-vps2','destructive-guard'].map(name=>({name,file:`scripts/test-${name}.ts`}));
for(const name of ['game-audit','realms-family','realms-engine-parity','cluster-referee','payline-referee'])jobs.push({name,file:`scripts/qa-${name}.ts`});
const results=[];
async function worker(){while(jobs.length){const job=jobs.shift();const start=Date.now();const log=fs.openSync(path.join(output,job.name+'.txt'),'w');
 const timeoutMs=job.name==='cluster-referee'?600000:240000; // Full 80-game referee needs shared-runner CPU headroom; retain a bounded timeout.
 const result=await new Promise(resolve=>{const child=spawn(process.execPath,['--import','tsx',job.file],{windowsHide:true,env:{...process.env,DATABASE_URL:'mysql://audit:audit@127.0.0.1:1/audit'},stdio:['ignore',log,log]});const timer=setTimeout(()=>child.kill(),timeoutMs);child.on('error',error=>resolve({error:error.message}));child.on('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});});
 fs.closeSync(log);results.push({name:job.name,...result,ms:Date.now()-start});console.log(JSON.stringify(results.at(-1)));fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
}}
await Promise.all([worker(),worker(),worker()]);if(results.some(result=>result.code!==0))process.exitCode=1;
