import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import crypto from 'node:crypto';

const root = 'output/abyssal-art-rework';
const target = 'public/images/symbols/realms/abyssal-pearls-v20261102';
const kinds = ['l1','l2','l3','l4','l5','p1','p2','p3','scatter','bomb'];
const ids = ['backdrop', ...kinds];
const manifest = ids.map(id => JSON.parse(fs.readFileSync(`${root}/generated/${id}.json`, 'utf8')));
for (const art of manifest) {
  assert(art.sourcePath && fs.existsSync(art.sourcePath), `Missing generated source: ${art.id}`);
  const metadata = await sharp(art.sourcePath).metadata();
  if (art.transparent) {
    assert(metadata.hasAlpha, `${art.id}: expected transparent artwork`);
    const stats = await sharp(art.sourcePath).stats();
    assert.equal(stats.channels[3].min, 0, `${art.id}: background must be transparent`);
    assert(stats.channels[3].max > 0, `${art.id}: empty image`);
  }
}
fs.mkdirSync(target, { recursive: true });
const inventory = [];
for (const art of manifest) {
  const image = art.id === 'backdrop'
    ? sharp(art.sourcePath).resize(1920,1080,{fit:'cover'})
    : sharp(art.sourcePath).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}});
  const buffer = await image.webp({quality:94,alphaQuality:100}).toBuffer();
  const file = `${target}/${art.id}.webp`;
  fs.writeFileSync(file,buffer);
  const metadata = await sharp(file).metadata();
  const stats = await sharp(file).stats();
  if(art.transparent) assert.equal(stats.channels[3].min,0);
  inventory.push({id:art.id,file,width:metadata.width,height:metadata.height,alpha:metadata.hasAlpha,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex')});
}
fs.copyFileSync(`${target}/backdrop.webp`,`${target}/loading-bg.webp`);
fs.writeFileSync(`${root}/prompts.json`,JSON.stringify(manifest,null,2));
fs.writeFileSync(`${root}/inventory.json`,JSON.stringify(inventory,null,2));
const tiles = await Promise.all(kinds.map(async(id,i)=>({input:await sharp(`${target}/${id}.webp`).resize(160,160).png().toBuffer(),left:(i%5)*160,top:Math.floor(i/5)*160})));
tiles.push({input:await sharp(`${target}/backdrop.webp`).resize(800,450).png().toBuffer(),left:0,top:320});
await sharp({create:{width:800,height:770,channels:3,background:'#0a1b30'}}).composite(tiles).png().toFile(`${root}/art-review.png`);
console.log(JSON.stringify({installed:inventory.length,symbols:10,transparentSymbols:inventory.filter(a=>a.alpha).length,unique:new Set(inventory.map(a=>a.sha256)).size,target}));
