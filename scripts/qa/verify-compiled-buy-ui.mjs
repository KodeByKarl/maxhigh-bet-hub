// Guards against "source is fixed but the build/deployment being looked at is not". Inspects the COMPILED output, not the source.
//   node scripts/qa/verify-compiled-buy-ui.mjs [outputDir=.output]   [BASE_URL=http://127.0.0.1:18081 also checks what the server really serves]
// FAILS when: the build is older than the newest source file; any compiled client bundle still contains the old quantity / "Buy & Play" UI;
// fewer than the expected number of bundles contain the approved "Confirm Buy Bonus" dialog (a scan that finds nothing can never pass).
import fs from "node:fs";
import path from "node:path";

const outDir = process.argv[2] ?? ".output";
const MIN_NEW_DIALOG_BUNDLES = 31; // dedicated dialogs + the shared Realms dialog
const OLD = [/buy\s*(&|&amp;|and)\s*play/i, /label:\s*[`"']Quantity[`"']/, /label:\s*[`"'](Total )?Price[`"']/]; // rendered labels of the old dialog (a bare "quantity" identifier is only an internal argument name)
const fail = [];
const assets = path.join(outDir, "public", "assets");
if (!fs.existsSync(assets)) { console.error("FAIL  no compiled client bundles at " + assets); process.exit(1); }

const builtAt = fs.statSync(path.join(outDir, "nitro.json")).mtimeMs;
let newest = { f: "", t: 0 };
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx?|css)$/.test(e.name) && fs.statSync(p).mtimeMs > newest.t) newest = { f: p, t: fs.statSync(p).mtimeMs }; } };
walk("src");
if (newest.t > builtAt + 1000) fail.push(`STALE BUILD: ${newest.f} is newer than the build (${new Date(builtAt).toISOString()}). Rebuild before testing or deploying.`);

const js = fs.readdirSync(assets).filter((f) => f.endsWith(".js"));
let newDialog = 0; const oldHits = [];
for (const f of js) {
  const s = fs.readFileSync(path.join(assets, f), "utf8");
  if (/confirm buy bonus/i.test(s)) newDialog++;
  if (/buy bonus/i.test(s) || /BuyFeatureModal/.test(s)) for (const re of OLD) if (re.test(s)) oldHits.push(`${f}: ${re}`);
}
if (newDialog < MIN_NEW_DIALOG_BUNDLES) fail.push(`only ${newDialog} compiled bundles contain the approved Confirm Buy Bonus dialog (expected >= ${MIN_NEW_DIALOG_BUNDLES})`);
for (const h of oldHits) fail.push("OLD UI still compiled: " + h);

const base = process.env.BASE_URL;
if (base) {
  const html = await (await fetch(base + "/slots")).text();
  const served = [...html.matchAll(/\/assets\/[\w.-]+\.js/g)].map((m) => m[0]);
  const missing = served.filter((u) => !fs.existsSync(path.join(outDir, "public", u)));
  if (missing.length) fail.push(`the server at ${base} serves ${missing.length} bundle(s) that are not in ${outDir} (different/older build is running): ${missing.slice(0, 3).join(", ")}`);
  console.log(`served-by-${base}: ${served.length} entry bundles checked against ${outDir}`);
}
console.log(`bundles scanned: ${js.length}; approved dialog bundles: ${newDialog}; old-UI bundles: ${oldHits.length}; built: ${new Date(builtAt).toISOString()}`);
if (fail.length) { fail.forEach((f) => console.error("FAIL  " + f)); process.exit(1); }
console.log("PASS  compiled output contains only the approved Buy Bonus dialog");
