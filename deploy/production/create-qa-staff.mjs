#!/usr/bin/env node
/**
 * Administrator-run: create the approved QA staff accounts THROUGH the Super Admin web interface on https://maxhigh.online.
 *
 *   $env:ROLE_QA_CREDENTIALS_FILE = "$env:USERPROFILE\maxhigh-uat-secrets\role-qa.tsv"   # must contain the superadmin line
 *   node deploy/production/create-qa-staff.mjs            # DRY RUN (default): signs in, checks names are free, checks the form; creates nothing
 *   node deploy/production/create-qa-staff.mjs --apply    # creates qa_master_agent, then qa_agent (upline: qa_master_agent)
 *
 * Approved scope: qa_master_agent (master_agent) and qa_agent (agent). `qa_admin` is NOT created here: the Super Admin interface
 * offers no "admin" role (agent / master agent / superadmin only), and accounts must not be inserted directly into the database.
 *
 * Safety: starting balance is the form's fixed 0 (no chips are added); no existing account is edited, locked, reset or deleted;
 * the owner password is never changed; passwords are generated here (crypto RNG), appended to the same local credentials file
 * after creation succeeds, and never printed or logged. Only the two create actions may POST besides sign-in/sign-out.
 * A record without passwords is written to output/production-role-acceptance/created-qa-accounts.json (git-ignored).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ORIGIN = 'https://maxhigh.online';
const apply = process.argv.includes('--apply');
const file = process.env.ROLE_QA_CREDENTIALS_FILE;
if (!file) throw Error('Set ROLE_QA_CREDENTIALS_FILE (outside the repository).');
const real = fs.realpathSync(file);
const rel = path.relative(path.resolve('.'), real);
if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) throw Error('Credentials file must be outside the repository.');
const rows = fs.readFileSync(real, 'utf8').split(/\r?\n/).map((l) => l.split('\t')).filter((c) => c.length >= 3 && c[0]);
const owner = rows.find((c) => c[0].trim() === 'superadmin');
if (!owner) throw Error('The credentials file has no superadmin line.');

const PLAN = [
  { username: 'qa_master_agent', role: 'master_agent', label: 'master_agent' },
  { username: 'qa_agent', role: 'agent', label: 'agent', upline: 'qa_master_agent' },
];
for (const p of PLAN) if (rows.some((c) => c[0].trim() === p.label)) throw Error(`${p.label} already has a line in the credentials file; remove it first if it should be recreated.`);

const newPassword = () => { for (;;) { const p = crypto.randomBytes(18).toString('base64url').slice(0, 22); if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)) return p; } };

const { chromium } = await import(pathToFileURL(path.resolve('output/production-browser-tools/node_modules/playwright/index.mjs')));
const outDir = path.resolve('output/production-role-acceptance'); fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
let allowPost = false;
await ctx.route('**/*', (route) => {
  const r = route.request();
  const sameHost = new URL(r.url()).origin === ORIGIN;
  if (!sameHost && !/^(data|blob):/.test(r.url()) && !/fonts\.(googleapis|gstatic)\.com$/.test(new URL(r.url()).hostname)) return route.abort();
  if (r.method() !== 'GET' && r.method() !== 'HEAD' && !allowPost) return route.abort();
  return route.continue();
});
const page = await ctx.newPage();
const text = async () => { await page.waitForTimeout(1200); return (await page.innerText('body')).replace(/\s+/g, ' '); };
const created = [];
let exitCode = 0;
try {
  // ---- sign in as the owner
  await page.goto(`${ORIGIN}/superadmin/login`, { waitUntil: 'networkidle' });
  allowPost = true;
  await page.locator('input[type=text], input[autocomplete=username]').first().fill(owner[1].trim());
  await page.locator('input[type=password]').first().fill(owner[2]);
  await page.locator('button[type=submit]').first().click();
  await page.waitForURL((u) => u.pathname === '/superadmin', { timeout: 20000 }).catch(() => {});
  allowPost = false;
  if (new URL(page.url()).pathname !== '/superadmin' || /Superadmin only/i.test(await text())) throw Error('Superadmin sign-in failed (wrong/unknown password, lock, or not a superadmin). Nothing was created.');
  console.log('Superadmin sign-in: OK');

  await page.goto(`${ORIGIN}/superadmin/admins`, { waitUntil: 'networkidle' });
  const listText = await text();
  for (const p of PLAN) if (listText.toLowerCase().includes('@' + p.username)) throw Error(`@${p.username} already exists. Nothing was created.`);
  console.log('Names free in the staff list:', PLAN.map((p) => p.username).join(', '));

  for (const p of PLAN) {
    await page.getByRole('button', { name: /\+ Add Agent/ }).first().click();
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: /^(Create Agent|Creating…)$/ }) });
    await form.waitFor({ timeout: 10000 });
    const selects = form.locator('select');
    await selects.nth(0).selectOption(p.role);
    if (p.upline) {
      const val = await selects.nth(1).locator('option').filter({ hasText: '@' + p.upline }).first().getAttribute('value').catch(() => null);
      if (!val) throw Error(`Upline @${p.upline} is not selectable (was it created?).`);
      await selects.nth(1).selectOption(val);
    }
    await form.locator('input').first().fill(p.username);
    if (/already taken/i.test(await text())) throw Error(`@${p.username} is already taken.`);
    if (!apply) { console.log(`DRY RUN @${p.username} (${p.role}): form reachable, name free. Not submitted.`); await page.getByRole('button', { name: /^Cancel$/ }).click(); continue; }

    const pw = newPassword();
    const pending = real + '.pending';
    fs.writeFileSync(pending, `${p.label}\t${p.username}\t${pw}\n`, { flag: 'a' }); // survives a crash between create and save
    const pwInputs = form.locator('input[type=password]');
    await pwInputs.nth(0).fill(pw); await pwInputs.nth(1).fill(pw);
    allowPost = true;
    await form.getByRole('button', { name: /^Create Agent$/ }).click();
    await page.waitForTimeout(3500); allowPost = false;
    const after = await text();
    if (!(await page.locator('form').filter({ has: page.getByRole('button', { name: /^Create Agent$/ }) }).count()) && after.toLowerCase().includes('@' + p.username)) {
      fs.appendFileSync(real, `${p.label}\t${p.username}\t${pw}\n`);
      fs.rmSync(pending, { force: true });
      created.push({ username: p.username, role: p.role, upline: p.upline ?? null, at: new Date().toISOString() });
      console.log(`CREATED @${p.username} (${p.role}); password saved to the local credentials file only.`);
    } else {
      const toast = (await page.locator('[data-sonner-toast]').allInnerTexts()).join(' | ').replace(/\s+/g, ' ').slice(0, 200);
      // Keep the pending line: the account may exist even though the page state was unclear.
      throw Error(`Creating @${p.username} did not complete. App message: ${toast || '(none)'}. The generated password was kept in ${path.basename(pending)} (outside the repo) in case the account exists; delete that file if the app reported a clear failure.`);
    }
  }
  await page.screenshot({ path: path.join(outDir, 'superadmin-admins-list.png') });
} catch (e) {
  exitCode = 1; console.error('STOPPED:', String(e.message).split('\n')[0]);
} finally {
  try { allowPost = true; await page.getByRole('button', { name: /log out/i }).first().click({ timeout: 4000 }); await page.waitForTimeout(1500); } catch {}
  await browser.close();
  if (created.length) {
    const rec = path.join(outDir, 'created-qa-accounts.json');
    const prev = fs.existsSync(rec) ? JSON.parse(fs.readFileSync(rec, 'utf8')) : [];
    fs.writeFileSync(rec, JSON.stringify([...prev, ...created], null, 2));
    console.log('Recorded (no passwords):', rec);
  }
  if (fs.existsSync(real + '.pending')) console.error('NOTE: a pending credentials file remains at', real + '.pending', '(account may exist; owner to review).');
}
process.exit(exitCode);
