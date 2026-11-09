import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ts from 'typescript';

const root = 'output/spin-ui-rework';
const apply = process.argv.includes('--apply');
const walk = node => { const nodes = [node]; ts.forEachChild(node, child => { nodes.push(...walk(child)); }); return nodes; };
const opening = node => ts.isJsxElement(node) ? node.openingElement : node;
const attr = (node, name) => opening(node).attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText() === name)?.initializer;
const expression = (node, name, source) => { const value = attr(node, name); return value && ts.isJsxExpression(value) ? value.expression?.getText(source) : undefined; };
const label = node => { const a = attr(node, 'aria-label'); return a && ts.isStringLiteral(a) ? a.text : ''; };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const manifest = JSON.parse(fs.readFileSync('output/player-catalog-audit/report.json', 'utf8')).games.filter(g => g.category === 'slot' && !g.thumbnail.includes('realms-illustrated') && !g.id.includes('unused'));
// The first 50 entries of the Home rework are the standalone original titles.
const originalIds = new Set(JSON.parse(fs.readFileSync('output/home-thumbnail-rework-2026-11-01/prompts.json', 'utf8')).slice(0, 50).map(g => g.id));
const report = [];
for (const file of fs.readdirSync('src/components/maxhigh').filter(file => file.endsWith('Slot.tsx') && file !== 'RealmsSlot.tsx')) {
  const full = path.join('src/components/maxhigh', file);
  const sourceText = fs.readFileSync(full, 'utf8');
  if (sourceText.includes('<SlotControlDeck')) continue;
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const all = walk(source);
  const buttons = all.filter(n => ts.isJsxElement(n) && opening(n).tagName.getText(source) === 'button');
  const spin = buttons.find(b => label(b) === 'Spin');
  const special = ['FireSpikeSlot.tsx', 'CoinVolcanoSlot.tsx'].includes(file);
  if (!spin && !special) continue;
  const id = special ? file === 'FireSpikeSlot.tsx' ? 'fire-spike' : 'coin-volcano' : file.replace(/Slot\.tsx$/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  if (!originalIds.has(id)) continue;
  const edits = [];
  const handlers = {};
  let jsx;
  if (special) {
    const footer = all.find(n => ts.isJsxElement(n) && opening(n).tagName.getText(source) === 'footer');
    assert(footer);
    const footerButtons = walk(footer).filter(n => ts.isJsxElement(n) && opening(n).tagName.getText(source) === 'button');
    const byHandler = pattern => footerButtons.find(b => pattern.test(expression(b, 'onClick', source) ?? ''));
    const roles = { Spin: byHandler(/startSpin\(\)/), Decrease: byHandler(/nudgeBet\(-1\)/), Increase: byHandler(/nudgeBet\(1\)/), Turbo: byHandler(/setTurbo/), Auto: byHandler(/clearAutoTimer/), Mute: byHandler(/toggleMute/) };
    for (const [name, button] of Object.entries(roles)) { assert(button, `${file}: ${name}`); handlers[name] = expression(button, 'onClick', source); }
    jsx = `<footer className="relative z-10 mx-auto w-full max-w-3xl shrink-0 px-2 pb-3"><SlotControlDeck gameId="${id}" bet={bet} win={ui.lastWin} balance={balance} busy={busy} turbo={turbo} autoSpin={autoSpin} supportsSkip={false} spinDisabled={busy || balance < bet} muted={muted} onSpin={${handlers.Spin}} onDecreaseBet={${handlers.Decrease}} onIncreaseBet={${handlers.Increase}} onTurbo={${handlers.Turbo}} onAuto={${handlers.Auto}} onMute={${handlers.Mute}} /></footer>`;
    edits.push({ start: footer.getStart(source), end: footer.end, text: jsx });
    const header = all.find(n => ts.isJsxElement(n) && opening(n).tagName.getText(source) === 'header');
    const meters = header?.children.find(n => ts.isJsxElement(n) && n.getText(source).includes('formatMoney(balance)') && n.getText(source).includes('ui.lastWin'));
    if (meters) edits.push({ start: meters.getStart(source), end: meters.end, text: '' });
  } else {
    let hud = spin.parent;
    while (hud && !(ts.isJsxElement(hud) && hud.getText(source).includes('Select Bet Amount') && hud.getText(source).includes('displayWin') && hud.getText(source).includes('balance'))) hud = hud.parent;
    assert(hud, `${file}: missing HUD`);
    const hudButtons = walk(hud).filter(n => ts.isJsxElement(n) && opening(n).tagName.getText(source) === 'button');
    assert.equal(hudButtons.length, 7, `${file}: unexpected controls must be reviewed`);
    const roles = { Spin: spin, Info: hudButtons.find(b => label(b) === 'Paytable Info'), Decrease: hudButtons.find(b => label(b) === 'Decrease Bet'), Increase: hudButtons.find(b => label(b) === 'Increase Bet'), Select: hudButtons.find(b => label(b) === 'Select Bet Amount'), Turbo: hudButtons.find(b => label(b) === 'Turbo Fast Mode'), Auto: hudButtons.find(b => attr(b, 'aria-label')?.getText(source).includes('Auto Spin Settings')) };
    for (const [name, button] of Object.entries(roles)) { assert(button, `${file}: ${name}`); handlers[name] = expression(button, 'onClick', source); }
    const buy = buttons.find(b => b.getText(source).includes('Buy FS'));
    assert(buy, `${file}: missing bonus`);
    handlers.Bonus = expression(buy, 'onClick', source);
    let buyCondition = buy.parent;
    while (buyCondition && !(ts.isJsxExpression(buyCondition) && buyCondition.getText(source).includes('!inFree'))) buyCondition = buyCondition.parent;
    assert(buyCondition && buyCondition.end < hud.getStart(source), `${file}: unexpected bonus structure`);
    assert.equal(walk(buyCondition).filter(n => ts.isJsxElement(n) && opening(n).tagName.getText(source) === 'button').length, 1);
    jsx = `<SlotControlDeck gameId="${id}" bet={totalBet} win={displayWin} balance={balance} busy={busy} turbo={turbo} autoSpin={autoSpin} inFree={inFree} freeSpins={freeSpins} freeSpinsPaused={fsPaused} autoRemaining={remainingAutoSpins} spinDisabled={${expression(spin, 'disabled', source) ?? 'false'}} onSpin={${handlers.Spin}} onInfo={${handlers.Info}} onDecreaseBet={${handlers.Decrease}} onIncreaseBet={${handlers.Increase}} onSelectBet={${handlers.Select}} onTurbo={${handlers.Turbo}} onAuto={${handlers.Auto}} buyFeature={!inFree ? { price: buyCost, disabled: busy, onClick: ${handlers.Bonus} } : undefined} />`;
    edits.push({ start: hud.getStart(source), end: hud.end, text: jsx }, { start: buyCondition.getStart(source), end: buyCondition.end, text: '' });
  }
  let next = sourceText;
  for (const edit of edits.sort((a, b) => b.start - a.start)) next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  next = `import { SlotControlDeck } from "./SlotControlDeck";\n` + next;
  // Compare the exact handler source strings before formatting: no wager/auto/skip logic is rewritten.
  const parsed = ts.createSourceFile(file, next, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file}: invalid output`);
  const deck = walk(parsed).find(n => ts.isJsxSelfClosingElement(n) && n.tagName.getText(parsed) === 'SlotControlDeck');
  for (const [role, original] of Object.entries(handlers)) {
    if (role === 'Bonus') continue;
    const prop = { Spin: 'onSpin', Info: 'onInfo', Decrease: 'onDecreaseBet', Increase: 'onIncreaseBet', Select: 'onSelectBet', Turbo: 'onTurbo', Auto: 'onAuto', Mute: 'onMute' }[role];
    assert.equal(expression(deck, prop, parsed), original, `${file}: changed ${role} behavior`);
  }
  if (apply) { fs.mkdirSync(`${root}/source-backup`, { recursive: true }); fs.writeFileSync(`${root}/source-backup/${file}`, sourceText); fs.writeFileSync(full, next); }
  report.push({ id, file: full, preservedHandlers: Object.keys(handlers), originalHash: hash(sourceText), updatedHash: hash(next) });
}
assert.equal(report.length, 32, 'Expected exactly the original 32 standalone slots');
if (apply) fs.writeFileSync(`${root}/migration.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ apply, slots: report.length, handlersPreserved: report.reduce((sum, r) => sum + r.preservedHandlers.length, 0), ids: report.map(r => r.id) }, null, 2));
