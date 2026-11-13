// Read-only page captures of https://maxhigh.online (no login, no clicks that place bets).
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.resolve('output/production-browser-tools/node_modules/playwright/index.mjs')));
const out = path.resolve('docs/owner-manual/screenshots');
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1366, height: 860 } });
for (const [name, url] of [['01-home', '/'], ['02-slots-lobby', '/slots'], ['03-superadmin-login', '/superadmin/login'], ['04-admin-login', '/admin/login']]) {
  await page.goto('https://maxhigh.online' + url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, name + '.png') });
  console.log(name, page.url());
}
await page.goto('https://maxhigh.online/slots', { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1500);
await page.locator('button:has(img[src$="/fortune-tiger.webp"])').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(out, '05-game-details-panel.png') });
console.log('05-game-details-panel');
await b.close();
