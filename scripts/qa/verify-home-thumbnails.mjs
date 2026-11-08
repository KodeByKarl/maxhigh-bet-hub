import fs from 'node:fs';
const root = 'output/home-thumbnail-rework-2026-11-01';
const tabs = await (await fetch('http://127.0.0.1:9231/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
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
await send('Page.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8080/' });
await new Promise(resolve => setTimeout(resolve, 9000));
const evaluated = await send('Runtime.evaluate', { expression: `(async () => {
  const cards = [...document.querySelectorAll('button[aria-label^="Play "]')];
  const rows = [];
  for (const card of cards) {
    const image = card.querySelector('img');
    image.loading = 'eager';
    await image.decode().catch(() => {});
    rows.push({ name: card.getAttribute('aria-label'), url: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight, loaded: image.complete && image.naturalWidth > 0 });
  }
  return { url: location.href, cards: rows, count: rows.length, missing: rows.filter(r => !r.loaded), oldUrls: rows.filter(r => !r.url.startsWith('/games/home-v20261101/')) };
})()`, awaitPromise: true, returnByValue: true });
const result = evaluated.result.value;
if (!result) throw new Error('Browser evaluation failed');
fs.writeFileSync(`${root}/browser-verification.json`, JSON.stringify(result, null, 2));
await send('Runtime.evaluate', { expression: `document.querySelector('.game-card-grid')?.scrollIntoView({block:'start'})` });
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(`${root}/home-browser.png`, Buffer.from(screenshot.data, 'base64'));
console.log(JSON.stringify({ count: result.count, missing: result.missing.length, oldUrls: result.oldUrls.length }));
ws.close();
