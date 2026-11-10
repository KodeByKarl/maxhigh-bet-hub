// Workstation only, through an approved loopback SSH tunnel. No login or financial payload.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const [moduleRoot, base, output] = process.argv.slice(2);
const url = new URL(base);
assert.equal(url.protocol, 'http:'); assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.username, ''); assert.equal(url.password, ''); assert.equal(url.pathname, '/');
assert.equal(url.search, ''); assert.equal(url.hash, '');
const require = createRequire(path.resolve(moduleRoot, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 10000 });
  assert.equal(response.status(), 200);
  assert.equal(response.headers()['x-maxhigh-preview'], 'read-only');
  assert.match(await page.locator('body').innerText(), /Application and financial actions are disabled/);
  checks.push('read-only notice and header');
  const health = await context.request.get(new URL('/api/health', url).href);
  assert.equal(health.status(), 200);
  assert.deepEqual(await health.json(), { ok: true, release: '75cc41980c70a2d188a9a8263ed56d4eb580d7a1' });
  assert.match(health.headers()['cache-control'], /no-store/);
  checks.push('healthy exact pinned release');
  for (const target of ['/admin', '/api/auth/login', '/_serverFn/paid-round', '/api/deposit', '/api/withdraw']) {
    const denied = await context.request.get(new URL(target, url).href);
    assert.equal(denied.status(), 423);
    assert.match(denied.headers()['cache-control'], /no-store/);
  }
  assert.equal((await context.cookies()).length, 0);
  checks.push('five denied routes and no session cookie');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'browser-smoke.json'), JSON.stringify({ passed: true, checks }, null, 2));
  console.log('PASS private browser notice, exact health, denied routes and no cookies');
} finally { await browser.close(); }
