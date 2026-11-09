// Browser smoke on a LOOPBACK app (clone/tunnel). Uses playwright-core from PW_MODULE_DIR and a cached Chromium (PW_CHROME).
//   PW_MODULE_DIR=... PW_CHROME=... UAT_BASE=http://127.0.0.1:18081 node scripts/qa/browser-smoke.mjs <evidenceDir>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";

const out = process.argv[2] ?? "browser-evidence";
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const catalog = fs.readFileSync("deploy/diagnostics/uat-game-catalog.tsv", "utf8").trim().split("\n").slice(1).map((l) => l.split("\t"));
const results = [];
const note = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`); };

const c = new Client(); await c.login(process.env.BR_USER ?? "uat_player5");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const phone = { viewport: { width: 390, height: 844 }, isMobile: true };
for (const [label, opts] of [["desktop", { viewport: { width: 1366, height: 800 } }], ["mobile", phone]]) {
  const ctx = await browser.newContext(opts);
  await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
  for (const route of ["/", "/slots", "/fishing", "/cards"]) {
    const page = await ctx.newPage();
    const errors = [], failed = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 140)); });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 140)));
    page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
    const resp = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => ({ status: () => 0, err: e.message }));
    await page.waitForTimeout(800);
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => new URL(i.src).pathname).slice(0, 8));
    const imgs = await page.evaluate(() => document.images.length);
    const horizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
    note(`${label} ${route} loads (HTTP ${resp.status()})`, resp.status() === 200, `${imgs} images`);
    note(`${label} ${route} no console/page errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
    note(`${label} ${route} no failed requests`, failed.length === 0, failed.slice(0, 4).join(" | "));
    note(`${label} ${route} no broken images`, broken.length === 0, broken.join(" | "));
    note(`${label} ${route} no horizontal scroll`, !horizontalScroll, "");
    note(`${label} ${route} does not offer wild-frontier-stampede`, !body.includes("frontier stampede") && !(await page.content()).includes("wild-frontier-stampede"), "");
    if (label === "desktop") await page.screenshot({ path: path.join(out, `${route === "/" ? "home" : route.slice(1)}-${label}.png`) });
    await page.close();
  }
  await ctx.close();
}
await c.logout().catch(() => {});
await browser.close();
const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(out, "browser-results.json"), JSON.stringify({ at: new Date().toISOString(), catalogGames: catalog.length, total: results.length, failed: failed.length, results }, null, 1));
console.log(`\n${results.length} browser checks, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
