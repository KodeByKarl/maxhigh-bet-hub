import fs from 'node:fs';
import assert from 'node:assert/strict';
const tabs = await (await fetch('http://127.0.0.1:9231/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const request = pending.get(message.id); pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  }
};
await new Promise(resolve => { ws.onopen = resolve; });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error('Browser evaluation failed');
  return response.result.value;
};
async function waitFor(expression, limit = 100) {
  for (let i = 0; i < limit; i++) {
    if (await evaluate(expression).catch(() => false)) return;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Expected login UI did not become ready');
}
await send('Fetch.disable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8080/' });
await waitFor(`!!document.querySelector('button[aria-label="Play Fortune Rabbit"]')`);
await new Promise(resolve => setTimeout(resolve, 3000));
await evaluate(`[...document.querySelectorAll('button')].find(b => /^sign in$/i.test(b.textContent.trim()))?.click()`);
await waitFor(`!!document.querySelector('#mh-username')`);
await evaluate(`(() => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  for (const [id, value] of [['mh-username', 'player1'], ['mh-password', 'player123']]) {
    const input = document.getElementById(id); set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true }));
  }
})()`);
await evaluate(`document.querySelector('#mh-username').closest('form').requestSubmit()`);
await new Promise(resolve => setTimeout(resolve, 4500));
const outcome = await evaluate(`({ signedIn: document.body.innerText.includes('Player One') && !document.querySelector('#mh-password'), sqlExposed: /Failed query:|password_hash|select .+ from .+users/i.test(document.body.innerText), notices: [...document.querySelectorAll('[data-sonner-toast]')].map(e => e.innerText) })`);
fs.writeFileSync('output/database-demo/login-verification.json', JSON.stringify(outcome, null, 2));
assert.equal(outcome.signedIn, true, 'Demo browser login failed');
assert.equal(outcome.sqlExposed, false);
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('output/database-demo/signed-in.png', Buffer.from(screenshot.data, 'base64'));
console.log(JSON.stringify(outcome));
ws.close();
