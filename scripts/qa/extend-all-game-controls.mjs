import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import ts from 'typescript';

const root = 'output/all-game-controls';
fs.mkdirSync(`${root}/source-backup`, { recursive: true });
const apply = process.argv.includes('--apply');
const walk = node => { const result = [node]; ts.forEachChild(node, child => { result.push(...walk(child)); }); return result; };
const open = node => ts.isJsxElement(node) ? node.openingElement : node;
const attribute = (node, key, sf) => open(node).attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText(sf) === key)?.initializer;
const expression = (node, key, sf) => { const a = attribute(node, key, sf); return a && ts.isJsxExpression(a) ? a.expression?.getText(sf) ?? '' : ''; };
const label = (node, sf) => { const a = attribute(node, 'aria-label', sf); return a && ts.isStringLiteral(a) ? a.text : ''; };
const plans = [];

// Realms uses a single runtime adapter, with the title ID supplied by the registry.
{
  const file = 'src/components/maxhigh/RealmsSlot.tsx';
  const before = fs.readFileSync(file, 'utf8');
  assert(!before.includes('<SlotControlDeck'), 'Realms controls are already migrated');
  const sf = ts.createSourceFile(file, before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const buttons = walk(sf).filter(n => ts.isJsxElement(n) && open(n).tagName.getText(sf) === 'button');
  const spin = buttons.find(n => label(n, sf) === 'Spin');
  assert(spin);
  let hud = spin.parent;
  while (hud && !(ts.isJsxElement(hud) && hud.getText(sf).includes('Select Bet Amount') && hud.getText(sf).includes('displayWin') && hud.getText(sf).includes('balance'))) hud = hud.parent;
  assert(hud);
  const roles = { Spin: spin, Info: buttons.find(n => label(n, sf) === 'Paytable Info'), Decrease: buttons.find(n => label(n, sf) === 'Decrease Bet'), Increase: buttons.find(n => label(n, sf) === 'Increase Bet'), Select: buttons.find(n => label(n, sf) === 'Select Bet Amount'), Turbo: buttons.find(n => label(n, sf) === 'Turbo Fast Mode'), Auto: buttons.find(n => attribute(n, 'aria-label', sf)?.getText(sf).includes('Auto Spin Settings')) };
  const handlers = Object.fromEntries(Object.entries(roles).map(([key, button]) => { assert(button, key); return [key, expression(button, 'onClick', sf)]; }));
  const buy = buttons.find(n => n.getText(sf).includes('Buy FS'));
  assert(buy);
  let condition = buy.parent;
  while (condition && !(ts.isJsxExpression(condition) && condition.getText(sf).includes('!inFree'))) condition = condition.parent;
  assert(condition && condition.end < hud.getStart(sf));
  const jsx = `<SlotControlDeck gameId={gameId} bet={totalBet} win={displayWin} balance={balance} busy={busy} turbo={turbo} autoSpin={autoSpin} inFree={inFree} freeSpins={freeSpins} freeSpinsPaused={fsPaused} autoRemaining={remainingAutoSpins} spinDisabled={${expression(spin, 'disabled', sf)}} onSpin={${handlers.Spin}} onInfo={${handlers.Info}} onDecreaseBet={${handlers.Decrease}} onIncreaseBet={${handlers.Increase}} onSelectBet={${handlers.Select}} onTurbo={${handlers.Turbo}} onAuto={${handlers.Auto}} buyFeature={!inFree ? { price: buyCost, disabled: busy, onClick: ${expression(buy, 'onClick', sf)} } : undefined} />`;
  let after = before;
  for (const edit of [{ start: hud.getStart(sf), end: hud.end, text: jsx }, { start: condition.getStart(sf), end: condition.end, text: '' }].sort((a,b) => b.start-a.start)) after = after.slice(0,edit.start)+edit.text+after.slice(edit.end);
  after = 'import { SlotControlDeck } from "./SlotControlDeck";\n' + after;
  plans.push({ file, before, after, category: 'slot', id: 'realms-runtime', controls: 8 });
}

const tables = {
  'ace-high': ['src/components/maxhigh/ace-high/AceHighSlot.tsx', 'src/components/maxhigh/ace-high/BettingPanel.tsx'],
  baccarat: ['BaccaratTable', 'BettingPanel'], lucky9: ['Lucky9Table', 'BettingPanel'],
  threecardpoker: ['ThreeCardPokerTable', 'BettingPanel'], 'color-game': ['ColorGameTable', 'BettingPanel'],
  'tongits-arena': ['TongitsArenaTable', 'BettingPanel'], 'lucky-drop': ['LuckyDropTable'],
  'color-game-pro': ['ColorGameProTable', 'BettingPanel'], 'lucky-nine-plus': ['LuckyNinePlusTable', 'BettingPanel'],
  'drop-deluxe': ['DropDeluxeTable'], 'poker-showdown': ['PokerShowdownTable', 'BettingPanel'],
};
const fishing = { 'deep-bass': 'DeepBassGame', 'dragon-fisher': 'DragonFisherGame', 'crab-cannon': 'CrabCannonGame', 'shark-hunter': 'SharkHunterGame', 'octopus-armada': 'OctopusArmadaGame', 'turtle-tide': 'TurtleTideGame', 'whale-war': 'WhaleWarGame' };
const nativeFiles = [...Object.entries(tables).flatMap(([id, files]) => files.map(file => ({ id, file: file.startsWith('src/') ? file : `src/components/maxhigh/games/${id}/${file}.tsx`, category: 'cards' }))), ...Object.entries(fishing).map(([id, name]) => ({ id, file: `src/components/maxhigh/games/${id}/${name}.tsx`, category: 'fishing' }))];
for (const item of nativeFiles) {
  const { file, id, category } = item;
  const before = fs.readFileSync(file, 'utf8');
  assert(!before.includes('data-game-control-root='), `${file} is already migrated`);
  const sf = ts.createSourceFile(file, before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = sf.statements.filter(n => ts.isFunctionDeclaration(n) && n.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
  const component = functions.find(n => n.name?.text === path.basename(file, '.tsx')) ?? functions.find(n => n.name?.text === 'BettingPanel');
  assert(component, `${file}: no component`);
  const returned = component.body.statements.filter(ts.isReturnStatement).at(-1)?.expression;
  const element = returned && ts.isParenthesizedExpression(returned) ? returned.expression : returned;
  assert(element && ts.isJsxElement(element), `${file}: unexpected root`);
  const edits = [{ at: element.openingElement.end - 1, text: ` data-game-control-root="${id}"${file.endsWith('/BettingPanel.tsx') ? ` data-native-controls="${id}"` : ''}` }];
  const all = walk(component);
  if (category === 'fishing') {
    const dock = all.filter(ts.isJsxElement).filter(n => n.getText(sf).includes('cfg.weapons.map') && n.getText(sf).includes('cfg.powerUps.map') && n.getText(sf).includes('setAutoFire')).sort((a,b) => (a.end-a.pos)-(b.end-b.pos))[0];
    assert(dock, `${file}: missing fishing dock`);
    edits.push({ at: dock.openingElement.end - 1, text: ` data-native-controls="${id}"` });
  }
  if (['lucky-drop','drop-deluxe'].includes(id)) {
    // Give the existing footer rail its new skin without rearranging game controls.
    const candidates = all.filter(ts.isJsxElement).filter(n => n.getText(sf).includes('cfg.betSteps.map') && /onStart|onDeal/.test(n.getText(sf))).sort((a,b) => (a.end-a.pos)-(b.end-b.pos));
    if (candidates[0]) edits.push({ at: candidates[0].openingElement.end - 1, text: ` data-native-controls="${id}"` });
  }
  let controls = 0;
  for (const button of walk(sf).filter(n => ts.isJsxElement(n) && open(n).tagName.getText(sf) === 'button')) {
    const handler = expression(button, 'onClick', sf);
    let action = /changeWeapon/.test(handler) ? 'weapon' : /setAutoFire/.test(handler) ? 'auto' : /buyPower|activateNetBomb|activateFreeze/.test(handler) ? 'power' : /onFold|onSurrender|["']fold["']/.test(handler) ? 'danger' : /onDeal|onDraw|newHand|newRun|resetToBetting|onStart|onCashout|onCashOut|onPick|onSpin|onPlay|["']play["']/.test(handler) ? 'primary' : /stepBet|onClear|clearAll|undoLast|undoChip|onUndo|onSkip|setBet\(|pickBet\(/.test(handler) ? 'secondary' : '';
    if (!action) continue;
    let extra = ` data-control-action="${action}"`;
    if (category === 'fishing' && action === 'weapon' && !attribute(button, 'aria-pressed', sf)) extra += ' aria-pressed={weaponId === w.id}';
    if (category === 'fishing' && action === 'auto' && !attribute(button, 'aria-pressed', sf)) extra += ' aria-pressed={autoFire}';
    edits.push({ at: button.openingElement.end - 1, text: extra }); controls++;
  }
  let after = before;
  for (const edit of edits.sort((a,b) => b.at-a.at)) after = after.slice(0,edit.at)+edit.text+after.slice(edit.at);
  const importPath = path.relative(path.dirname(file), 'src/components/maxhigh/native-game-controls.css').replaceAll('\\','/');
  after = `import "${importPath.startsWith('.') ? importPath : './'+importPath}";\n` + after;
  assert.equal(ts.createSourceFile(file,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length,0,`${file}: invalid output`);
  plans.push({ ...item, before, after, controls });
}

const nativeCounts = nativeFiles.reduce((counts,item) => ({ ...counts, [item.id]: (counts[item.id] ?? 0) + plans.find(p => p.file === item.file).controls }), {});
for (const [id, count] of Object.entries(nativeCounts)) assert(count > 0, `${id}: no controls were skinned`);
if (apply) {
  for (const plan of plans) { const backup = `${root}/source-backup/${plan.file}`; fs.mkdirSync(path.dirname(backup), { recursive:true }); fs.writeFileSync(backup,plan.before); fs.writeFileSync(plan.file,plan.after); }
  await build({ entryPoints:['src/lib/native-control-skins.ts'],outfile:`${root}/native-skins.cjs`,bundle:true,platform:'node',format:'cjs',packages:'external',logLevel:'silent' });
  const require = createRequire(import.meta.url);
  const { NATIVE_CONTROL_SKINS } = require(`../../${root}/native-skins.cjs`);
  const colors = Object.entries(NATIVE_CONTROL_SKINS).map(([id,skin]) => `[data-game-control-root="${id}"], [data-native-controls="${id}"] { --native-accent: ${skin.accent}; --native-surface: ${skin.surface}; --native-ink: ${skin.ink}; --native-radius: ${skin.radius}; --native-font: ${skin.font}; }`).join('\n');
  fs.writeFileSync('src/components/maxhigh/native-control-colors.css', '/* Generated from native-control-skins.ts by extend-all-game-controls.mjs. */\n'+colors+'\n');
  const realmGames = JSON.parse(fs.readFileSync('output/realms-thumbnail-rework/catalog.json','utf8'));
  const shapes = ['24px 5px','4px','50%','8px 30px','30px 5px 30px 5px','3px 22px 3px 22px','12px 12px 30px 30px','25px','2px 2px 24px 24px','16px 3px'];
  const realmCss = realmGames.map((game,index) => `[data-slot-deck="${game.id}"] { border-radius: ${shapes[Math.floor(index/5) % shapes.length]}; border-top-width: ${1+index%3}px; border-top-style: ${index%4===0 ? 'double' : 'solid'}; }\n[data-slot-deck="${game.id}"] .slot-deck__spin { border-radius: ${shapes[index%shapes.length]}; ${index%3===0 ? 'clip-path:none;' : ''} ${index%5===0 ? 'border-inline-width:3px;' : ''} }`).join('\n');
  fs.writeFileSync('src/components/maxhigh/slot-control-realms.css','/* Individual Realms cabinet finishes, paired with per-title palettes. */\n'+realmCss+'\n');
  fs.writeFileSync(`${root}/migration.json`,JSON.stringify(plans.map(({before,after,...plan}) => plan),null,2));
}
console.log(JSON.stringify({ apply, runtimeViews:plans.length, realms:50, cardGames:11, fishingGames:7, nativeControlActions:nativeCounts },null,2));
