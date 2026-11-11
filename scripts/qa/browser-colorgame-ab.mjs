// A/B frame-pacing comparison for Color Game Pro on a LOOPBACK app: the shipped CSS vs the same page with the "while spinning" paint
// reductions NEUTRALISED by an injected style. Alternates A,B,A,B... so drift/noise affects both equally.
//   PW_MODULE_DIR=... PW_CHROME=... UAT_BASE=... node scripts/qa/browser-colorgame-ab.mjs <outDir> [runsPerVariant=4]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";

const out = process.argv[2] ?? "ab"; const RUNS = Number(process.argv[3] ?? 4);
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const GAME = process.env.CG_GAME ?? "Color Game Pro";
const NEUTRALISE = `.pro-root.pro-spinning .pro-aurora::before,.pro-root.pro-spinning .pro-aurora::after{animation-play-state:running !important}
.pro-root.pro-spinning .pro-glass{backdrop-filter:blur(8px) !important}.pro-root.pro-spinning .pro-dock{backdrop-filter:blur(10px) !important}`;
const c = new Client(); await c.login(process.env.BR_USER ?? "uat_player5");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const scenarios = [["desktop-1x", { width: 1280, height: 800 }, 1, 1], ["android-360-6x", { width: 360, height: 780 }, 2.75, 6]];
const rows = [];
async function once(variant, [name, vp, dpr, rate]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr, isMobile: vp.width < 600, hasTouch: vp.width < 600 });
  await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await page.goto(BASE + "/cards", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Play ${GAME}` }).first().click({ timeout: 10000 });
  await page.getByRole("button", { name: /play now/i }).first().click({ timeout: 10000 });
  await page.waitForTimeout(3000);
  if (variant === "B-neutralised") await page.addStyleTag({ content: NEUTRALISE });
  await page.getByRole("button", { name: /^Chip /i }).first().click({ timeout: 8000 }).catch(() => {});
  await page.evaluate(() => { window.__f = []; window.__run = true; const t = (x) => { if (!window.__run) return; window.__f.push(x); requestAnimationFrame(t); }; requestAnimationFrame(t); });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await page.getByRole("button", { name: /^spin$/i }).first().click({ timeout: 8000, force: true }).catch(() => {});
  await page.waitForTimeout(7000);
  const f = await page.evaluate(() => { window.__run = false; return window.__f; });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const d = f.slice(1).map((t, i) => t - f[i]).filter((x) => x < 1000);
  const sorted = [...d].sort((a, b) => a - b);
  rows.push({ variant, scenario: name, fps: 1000 / (d.reduce((a, b) => a + b, 0) / d.length), p99: sorted[Math.floor(sorted.length * 0.99)], slow: d.filter((x) => x > 33.4).length });
  await ctx.close();
}
for (let i = 0; i < RUNS; i++) for (const sc of scenarios) for (const v of ["A-shipped", "B-neutralised"]) await once(v, sc);
await browser.close(); await c.logout().catch(() => {});
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const summary = [];
for (const [name] of scenarios) for (const v of ["A-shipped", "B-neutralised"]) {
  const r = rows.filter((x) => x.scenario === name && x.variant === v);
  summary.push({ scenario: name, variant: v, runs: r.length, meanFps: +mean(r.map((x) => x.fps)).toFixed(1), minFps: +Math.min(...r.map((x) => x.fps)).toFixed(1), meanP99: +mean(r.map((x) => x.p99)).toFixed(1), meanSlowFrames: +mean(r.map((x) => x.slow)).toFixed(1) });
}
fs.writeFileSync(path.join(out, "colorgame-ab.json"), JSON.stringify({ rows, summary }, null, 1));
for (const s of summary) console.log(`${s.scenario.padEnd(15)} ${s.variant.padEnd(14)} fps mean ${s.meanFps} min ${s.minFps} | p99 ${s.meanP99}ms | slow frames ${s.meanSlowFrames} (${s.runs} runs)`);
