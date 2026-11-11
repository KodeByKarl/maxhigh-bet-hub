// Head-to-head frame pacing of the ORIGINAL build (deployed 2294d79) vs the RELEASE build for the Color Game wheels, LOOPBACK only.
// Both apps share one disposable database. Runs alternate NEW,OLD,NEW,OLD... so machine drift affects both equally.
//   BASE_NEW=http://127.0.0.1:18081 BASE_OLD=http://127.0.0.1:18082 PW_MODULE_DIR=... PW_CHROME=... node ... <outDir> [runs=4]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client } from "./uat-client.mjs";

const out = process.argv[2] ?? "build-ab"; const RUNS = Number(process.argv[3] ?? 4);
const BASES = { "RELEASE-new": process.env.BASE_NEW, "ORIGINAL-2294d79": process.env.BASE_OLD };
for (const b of Object.values(BASES)) if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(b ?? "")) throw new Error("both bases must be loopback http URLs");
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const c = new Client(); await c.login(process.env.BR_USER ?? "uat_player5");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const GAMES = ["Color Game", "Color Game Pro"];
const SCEN = [["desktop-1x", { width: 1280, height: 800 }, 1, 1], ["android-360-6x", { width: 360, height: 780 }, 2.75, 6]];
const rows = [];
async function once(variant, game, [name, vp, dpr, rate]) {
  const base = BASES[variant];
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr, isMobile: vp.width < 600, hasTouch: vp.width < 600 });
  await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: base }]);
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await page.goto(base + "/cards", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Play ${game}` }).first().click({ timeout: 10000 });
  await page.getByRole("button", { name: /play now/i }).first().click({ timeout: 10000 });
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /^Chip /i }).first().click({ timeout: 8000 }).catch(() => {});
  await page.evaluate(() => { window.__f = []; window.__run = true; const t = (x) => { if (!window.__run) return; window.__f.push(x); requestAnimationFrame(t); }; requestAnimationFrame(t); });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await page.getByRole("button", { name: /^spin$/i }).first().click({ timeout: 8000, force: true }).catch(() => {});
  await page.waitForTimeout(7000);
  const f = await page.evaluate(() => { window.__run = false; return window.__f; });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const d = f.slice(1).map((t, i) => t - f[i]).filter((x) => x < 1000); const s = [...d].sort((a, b) => a - b);
  rows.push({ variant, game, scenario: name, fps: 1000 / (d.reduce((a, b) => a + b, 0) / d.length), p99: s[Math.floor(s.length * 0.99)], worst: s[s.length - 1], slow: d.filter((x) => x > 33.4).length, frames: d.length });
  await ctx.close();
}
for (let i = 0; i < RUNS; i++) for (const g of GAMES) for (const sc of SCEN) for (const v of Object.keys(BASES)) await once(v, g, sc);
await browser.close(); await c.logout().catch(() => {});
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => Math.sqrt(a.reduce((x, y) => x + (y - mean(a)) ** 2, 0) / (a.length - 1));
const summary = [];
for (const g of GAMES) for (const [sn] of SCEN) for (const v of Object.keys(BASES)) {
  const r = rows.filter((x) => x.game === g && x.scenario === sn && x.variant === v);
  summary.push({ game: g, scenario: sn, build: v, runs: r.length, meanFps: +mean(r.map((x) => x.fps)).toFixed(1), sdFps: +sd(r.map((x) => x.fps)).toFixed(1), minFps: +Math.min(...r.map((x) => x.fps)).toFixed(1), maxFps: +Math.max(...r.map((x) => x.fps)).toFixed(1), meanP99ms: +mean(r.map((x) => x.p99)).toFixed(1), meanWorstMs: +mean(r.map((x) => x.worst)).toFixed(1), meanSlowFrames: +mean(r.map((x) => x.slow)).toFixed(1) });
}
fs.writeFileSync(path.join(out, "colorgame-build-ab.json"), JSON.stringify({ rows, summary }, null, 1));
for (const s of summary) console.log(`${s.game.padEnd(15)} ${s.scenario.padEnd(15)} ${s.build.padEnd(17)} fps ${s.meanFps} (sd ${s.sdFps}, range ${s.minFps}-${s.maxFps}) | p99 ${s.meanP99ms}ms worst ${s.meanWorstMs}ms | slow ${s.meanSlowFrames}`);
