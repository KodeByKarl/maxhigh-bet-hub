// Edge-case browser QA for the Buy Bonus on ONE slot (loopback clone only): insufficient balance, double-clicked purchase, refresh in the
// middle of the bonus (session recovery), exactly-once debit and exactly-once payout. Observes only; never changes a result.
//   UAT_BASE=... DB_URL=... GAME=buffalo-reign CONFIRM="buy & play" QTY=10 node scripts/qa/browser-buy-bonus-edge.mjs <evidenceDir>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";

const out = process.argv[2] ?? "buy-bonus-edge";
fs.mkdirSync(out, { recursive: true });
const game = process.env.GAME ?? "wild-panther";
const player = process.env.PLAYER ?? "uat_player";
const confirmBtn = new RegExp(process.env.CONFIRM ?? "^yes$", "i");
const QTY = process.env.QTY ? Number(process.env.QTY) : null;
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const mysql = createRequire(path.resolve("package.json"))("mysql2/promise");
const db = await mysql.createConnection(process.env.DB_URL);
const results = [];
const note = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  [${game}] ${name}${detail ? "  - " + String(detail).slice(0, 170) : ""}`); };
const q = async (sql, p) => (await db.query(sql, p))[0];
const userId = (await q("SELECT id FROM users WHERE username=?", [player]))[0].id;
const bal = async () => Number((await q("SELECT balance b FROM users WHERE id=?", [userId]))[0].b);
const seq0 = async () => Number((await q("SELECT IFNULL(MAX(seq),0) m FROM transactions"))[0].m);
const rowsSince = (s) => q("SELECT type, amount, note FROM transactions WHERE user_id=? AND seq>? ORDER BY seq", [userId, s]);
const c = new Client(); await c.login(player);
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const vp = process.env.VW ? { width: Number(process.env.VW), height: Number(process.env.VH ?? 844) } : { width: 1366, height: 900 };
const ctx = await browser.newContext({ viewport: vp, isMobile: vp.width < 700, hasTouch: vp.width < 700 });
await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));
page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 120)); });

async function openGame() {
  await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
  await page.locator(`button:has(img[src$="/${game}.webp"])`).first().click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /play now/i }).click();
  await page.waitForSelector(".slot-deck", { timeout: 30000 });
  await page.waitForTimeout(2200);
  for (let k = 0; k < 120; k++) {
    const pending = page.locator('button[aria-label^="Free spins complete"]').first();
    if (await pending.count()) { await pending.click().catch(() => undefined); await page.waitForTimeout(800); continue; }
    const modal = page.locator('.fixed.inset-0[class*="z-[150]"]').first();
    if (await modal.count()) { await modal.click({ position: { x: 4, y: 4 }, timeout: 800 }).catch(() => undefined); await page.waitForTimeout(800); continue; }
    const b = page.getByRole("button", { name: /buy bonus/i }).first();
    if ((await b.count()) && (await b.isEnabled().catch(() => false))) return;
    await page.waitForTimeout(1000);
  }
}
async function openBuyDialog() {
  await page.getByRole("button", { name: /buy bonus/i }).first().click();
  await page.waitForTimeout(800);
  if (QTY) {
    const plus = page.locator("button").filter({ hasText: /^\s*\+\s*$/ });
    const qtyPlus = plus.nth((await plus.count()) - 1);
    for (let k = 1; k < QTY; k++) await qtyPlus.click();
    await page.waitForTimeout(700);
  }
}
async function finishBonus(maxMs = 150000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const modal = page.locator('.fixed.inset-0[class*="z-[150]"]').first();
    if (await modal.count()) await modal.click({ position: { x: 4, y: 4 }, timeout: 800 }).catch(() => undefined);
    const sum = page.locator('button[aria-label^="Free spins complete"]').first();
    if (await sum.count()) { const t = (await sum.textContent()) ?? ""; await sum.click().catch(() => undefined); return t.replace(/\s+/g, " "); }
    await page.waitForTimeout(400);
  }
  return null;
}

await q("UPDATE users SET balance=100000 WHERE id=?", [userId]);
await openGame();
const base = await bal();

// ---- 1) insufficient balance: no debit, no session, clear message
await q("UPDATE users SET balance=0.50 WHERE id=?", [userId]);
await page.reload({ waitUntil: "networkidle" });
await openGame().catch(() => undefined);
let s0 = await seq0();
const buyBtn = page.getByRole("button", { name: /buy bonus/i }).first();
const disabledAtLowBalance = (await buyBtn.count()) > 0 && !(await buyBtn.isEnabled().catch(() => true));
let refusedMsg = "";
if (!disabledAtLowBalance) {
  await openBuyDialog().catch(() => undefined);
  await page.getByRole("button", { name: confirmBtn }).first().click().catch(() => undefined);
  await page.waitForTimeout(1500);
  const bodyText = (await page.locator("[data-sonner-toast]").allInnerTexts().catch(() => [])).join(" ") + " " + (await page.locator("body").innerText().catch(() => ""));
  refusedMsg = /insufficient[^.]{0,40}/i.exec(bodyText)?.[0] ?? "";
}
const lowRows = await rowsSince(s0);
note("insufficient balance: purchase is blocked (button disabled or a clear message)", disabledAtLowBalance || /insufficient/i.test(refusedMsg), disabledAtLowBalance ? "Buy Bonus disabled" : refusedMsg);
note("insufficient balance: nothing was debited and no bonus session was opened", lowRows.length === 0 && (await q("SELECT COUNT(*) n FROM play_sessions WHERE user_id=? AND status='open'", [userId]))[0].n === 0, `${lowRows.length} ledger rows`);
await q("UPDATE users SET balance=100000 WHERE id=?", [userId]);

// ---- 2) double-clicked confirm: exactly one purchase
await page.reload({ waitUntil: "networkidle" });
await openGame();
s0 = await seq0();
let b0 = await bal();
await openBuyDialog();
const confirm = page.getByRole("button", { name: confirmBtn }).first();
await Promise.allSettled([confirm.click({ timeout: 2000 }), confirm.click({ timeout: 2000, force: true }), confirm.dblclick({ timeout: 2000, force: true })]);
await page.waitForTimeout(2500);
const debitsEarly = (await rowsSince(s0)).filter((r) => r.type === "bet" && Number(r.amount) < 0);
note("double/triple-clicked confirm: exactly ONE purchase debit", debitsEarly.length === 1, debitsEarly.map((r) => r.amount).join(","));
const openSessions = (await q("SELECT COUNT(*) n FROM play_sessions WHERE user_id=? AND status='open'", [userId]))[0].n;
note("double-clicked confirm: exactly ONE open bonus session", openSessions === 1, `${openSessions}`);

// recover from scenario 2 with a reload (this alone exercises session recovery), then run scenario 3 on a CLEAN single-click purchase
await page.reload({ waitUntil: "networkidle" });
await openGame();
await q("UPDATE users SET balance=100000 WHERE id=?", [userId]);
s0 = await seq0();
b0 = await bal();
await openBuyDialog();
await page.getByRole("button", { name: confirmBtn }).first().click();

// ---- 3) refresh in the middle of the bonus: the server session resumes; payout credited once
let sawMid = false, lastCnt = null;
for (let k = 0; k < 900 && !sawMid; k++) {
  const cnt = await page.evaluate(() => document.querySelector("[data-fs-counter]")?.getAttribute("data-fs-counter") ?? null).catch(() => null);
  const modal = page.locator('.fixed.inset-0[class*="z-[150]"]').first();
  if (await modal.count()) await modal.click({ position: { x: 4, y: 4 }, timeout: 800 }).catch(() => undefined);
  if (cnt) lastCnt = cnt;
  if (cnt && Number(cnt.split("/")[0]) >= 3) { sawMid = true; await page.screenshot({ path: path.join(out, `${game}-before-refresh.png`) }); }
  await page.waitForTimeout(150);
}
note("refresh test starts genuinely mid-bonus (counter reached 3 or more before the refresh)", sawMid, `last counter ${lastCnt}`);
const leftBefore = (await q("SELECT free_spins_left l, fs_spins_played p FROM play_sessions WHERE user_id=? AND status='open'", [userId]))[0];
await page.reload({ waitUntil: "networkidle" });
await page.locator(`button:has(img[src$="/${game}.webp"])`).first().click().catch(() => undefined);
await page.waitForTimeout(800);
await page.getByRole("button", { name: /play now/i }).click().catch(() => undefined);
await page.waitForSelector(".slot-deck", { timeout: 30000 }).catch(() => undefined);
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, `${game}-after-refresh.png`) });
const resumedCounter = await page.evaluate(() => document.querySelector("[data-fs-counter]")?.getAttribute("data-fs-counter") ?? null).catch(() => null);
note("refresh mid-bonus: the bonus session is still open on the server with spins left", !!leftBefore && Number(leftBefore.l) > 0, JSON.stringify(leftBefore));
const summary = await finishBonus();
note("refresh mid-bonus: the free spins resume and finish with a Total Bonus Win summary", !!summary && /won|win/i.test(summary), (summary ?? "no summary").slice(0, 110));
const rows = await rowsSince(s0);
const debits = rows.filter((r) => Number(r.amount) < 0), wins = rows.filter((r) => r.type === "win");
note("exactly-once money: ONE purchase debit and the payout credited ONCE across the refresh", debits.length === 1 && wins.length <= 1, `${debits.length} debit(s), ${wins.length} win row(s)`);
const b1 = await bal();
note("wallet equals start - price + payout", Math.abs(b1 - (b0 + rows.reduce((a, r) => a + Number(r.amount), 0))) < 0.011, `${b0} -> ${b1}`);
note("no open session remains and the base game is back", (await q("SELECT COUNT(*) n FROM play_sessions WHERE user_id=? AND status='open'", [userId]))[0].n === 0);
note("no browser console/page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await db.end();
await browser.close();
fs.writeFileSync(path.join(out, `${game}-edge.json`), JSON.stringify({ at: new Date().toISOString(), game, viewport: vp, resumedCounter, results }, null, 1));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
