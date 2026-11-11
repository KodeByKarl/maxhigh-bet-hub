// Opens the REAL Buy Bonus dialog of EVERY buy-enabled game in the COMPILED app (loopback clone) and inspects the rendered DOM.
// A game whose dialog cannot be opened or read is a FAILURE (never a silent pass), so "0 old modals" can only be reported when 80/80 dialogs were
// actually seen and each one was inspected.
//   UAT_BASE=http://127.0.0.1:18081 node scripts/qa/browser-buy-dialog-all.mjs <evidenceDir> [gameId ...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { Client, BASE } from "./uat-client.mjs";

const out = process.argv[2] ?? "buy-dialog-all";
fs.mkdirSync(out, { recursive: true });
const only = process.argv.slice(3);
const games = only.length ? only : execFileSync(process.execPath, ["scripts/qa/list-buy-games.mjs"], { encoding: "utf8" }).trim().split(/\r?\n/);
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const c = new Client(); await c.login(process.env.PLAYER ?? "uat_player");
const browser = await chromium.launch({ headless: process.env.HEADED !== "1", executablePath: process.env.PW_CHROME });
const ctx = await browser.newContext({ viewport: { width: Number(process.env.VW ?? 1366), height: Number(process.env.VH ?? 900) }, serviceWorkers: "block" });
await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
const rows = [];
for (const game of games) {
  const r = { game, opened: false, problems: [] };
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
    await page.locator(`button:has(img[src$="/${game}.webp"])`).first().click({ timeout: 10000 });
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: /play now/i }).click({ timeout: 10000 });
    await page.waitForSelector(".slot-deck", { timeout: 30000 });
    await page.waitForTimeout(1500);
    for (let k = 0; k < 60; k++) { // dismiss a recovered bonus from an earlier run, if any
      const pending = page.locator('button[aria-label^="Free spins complete"]').first();
      if (await pending.count()) { await pending.click().catch(() => undefined); await page.waitForTimeout(600); continue; }
      const b = page.getByRole("button", { name: /buy bonus/i }).first();
      if ((await b.count()) && (await b.isEnabled().catch(() => false))) break;
      await page.waitForTimeout(1000);
    }
    await page.getByRole("button", { name: /buy bonus/i }).first().click({ timeout: 10000 });
    await page.waitForTimeout(900);
    const confirm = page.getByRole("button", { name: /confirm buy bonus/i });
    r.opened = (await confirm.count()) > 0;
    const dlg = r.opened ? confirm.first().locator("xpath=ancestor::*[.//button[contains(translate(normalize-space(.),'CANEL','canel'),'cancel')] and contains(translate(.,'CURENTB','curentb'),'current bet')][1]") : page.locator("body");
    const text = (await dlg.innerText()).replace(/\s+/g, " ");
    const html = await dlg.innerHTML();
    r.text = text.slice(0, 220);
    const buttons = await dlg.locator("button").allInnerTexts();
    if (!r.opened) r.problems.push("CONFIRM BUY BONUS button not found (dialog not the approved one / not opened)");
    if (/quantity|qty/i.test(text) || /quantity|qty/i.test(html)) r.problems.push("quantity selector text/markup present");
    if (/buy\s*(&|&amp;|and)\s*play/i.test(text)) r.problems.push("old BUY & PLAY button present");
    if (buttons.some((b) => /^\s*[+−–-]\s*$/.test(b)) || (await dlg.locator('input[type="number"], input[type="range"], [role="spinbutton"], [role="slider"]').count()) > 0) r.problems.push("stepper / numeric input present");
    if (/total price|per spin|price per/i.test(text)) r.problems.push("separate per-spin / total price rows present");
    for (const [re, label] of [[/current bet\s*₱\s*[\d,.]+/i, "CURRENT BET ₱x"], [/free spins\s*10\b/i, "FREE SPINS 10"], [/buy bonus price\s*₱\s*[\d,.]+/i, "BUY BONUS PRICE ₱x"], [/cancel/i, "CANCEL"]])
      if (!re.test(text)) r.problems.push("missing " + label);
    await page.screenshot({ path: path.join(out, `${game}.png`) });
  } catch (e) { r.problems.push("could not inspect: " + String(e.message).split("\n")[0].slice(0, 140)); await page.screenshot({ path: path.join(out, `${game}-ERROR.png`) }).catch(() => undefined); }
  await page.close();
  r.pass = r.opened && r.problems.length === 0;
  rows.push(r);
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${game}${r.problems.length ? "  - " + r.problems.join("; ") : "  - " + r.text.slice(0, 110)}`);
}
await browser.close();
const passed = rows.filter((r) => r.pass).length;
fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ base: BASE, total: rows.length, passed, rows }, null, 1));
console.log(`\nDIALOGS OPENED+INSPECTED: ${rows.filter((r) => r.opened).length}/${rows.length}; PASSED: ${passed}/${rows.length}`);
process.exit(passed === rows.length && rows.length > 0 ? 0 : 1);
