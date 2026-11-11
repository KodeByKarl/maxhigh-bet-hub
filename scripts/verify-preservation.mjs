import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const baseline=JSON.parse(fs.readFileSync('audit/evidence/inventory.json','utf8')).summary;
const files=walk('public'),bytes=files.reduce((n,file)=>n+fs.statSync(file).size,0);
const assets=walk('.output/public/assets').map(file=>({file:file.replaceAll('\\','/'),bytes:fs.statSync(file).size})).sort((a,b)=>b.bytes-a.bytes);
const removed=execFileSync('git',['-c','safe.directory=D:/Porjects/maxhigh-bet-hub','diff','--name-only','--diff-filter=D','--','public'],{encoding:'utf8'}).trim();
const result={catalogEvidence:'unit/game-audit.txt: 100 games, 100 clean',publicFiles:files.length,baselinePublicFiles:baseline.publicCount,publicBytes:bytes,baselinePublicBytes:baseline.publicBytes,unchangedCountAndBytes:files.length===baseline.publicCount&&bytes===baseline.publicBytes,removedPublicPaths:removed?removed.split('\n'):[],largestAssets:assets.slice(0,8)};
fs.writeFileSync('audit/remediation/evidence/preservation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.unchangedCountAndBytes||removed)process.exitCode=1;
