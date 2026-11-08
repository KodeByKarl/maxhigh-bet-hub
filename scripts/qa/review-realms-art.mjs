import fs from 'node:fs';
import sharp from 'sharp';
const ready=JSON.parse(fs.readFileSync('src/lib/realms-art-ready.json','utf8'));
const games=JSON.parse(fs.readFileSync('output/realms-thumbnail-rework/catalog.json','utf8')).filter(g=>ready.includes(g.id));
const out='output/realms-art-rework/review';
fs.mkdirSync(out,{recursive:true});
for(const world of [...new Set(games.map(g=>g.world))]){
 const group=games.filter(g=>g.world===world);
 const layers=[];
 for(let i=0;i<group.length;i++){
  const g=group[i],base=`public/images/symbols/realms/${g.id}-v20261102-r2`,top=i*240;
  const safe=g.name.replaceAll('&','&amp;').replaceAll('<','&lt;');
  layers.push({input:Buffer.from(`<svg width="1440" height="30"><text x="12" y="22" fill="white" font-size="18" font-family="sans-serif">${safe}</text></svg>`),left:0,top});
  layers.push({input:await sharp(`${base}/loading-bg.webp`).resize(128,192).toBuffer(),left:8,top:top+36});
  layers.push({input:await sharp(`${base}/backdrop.webp`).resize(256,144).toBuffer(),left:144,top:top+36});
  const kinds=['l1','l2','l3','l4','l5','p1','p2','p3','scatter','bomb'];
  for(let j=0;j<kinds.length;j++)layers.push({input:await sharp(`${base}/${kinds[j]}.webp`).resize(100,100).toBuffer(),left:420+(j%5)*200,top:top+30+Math.floor(j/5)*104});
 }
 await sharp({create:{width:1440,height:group.length*240,channels:3,background:'#101724'}}).composite(layers).webp({quality:88}).toFile(`${out}/${world}.webp`);
}
console.log(JSON.stringify({reviewedGames:games.length,sheets:[...new Set(games.map(g=>g.world))]}));
