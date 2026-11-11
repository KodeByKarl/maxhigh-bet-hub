// Screenshots + layout checks of REAL game pages (src/games/<id>/GameView) via scripts/qa/game-skin-harness.
//   PW_MODULE_DIR=<dir with node_modules/playwright-core> PW_CHROME=<chrome.exe> HARNESS=http://127.0.0.1:5198 \
//   node scripts/qa/capture-game-skins.mjs <outDir> [id,id|all] [views=1920,1366,390,360]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const out = process.argv[2] ?? "game-skin-shots";
const which = process.argv[3] ?? "all";
const base = process.env.HARNESS ?? "http://127.0.0.1:5198";
const { chromium } = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"))(
  "playwright-core",
);
const ALL = {
  1920: { name: "1920x1080", viewport: { width: 1920, height: 1080 } },
  1366: { name: "1366x768", viewport: { width: 1366, height: 768 } },
  390: {
    name: "390x844",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
  360: {
    name: "360x640",
    viewport: { width: 360, height: 640 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
};
const VIEWS = (process.argv[4] ?? "1920,1366,390,360").split(",").map((k) => ALL[k]);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const probe = await (await browser.newContext()).newPage();
await probe.goto(base);
await probe.waitForFunction(() => window.__games);
const all = await probe.evaluate(() => window.__games());
const games = which === "all" ? all : which.split(",");
const report = [];
for (const v of VIEWS) {
  const ctx = await browser.newContext({ ...v, serviceWorkers: "block" });
  for (const g of games) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 160)));
    page.on("console", (m) => {
      if (m.type() === "error" && !/qa stub|Failed to load resource|net::ERR|404/.test(m.text()))
        errors.push(m.text().slice(0, 160));
    });
    await page.goto(`${base}/?game=${g}${process.env.LEGACY ? "&legacy=1" : ""}`);
    await page
      .waitForSelector("[data-game-view], [data-harness-game] *", { timeout: 20000 })
      .catch(() => {});
    await page.waitForTimeout(2200);
    const r = await page.evaluate(() => {
      const vw = innerWidth,
        vh = innerHeight,
        de = document.documentElement;
      const rect = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, r: b.right, b: b.bottom, w: b.width, h: b.height };
      };
      const deck = document.querySelector("[data-slot-deck]");
      const well = document.querySelector("[data-gs-well]");
      const spin = document.querySelector(".slot-deck__spin");
      const btns = deck
        ? [...deck.querySelectorAll("button")].map((b) => ({
            n: b.getAttribute("aria-label") || b.className,
            ...rect(b),
          }))
        : [];
      const imgs = [...document.images]
        .filter((i) => i.currentSrc)
        .map((i) => ({ s: i.currentSrc, ok: i.complete && i.naturalWidth > 0 }));
      return {
        vw,
        vh,
        sw: de.scrollWidth,
        sh: de.scrollHeight,
        view: document.querySelector("[data-game-view]")?.getAttribute("data-frame") ?? null,
        deck: rect(deck),
        well: rect(well),
        spin: rect(spin),
        btns,
        imgs,
        tagged: !!well,
        payline: !!deck?.closest("footer"),
      };
    });
    const issues = [];
    if (r.sw > r.vw + 1) issues.push(`horizontal overflow ${r.sw}>${r.vw}`);
    if (r.sh > r.vh + 1) issues.push(`page scrolls vertically ${r.sh}>${r.vh}`);
    if (r.view && !r.deck) issues.push("deck not found");
    if (r.deck) {
      if (r.deck.b > r.vh + 1 || r.deck.r > r.vw + 1 || r.deck.x < -1)
        issues.push("deck outside viewport");
      for (const b of r.btns) {
        if (b.h < 43 && b.n !== "slot-deck__stake")
          issues.push(`touch target ${b.n} ${Math.round(b.w)}x${Math.round(b.h)}`);
        if (b.r > r.vw + 1 || b.b > r.vh + 1 || b.x < -1) issues.push(`control ${b.n} clipped`);
      }
    }
    if (
      r.well &&
      r.deck &&
      r.well.b > r.deck.y + 6 &&
      !(await page.evaluate(() => document.querySelector("[data-deck=orbit]") != null))
    )
      issues.push("board overlaps controls");
    if (r.view && !r.tagged && !r.payline) issues.push("well not tagged by skin hooks");
    const broken = r.imgs.filter((i) => !i.ok);
    if (broken.length)
      issues.push(
        "broken images: " +
          broken
            .slice(0, 2)
            .map((i) => i.s.split("/").slice(-2).join("/"))
            .join(","),
      );
    if (errors.length) issues.push("console: " + errors[0]);
    await page.screenshot({ path: path.join(out, `${g}.${v.name}.png`) });
    report.push({ game: g, view: v.name, issues });
    await page.close();
  }
  await ctx.close();
}
const bad = report.filter((x) => x.issues.length);
fs.writeFileSync(
  path.join(out, "report.json"),
  JSON.stringify(
    { games: games.length, views: VIEWS.map((v) => v.name), checked: report.length, problems: bad },
    null,
    2,
  ),
);
console.log(`captured ${games.length} games x ${VIEWS.length} views; with issues: ${bad.length}`);
for (const p of bad.slice(0, 40)) console.log(p.game, p.view, "|", p.issues.join("; "));
await browser.close();
