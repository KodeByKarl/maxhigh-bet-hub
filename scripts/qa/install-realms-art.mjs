import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
const root='output/realms-art-rework';
const prompts=JSON.parse(fs.readFileSync(`${root}/prompts.json`,'utf8'));
const games=[...new Set(prompts.map(p=>p.gameId))];
const ready=[];const inventory=[];
for(const id of games){
 const assets=prompts.filter(p=>p.gameId===id);
 if(!assets.every(a=>fs.existsSync(`${root}/generated/${a.id}.json`)))continue;
 const target=`public/images/symbols/realms/${id}-v20261102-r2`;
 fs.mkdirSync(target,{recursive:true});
 for(const asset of assets){
  const row=JSON.parse(fs.readFileSync(`${root}/generated/${asset.id}.json`,'utf8'));
  assert(row.sourcePath&&fs.existsSync(row.sourcePath),`Missing ${asset.id}`);
  const file=`${target}/${asset.kind}.webp`;
  if(!fs.existsSync(file)){
   const image=sharp(row.sourcePath);
   if(asset.transparent){const stats=await image.stats();assert.equal(stats.channels[3]?.min,0,`${asset.id}: transparency required`);assert(stats.channels[3].max>0);}
   const sized=asset.transparent?image.resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}):asset.kind==='backdrop'?image.resize(1920,1080,{fit:'cover'}):image.resize(1024,1536,{fit:'cover'});
   fs.writeFileSync(file,await sized.webp({quality:90,alphaQuality:100}).toBuffer());
  }
  const buffer=fs.readFileSync(file),meta=await sharp(buffer).metadata();
  inventory.push({id:asset.id,file,bytes:buffer.length,width:meta.width,height:meta.height,alpha:meta.hasAlpha,sha256:crypto.createHash('sha256').update(buffer).digest('hex')});
 }
 ready.push(id);
}
const readyPath='src/lib/realms-art-ready.json';
const readyText=JSON.stringify(ready,null,2)+'\n';
if(!fs.existsSync(readyPath)||fs.readFileSync(readyPath,'utf8')!==readyText)fs.writeFileSync(readyPath,readyText);
fs.writeFileSync(`${root}/inventory.json`,JSON.stringify(inventory,null,2));
console.log(JSON.stringify({ready:ready.length,total:games.length,assets:inventory.length}));
