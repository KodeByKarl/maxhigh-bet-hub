import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const folder='output/realms-art-rework/generated';
let last=-1;
async function tick(){
 const count=fs.readdirSync(folder).filter(f=>f.endsWith('.json')).length;
 if(count!==last){
  last=count;
  const child=spawnSync(process.execPath,['scripts/qa/install-realms-art.mjs'],{encoding:'utf8'});
  process.stdout.write(child.stdout||'');
  if(child.status!==0){process.stderr.write(child.stderr||'Install failed');process.exitCode=1;return;}
  const ready=JSON.parse(fs.readFileSync('src/lib/realms-art-ready.json','utf8'));
  console.log(JSON.stringify({generated:count,installedGames:ready.length}));
  if(ready.length===50)return;
 }
 setTimeout(tick,30000);
}
tick();
