import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = 'output/spin-ui-rework';
const games = JSON.parse(fs.readFileSync(`${root}/migration.json`, 'utf8'));
const tabs = await (await fetch('http://127.0.0.1:9231/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
let sequence = 0; const pending = new Map();
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Fetch.requestPaused') {
    const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></head><body style="margin:0"><div id="review"></div><script type="module" src="/output/spin-ui-rework/preview.tsx"></script></body></html>`;
    void send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: Buffer.from(html).toString('base64') }); return;
  }
  if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result); }
};
await new Promise(resolve => { ws.onopen = resolve; });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error('Preview evaluation failed'); return response.result.value; };
await send('Page.enable'); await send('Network.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: '*://localhost:8080/output/spin-ui-rework/review.html*', requestStage: 'Request' }] });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
async function visit(id, state = '') {
  await send('Page.navigate', { url: `http://localhost:8080/output/spin-ui-rework/review.html?game=${id}&state=${state}` });
  for (let i = 0; i < 100; i++) { if (await evaluate(`document.querySelector('[data-slot-deck]')?.dataset.slotDeck === ${JSON.stringify(id)}`).catch(() => false)) return; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error(`No control deck for ${id}`);
}
async function capture(name) { const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${root}/${name}.png`, Buffer.from(shot.data, 'base64')); }
const rows = [];
for (const game of games) {
  await visit(game.id);
  const row = await evaluate(`(() => { const deck = document.querySelector('[data-slot-deck]'); const spin = deck.querySelector('[aria-label="Spin"]'); const box = deck.getBoundingClientRect(); return { id: deck.dataset.slotDeck, skin: deck.dataset.skin, overflow: deck.scrollWidth > deck.clientWidth + 1, onScreen: box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight, spin: !!spin, shape: getComputedStyle(spin).borderRadius, clip: getComputedStyle(spin).clipPath }; })()`);
  assert.equal(row.spin, true); assert.equal(row.overflow, false, `${game.id}: overflow`); assert.equal(row.onScreen, true);
  await capture(`${game.id}-mobile`); rows.push(row);
}
await visit('fortune-rabbit');
await evaluate(`document.querySelector('[aria-label="Increase Bet"]').click()`);
await evaluate(`document.querySelector('[aria-label="Decrease Bet"]').click()`);
await evaluate(`document.querySelector('[aria-label="Select Bet Amount"]').click()`);
await evaluate(`document.querySelector('[aria-label="Paytable Info"]').click()`);
await evaluate(`document.querySelector('[aria-label="Turbo Fast Mode"]').click()`);
assert.equal(await evaluate(`document.querySelector('[aria-label="Turbo Fast Mode"]').getAttribute('aria-pressed')`), 'true');
await evaluate(`document.querySelector('.slot-deck__bonus').click()`);
await evaluate(`document.querySelector('[aria-label="Spin"]').click()`);
assert.equal(await evaluate(`document.querySelector('[aria-label="Decrease Bet"]').disabled`), true);
assert.equal(await evaluate(`!!document.querySelector('[aria-label="Skip spin animation"]')`), true);
await evaluate(`document.querySelector('[aria-label="Skip spin animation"]').click()`);
const counts = await evaluate(`JSON.parse(document.querySelector('#qa-events').textContent)`);
assert.deepEqual(counts, { increase: 1, decrease: 1, select: 1, info: 1, turbo: 1, bonus: 1, spin: 2 });
await evaluate(`document.querySelector('[aria-label="Auto Spin Settings"]').click()`);
assert.equal(await evaluate(`!!document.querySelector('[aria-label="Stop Game"]')`), true);
await evaluate(`document.querySelector('[aria-label="Stop Game"]').click()`);
assert.equal(await evaluate(`JSON.parse(document.querySelector('#qa-events').textContent).auto`), 2);
await visit('fire-spike', 'busy');
assert.equal(await evaluate(`document.querySelector('.slot-deck__spin').disabled`), true);
assert.equal(await evaluate(`!!document.querySelector('[aria-label="Auto Spin Settings"]')`), true, 'A disabled forge spin must not turn Auto into a misleading Stop action');
await visit('fortune-rabbit', 'free');
assert.equal(await evaluate(`document.querySelector('.slot-deck__spin').disabled`), false);
assert.equal(await evaluate(`document.querySelector('.slot-deck__spin').innerText.includes('8 left')`), true);
assert.equal(await evaluate(`!!document.querySelector('.slot-deck__bonus')`), false);
for (const [width, height] of [[320, 568], [844, 390], [1280, 800]]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  for (const id of ['fortune-rabbit', 'cleopatra-gold', 'zeus-strike', 'fire-spike', 'midnight-owl', 'golden-panther']) {
    await visit(id);
    assert.equal(await evaluate(`document.querySelector('[data-slot-deck]').scrollWidth > document.querySelector('[data-slot-deck]').clientWidth + 1`), false, `${id}: overflow at ${width}`);
    await capture(`${id}-${width}x${height}`);
  }
}
await send('Fetch.disable');
fs.writeFileSync(`${root}/verification.json`, JSON.stringify({ games: rows, interactions: counts, autoStartStop: true, freeSpins: true, forgeBusyBehavior: true, viewports: ['390x844', '320x568', '844x390', '1280x800'] }, null, 2));
console.log(JSON.stringify({ games: rows.length, skins: new Set(rows.map(r => r.skin)).size, horizontalOverflow: rows.filter(r => r.overflow).length, interactionChecks: true, freeSpins: true, autoStartStop: true }));
ws.close();
