// Functional mobile-first layout check for ALL game pages (NO screenshots): DOM measurements, overflow, touch targets,
// control overlap, spin prominence, images, console errors. Uses the stubbed harness (no wallet / server / DB).
//   PW_MODULE_DIR=<dir with node_modules/playwright-core> PW_CHROME=<chrome.exe> HARNESS=http://127.0.0.1:5210 \
//   node scripts/qa/check-mobile-layout.mjs [id,id|all] [views=360x640,...] [out.json]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { GUARDED_CONTEXT_OPTIONS, installReadOnlyGuard } from "./lib/readonly-guard.mjs";

const which = process.argv[2] ?? "all";
const viewArg =
  process.argv[3] ?? "360x640,375x667,390x844,393x852,430x932,844x390,1366x768,1920x1080";
const outFile = process.argv[4];
const base = process.env.HARNESS ?? "http://127.0.0.1:5210";
const { chromium } = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"))(
  "playwright-core",
);
const VIEWS = viewArg.split(",").map((s) => {
  const [w, h] = s.split("x").map(Number);
  const mobile = w <= 900;
  return {
    name: s,
    mobile,
    portrait: h > w,
    viewport: { width: w, height: h },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: mobile ? 2 : 1,
  };
});

const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
// Read-only: only GET page/asset requests are allowed; any server function call is refused (empty id table = default deny).
const guardOpts = {
  origins: [new URL(base).origin],
  idToName: new Map(),
  readNames: new Set(),
  allowWebSocketHosts: [new URL(base).host], // local harness hot-reload socket only
};
const guards = [];
const probeCtx = await browser.newContext({ ...GUARDED_CONTEXT_OPTIONS });
guards.push(await installReadOnlyGuard(probeCtx, guardOpts));
const probe = await probeCtx.newPage();
await probe.goto(base);
await probe.waitForFunction(() => window.__games);
const allGames = await probe.evaluate(() => window.__games());
const games = which === "all" ? allGames : which.split(",");

function measure() {
  const de = document.documentElement;
  const R = (el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, r: b.right, b: b.bottom, w: b.width, h: b.height };
  };
  const vis = (el) => {
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return cs.display !== "none" && cs.visibility !== "hidden" && b.width > 0 && b.height > 0;
  };
  const deck = document.querySelector("[data-slot-deck]");
  const spin = document.querySelector(".slot-deck__spin");
  const well = document.querySelector("[data-gs-well]");
  const btns = deck
    ? [...deck.querySelectorAll("button")].filter(vis).map((b) => ({
        n: b.getAttribute("aria-label") || b.className,
        stake: b.classList.contains("slot-deck__stake"),
        isSpin: b.classList.contains("slot-deck__spin"),
        ...R(b),
      }))
    : [];
  const inScroller = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if ((ox === "auto" || ox === "scroll") && a.scrollWidth > a.clientWidth) return true;
    }
    return false;
  };
  const all = [...document.querySelectorAll("button, [role=button], a[href], input, select")]
    .filter((e) => vis(e) && !inScroller(e))
    .map((b) => ({
      n: (b.getAttribute("aria-label") || b.textContent || b.className || b.tagName)
        .toString()
        .trim()
        .slice(0, 28),
      ...R(b),
    }));
  return {
    vw: innerWidth,
    vh: innerHeight,
    sw: de.scrollWidth,
    sh: de.scrollHeight,
    bodySw: document.body.scrollWidth,
    slot: !!document.querySelector("[data-game-view]"),
    table: !!document.querySelector("[data-table-view]"),
    deck: deck ? R(deck) : null,
    well: well ? R(well) : null,
    spin: spin ? R(spin) : null,
    hasMeters:
      !!deck?.querySelector(".slot-deck__balance") && !!deck?.querySelector(".slot-deck__win"),
    hasBet: !!deck?.querySelector(".slot-deck__stake"),
    hasTurbo: !!deck?.querySelector(".slot-deck__turbo"),
    hasAuto: !!deck?.querySelector(".slot-deck__auto"),
    orbit: !!document.querySelector("[data-deck=orbit]"),
    btns,
    all,
    imgs: [...document.images]
      .filter((i) => i.currentSrc)
      .map((i) => ({ s: i.currentSrc, ok: i.complete && i.naturalWidth > 0 })),
  };
}

const report = [];
for (const v of VIEWS) {
  const ctx = await browser.newContext({
    viewport: v.viewport,
    isMobile: v.isMobile,
    hasTouch: v.hasTouch,
    deviceScaleFactor: v.deviceScaleFactor,
    ...GUARDED_CONTEXT_OPTIONS,
  });
  guards.push(await installReadOnlyGuard(ctx, guardOpts));
  for (const g of games) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 160)));
    page.on("console", (m) => {
      if (m.type() === "error" && !/qa stub|Failed to load resource|net::ERR|404/.test(m.text()))
        errors.push(m.text().slice(0, 160));
    });
    await page.goto(`${base}/?game=${g}`);
    await page
      .waitForSelector("[data-game-view], [data-table-view], [data-harness-game] *", {
        timeout: 20000,
      })
      .catch(() => {});
    let m;
    try {
      await page.waitForTimeout(1800);
      m = await page.evaluate(measure);
    } catch (e) {
      report.push({
        game: g,
        view: v.name,
        kind: "crash",
        spin: null,
        issues: ["page crashed: " + String(e).slice(0, 80)],
      });
      await page.close().catch(() => {});
      continue;
    }
    const issues = [];
    if (m.sw > m.vw + 1 || m.bodySw > m.vw + 1) issues.push(`horizontal overflow ${m.sw}>${m.vw}`);
    if (m.sh > m.vh + 1) issues.push(`page scrolls vertically ${m.sh}>${m.vh}`);
    if (m.slot && !m.deck) issues.push("slot has no control deck");
    if (m.deck) {
      if (m.deck.b > m.vh + 1 || m.deck.r > m.vw + 1 || m.deck.x < -1)
        issues.push("deck outside viewport");
      if (!m.hasMeters) issues.push("balance/win meters missing");
      if (!m.hasBet) issues.push("bet display missing");
      if (!m.hasTurbo || !m.hasAuto) issues.push("turbo/auto missing");
      const minTouch = v.mobile ? 44 : 30;
      for (const b of m.btns) {
        if (!b.stake && (b.h < minTouch - 1 || b.w < minTouch - 1))
          issues.push(`touch target ${b.n} ${Math.round(b.w)}x${Math.round(b.h)}`);
        if (b.r > m.vw + 1 || b.b > m.vh + 1 || b.x < -1 || b.y < -1)
          issues.push(`control ${b.n} clipped`);
      }
      for (let i = 0; i < m.btns.length; i++)
        for (let j = i + 1; j < m.btns.length; j++) {
          const a = m.btns[i];
          const c = m.btns[j];
          const ox = Math.min(a.r, c.r) - Math.max(a.x, c.x);
          const oy = Math.min(a.b, c.b) - Math.max(a.y, c.y);
          if (ox > 3 && oy > 3) issues.push(`overlap ${a.n} / ${c.n}`);
        }
      if (m.spin) {
        const area = (b) => b.w * b.h;
        const maxOther = Math.max(0, ...m.btns.filter((b) => !b.isSpin).map(area));
        if (v.mobile && v.portrait && Math.min(m.spin.w, m.spin.h) < 60)
          issues.push(`spin too small ${Math.round(m.spin.w)}x${Math.round(m.spin.h)}`);
        if (area(m.spin) < maxOther * 0.95) issues.push("spin is not the largest control");
      }
      if (m.well && m.well.b > m.deck.y + 6 && !m.orbit) issues.push("board overlaps controls");
      if (v.mobile && v.portrait && m.well && m.well.w < m.vw * 0.9 && m.well.h < m.vh * 0.15)
        issues.push(`reel area small ${Math.round(m.well.h)}px`);
    } else if (!m.slot) {
      for (const b of m.all) {
        if (b.r > m.vw + 2 && b.x < m.vw) issues.push(`control "${b.n}" clipped right`);
      }
    }
    const broken = m.imgs.filter((i) => !i.ok);
    if (broken.length)
      issues.push(
        "broken images: " +
          broken
            .slice(0, 2)
            .map((i) => i.s.split("/").slice(-2).join("/"))
            .join(","),
      );
    if (errors.length) issues.push("console: " + errors[0]);
    report.push({
      game: g,
      view: v.name,
      kind: m.slot ? "slot" : m.table ? "table" : "other",
      spin: m.spin ? [Math.round(m.spin.w), Math.round(m.spin.h)] : null,
      issues,
    });
    await page.close();
  }
  guards[guards.length - 1].assertNothingMutating();
  await ctx.close();
}
const guardReport = guards.reduce(
  (a, g) => ({ blocked: a.blocked + g.blocked.length, leaked: a.leaked + g.leaked.length }),
  { blocked: 0, leaked: 0 },
);
if (guardReport.leaked)
  throw new Error("read-only guard leaked " + guardReport.leaked + " mutating request(s)");
const bad = report.filter((x) => x.issues.length);
const summary = {
  games: games.length,
  views: VIEWS.map((v) => v.name),
  checked: report.length,
  withIssues: bad.length,
  readOnlyGuard: guardReport,
  problems: bad,
  all: report,
};
if (outFile) fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
console.log(
  `checked ${games.length} games x ${VIEWS.length} views = ${report.length}; with issues: ${bad.length}`,
);
const tally = {};
for (const p of bad)
  for (const i of p.issues) {
    const k = i.replace(/[0-9]+/g, "N").slice(0, 70);
    tally[k] = (tally[k] ?? 0) + 1;
  }
console.log(JSON.stringify(tally, null, 1));
for (const p of bad.slice(0, 30)) console.log(p.game, p.view, "|", p.issues.slice(0, 3).join("; "));
await browser.close();
