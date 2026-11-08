import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const root='output/realms-art-rework';
await build({stdin:{contents:'export { realmsAssets } from "./src/components/maxhigh/realms/theme"; export { GAME_LOADING_THEMES } from "./src/lib/game-loading-themes"; export { REALMS_GAMES } from "./src/lib/realms/catalog"; export { GameLoadingScreen } from "./src/components/maxhigh/GameLoadingScreen";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'},outfile:`${root}/verify.cjs`,logLevel:'silent'});
const require=createRequire(import.meta.url);
const {realmsAssets,GAME_LOADING_THEMES,REALMS_GAMES,GameLoadingScreen}=require(`../../${root}/verify.cjs`);
const ready=JSON.parse(fs.readFileSync('src/lib/realms-art-ready.json','utf8'));
assert.equal(new Set(ready).size,ready.length,'Duplicate ready game IDs');
const inventory=JSON.parse(fs.readFileSync(`${root}/inventory.json`,'utf8'));
assert.equal(new Set(inventory.map(asset=>asset.sha256)).size,inventory.length,'Duplicate artwork files');
const results=[];
for(const game of REALMS_GAMES){
 assert(GAME_LOADING_THEMES[game.id],`Loading screen theme missing: ${game.id}`);
 if(!ready.includes(game.id))continue;
 const assets=realmsAssets(game.id);
 const html=renderToStaticMarkup(React.createElement(GameLoadingScreen,{game:{id:game.id,name:game.name,category:'slot',thumb:'/fallback.webp'}}));
 assert(html.includes(`src="${assets.loadingBg}"`),`${game.id}: loading illustration is not connected`);
 assert(html.includes('game-boot--illustrated'),`${game.id}: immersive loading layout missing`);
 const urls=[assets.backdrop,assets.loadingBg,...Object.values(assets.icons)];
 assert.equal(new Set(urls).size,12);
 for(const url of urls){
  const file=`public${url.split('?')[0]}`;
  const meta=await sharp(file).metadata();
  assert(meta.width>0&&meta.height>0);
  if(/\/(l[1-5]|p[123]|scatter|bomb)\.webp/.test(url)){
   assert.equal(meta.width,512);assert.equal(meta.height,512);
   const stats=await sharp(file).stats();assert.equal(stats.channels[3]?.min,0,`${file} lacks transparency`);
  }
  if(process.argv.includes('--http')){
   try {
    const response=await fetch(`http://localhost:8080${url}`,{signal:AbortSignal.timeout(10000)});
    assert.equal(response.status,200,url);
    assert(response.headers.get('content-type')?.startsWith('image/'));
    const body=await response.arrayBuffer();
    assert(body.byteLength>0,`${url}: empty response`);
   } catch(error) { throw new Error(`${game.id}: ${url}: ${error.message}`,{cause:error}); }
  }
 }
 results.push({id:game.id,files:urls.length});
}
if(process.argv.includes('--complete'))assert.equal(results.length,50,'All 50 packs must be complete');
const report={games:results.length,total:50,files:results.reduce((n,r)=>n+r.files,0),http:process.argv.includes('--http'),results};
fs.writeFileSync(`${root}/verification.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:undefined}));
