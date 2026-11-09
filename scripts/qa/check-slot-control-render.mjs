import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
import ts from 'typescript';

const root = 'output/spin-ui-rework';
await build({ entryPoints: ['src/components/maxhigh/SlotControlDeck.tsx'], outfile: `${root}/control-render.cjs`, bundle: true, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' }, logLevel: 'silent' });
const require = createRequire(import.meta.url);
const { SlotControlDeck } = require(`../../${root}/control-render.cjs`);
const migration = JSON.parse(fs.readFileSync(`${root}/migration.json`, 'utf8'));
const noop = () => {};
const base = { bet: 5, win: 0, balance: 15491, busy: false, turbo: false, autoSpin: false, onSpin: noop, onDecreaseBet: noop, onIncreaseBet: noop, onSelectBet: noop, onInfo: noop, onTurbo: noop, onAuto: noop, buyFeature: { price: 42.5, disabled: false, onClick: noop } };
const render = props => renderToStaticMarkup(React.createElement(SlotControlDeck, { ...base, ...props }));
const button = (html, label) => html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0];
const scannerTokens = value => { const scan = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.JSX, value); const tokens = []; while (scan.scan() !== ts.SyntaxKind.EndOfFileToken) tokens.push(scan.getTokenText()); return tokens; };
const source = (file, text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const walk = node => { const result = [node]; ts.forEachChild(node, child => { result.push(...walk(child)); }); return result; };
const opening = node => ts.isJsxElement(node) ? node.openingElement : node;
const expr = (node, name, sf) => { const attribute = opening(node).attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText(sf) === name); return attribute && ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression?.getText(sf) : null; };
const rows = [];
for (const game of migration) {
  const html = render({ gameId: game.id });
  assert(html.includes(`data-slot-deck="${game.id}"`));
  assert(button(html, 'Spin'));
  assert(html.includes('₱15,491.00'));
  assert(html.includes('aria-pressed="false"'));
  fs.writeFileSync(`${root}/${game.id}-render.html`, html);
  const idleSpin = button(html, 'Spin');
  assert(!idleSpin.includes('disabled'));
  const special = ['fire-spike', 'coin-volcano'].includes(game.id);
  const busyHtml = render({ gameId: game.id, busy: true, supportsSkip: !special, spinDisabled: special });
  for (const label of ['Decrease Bet', 'Increase Bet', 'Select Bet Amount']) assert(button(busyHtml, label).includes('disabled'));
  if (special) {
    assert(button(busyHtml, 'Spinning').includes('disabled'));
    assert(button(busyHtml, 'Auto Spin Settings'));
  } else {
    assert(button(busyHtml, 'Skip spin animation'));
    assert(!button(busyHtml, 'Skip spin animation').includes('disabled'));
    assert(button(busyHtml, 'Stop Game'));
  }
  const freeHtml = render({ gameId: game.id, inFree: true, freeSpins: 8, balance: 0, buyFeature: undefined });
  assert(button(freeHtml, 'Free spin'));
  assert(freeHtml.includes('8 left'));
  assert(!freeHtml.includes('Buy bonus'));
  const autoHtml = render({ gameId: game.id, autoSpin: true, autoRemaining: 'infinity' });
  assert(button(autoHtml, 'Stop auto')); assert(autoHtml.includes('∞ left')); assert(button(autoHtml, 'Stop Game'));

  const current = source(game.file, fs.readFileSync(game.file, 'utf8'));
  const old = source(game.file, fs.readFileSync(`${root}/source-backup/${game.file.split(/[\\/]/).pop()}`, 'utf8'));
  // Every function declaration's statements before its rendered return stay identical.
  const behavior = sf => sf.statements.filter(ts.isFunctionDeclaration).map(fn => ({ name: fn.name?.text, statements: fn.body?.statements.filter(statement => !ts.isReturnStatement(statement)).map(statement => scannerTokens(statement.getText(sf))) }));
  assert.deepEqual(behavior(current), behavior(old), `${game.id}: engine behavior changed`);
  const deck = walk(current).find(n => ts.isJsxSelfClosingElement(n) && n.tagName.getText(current) === 'SlotControlDeck');
  const oldButtons = walk(old).filter(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(old) === 'button');
  const oldHandlers = oldButtons.map(n => expr(n, 'onClick', old)).filter(Boolean).map(scannerTokens);
  let preserved = 0;
  for (const prop of ['onSpin', 'onInfo', 'onDecreaseBet', 'onIncreaseBet', 'onSelectBet', 'onTurbo', 'onAuto', 'onMute']) {
    const callback = expr(deck, prop, current);
    if (!callback) continue;
    assert(oldHandlers.some(original => JSON.stringify(original) === JSON.stringify(scannerTokens(callback))), `${game.id}: ${prop} changed`);
    preserved++;
  }
  const bonusAttribute = deck.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText(current) === 'buyFeature');
  const bonusCallback = bonusAttribute && walk(bonusAttribute).find(n => ts.isPropertyAssignment(n) && n.name.getText(current) === 'onClick');
  if (bonusCallback) {
    assert(oldHandlers.some(original => JSON.stringify(original) === JSON.stringify(scannerTokens(bonusCallback.initializer.getText(current)))), `${game.id}: bonus action changed`);
    preserved++;
  }
  rows.push({ id: game.id, idle: true, busy: true, free: true, auto: true, unchangedGameLogic: true, preservedCallbacks: preserved });
}
const css = fs.readFileSync('src/components/maxhigh/slot-control-deck.css', 'utf8');
for (const game of migration) assert(css.includes(`[data-slot-deck="${game.id}"]`), `${game.id}: missing individual styling`);
fs.writeFileSync(`${root}/render-verification.json`, JSON.stringify({ games: rows, browserVerified: false, browserLimitation: 'Starting the headless browser was blocked by automatic approval review.' }, null, 2));
console.log(JSON.stringify({ slots: rows.length, individualSkins: rows.length, unchangedGameLogic: true, preservedCallbacks: rows.reduce((sum, row) => sum + row.preservedCallbacks, 0), checkedStates: ['idle', 'busy', 'free', 'auto'], browserVerified: false }));
