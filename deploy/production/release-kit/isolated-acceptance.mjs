// Isolated 100-game acceptance for a release artifact. LOOPBACK ONLY: it refuses any non-local URL, so it can never
// touch production, UAT, or the shared live database. Run it against the artifact started on a disposable database
// seeded with synthetic demo accounts (ALLOW_DEMO_SEED=disposable-test-only).
//
//   ACCEPTANCE_BASE=http://127.0.0.1:18999 RELEASE_DIR=/rel PLAYWRIGHT_MODULE=/tmp/browser-tools/node_modules/playwright \
//   ACCEPTANCE_OUTPUT=/out/acceptance node isolated-acceptance.mjs
//
// Phases: (1) access status for anonymous + every client role (none may be the developer QA identity);
// (2) one minimum-stake round per game as a NON-developer player, reconciled against the ledger;
// (3) real-browser launch of every game from its lobby category page as the same player.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const BASE = process.env.ACCEPTANCE_BASE ?? 'http://127.0.0.1:18999';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(BASE)) throw Error('Isolated acceptance only runs against a loopback URL');
const RELEASE = process.env.RELEASE_DIR ?? '/rel';
const OUT = process.env.ACCEPTANCE_OUTPUT ?? 'output/acceptance';
fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true });
const require = createRequire(process.env.SEROVAL_FROM ?? '/src/package.json');
const { toJSONAsync, fromCrossJSON } = require('seroval');
const { createDefaultSerovalPlugins } = require('@tanstack/router-core/ssr/client');

const manifest = JSON.parse(fs.readFileSync(path.join(RELEASE, 'release-validation.json')));
const ids = new Map();
for (const file of fs.readdirSync(path.join(RELEASE, '.output/server/_ssr')).filter(x => x.endsWith('.mjs')))
  for (const m of fs.readFileSync(path.join(RELEASE, '.output/server/_ssr', file), 'utf8').matchAll(/id:\s*"([a-f0-9]{64})",\s*name:\s*"([^"]+)"/g))
    ids.set(m[2], m[1]);
const has = name => ids.has(name);
const catalog = fs.readFileSync(process.env.CATALOG_TSV ?? '/src/deploy/diagnostics/uat-game-catalog.tsv', 'utf8').trim().split('\n').slice(1)
  .map(line => { const [id, category, title, minimum] = line.split('\t'); return { id, category, title, minimum: Number(minimum) }; });
if (catalog.length !== 100) throw Error('Expected the 100-game catalog');
// Optional targeted re-run (e.g. ACCEPTANCE_GAMES=lucky-drop); results are written to a separate file.
const only = (process.env.ACCEPTANCE_GAMES ?? '').split(',').filter(Boolean);
if (only.length) catalog.splice(0, catalog.length, ...catalog.filter(g => only.includes(g.id)));
const RESULT_FILE = only.length ? `acceptance-rerun-${only.join('_')}.json` : 'acceptance.json';
const results = { release: manifest.sha, base: BASE, startedAt: new Date().toISOString(), access: {}, wagers: [], launches: [] };
const save = () => fs.writeFileSync(path.join(OUT, RESULT_FILE), JSON.stringify(results, null, 2));

class Client {
  cookie = null;
  async rpc(name, data, { method = 'POST' } = {}) {
    if (!ids.has(name)) throw Error(`Unknown server function: ${name}`);
    const headers = { 'content-type': 'application/json', accept: 'application/json', 'x-tsr-serverFn': 'true',
      Origin: BASE, 'Sec-Fetch-Site': 'same-origin', 'Idempotency-Key': randomUUID() };
    if (this.cookie) headers.Cookie = `mh_session=${this.cookie}`;
    const payload = JSON.stringify(await toJSONAsync({ data }));
    const r = await fetch(`${BASE}/_serverFn/${ids.get(name)}${method === 'GET' ? '?payload=' + encodeURIComponent(payload) : ''}`,
      { method, headers, body: method === 'POST' ? payload : undefined, signal: AbortSignal.timeout(30000) });
    for (const c of r.headers.getSetCookie()) { const m = /^mh_session=([^;]*)/.exec(c); if (m) this.cookie = m[1] || null; }
    const decoded = fromCrossJSON(await r.json(), { plugins: createDefaultSerovalPlugins() });
    if (decoded?.error) throw Error(`${name}: ${String(decoded.error.message ?? 'rejected').slice(0, 200)}`);
    if (!r.ok) throw Error(`${name}: HTTP ${r.status}`);
    return decoded?.result;
  }
  login = (username, password) => this.rpc('loginFn', { username, password });
  balance = async () => Number((await this.rpc('getBalanceFn', undefined, { method: 'GET' }))?.balance ?? NaN);
}
const PLAYER = { username: process.env.ACCEPTANCE_PLAYER ?? 'slotmaster', password: process.env.ACCEPTANCE_PLAYER_PASSWORD ?? 'player123' };
// Seeded demo identities (scripts/seed.ts). 'superadmin' is a client administrator, NOT the compiled developer account.
const ROLES = [['agent', 'agent1', 'agent123'], ['master_agent', 'masteragent', 'master123'], ['client_admin', 'superadmin', 'super123']];

// ---- Phase 1: catalog access for every client-facing identity
const anon = new Client();
results.access.anonymous = await anon.rpc('getAccessStatusFn', undefined, { method: 'GET' });
for (const [role, user, pass] of [['player', PLAYER.username, PLAYER.password], ...ROLES]) {
  const c = new Client();
  try { await c.login(user, pass); results.access[role] = { user, ...(await c.rpc('getAccessStatusFn', undefined, { method: 'GET' })) }; }
  catch (e) { results.access[role] = { user, error: e.message }; }
}
const accessOk = Object.values(results.access).every(a => Array.isArray(a.lockedGames) && a.lockedGames.length === 0 && !a.ownerQa);
results.accessPassed = accessOk;
save();
console.log(JSON.stringify({ phase: 'access', passed: accessOk, access: results.access }));

// ---- Phase 2: one minimum-stake round per game as a non-developer player (synthetic credits, disposable DB)
const camel = id => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = id => camel(id)[0].toUpperCase() + camel(id).slice(1);
const round = n => Math.round(n * 100) / 100;
const player = new Client();
await player.login(PLAYER.username, PLAYER.password);
const ledger = async () => { const v = await player.rpc('listMyTransactionsFn', { tab: 'all', limit: 300 }, { method: 'GET' }); return Array.isArray(v) ? v : v.rows ?? []; };
async function finishFree(game, initial) {
  if (game.category !== 'slot') return 0;
  const realms = !has(camel(game.id) + 'SpinFn');
  const fn = realms ? 'realmsFreeSpinFn' : camel(game.id) + 'FreeSpinFn', getter = realms ? 'getRealmsSessionFn' : `get${pascal(game.id)}SessionFn`;
  if (!has(fn)) return 0;
  let session = initial, count = 0;
  if (session === undefined && has(getter)) { const r = await player.rpc(getter, realms ? { gameId: game.id } : undefined, { method: 'GET' }); session = r?.session ?? r; }
  while (session?.sessionId && Number(session.freeSpinsLeft) > 0 && count < 500) {
    session = (await player.rpc(fn, realms ? { gameId: game.id, sessionId: session.sessionId } : { sessionId: session.sessionId }))?.session;
    count++;
  }
  return count;
}
async function recipe(game) {
  const bet = game.minimum, prefix = camel(game.id);
  if (game.category === 'slot') {
    if (has(prefix + 'SpinFn')) return { fn: prefix + 'SpinFn', bet, data: ['fire-spike', 'coin-volcano'].includes(game.id) ? { bet } : { bet, ante: false } };
    return { fn: 'realmsSpinFn', bet, data: { gameId: game.id, bet, ante: false } };
  }
  if (game.category === 'fishing') {
    const config = await player.rpc(`get${pascal(game.id)}EngineConfigFn`, undefined, { method: 'GET' });
    const weapon = [...config.weapons].sort((a, b) => Number(a.betCost) - Number(b.betCost))[0];
    let fish;
    for (let i = 0; i < 10 && !fish; i++) {
      const spawn = await player.rpc(prefix + 'SyncSpawnsFn', undefined);
      fish = [...(spawn?.fish ?? [])].sort((a, b) => b.createdAt - a.createdAt)[0];
      if (!fish) await new Promise(r => setTimeout(r, 1000));
    }
    if (!weapon || !fish) throw Error('No fishing weapon/target available');
    return { fn: prefix + 'FireShotFn', bet: Number(weapon.betCost), data: { weaponId: weapon.id, target: { instanceId: fish.instanceId } } };
  }
  const cards = {
    'ace-high': ['aceHighDealFn', { baseBet: bet }], baccarat: ['baccaratDealFn', { playerBet: bet }],
    lucky9: ['lucky9DealFn', { playerBet: bet }], 'color-game': ['colorGameDealFn', { bets: { red: bet } }],
    threecardpoker: ['threeCardPokerDealFn', { ante: bet, pairPlus: 0 }],
    'color-game-pro': ['colorGameProDealFn', { bets: { red: bet } }], 'lucky-nine-plus': ['luckyNinePlusDealFn', { playerBet: bet }],
    'poker-showdown': ['pokerShowdownDealFn', { ante: bet, pairPlus: 0 }], 'tongits-arena': ['tongitsArenaDealFn', { ante: bet, pairPlus: 0 }],
    'drop-deluxe': ['dropDeluxeDealFn', { bet }], 'lucky-drop': ['luckyDropStartFn', { bet }],
  };
  if (!cards[game.id]) throw Error('Missing game recipe');
  if (game.id === 'lucky-drop') { // settle a run left open by an interrupted earlier attempt (not counted as this round)
    const open = await player.rpc('getLuckyDropOpenRunFn', undefined, { method: 'GET' });
    if (open?.run) await settleClimb(open);
  }
  return { fn: cards[game.id][0], data: cards[game.id][1], bet };
}
async function settle(game, response) {
  const sessionId = response?.sessionId ?? response?.script?.sessionId ?? response?.session?.sessionId;
  if (game.id === 'threecardpoker') await player.rpc('threeCardPokerFoldFn', { sessionId });
  if (game.id === 'poker-showdown') await player.rpc('pokerShowdownFoldFn', { sessionId });
  if (game.id === 'tongits-arena') await player.rpc('tongitsArenaFoldFn', { sessionId });
  if (game.id === 'drop-deluxe') await player.rpc('dropDeluxeDrawFn', { holds: [false, false, false, false, false] });
  if (game.id === 'lucky-drop') await settleClimb(response);
}
// Royal Climb: a run ends on a wrong call (run === null); cash-out needs at least one correct call.
async function settleClimb(result) {
  for (let i = 0; i < 30; i++) {
    if (!result?.run) return;
    if (Number(result.run.steps) >= 1) { await player.rpc('luckyDropCashoutFn', {}); return; }
    try { result = await player.rpc('luckyDropGuessFn', { pick: 'higher' }); }
    catch (e) { if (!/impossible/i.test(e.message)) throw e; result = await player.rpc('luckyDropGuessFn', { pick: 'lower' }); }
  }
  throw Error('Royal Climb run did not settle within 30 calls');
}
for (const game of catalog) {
  let entry;
  try {
    await finishFree(game);
    const request = await recipe(game);
    const before = await player.balance(), previous = new Set((await ledger()).map(r => r.id));
    const response = await player.rpc(request.fn, request.data);
    await settle(game, response);
    const freeSpins = await finishFree(game, response?.session);
    const after = await player.balance(), added = (await ledger()).filter(r => !previous.has(r.id));
    const sum = round(added.reduce((s, r) => s + Number(r.amount), 0));
    const stake = round(-added.filter(r => r.type === 'bet').reduce((s, r) => s + Number(r.amount), 0));
    const checks = { ledgerMatchesBalance: round(before + sum) === round(after), stakeRecorded: stake >= request.bet,
      noNegativeBalance: after >= 0, knownLedgerTypes: added.every(r => ['bet', 'win', 'jackpot'].includes(r.type)) };
    entry = { game: game.id, category: game.category, fn: request.fn, passed: Object.values(checks).every(Boolean), checks, stake, freeSpins, ledgerRows: added.length };
  } catch (e) {
    entry = { game: game.id, category: game.category, passed: false, error: e.message };
  }
  results.wagers.push(entry);
  save();
  console.log(JSON.stringify({ phase: 'wager', ...entry }));
}

// ---- Phase 3: real-browser launch of every game, as the same non-developer player
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? '/tmp/browser-tools/node_modules/playwright');
const browser = await chromium.launch();
for (const [label, viewport] of [['desktop', { width: 1366, height: 900 }], ['phone', { width: 400, height: 860 }]]) {
  const context = await browser.newContext({ viewport });
  await context.addCookies([{ name: 'mh_session', value: player.cookie, url: BASE }]);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 200)));
  const list = label === 'desktop' ? catalog : catalog.filter((g, i) => i % 10 === 0 || g.category !== 'slot'); // phone: spread sample + all cards/fishing
  for (const game of list) {
    const route = { slot: '/slots', cards: '/cards', fishing: '/fishing' }[game.category];
    const errorsBefore = pageErrors.length;
    const entry = { game: game.id, viewport: label };
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      const card = page.getByRole('button', { name: `Play ${game.title}`, exact: true }).first();
      const lockedCard = await page.getByRole('button', { name: `${game.title} (locked)`, exact: true }).count();
      entry.lockedCard = lockedCard > 0;
      await card.scrollIntoViewIfNeeded({ timeout: 15000 });
      await card.click();
      await page.getByRole('button', { name: /Play Now/ }).click({ timeout: 10000 });
      const dialog = page.getByRole('dialog', { name: `${game.title} game` });
      await dialog.waitFor({ timeout: 20000 });
      await page.waitForTimeout(2500); // let the lazy game component and assets initialise
      const text = await dialog.innerText().catch(() => '');
      entry.lockedText = /Game Locked/i.test(text);
      entry.mounted = (await dialog.locator('canvas, button, img').count()) > 3;
      entry.pageErrors = pageErrors.slice(errorsBefore);
      entry.horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      entry.passed = !entry.lockedCard && !entry.lockedText && entry.mounted && entry.pageErrors.length === 0;
      if (!entry.passed || game.id === list[0].id || process.env.ACCEPTANCE_SCREENSHOT_ALL === '1') await page.screenshot({ path: path.join(OUT, 'screens', `${label}-${game.id}.png`) });
      await page.getByRole('button', { name: 'Close game' }).click({ timeout: 5000 }).catch(() => {});
    } catch (e) {
      entry.passed = false;
      entry.error = e.message.split('\n')[0].slice(0, 200);
      await page.screenshot({ path: path.join(OUT, 'screens', `${label}-${game.id}-error.png`) }).catch(() => {});
    }
    results.launches.push(entry);
    save();
    console.log(JSON.stringify({ phase: 'launch', ...entry }));
  }
  await context.close();
}
await browser.close();

const wagerPass = results.wagers.filter(w => w.passed).length, total = catalog.length;
const desktopPass = results.launches.filter(l => l.viewport === 'desktop' && l.passed).length;
const phone = results.launches.filter(l => l.viewport === 'phone');
results.summary = { accessPassed: accessOk, wagersPassed: `${wagerPass}/${total}`, desktopLaunchesPassed: `${desktopPass}/${total}`,
  phoneLaunchesPassed: `${phone.filter(l => l.passed).length}/${phone.length}`, finishedAt: new Date().toISOString() };
save();
console.log(JSON.stringify({ phase: 'summary', ...results.summary }));
