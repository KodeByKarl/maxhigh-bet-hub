// In-game mobile layout audit on a LOOPBACK app: opens representative games at phone sizes with EMULATED safe-area insets
// (CDP Emulation.setSafeAreaInsetsOverride) and reports STATIC controls that sit inside the system-UI zones, horizontal overflow,
// undersized touch targets and console errors. Controls whose position changes between two samples (e.g. swimming fish) are
// reported separately as "moving" and are not judged. Emulation only: a physical Android device is still required for sign-off.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";

const out = process.argv[2] ?? "ingame-mobile";
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const GAMES = (process.env.IG_GAMES ?? "Golden Panther|slots,Wild Panther|slots,Color Game|cards,Baccarat|cards,Deep Bass|fishing,Abyssal Pearls|slots").split(",").map((s) => s.split("|"));
const ALL_VIEWPORTS = [["320x640", { width: 320, height: 640 }, 2], ["360x780-portrait", { width: 360, height: 780 }, 2.75], ["412x915-portrait", { width: 412, height: 915 }, 2.6], ["667x375-landscape", { width: 667, height: 375 }, 2], ["780x360-landscape", { width: 780, height: 360 }, 2.75], ["915x412-landscape", { width: 915, height: 412 }, 2.6]];
const VIEWPORTS = process.env.IG_ONLY ? ALL_VIEWPORTS.filter((v) => v[0].includes(process.env.IG_ONLY)) : ALL_VIEWPORTS;
const INSET = { top: 28, bottom: 34, left: 0, right: 0 }; const INSET_LAND = { top: 0, bottom: 21, left: 40, right: 40 };
const c = new Client(); await c.login(process.env.BR_USER ?? "uat_player5");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const rows = [];

const collect = () => {
  const root = document.querySelector('[role="dialog"][aria-label$=" game"]');
  if (!root) return null;
  const vw = innerWidth, vh = innerHeight, list = [];
  [...root.querySelectorAll("button,[role=button],a[href],input,select")].forEach((el, i) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") return;
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return;
    list.push({ i, label: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 24), l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height });
  });
  return { vw, vh, list, hScroll: document.documentElement.scrollWidth > vw + 2 };
};

for (const [vname, vp, dpr] of VIEWPORTS) {
  const land = vp.width > vp.height; const inset = land ? INSET_LAND : INSET;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
  for (const [game, route] of GAMES) {
    const page = await ctx.newPage(); const errs = [];
    page.on("pageerror", (e) => errs.push(e.message.slice(0, 80)));
    let insetOk = true;
    try { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: inset }); } catch { insetOk = false; }
    await page.goto(`${BASE}/${route}`, { waitUntil: "networkidle" }).catch(() => {});
    let opened = false;
    try {
      await page.getByRole("button", { name: `Play ${game}` }).first().click({ timeout: 6000 });
      await page.getByRole("button", { name: /play now/i }).first().click({ timeout: 6000 });
      await page.waitForTimeout(6000); opened = (await page.getByRole("dialog", { name: new RegExp(`${game} game`, "i") }).count()) > 0;
    } catch { /* recorded below */ }
    const a = await page.evaluate(collect); await page.waitForTimeout(450); const b = await page.evaluate(collect);
    const hit = [], small = new Set(); let moving = 0;
    if (a && b) for (const e of a.list) {
      const f = b.list.find((x) => x.i === e.i);
      if (!f || Math.abs(f.l - e.l) > 2 || Math.abs(f.t - e.t) > 2) { moving++; continue; }
      if (e.b > a.vh - inset.bottom + 1 && e.t < a.vh) hit.push(`${e.label} (bottom zone, ${Math.round(e.b - (a.vh - inset.bottom))}px in)`);
      if (!land && e.t < inset.top - 1 && e.b > 0) hit.push(`${e.label} (top zone)`);
      if (land && (e.l < inset.left - 1 || e.r > a.vw - inset.right + 1)) hit.push(`${e.label} (side cutout)`);
      if (e.w < 28 || e.h < 28) small.add(e.label);
    }
    rows.push({ viewport: vname, game, opened, insetEmulated: insetOk, hScroll: !!a?.hScroll, controlsInSystemZones: [...new Set(hit)].slice(0, 6), smallTargets: small.size, movingTargetsNotJudged: moving, errors: errs.length });
    if (vname === "360x780-portrait") await page.screenshot({ path: path.join(out, `${game.replace(/\W+/g, "-")}-360.png`) });
    await page.close();
  }
  await ctx.close();
}
await browser.close(); await c.logout().catch(() => {});
fs.writeFileSync(path.join(out, "ingame-mobile-results.json"), JSON.stringify(rows, null, 1));
for (const r of rows) console.log(`${r.viewport.padEnd(18)} ${r.game.padEnd(16)} opened=${r.opened} hScroll=${r.hScroll} sysZone=${r.controlsInSystemZones.length ? r.controlsInSystemZones.join("; ") : "-"} small=${r.smallTargets} moving=${r.movingTargetsNotJudged} err=${r.errors}${r.insetEmulated ? "" : " (inset emulation unavailable)"}`);
console.log(`\n${rows.length} game/viewport checks; static controls in system zones: ${rows.filter((r) => r.controlsInSystemZones.length).length}; hScroll: ${rows.filter((r) => r.hScroll).length}; not opened: ${rows.filter((r) => !r.opened).length}`);
