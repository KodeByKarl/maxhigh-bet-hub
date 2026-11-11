// Screenshots + layout/a11y checks of the shared Buy Bonus modal for every game, via the QA harness (scripts/qa/buy-bonus-harness).
//   PW_MODULE_DIR=<dir with node_modules/playwright-core> PW_CHROME=<chrome.exe> HARNESS=http://127.0.0.1:5199 node scripts/qa/capture-buy-bonus-modal.mjs <outDir> [game,game,...|all]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const out = process.argv[2] ?? "buy-bonus-shots";
const which = process.argv[3] ?? "all";
const base = process.env.HARNESS ?? "http://127.0.0.1:5199";
const { chromium } = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"))("playwright-core");
const VIEWS = [
  { name: "desktop", viewport: { width: 1366, height: 900 } },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "small", viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const probe = await (await browser.newContext()).newPage();
await probe.goto(base);
await probe.waitForFunction(() => window.__themes);
const all = await probe.evaluate(() => window.__themes());
const games = which === "all" ? all : which.split(",");
const problems = [];
for (const v of VIEWS) {
  const ctx = await browser.newContext({ ...v, serviceWorkers: "block" });
  for (const g of games) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`${base}/?game=${g}`);
    const dlg = page.getByRole("dialog");
    await dlg.waitFor();
    await page.waitForTimeout(1400); // entrance animation settles
    const r = await page.evaluate(() => {
      const box = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
      const c = document.querySelector(".bb-confirm"), x = document.querySelector(".bb-cancel"), card = document.querySelector(".bb-glow");
      const imgs = [...document.images].map((i) => ({ src: i.currentSrc, ok: i.complete && i.naturalWidth > 0 }));
      return { vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, confirm: box(c), cancel: box(x), card: box(card), imgs, focus: document.activeElement?.className };
    });
    const issues = [];
    if (r.sw > r.vw) issues.push(`horizontal scroll ${r.sw}>${r.vw}`);
    for (const k of ["confirm", "cancel"]) {
      const b = r[k];
      if (b.x < 0 || b.r > r.vw || b.y < 0 || b.b > r.vh) issues.push(`${k} outside viewport`);
      if (b.h < 44) issues.push(`${k} touch target ${Math.round(b.h)}px`);
    }
    if (r.card.y < 0 || r.card.b > r.vh + 1 || r.card.x < 0 || r.card.r > r.vw) issues.push("card clipped by viewport");
    if (r.imgs.some((i) => !i.ok)) issues.push("broken image " + r.imgs.filter((i) => !i.ok).map((i) => i.src).join(","));
    if (!String(r.focus).includes("bb-confirm")) issues.push(`initial focus on ${r.focus}`);
    if (errors.length) issues.push("console errors: " + errors.slice(0, 2).join(" | "));
    if (v.name === "desktop") {
      await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
      const cls = await page.evaluate(() => document.activeElement?.className);
      if (!/bb-(confirm|cancel|close)/.test(cls)) issues.push(`focus escaped dialog (${cls})`);
    }
    await page.screenshot({ path: path.join(out, `${g}.${v.name}.png`) });
    if (v.name === "desktop") {
      await page.keyboard.press("Escape");
      if ((await page.evaluate(() => document.body.dataset.result)) !== "cancel") issues.push("Escape did not cancel");
    }
    if (issues.length) problems.push({ game: g, view: v.name, issues });
    await page.close();
  }
  await ctx.close();
}
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify({ games: games.length, views: VIEWS.map((v) => v.name), problems }, null, 2));
console.log(`captured ${games.length} games x ${VIEWS.length} views; problems: ${problems.length}`);
for (const p of problems.slice(0, 40)) console.log(JSON.stringify(p));
await browser.close();
process.exitCode = problems.length ? 1 : 0;
