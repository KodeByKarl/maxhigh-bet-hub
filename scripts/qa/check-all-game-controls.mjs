import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
import ts from 'typescript';

const root = 'output/all-game-controls';
await build({ entryPoints: { component: 'src/components/maxhigh/SlotControlDeck.tsx', native: 'src/lib/native-control-skins.ts', slots: 'src/lib/slot-control-skins.ts', catalog: 'src/lib/games.ts' }, outdir: `${root}/checks`, bundle: true, platform: 'node', format: 'cjs', outExtension: { '.js': '.cjs' }, packages: 'external', loader: { '.css': 'empty' }, logLevel: 'silent' });
const require = createRequire(import.meta.url);
const { SlotControlDeck } = require(`../../${root}/checks/component.cjs`);
const { SLOT_CONTROL_SKINS } = require(`../../${root}/checks/slots.cjs`);
const { NATIVE_CONTROL_SKINS } = require(`../../${root}/checks/native.cjs`);
const { slotGames } = require(`../../${root}/checks/catalog.cjs`);
assert.equal(slotGames.length,100);
assert.equal(Object.keys(SLOT_CONTROL_SKINS).length,82);
assert.equal(Object.keys(NATIVE_CONTROL_SKINS).length,18);
const ids = new Set(slotGames.map(game => game.id));
assert.equal(ids.size,100);
assert.deepEqual(new Set([...Object.keys(SLOT_CONTROL_SKINS),...Object.keys(NATIVE_CONTROL_SKINS)]),ids);
const noop=()=>{};
const props={ bet:5,win:0,balance:15491,busy:false,turbo:false,autoSpin:false,onSpin:noop,onDecreaseBet:noop,onIncreaseBet:noop,onTurbo:noop,onAuto:noop,onInfo:noop,onSelectBet:noop,buyFeature:{price:42.5,disabled:false,onClick:noop} };
const render=extra=>renderToStaticMarkup(React.createElement(SlotControlDeck,{...props,...extra}));
const checkButton=(html,label)=>html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0];
const files=JSON.parse(fs.readFileSync(`${root}/migration.json`,'utf8'));
const css = fs.readFileSync('src/components/maxhigh/slot-control-deck.css','utf8') + fs.readFileSync('src/components/maxhigh/slot-control-realms.css','utf8');
const nativeCss=fs.readFileSync('src/components/maxhigh/native-control-colors.css','utf8');
const coverage=[];
for(const game of slotGames){
  if(game.category==='slot'){
    const html=render({gameId:game.id});
    assert(html.includes(`data-slot-deck="${game.id}"`)); assert(checkButton(html,'Spin'));
    assert(css.includes(`[data-slot-deck="${game.id}"]`),`${game.id}: no individual finish`);
    const forge=['fire-spike','coin-volcano'].includes(game.id);
    const busy=render({gameId:game.id,busy:true,supportsSkip:!forge,spinDisabled:forge});
    for(const label of ['Decrease Bet','Increase Bet','Select Bet Amount']) assert(checkButton(busy,label).includes('disabled'));
    if(forge)assert(checkButton(busy,'Spinning').includes('disabled'));else assert(!checkButton(busy,'Skip spin animation').includes('disabled'));
    const free=render({gameId:game.id,balance:0,inFree:true,freeSpins:5,buyFeature:undefined});
    assert(checkButton(free,'Free spin')); assert(free.includes('5 left')); assert(!free.includes('Buy bonus'));
    const auto=render({gameId:game.id,autoSpin:true,autoRemaining:'infinity'}); assert(checkButton(auto,'Stop auto')); assert(auto.includes('∞ left'));
    coverage.push({id:game.id,name:game.name,category:game.category,implemented:true,kind:'slot-deck',statesChecked:['idle','busy','free','auto'],browserVerified:false});
  }else{
    assert(NATIVE_CONTROL_SKINS[game.id]);
    const bindings=files.filter(file=>file.id===game.id);
    assert(bindings.length,`${game.id}: no view binding`);
    assert(bindings.some(binding=>fs.readFileSync(binding.file,'utf8').includes(`data-game-control-root="${game.id}"`)));
    assert(bindings.some(binding=>fs.readFileSync(binding.file,'utf8').includes(`data-native-controls="${game.id}"`)),`${game.id}: no control container`);
    assert(bindings.reduce((sum,binding)=>sum+binding.controls,0)>0);
    assert(nativeCss.includes(`[data-game-control-root="${game.id}"]`));
    coverage.push({id:game.id,name:game.name,category:game.category,implemented:true,kind:'native-controls',bindings:bindings.map(binding=>binding.file),browserVerified:false});
  }
}

const tokens=value=>{const scan=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.JSX,value);const result=[];while(scan.scan()!==ts.SyntaxKind.EndOfFileToken)result.push(scan.getTokenText());return result;};
const parse=(file,text)=>ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const walk=node=>{const result=[node];ts.forEachChild(node,child=>{result.push(...walk(child));});return result;};
const callbacks=sf=>walk(sf).filter(ts.isJsxAttribute).filter(a=>/^on[A-Z]/.test(a.name.getText(sf))||['disabled','value'].includes(a.name.getText(sf))).map(a=>({name:a.name.getText(sf),value:tokens(a.initializer?.getText(sf)??'')}));
const behavior=sf=>sf.statements.filter(ts.isFunctionDeclaration).map(fn=>({name:fn.name?.text,statements:fn.body?.statements.filter(statement=>!ts.isReturnStatement(statement)).map(statement=>tokens(statement.getText(sf)))}));
let callbacksPreserved=0;
for(const file of files){
  const old=parse(file.file,fs.readFileSync(`${root}/source-backup/${file.file}`,'utf8'));
  const current=parse(file.file,fs.readFileSync(file.file,'utf8'));
  assert.deepEqual(behavior(current),behavior(old),`${file.id}: changed non-render behavior`);
  if(file.id!=='realms-runtime'){
    assert.deepEqual(callbacks(current),callbacks(old),`${file.id}: callbacks, disabled state, or values changed`);
    callbacksPreserved+=callbacks(old).filter(a=>/^on[A-Z]/.test(a.name)).length;
  }else{
    const deck=walk(current).find(n=>ts.isJsxSelfClosingElement(n)&&n.tagName.getText(current)==='SlotControlDeck');assert(deck);
    const oldButtons=walk(old).filter(n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText(old)==='button');
    const expression=(node,key,sf)=>{const a=(ts.isJsxElement(node)?node.openingElement:node).attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(sf)===key);return a&&ts.isJsxExpression(a.initializer)?a.initializer.expression?.getText(sf):null;};
    const originals=oldButtons.map(n=>expression(n,'onClick',old)).filter(Boolean).map(tokens);
    for(const prop of ['onSpin','onInfo','onDecreaseBet','onIncreaseBet','onSelectBet','onTurbo','onAuto']){const value=expression(deck,prop,current);assert(originals.some(original=>JSON.stringify(original)===JSON.stringify(tokens(value))),`Realms ${prop} changed`);callbacksPreserved++;}
  }
}
fs.writeFileSync(`${root}/coverage.json`,JSON.stringify({total:100,slots:82,cards:11,fishing:7,callbacksPreserved,visualVerification:'Not performed: headless browser launch was blocked by automatic approval review.',games:coverage},null,2));
console.log(JSON.stringify({catalog:100,slots:82,cards:11,fishing:7,missingControlBindings:0,nonRenderGameLogicUnchanged:true,callbacksPreserved,browserVerified:false}));
