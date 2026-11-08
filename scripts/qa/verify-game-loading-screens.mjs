import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = 'output/loading-screen-review';
const manifest = JSON.parse(fs.readFileSync('output/home-thumbnail-rework-2026-11-01/prompts.json', 'utf8')).slice(0, 50);
const tabs = await (await fetch('http://127.0.0.1:9231/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Fetch.requestPaused') {
    const html = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Loading review</title><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script></head><body style="margin:0"><div id="review"></div><script type="module" src="/output/loading-screen-review/preview.tsx"></script></body></html>`;
    void send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: Buffer.from(html).toString('base64') });
    return;
  }
  if (message.id) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  }
};
await new Promise(resolve => { ws.onopen = resolve; });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
};
await send('Page.enable');
await send('Network.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: '*://localhost:8080/output/loading-screen-review/index.html*', requestStage: 'Request' }] });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
const screenshotGames = new Set(['fortune-tiger', 'fortune-rabbit', 'cleopatra-gold', 'lucky-neko', 'fire-spike', 'baccarat', 'deep-bass', 'color-game-pro']);
const rows = [];
async function visit(id, state = 'loading') {
  await send('Page.navigate', { url: `http://localhost:8080/output/loading-screen-review/index.html?game=${id}&state=${state}` });
  for (let i = 0; i < 60; i++) {
    const ready = await evaluate(`document.querySelector('[data-game-boot]')?.dataset.gameBoot === ${JSON.stringify(id)} && document.querySelector('.game-boot__art')?.dataset.artwork !== 'pending'`).catch(() => false);
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  return evaluate(`(() => {
    const boot = document.querySelector('[data-game-boot]');
    const image = boot?.querySelector('img');
    const status = boot?.querySelector('[role=status]')?.textContent;
    const bounds = boot?.getBoundingClientRect();
    return { id: boot?.dataset.gameBoot, status, stage: boot?.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'), imageLoaded: image?.complete && image?.naturalWidth > 0, overflowX: boot ? boot.scrollWidth > boot.clientWidth + 1 : true, width: bounds?.width, height: bounds?.height };
  })()`);
}
async function capture(file) {
  // Let the entry animation settle before judging the composition.
  await new Promise(resolve => setTimeout(resolve, 750));
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${root}/${file}.png`, Buffer.from(screenshot.data, 'base64'));
}
for (const game of manifest) {
  const row = await visit(game.id);
  assert.equal(row.id, game.id, `No loader for ${game.id}`);
  assert.equal(row.stage, '2', `Loader must wait for game readiness: ${game.id}`);
  assert.equal(row.imageLoaded, true, `Missing cover: ${game.id}`);
  if (row.overflowX) {
    console.log(await evaluate(`JSON.stringify([...document.querySelector('[data-game-boot]').querySelectorAll('*')].map(e => ({ class: e.className, left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right, scroll: e.scrollWidth, client: e.clientWidth })).filter(e => e.left < -1 || e.right > innerWidth + 1 || e.scroll > e.client + 1))`));
    await capture('overflow-debug');
  }
  assert.equal(row.overflowX, false, `Horizontal overflow: ${game.id}`);
  if (screenshotGames.has(game.id)) await capture(`${game.id}-mobile`);
  rows.push(row);
}
const ready = await visit('fortune-rabbit', 'ready');
assert.equal(ready.stage, '3');
assert.equal(ready.status, 'Ready to play!');
const missingArt = await visit('fortune-tiger', 'missing-art');
assert.equal(missingArt.stage, '2', 'Failed artwork must not trap the loader');
assert.equal(await evaluate(`document.body.dataset.artworkReady`), 'true');
assert.equal(await evaluate(`!!document.querySelector('.game-boot__art-fallback')`), true);
const boundaryError = await visit('fortune-tiger', 'boundary-error');
assert.equal(boundaryError.status, "We couldn't open this game");
const slow = await visit('baccarat', 'slow');
assert.equal(slow.status, 'Taking a little longer');
await capture('baccarat-slow');
const error = await visit('shark-hunter', 'error');
assert.equal(error.status, "We couldn't open this game");
assert.equal(await evaluate(`!![...document.querySelectorAll('button')].find(b => b.textContent.includes('Reload page'))`), true);
await capture('shark-hunter-error');
await evaluate(`document.querySelector('.game-boot__back').click()`);
assert.equal(await evaluate(`!!document.querySelector('[data-review-closed]')`), true);
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await visit('fire-spike');
assert.equal(await evaluate(`getComputedStyle(document.querySelector('.game-boot__dots i')).animationName`), 'none');
await send('Emulation.setEmulatedMedia', { features: [] });
for (const [width, height] of [[320, 568], [844, 390], [1280, 800]]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const row = await visit('cleopatra-gold');
  assert.equal(row.overflowX, false, `Overflow at ${width}x${height}`);
  await capture(`cleopatra-${width}x${height}`);
}
await visit('fortune-tiger');
await capture('fortune-tiger-desktop');
fs.writeFileSync(`${root}/verification.json`, JSON.stringify({ games: rows, ready, slow, error, missingArt, boundaryError, reducedMotion: true, closeAction: true, viewports: ['390x844', '320x568', '844x390', '1280x800'] }, null, 2));
console.log(JSON.stringify({ themesChecked: rows.length, missingImages: rows.filter(r => !r.imageLoaded).length, horizontalOverflow: rows.filter(r => r.overflowX).length, readyState: true, slowState: true, errorState: true, missingArtFallback: true, errorBoundary: true, closeAction: true, reducedMotion: true }));
await send('Fetch.disable');
ws.close();
