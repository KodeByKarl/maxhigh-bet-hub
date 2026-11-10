// Mobile-width audit on a LOOPBACK app: horizontal overflow, clipped fixed elements, tiny touch targets, console errors.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";
const out = process.argv[2] ?? "widths";
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const c = new Client(); await c.login(process.env.BR_USER ?? "uat_player5");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const rows = [];
const profiles = [[320, 640, 2], [360, 780, 2.75], [390, 844, 3], [412, 915, 2.6], [430, 932, 3], [915, 412, 2.6], [800, 1280, 2]];
for (const [w, h, dpr] of profiles) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
  for (const route of ["/", "/slots", "/fishing", "/cards", "/support"]) {
    const page = await ctx.newPage(); const errs = [];
    page.on("pageerror", (e) => errs.push(e.message.slice(0, 80)));
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const vw = window.innerWidth; const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        if (r.width === 0 || cs.visibility === "hidden" || cs.display === "none") continue;
        if (r.right > vw + 2 && cs.position !== "absolute" && !el.closest("[class*=overflow-x-auto],[class*=overflow-hidden],[class*=snap-x]")) bad.push((el.tagName + "." + String(el.className).slice(0, 40)).slice(0, 60));
      }
      const small = [...document.querySelectorAll("button,a[href],[role=button]")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32); }).length;
      return { scrollW: document.documentElement.scrollWidth, vw, hScroll: document.documentElement.scrollWidth > vw + 2, overflowing: bad.slice(0, 3), overflowCount: bad.length, smallTargets: small };
    });
    rows.push({ w, h, route, ...m, errors: errs.length });
    await page.close();
  }
  await ctx.close();
}
await browser.close(); await c.logout().catch(() => {});
fs.writeFileSync(path.join(out, "mobile-width-audit.json"), JSON.stringify(rows, null, 1));
const bad = rows.filter((r) => r.hScroll || r.errors);
for (const r of rows) console.log(`${r.w}x${r.h} ${r.route.padEnd(9)} hScroll=${r.hScroll} overflow=${r.overflowCount} smallTargets(<32px)=${r.smallTargets} errors=${r.errors}${r.overflowing.length ? " e.g. " + r.overflowing[0] : ""}`);
console.log(`\n${rows.length} page/viewport checks, ${bad.length} with horizontal scroll or errors`);
