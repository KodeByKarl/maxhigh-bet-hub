import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const root='output/realms-art-rework';
const rows=fs.readdirSync(`${root}/generated`).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(`${root}/generated/${f}`,'utf8')));
const used=new Set(rows.map(r=>r.sourcePath));
const earliest=Math.min(...rows.map(r=>fs.statSync(r.sourcePath).mtimeMs));
const dirs=[...new Set(rows.map(r=>path.dirname(r.sourcePath)))];
const candidates=dirs.flatMap(dir=>fs.readdirSync(dir).filter(f=>f.endsWith('.png')).map(f=>path.join(dir,f))).filter(file=>!used.has(file)&&fs.statSync(file).mtimeMs>=earliest).sort((a,b)=>fs.statSync(a).mtimeMs-fs.statSync(b).mtimeMs);
const metadata=[];const tiles=[];
for(let i=0;i<candidates.length;i++){
 const file=candidates[i],meta=await sharp(file).metadata();metadata.push({index:i,file,width:meta.width,height:meta.height,alpha:meta.hasAlpha});
 tiles.push({input:await sharp(file).resize(200,200,{fit:'contain',background:'#192235'}).png().toBuffer(),left:(i%6)*220,top:Math.floor(i/6)*230+24});
 tiles.push({input:Buffer.from(`<svg width="200" height="24"><text x="5" y="18" fill="white" font-size="17">${i}</text></svg>`),left:(i%6)*220,top:Math.floor(i/6)*230});
}
fs.writeFileSync(`${root}/recovered-candidates.json`,JSON.stringify(metadata,null,2));
if(candidates.length)await sharp({create:{width:1320,height:Math.ceil(candidates.length/6)*230,channels:3,background:'#192235'}}).composite(tiles).png().toFile(`${root}/recovery-review.png`);
console.log(JSON.stringify({candidates:candidates.length,earliest:new Date(earliest).toISOString()}));
