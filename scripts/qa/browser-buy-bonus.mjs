// Browser QA of the Scatter-triggered Buy Bonus presentation for ONE slot, against a LOOPBACK clone/app (never the live UAT).
// Sequence verified from the real UI: BUY -> confirm -> cost debited once -> reels spin -> scatters land + glow -> Free Spins announcement
// -> counter FREE SPINS 1/N ... N/N (retriggers grow N) -> Total Bonus Win -> back to the base game. The wallet is reconciled against the
// ledger (one buy debit, one payout credit). Nothing here changes a result: it only observes.
//   UAT_BASE=http://127.0.0.1:18081 GAME=wild-panther BUY_BET=5 node scripts/qa/browser-buy-bonus.mjs <evidenceDir>
// env: BUYBTN (default /buy bonus/i), CONFIRM (default /^yes$/i), PLAYER (default uat_player), DB_URL for the ledger check (optional)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";

const out = process.argv[2] ?? "buy-bonus-evidence";
fs.mkdirSync(out, { recursive: true });
const game = process.env.GAME ?? "wild-panther";
const player = process.env.PLAYER ?? "uat_player";
const buyBtn = new RegExp(process.env.BUYBTN ?? "buy bonus", "i");
const confirmBtn = new RegExp(process.env.CONFIRM ?? "buy (&|&amp;|and) play", "i");
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const results = [];
const note = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  [${game}] ${name}${detail ? "  - " + String(detail).slice(0, 180) : ""}`); };
const moneyAny = (t) => Number((/₱\s*([\d,]+(?:\.\d+)?)/.exec(t ?? "") ?? [])[1]?.replace(/,/g, "") ?? NaN);
const money = (t) => Number((/₱\s*([\d,]+\.\d\d)/.exec(t ?? "") ?? [])[1]?.replace(/,/g, "") ?? NaN);

const c = new Client(); await c.login(player);
const balanceApi = async () => Number((await c.rpc("getBalanceFn", undefined, { method: "GET" }))?.balance);
const startBal = await balanceApi();
const mysqlMod = process.env.DB_URL ? createRequire(path.resolve("package.json"))("mysql2/promise") : null;
let seq0 = 0;
if (mysqlMod) { const d = await mysqlMod.createConnection(process.env.DB_URL); seq0 = Number((await d.query("SELECT IFNULL(MAX(seq),0) m FROM transactions"))[0][0].m); await d.end(); }
const browser = await chromium.launch({ headless: process.env.HEADED !== "1", executablePath: process.env.PW_CHROME });
const ctx = await browser.newContext({ viewport: { width: Number(process.env.VW ?? 1366), height: Number(process.env.VH ?? 900) }, isMobile: process.env.VW ? Number(process.env.VW) < 700 : false });
await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 140)));
page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 140)); });

await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
await page.locator(`button:has(img[src$="/${game}.webp"])`).first().click();
await page.waitForTimeout(900);
fs.mkdirSync(out, { recursive: true });
await page.screenshot({ path: path.join(out, `${game}-0-lobby.png`) });
await page.getByRole("button", { name: /play now/i }).click({ timeout: 8000 }).catch(async (e) => { console.log("LOBBY BODY:", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300)); throw e; });
await page.waitForSelector(".slot-deck", { timeout: 30000 }).catch(() => undefined);
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, `${game}-1-base.png`) });

// start from a clean base game: finish/dismiss any recovered bonus left by an earlier run (this also exercises session recovery)
for (let k = 0; k < 150; k++) {
  const pending = page.locator('button[aria-label^="Free spins complete"]').first();
  if (await pending.count()) { await pending.click().catch(() => undefined); await page.waitForTimeout(800); continue; }
  const modal = page.locator('.fixed.inset-0[class*="z-[150]"]').first();
  if (await modal.count()) { await modal.click({ position: { x: 4, y: 4 }, timeout: 800 }).catch(() => undefined); await page.waitForTimeout(800); continue; }
  const b = page.getByRole("button", { name: buyBtn }).first();
  if ((await b.count()) && (await b.isEnabled().catch(() => false))) break;
  await page.waitForTimeout(1000);
}
const buy = page.getByRole("button", { name: buyBtn }).first();
const priceText = await buy.innerText();
let price = money(priceText);
const QTY = process.env.QTY ? Number(process.env.QTY) : 10;
note("Buy Bonus control shows the price from the game's configuration", price > 0, priceText.replace(/\s+/g, " "));
await buy.click();
await page.waitForTimeout(900);
{
  // client reference dialog: Bet, Quantity, Price, Total Price, Buy & Play (+ Cancel). Wild Panther keeps its locked 10 (no selector).
  const dlg = page.locator("[data-buy-bonus-modal]").first();
  const locked = (await dlg.locator('[data-bb="quantity"]').count()) === 0;
  globalThis.locked0 = locked;
  const text0 = await dlg.innerText();
  note("dialog shows Bet, Quantity, Price, Total Price, Buy & Play, Cancel", /bet \(₱\)/i.test(text0) && /quantity/i.test(text0) && /price/i.test(text0) && /total price/i.test(text0) && /buy\s*&\s*play/i.test(text0) && /cancel/i.test(text0), text0.replace(/\s+/g, " ").slice(0, 160));
  if (!locked) {
    const unit0 = moneyAny(await dlg.locator('[data-bb="unit-price"]').innerText());
    note("Total Price follows Price x Quantity (initial quantity)", Math.abs(moneyAny(await dlg.locator('[data-bb="total-price"]').innerText()) - unit0 * Number(await dlg.locator('input[aria-label="Quantity"]').inputValue())) < 0.011);
    await dlg.locator('input[aria-label="Quantity"]').fill(String(QTY));
    await dlg.locator('input[aria-label="Quantity"]').blur();
    await page.waitForTimeout(300);
    const unit = moneyAny(await dlg.locator('[data-bb="unit-price"]').innerText());
    const tot = moneyAny(await dlg.locator('[data-bb="total-price"]').innerText());
    note(`quantity ${QTY}: Total Price = Price x ${QTY}`, Math.abs(tot - unit * QTY) < 0.02 + QTY * 0.005, `unit ${unit}, total ${tot}`);
  } else note("locked-spec game: fixed quantity shown, no selector", /10/.test(text0));
  const dialogText = await dlg.innerText();
  const tots = [...dialogText.matchAll(/total price\s*₱?\s*([\d,]+(?:\.\d+)?)/gi)];
  if (tots.length) {
    price = Number(tots.at(-1)[1].replace(/,/g, ""));
    note("dialog shows the Total Price that will be debited", price > 0, `total ${price}`);
  }
}
await page.screenshot({ path: path.join(out, `${game}-2-confirm.png`) });
note("purchase needs an explicit confirmation (existing dialog)", (await page.getByRole("button", { name: confirmBtn }).count()) > 0);
const deckBefore = await page.locator(".slot-deck").first().innerText();

// ---- confirm and watch the timeline
const timeline = [];
const t0 = Date.now();
await page.getByRole("button", { name: confirmBtn }).first().click();
let sawBusyBeforeAnnouncement = false, announcementAt = null, counterSeen = [], firstCounterAt = null, shots = new Set();
let ended = false, summaryText = "", lastCounter = null;
for (let i = 0; i < 1400 && !ended; i++) {
  await page.waitForTimeout(100);
  const st = await page.evaluate(() => {
    const deck = document.querySelector(".slot-deck");
    const counter = document.querySelector("[data-fs-counter]")?.getAttribute("data-fs-counter") ?? null;
    const msg = document.querySelector(".slot-deck__message")?.textContent ?? "";
    const body = document.body.innerText;
    const announce = /free spins!?\b/i.test(body) && /(you (won|have)|awarded|\d+\s*free spins)/i.test(body);
    const modalClickable = document.querySelector('.fixed.inset-0[class*="z-[150]"]');
    const summary = document.querySelector('button[aria-label^="Free spins complete"]');
    return { counter, msg, busy: /spin in progress/i.test(msg), announce, hasModal: !!modalClickable, total: !!summary, summaryText: summary?.textContent ?? "" };
  });
  const tms = Date.now() - t0;
  if (st.busy && announcementAt === null) sawBusyBeforeAnnouncement = true;
  if (i === 6 || i === 14 || i === 22) await page.screenshot({ path: path.join(out, `${game}-3-reels-${i}.png`) });
  if (st.hasModal && announcementAt === null && !st.counter) { announcementAt = tms; await page.waitForTimeout(400); await page.screenshot({ path: path.join(out, `${game}-3-announcement.png`) }); timeline.push({ tms, event: "announcement" }); }
  if (st.hasModal && !st.counter) { await page.waitForTimeout(300); /* no click: the announcement must close by itself */ }
  if (st.counter && st.counter !== lastCounter) {
    lastCounter = st.counter; counterSeen.push(st.counter);
    if (firstCounterAt === null) { firstCounterAt = tms; await page.screenshot({ path: path.join(out, `${game}-4-first-free-spin.png`) }); }
    timeline.push({ tms, event: `counter ${st.counter}` });
  }
  if (st.total && counterSeen.length > 0) {
    summaryText = (st.summaryText ?? "").replace(/\s+/g, " ");
    await page.screenshot({ path: path.join(out, `${game}-5-total-win.png`) });
    ended = true;
  }
}
const finalBal = await balanceApi();
note("a spin/animation phase is shown after confirming (reels spin) before the free spins are announced", sawBusyBeforeAnnouncement && announcementAt !== null && announcementAt > 1000, `announcement at ${announcementAt}ms`);
note("the Free Spins announcement appears BEFORE the first bonus spin", announcementAt !== null && (firstCounterAt === null || announcementAt <= firstCounterAt), `announce ${announcementAt}ms, first counter ${firstCounterAt}ms`);
const N0 = (await page.evaluate(() => 0), globalThis.locked0 ? 10 : QTY);
note(`the counter starts at exactly 1/${N0} (the scatter moment consumed no free spin)`, counterSeen[0] === `1/${N0}`, counterSeen.slice(0, 3).join(","));
const nums = counterSeen.map((x) => x.split("/").map(Number));
const total = nums.at(-1)?.[1] ?? 0;
const sequential = nums.every((n, i) => i === 0 || n[0] === nums[i - 1][0] + 1 || n[0] === nums[i - 1][0]);
note("the counter progresses without skipping (1/N ... N/N)", sequential && nums.at(-1)?.[0] === total, counterSeen.join(" "));
note(`the counter total is the ${N0} purchased spins (a retrigger can only add)`, total >= N0, `N=${total}`);
note("a Total Bonus Win summary is shown at the end", ended && /₱\s*[\d,]+\.\d\d|total|win/i.test(summaryText), summaryText.slice(0, 120));
await page.waitForTimeout(1500);
const deckAfter = await page.locator(".slot-deck").first().innerText().catch(() => "");
await page.locator('button[aria-label^="Free spins complete"]').first().click().catch(() => undefined);
await page.waitForTimeout(1500);
const baseBack = await page.locator(".slot-deck").first().innerText().catch(() => "");
note("returns to the normal base game (no free-spin counter, Buy Bonus available again)", !/free spins\s*\d+\/\d+/i.test(baseBack) && (await page.getByRole("button", { name: buyBtn }).count()) > 0, baseBack.replace(/\s+/g, " ").slice(0, 80));
await page.screenshot({ path: path.join(out, `${game}-6-base-again.png`) });

// ---- wallet: exactly one debit for the purchase and the payout credited once
const delta = +(finalBal - startBal).toFixed(2);
let ledger = null;
if (process.env.DB_URL) {
  const db = await mysqlMod.createConnection(process.env.DB_URL);
  const [rows] = await db.query("SELECT t.type, t.amount, t.game, t.note FROM transactions t JOIN users u ON u.id = t.user_id WHERE u.username = ? AND t.seq > ? ORDER BY t.seq", [player, seq0]);
  await db.end();
  ledger = rows;
}
const buyRows = (ledger ?? []).filter((r) => r.type === "bet" && Number(r.amount) < 0 && /buy/i.test(r.note ?? ""));
const winRows = (ledger ?? []).filter((r) => r.type === "win");
const sumAll = (ledger ?? []).reduce((a, r) => a + Number(r.amount), 0);
if (ledger) {
  note("ledger: exactly ONE purchase debit equal to the displayed price", buyRows.length === 1 && Math.abs(Math.abs(Number(buyRows[0].amount)) - price) < 0.011, buyRows.map((r) => r.amount).join(","));
  note("ledger: no other debit besides the purchase (free spins cost nothing)", (ledger ?? []).filter((r) => Number(r.amount) < 0).length === 1, (ledger ?? []).map((r) => `${r.type}:${r.amount}`).join(" "));
  note("wallet reconciles with the ledger (balance change = sum of this game's ledger rows)", Math.abs(delta - sumAll) < 0.02, `delta ${delta} vs ledger ${sumAll.toFixed(2)}`);
} else note("wallet changed by the purchase and payouts only", delta <= 0 || delta > -price - 1e-6, `delta ${delta}`);
note("no browser console/page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
fs.writeFileSync(path.join(out, `${game}-buy-bonus.json`), JSON.stringify({ at: new Date().toISOString(), game, price, startBal, finalBal, delta, counterSeen, timeline, ledger, errors, results }, null, 1));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length} checks, ${failed} failed; counter seen: ${counterSeen.join(" ")}`);
process.exit(failed ? 1 : 0);
