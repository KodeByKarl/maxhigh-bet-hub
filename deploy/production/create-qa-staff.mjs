#!/usr/bin/env node
/**
 * Administrator-run: create the approved QA staff accounts THROUGH the Super Admin web interface on https://maxhigh.online.
 *
 *   $env:ROLE_QA_CREDENTIALS_FILE = "$env:USERPROFILE\maxhigh-uat-secrets\role-qa.tsv"   # must contain the superadmin line
 *   node deploy/production/create-qa-staff.mjs            # DRY RUN (default): validates both forms independently; creates nothing
 *   node deploy/production/create-qa-staff.mjs --apply    # creates qa_master_agent, verifies it, then creates qa_agent under it
 *
 * Scope: qa_master_agent (master_agent) and qa_agent (agent, upline qa_master_agent). (Admin is not an operational role; no qa_admin is created.)
 *
 * Dry run: each form is validated on its own and nothing is submitted. The agent's upline (qa_master_agent) cannot be selectable
 * until it exists, so that single check is reported "PENDING UNTIL APPLY" (not a failure). Apply mode requires it to be selectable.
 * Safety: starting balance is not a field on this form (the app fixes it at 0) and is verified as zero after creation; an existing
 * account is never created over, edited, locked, reset or deleted; an account cap notice stops the run (never bypassed); passwords are
 * generated locally, appended to the credentials file only after creation is verified, and never printed or logged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PLAN, hasUsername, checkRoleOptions, uplineStatus, decideAccount, verifyCreatedRow, newPassword } from './qa-staff-plan.mjs';

const ORIGIN = 'https://maxhigh.online';
const apply = process.argv.includes('--apply');
const file = process.env.ROLE_QA_CREDENTIALS_FILE;
if (!file) throw Error('Set ROLE_QA_CREDENTIALS_FILE (outside the repository).');
const real = fs.realpathSync(file);
const rel = path.relative(path.resolve('.'), real);
if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) throw Error('Credentials file must be outside the repository.');
const credRows = () => fs.readFileSync(real, 'utf8').split(/\r?\n/).map((l) => l.split('\t')).filter((c) => c.length >= 3 && c[0]);
const owner = credRows().find((c) => c[0].trim() === 'superadmin');
if (!owner) throw Error('The credentials file has no superadmin line.');

const outDir = path.resolve('output/production-role-acceptance'); fs.mkdirSync(outDir, { recursive: true });
const recordFile = path.join(outDir, 'created-qa-accounts.json');
const record = () => (fs.existsSync(recordFile) ? JSON.parse(fs.readFileSync(recordFile, 'utf8')) : []);

const { chromium } = await import(pathToFileURL(path.resolve('output/production-browser-tools/node_modules/playwright/index.mjs')));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
let allowPost = false;
await ctx.route('**/*', (route) => {
  const r = route.request(); const u = new URL(r.url());
  const okHost = u.origin === ORIGIN || /^(data|blob):/.test(r.url()) || /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!okHost) return route.abort();
  if (r.method() !== 'GET' && r.method() !== 'HEAD' && !allowPost) return route.abort();
  return route.continue();
});
const page = await ctx.newPage();
const text = async () => { await page.waitForTimeout(1200); return (await page.innerText('body')).replace(/\s+/g, ' '); };
const results = []; // validation summary (no secrets)
const created = [];
let exitCode = 0;

async function openForm() {
  await page.getByRole('button', { name: /\+ Add Agent/ }).first().click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: /^(Create Agent|Creating…)$/ }) });
  await form.waitFor({ timeout: 10000 });
  return form;
}
async function closeForm() { await page.getByRole('button', { name: /^Cancel$/ }).click(); }
async function loadList() { await page.goto(`${ORIGIN}/superadmin/admins`, { waitUntil: 'networkidle' }); return text(); }

try {
  // ---- owner sign-in (single attempt, no retry)
  await page.goto(`${ORIGIN}/superadmin/login`, { waitUntil: 'networkidle' });
  allowPost = true;
  await page.locator('input[type=text], input[autocomplete=username]').first().fill(owner[1].trim());
  await page.locator('input[type=password]').first().fill(owner[2]);
  await page.locator('button[type=submit]').first().click();
  await page.waitForURL((u) => u.pathname === '/superadmin', { timeout: 20000 }).catch(() => {});
  allowPost = false;
  if (new URL(page.url()).pathname !== '/superadmin' || /Superadmin only/i.test(await text())) throw Error('Superadmin sign-in failed. Nothing was created.');
  console.log(`Host: ${ORIGIN}  |  Superadmin sign-in: OK  |  Mode: ${apply ? 'APPLY' : 'DRY RUN (nothing is submitted)'}`);

  let listText = await loadList();
  const rec = record();
  const plannedUplines = PLAN.map((p) => p.username);

  for (const p of PLAN) {
    const r = { username: p.username, role: p.role, checks: {} };
    results.push(r);
    const decision = decideAccount({
      existsInApp: hasUsername(listText, p.username),
      inRecord: rec.some((x) => x.username === p.username),
      hasCredLine: credRows().some((c) => c[0].trim() === p.label && c[1].trim() === p.username),
    });
    if (decision.action === 'ABORT') throw Error(`@${p.username}: ${decision.reason}.`);
    r.checks.username = decision.action === 'REUSE' ? 'exists (created earlier by this tool; reused)' : 'available';
    if (decision.action === 'REUSE') { r.checks.creation = 'SKIPPED (already created)'; continue; }

    const form = await openForm();
    // account-cap notice: the app shows a role=status banner inside the form when no more accounts can be added
    const capNotice = (await form.locator('[role=status]').allInnerTexts()).join(' ').replace(/\s+/g, ' ').trim();
    if (capNotice) throw Error(`Account cap/restriction notice shown by the app: "${capNotice.slice(0, 160)}". Not bypassed; nothing created for @${p.username}.`);
    r.checks.accountCap = 'no restriction notice (the server still enforces the cap on submit)';

    const selects = form.locator('select');
    const roleValues = await selects.nth(0).locator('option').evaluateAll((os) => os.map((o) => o.value));
    const ro = checkRoleOptions(roleValues, p.role);
    if (!ro.ok) throw Error(`@${p.username}: ${ro.reason}`);
    await selects.nth(0).selectOption(p.role);
    r.checks.role = `"${p.role}" offered; offered values: ${roleValues.join(', ')}`;

    const numberFields = await form.locator('input[type=number]').count();
    r.checks.startingBalance = numberFields === 0 ? 'no balance field on this form (the app creates staff at 0); verified after creation' : `UNEXPECTED: ${numberFields} numeric field(s)`;
    if (numberFields !== 0) throw Error(`@${p.username}: the form has an unexpected numeric (balance) field; stopping.`);

    await form.locator('input').first().fill(p.username);
    if (/already taken/i.test(await text())) throw Error(`@${p.username} is already taken.`);

    if (p.upline) {
      const optionTexts = await selects.nth(1).locator('option').allInnerTexts();
      const status = uplineStatus({ apply, upline: p.upline, optionTexts, plannedUplines });
      r.checks.upline = status === 'OK' ? `@${p.upline} selectable` : status === 'PENDING UNTIL APPLY' ? `PENDING UNTIL APPLY (@${p.upline} does not exist yet; it is created first in apply mode)` : 'FAIL';
      if (status === 'FAIL') throw Error(`Upline @${p.upline} is not selectable. Not creating @${p.username}.`);
      if (status === 'OK') {
        const val = await selects.nth(1).locator('option').filter({ hasText: '@' + p.upline }).first().getAttribute('value');
        await selects.nth(1).selectOption(val);
      }
    }

    if (!apply) { r.checks.creation = 'NOT SUBMITTED (dry run)'; await closeForm(); continue; }

    // ---- apply: submit
    const pw = newPassword();
    const pending = real + '.pending';
    fs.writeFileSync(pending, `${p.label}\t${p.username}\t${pw}\n`, { flag: 'a' }); // survives a crash between create and save
    const pwInputs = form.locator('input[type=password]');
    await pwInputs.nth(0).fill(pw); await pwInputs.nth(1).fill(pw);
    allowPost = true;
    await form.getByRole('button', { name: /^Create Agent$/ }).click();
    await page.waitForTimeout(3500); allowPost = false;
    const stillOpen = await page.locator('form').filter({ has: page.getByRole('button', { name: /^Create Agent$/ }) }).count();
    listText = await loadList();
    if (stillOpen || !hasUsername(listText, p.username)) {
      const toast = (await page.locator('[data-sonner-toast]').allInnerTexts()).join(' | ').replace(/\s+/g, ' ').slice(0, 200);
      throw Error(`Creating @${p.username} did not complete (${toast || 'no message'}). The generated password is kept in ${path.basename(pending)} outside the repo in case the account exists; delete it if the app reported a clear failure.`);
    }
    // ---- verify role + zero balance (+ upline) on the list row before anything depends on it
    const row = page.locator('tbody tr').filter({ hasText: '@' + p.username }).first();
    const problems = verifyCreatedRow({
      expectedRole: p.role, expectedUpline: p.upline,
      role: await row.locator('select').first().inputValue(),
      balanceText: await row.locator('td.tabular-nums').first().innerText(),
      rowText: (await row.innerText()).replace(/\s+/g, ' '),
    });
    fs.appendFileSync(real, `${p.label}\t${p.username}\t${pw}\n`); // account exists: keep its password even if verification complains
    fs.rmSync(pending, { force: true });
    created.push({ username: p.username, role: p.role, upline: p.upline ?? null, at: new Date().toISOString() });
    fs.writeFileSync(recordFile, JSON.stringify([...record().filter((x) => x.username !== p.username), ...created.filter((x) => x.username === p.username)], null, 2));
    if (problems.length) throw Error(`@${p.username} was created but verification found: ${problems.join('; ')}. Stopping; nothing further is created.`);
    r.checks.creation = 'CREATED and verified (role, zero balance' + (p.upline ? ', upline' : '') + ')';
    console.log(`CREATED @${p.username} (${p.role}); password saved to the local credentials file only.`);
  }
  await page.screenshot({ path: path.join(outDir, 'superadmin-admins-list.png') });
} catch (e) {
  exitCode = 1; console.error('STOPPED:', String(e.message).split('\n')[0]);
} finally {
  try { allowPost = true; await page.getByRole('button', { name: /log out/i }).first().click({ timeout: 4000 }); await page.waitForTimeout(1500); } catch {}
  await browser.close();
  for (const r of results) { console.log(`\n@${r.username} (${r.role})`); for (const [k, v] of Object.entries(r.checks)) console.log(`  ${k.padEnd(16)} ${v}`); }
  if (!apply && !exitCode) console.log('\nDRY RUN PASSED. Items marked PENDING UNTIL APPLY are expected dependencies, not failures. Re-run with --apply after review.');
  if (fs.existsSync(real + '.pending')) console.error('NOTE: a pending credentials file remains at', real + '.pending', '(an account may exist; owner to review).');
}
process.exit(exitCode);
