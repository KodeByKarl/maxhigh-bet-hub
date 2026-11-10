// Frame-pacing measurement for the Color Game wheel on a LOOPBACK app, under emulated phone viewport and CPU throttling.
//   PW_MODULE_DIR=... PW_CHROME=... UAT_BASE=http://127.0.0.1:18081 node scripts/qa/browser-colorgame-perf.mjs <outDir> [label]
// Software-rendered headless Chromium is pessimistic: use the numbers to COMPARE before/after, not as absolute device FPS.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";

const out = process.argv[2] ?? "perf";
const label = process.argv[3] ?? "run";
const game = process.env.CG_GAME ?? "Color Game";
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const c = new Client(); await c.login(process.env.BR_USER ?? "uat_player5");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const results = [];
for (const [name, viewport, dpr, rate] of [["desktop-1x", { width: 1280, height: 800 }, 1, 1], ["android-360-4x", { width: 360, height: 780 }, 2.75, 4], ["android-360-6x", { width: 360, height: 780 }, 2.75, 6]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(BASE + "/cards", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Play ${game}` }).first().click({ timeout: 10000 });
  await page.getByRole("button", { name: /play now/i }).first().click({ timeout: 10000 });
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /^Chip /i }).first().click({ timeout: 8000 }).catch(() => {});
  await page.evaluate(() => {
    window.__frames = []; window.__run = true;
    const tick = (t) => { if (!window.__run) return; window.__frames.push(t); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await page.getByRole("button", { name: /^spin$/i }).first().click({ timeout: 8000, force: true }).catch((e) => console.log("spin click:", e.message.slice(0, 80)));
  await page.waitForTimeout(6500);
  const frames = await page.evaluate(() => { window.__run = false; return window.__frames; });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const d = frames.slice(1).map((t, i) => t - frames[i]);
  const spinWindow = d.filter((x) => x < 1000);
  const q = (p) => [...spinWindow].sort((a, b) => a - b)[Math.floor(spinWindow.length * p)];
  const r = { label, scenario: name, frames: spinWindow.length, medianMs: +q(0.5).toFixed(1), p95Ms: +q(0.95).toFixed(1), p99Ms: +q(0.99).toFixed(1), worstMs: +Math.max(...spinWindow).toFixed(1),
    over33ms: spinWindow.filter((x) => x > 33.4).length, over50ms: spinWindow.filter((x) => x > 50).length, avgFps: +(1000 / (spinWindow.reduce((a, b) => a + b, 0) / spinWindow.length)).toFixed(1) };
  results.push(r); console.log(JSON.stringify(r));
  await ctx.close();
}
fs.writeFileSync(path.join(out, `colorgame-perf-${label}.json`), JSON.stringify(results, null, 1));
await browser.close(); await c.logout().catch(() => {});
