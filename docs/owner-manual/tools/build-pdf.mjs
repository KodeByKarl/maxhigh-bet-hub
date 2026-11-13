// Builds MAXHIGH_OWNER_GAME_CONFIGURATION_MANUAL.pdf from the editable HTML source.
// Run from the repository root:  node docs/owner-manual/tools/build-pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const dir = path.resolve('docs/owner-manual');
execFileSync(process.execPath, [path.join(dir, 'tools/build-reference.mjs')], { stdio: 'inherit' });

const meta = JSON.parse(fs.readFileSync(path.join(dir, 'data/reference-meta.json'), 'utf8'));
const readAt = new Date(meta.readAt).toLocaleString('en-GB', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' }) + ' (PH time)';
const values = {
  SHA_SHORT: meta.sha.slice(0, 7), READ_AT: readAt,
  BUILT_AT: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' }),
  COUNT_CLUSTER: meta.counts['Cluster slot'], COUNT_REALMS: meta.counts['Realms slot'],
  COUNT_VOLCANO: meta.counts['Lines slot (RTP profiles)'], COUNT_FISHING: meta.counts.Fishing,
  COUNT_CARDS: meta.counts['Card table'], COUNT_COLOR: meta.counts['Color Game'],
  REFERENCE_TABLE: fs.readFileSync(path.join(dir, 'data/reference-table.html'), 'utf8'),
};
let html = fs.readFileSync(path.join(dir, 'MAXHIGH_OWNER_GAME_CONFIGURATION_MANUAL.html'), 'utf8');
html = html.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
  if (!(k in values)) throw new Error(`Unknown placeholder ${m}`);
  return String(values[k]);
});
if (/password\s*[:=]\s*\S{6,}/i.test(html)) throw new Error('Refusing to build: something that looks like a password is in the manual');
const built = path.join(dir, '.manual.built.html'); // beside the source so screenshots/ resolves
fs.writeFileSync(built, html);

const { chromium } = await import(pathToFileURL(path.resolve('output/production-browser-tools/node_modules/playwright/index.mjs')));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(built).href, { waitUntil: 'networkidle' });
const broken = await page.evaluate(() => [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
if (broken.length) throw new Error('Missing images: ' + broken.join(', '));
const pdf = path.join(dir, 'MAXHIGH_OWNER_GAME_CONFIGURATION_MANUAL.pdf');
await page.pdf({
  path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
  headerTemplate: '<div style="width:100%;font-size:7.5pt;color:#8a8496;padding:0 16mm;font-family:Segoe UI,Arial">MAXHIGH · Game Configuration &amp; Fine-Tuning Guide (Owner\'s Manual)</div>',
  footerTemplate: '<div style="width:100%;font-size:8pt;color:#5d5868;padding:0 16mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial"><span>Confidential: for the MaxHigh owner</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
});
await browser.close();
console.log('PDF written:', pdf, Math.round(fs.statSync(pdf).size / 1024) + ' KB');
