#!/usr/bin/env node
/**
 * Administrator-run role acceptance test for https://maxhigh.online (read-only).
 *
 *   ROLE_QA_CREDENTIALS_FILE=C:\path\outside\repo\role-qa.tsv node deploy/production/verify-roles.mjs
 *
 * Credentials file (tab-separated, one line per role, NEVER inside the repository):
 *     superadmin<TAB>username<TAB>password
 *     admin<TAB>...    agent<TAB>...    master_agent<TAB>...    player<TAB>...
 * Roles missing from the file are reported PENDING. Only EXISTING QA accounts are used.
 *
 * Safety: no account is created or funded. Every non-GET request is blocked except the sign-in and
 * sign-out server calls (and only while those steps run). Passwords, cookies and request bodies are never
 * printed or written; the report contains only PASS/FAIL/PENDING and public page labels.
 * Output: output/production-role-acceptance/report.json + screenshots (git-ignored).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ORIGIN = 'https://maxhigh.online';
const repo = path.resolve('.');
const file = process.env.ROLE_QA_CREDENTIALS_FILE;
if (!file) throw Error('Set ROLE_QA_CREDENTIALS_FILE to a credentials file outside the repository.');
const real = fs.realpathSync(file);
const rel = path.relative(repo, real); // absolute result = different drive = outside
if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) throw Error('Credentials file must be outside the repository.');
const creds = {};
for (const line of fs.readFileSync(real, 'utf8').split(/\r?\n/)) {
  const [role, user, pass] = line.split('\t');
  if (role && user && pass) creds[role.trim()] = { user: user.trim(), pass };
}
const { chromium } = await import(pathToFileURL(path.resolve('output/production-browser-tools/node_modules/playwright/index.mjs')));
const outDir = path.resolve('output/production-role-acceptance');
fs.mkdirSync(outDir, { recursive: true });

const ROLES = {
  superadmin: { login: '/superadmin/login', home: '/superadmin', allowed: ['/superadmin', '/superadmin/users', '/superadmin/games'], forbidden: [], lock: /Superadmin only/i },
  admin: { login: '/admin/login', home: '/admin', allowed: ['/admin', '/admin/users'], forbidden: ['/superadmin', '/superadmin/games', '/superadmin/settings'], lock: /Superadmin only/i },
  master_agent: { login: '/admin/login', home: '/admin', allowed: ['/admin', '/admin/users'], forbidden: ['/superadmin', '/superadmin/games', '/superadmin/settings'], lock: /Superadmin only/i },
  agent: { login: '/admin/login', home: '/admin', allowed: ['/admin', '/admin/users'], forbidden: ['/superadmin', '/superadmin/games', '/superadmin/settings'], lock: /Superadmin only/i },
  player: { login: null, home: '/', allowed: ['/'], forbidden: ['/admin', '/admin/users', '/superadmin', '/superadmin/games'], lock: /(Superadmin only|Admin access required)/i },
};
const LOCKED = /(Superadmin only|Admin access required)/i;
const VIEWPORTS = { desktop: { viewport: { width: 1366, height: 800 } }, mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } };

const browser = await chromium.launch();
const report = { origin: ORIGIN, at: new Date().toISOString(), roles: {} };

async function bodyText(page) { await page.waitForTimeout(1200); return (await page.innerText('body')).replace(/\s+/g, ' '); }
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

async function runRole(role, spec, vpName, vp) {
  const checks = {};
  const set = (k, v) => { checks[k] = v === true ? 'PASS' : v === false ? 'FAIL' : v; };
  const c = creds[role];
  if (!c) { for (const k of ['login', 'dashboard', 'permissions', 'unauthorized', 'refresh', 'mobile', 'session_expiry', 'logout']) set(k, 'PENDING'); return checks; }
  const ctx = await browser.newContext(vp);
  let allowAuth = false; let blocked = 0;
  await ctx.route('**/*', (route) => {
    const r = route.request();
    if (r.method() !== 'GET' && r.method() !== 'HEAD' && !allowAuth) { blocked++; return route.abort(); }
    return route.continue();
  });
  const page = await ctx.newPage();
  try {
    // --- login
    if (spec.login) {
      await page.goto(ORIGIN + spec.login, { waitUntil: 'networkidle' });
      allowAuth = true;
      await page.locator('input[type=text], input[autocomplete=username]').first().fill(c.user);
      await page.locator('input[type=password]').first().fill(c.pass);
      await page.locator('button[type=submit]').first().click();
      await page.waitForURL((u) => u.pathname === spec.home, { timeout: 20000 }).catch(() => {});
      allowAuth = false;
      set('login', new URL(page.url()).pathname === spec.home && !LOCKED.test(await bodyText(page)));
    } else {
      // Player: sign-in control on the public site. Marked PENDING if the control cannot be driven.
      await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
      const btn = page.getByRole('button', { name: /sign in/i }).first();
      if (!(await btn.count())) { set('login', 'PENDING'); }
      else {
        await btn.click(); allowAuth = true;
        await page.locator('input[type=password]').first().fill(c.pass).catch(() => {});
        await page.locator('input[type=text], input[autocomplete=username]').first().fill(c.user).catch(() => {});
        await page.locator('form button[type=submit]').first().click().catch(() => {});
        await page.waitForTimeout(4000); allowAuth = false;
        set('login', /Guest/.test(await bodyText(page)) ? false : true);
      }
    }
    await page.screenshot({ path: path.join(outDir, `${role}-${vpName}-after-login.png`) });
    // --- dashboard + direct URL + refresh
    let dash = true, refresh = true; const nav = [];
    for (const p of spec.allowed) {
      await page.goto(ORIGIN + p, { waitUntil: 'networkidle' });
      if (LOCKED.test(await bodyText(page))) dash = false;
      await page.reload({ waitUntil: 'networkidle' });
      if (LOCKED.test(await bodyText(page))) refresh = false;
    }
    if (spec.login) nav.push(...(await page.locator('nav a, aside a').allInnerTexts()).map((t) => t.trim()).filter(Boolean));
    set('dashboard', dash); set('refresh', refresh);
    checks.navigationLabels = [...new Set(nav)].slice(0, 30);
    // --- unauthorized pages must show the lock screen, never privileged content
    let denied = true;
    for (const p of spec.forbidden) {
      await page.goto(ORIGIN + p, { waitUntil: 'networkidle' });
      if (!spec.lock.test(await bodyText(page)) && !LOCKED.test(await bodyText(page))) denied = false;
    }
    set('unauthorized', spec.forbidden.length ? denied : 'N/A (full access role)');
    set('permissions', spec.forbidden.length ? denied : true);
    // --- mobile layout (checked only in the mobile run)
    await page.goto(ORIGIN + spec.home, { waitUntil: 'networkidle' });
    set('mobile', vpName === 'mobile' ? await noOverflow(page) : 'N/A');
    // --- session expiry: dropping the session cookies must re-lock the page
    await ctx.clearCookies(); await page.reload({ waitUntil: 'networkidle' });
    const expired = spec.login ? LOCKED.test(await bodyText(page)) : /Guest/.test(await bodyText(page));
    set('session_expiry', expired);
    // --- logout (fresh sign-in, then press Log out)
    if (spec.login) {
      await page.goto(ORIGIN + spec.login, { waitUntil: 'networkidle' }); allowAuth = true;
      await page.locator('input[type=text], input[autocomplete=username]').first().fill(c.user);
      await page.locator('input[type=password]').first().fill(c.pass);
      await page.locator('button[type=submit]').first().click();
      await page.waitForURL((u) => u.pathname === spec.home, { timeout: 20000 }).catch(() => {});
      await page.getByRole('button', { name: /log out/i }).first().click();
      await page.waitForTimeout(2500); allowAuth = false;
      await page.goto(ORIGIN + spec.home, { waitUntil: 'networkidle' });
      set('logout', LOCKED.test(await bodyText(page)));
    } else set('logout', 'PENDING');
    checks.blockedMutatingRequests = blocked;
  } catch (e) {
    // Never include page content; message may only name a selector/timeout.
    checks.error = String(e.message).split('\n')[0].replace(/password[^\s]*/gi, '[redacted]').slice(0, 160);
    for (const k of ['login', 'dashboard', 'permissions', 'unauthorized', 'refresh', 'mobile', 'session_expiry', 'logout']) checks[k] ??= 'FAIL';
  } finally { await ctx.close(); }
  return checks;
}

for (const [role, spec] of Object.entries(ROLES)) {
  report.roles[role] = {};
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    report.roles[role][vpName] = await runRole(role, spec, vpName, vp);
  }
  const all = Object.values(report.roles[role]).flatMap((r) => Object.entries(r).filter(([k]) => !['navigationLabels', 'blockedMutatingRequests', 'error'].includes(k)).map(([, v]) => v));
  report.roles[role].final = all.includes('FAIL') ? 'FAIL' : all.includes('PENDING') ? 'PENDING' : 'PASS';
}
await browser.close();
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
for (const [r, v] of Object.entries(report.roles)) console.log(r.padEnd(13), v.final, '| desktop', JSON.stringify(Object.fromEntries(Object.entries(v.desktop).filter(([k]) => !['navigationLabels'].includes(k)))));
console.log('Report:', path.join(outDir, 'report.json'));
