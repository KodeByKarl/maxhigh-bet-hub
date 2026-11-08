import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import sharp from 'sharp';

const root = 'output/abyssal-art-rework';
await build({ entryPoints: { theme: 'src/components/maxhigh/realms/theme.ts', loading: 'src/lib/game-loading-themes.ts', catalog: 'src/lib/realms/index.ts' }, outdir: `${root}/checks`, bundle: true, platform: 'node', format: 'cjs', outExtension: { '.js': '.cjs' }, packages: 'external', logLevel: 'silent' });
const require = createRequire(import.meta.url);
const { realmsAssets } = require(`../../${root}/checks/theme.cjs`);
const { GAME_LOADING_THEMES } = require(`../../${root}/checks/loading.cjs`);
const { realmsDefaultConfig } = require(`../../${root}/checks/catalog.cjs`);
const assets = realmsAssets('abyssal-pearls');
assert(GAME_LOADING_THEMES['abyssal-pearls'], 'Abyssal must use the game splash screen');
assert.equal(Object.keys(assets.icons).length,10);
const config = realmsDefaultConfig('abyssal-pearls');
assert.deepEqual(config.symbols.slice(0,5).map(symbol=>symbol.label), ['10','J','Q','K','A']);
assert(GAME_LOADING_THEMES['sirens-lagoon'], 'Every Realms title must use the game splash screen');
const results = [];
for (const [id,url] of Object.entries({backdrop:assets.backdrop,loading:assets.loadingBg,...assets.icons})) {
  const file = 'public'+url.split('?')[0];
  assert(fs.existsSync(file),`Missing ${file}`);
  const metadata = await sharp(file).metadata();
  const stats = await sharp(file).stats();
  if(id!=='backdrop'&&id!=='loading') { assert(metadata.hasAlpha); assert.equal(stats.channels[3].min,0); }
  const response = await fetch('http://localhost:8080'+url,{signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200,`${id}: HTTP failure`);
  assert(response.headers.get('content-type')?.includes('image/webp'));
  results.push({id,url,width:metadata.width,height:metadata.height,alpha:metadata.hasAlpha,httpStatus:response.status});
}
fs.writeFileSync(`${root}/verification.json`,JSON.stringify({assets:results,splashConnected:true,symbolRanksUnchanged:true,browserVisualVerification:false},null,2));
console.log(JSON.stringify({assets:results.length,transparentSymbols:results.filter(result=>result.alpha).length,httpFailures:0,splashConnected:true,symbolRanksUnchanged:true}));
