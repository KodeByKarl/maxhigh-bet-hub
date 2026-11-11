// Real-UI check that the Buy Bonus dialog price follows the selected bet: raises the bet with the game's own bet control, opens the dialog each time
// and records CURRENT BET and BUY BONUS PRICE. Nothing is purchased. FAILS if the price does not scale with the bet or the dialog is not the approved one.
//   UAT_BASE=http://127.0.0.1:8080 PLAYER=demo_player GAME=wild-panther node scripts/qa/browser-buy-dynamic-price.mjs <evidenceDir>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";
const out = process.argv[2] ?? "buy-dynamic-price"; fs.mkdirSync(out, { recursive: true });
const game = process.env.GAME ?? "wild-panther";
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const c = new Client(); await c.login(process.env.PLAYER ?? "uat_player");
const browser = await chromium.launch({ headless: process.env.HEADED !== "1", executablePath: process.env.PW_CHROME });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: "block" });
await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
const page = await ctx.newPage();
await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
await page.locator(`button:has(img[src$="/${game}.webp"])`).first().click({ timeout: 10000 });
await page.waitForTimeout(700);
await page.getByRole("button", { name: /play now/i }).click({ timeout: 10000 });
await page.waitForSelector(".slot-deck", { timeout: 30000 });
await page.waitForTimeout(2000);
const rows = []; const problems = [];
const money = (t, re) => Number(((re.exec(t) ?? [])[1] ?? "NaN").replace(/,/g, ""));
for (let step = 0; step < 4; step++) {
  await page.getByRole("button", { name: /buy bonus/i }).first().click({ timeout: 10000 });
  await page.waitForTimeout(700);
  const confirm = page.getByRole("button", { name: /confirm buy bonus/i });
  if (!(await confirm.count())) { problems.push(`step ${step}: approved dialog not shown`); break; }
  const dlg = confirm.first().locator("xpath=ancestor::*[.//button[contains(translate(normalize-space(.),'CANEL','canel'),'cancel')] and contains(translate(.,'CURENTB','curentb'),'current bet')][1]");
  const text = (await dlg.innerText()).replace(/\s+/g, " ");
  if (/quantity|buy\s*&\s*play/i.test(text)) problems.push(`step ${step}: old quantity/Buy&Play text in dialog`);
  const bet = money(text, /current bet\s*₱\s*([\d,.]+)/i), price = money(text, /buy bonus price\s*₱\s*([\d,.]+)/i);
  rows.push({ bet, price, ratio: +(price / bet).toFixed(4), freeSpins10: /free spins\s*10\b/i.test(text) });
  await page.screenshot({ path: path.join(out, `${game}-dialog-bet-${bet}.png`) });
  await page.getByRole("button", { name: /^\s*cancel\s*$/i }).first().click();
  await page.waitForTimeout(500);
  // raise the bet with the deck's own control (the "+" next to BET)
  const plus = page.locator(".slot-deck button").filter({ hasText: /^\s*\+\s*$/ }).last();
  const plusAlt = page.locator('.slot-deck button[aria-label*="ncrease" i], .slot-deck button[aria-label*="bet" i][aria-label*="+"]').first();
  const target = (await plus.count()) ? plus : plusAlt;
  if (!(await target.count())) { problems.push("bet increase control not found"); break; }
  await target.click(); await page.waitForTimeout(500);
}
await browser.close();
console.log(JSON.stringify(rows));
const distinct = new Set(rows.map((r) => r.bet));
if (distinct.size < 3) problems.push(`only ${distinct.size} distinct bets reached`);
if (rows.some((r) => !(r.price > 0) || !r.freeSpins10)) problems.push("a dialog lacked a price or FREE SPINS 10");
const unit = rows[0] ? rows[0].price / rows[0].bet : NaN; // displayed prices are rounded, so allow a few centavos
if (rows.some((r) => Math.abs(r.price - r.bet * unit) > 0.05)) problems.push("price is not proportional to the bet: " + rows.map((r) => `${r.bet}->${r.price}`).join(", "));
console.log(problems.length ? "FAIL  " + problems.join("; ") : `PASS  price follows the bet: ${rows.map((r) => `bet ${r.bet} -> price ${r.price}`).join(" | ")}`);
process.exit(problems.length ? 1 : 0);
