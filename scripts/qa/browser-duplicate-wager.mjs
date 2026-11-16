// Regression: rapid double-taps must never place more than ONE wager / purchase / deal.
//
// Fires 12 clicks in the same JavaScript tick (plus 12 more 25 ms apart) on Spin / Buy Bonus confirm / Deal in a real browser and
// counts the wager requests the page sends. Reproduces the bug fixed in "claim the spin synchronously" (before the fix: 12-14 wagers).
//
// SAFETY: LOOPBACK ONLY. Refuses to run against anything but localhost / 127.0.0.1 and uses demo accounts on the local demo
// database. Never point this at UAT or production.
//
//   PW_MODULE_DIR=<dir containing node_modules/playwright-core> [PW_CHROME=<chrome.exe>] \
//   node scripts/qa/browser-duplicate-wager.mjs [slots|cards|buy|all]
//
// Optional ledger proof: run with `node --env-file=.env` against the local demo DB (MYSQL_DATABASE=maxhigh_demo); the script then also
// verifies the transactions table received exactly one 'bet' row per game.
import path from "node:path";
import { createRequire } from "node:module";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const host = new URL(BASE).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(`Refusing to run against non-loopback host "${host}". This test places real wagers.`);
  process.exit(2);
}
const USER = process.env.DUP_USER ?? "player1";
const PASS = process.env.DUP_PASS ?? "player123";
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");

const SLOTS = (process.env.DUP_SLOTS ?? "Fortune Mouse,Gate of Ra,Siren's Lagoon,Thor Thunder,Cleopatra Gold").split(",");
const CARDS = {
  Baccarat: /^deal$/i,
  "Lucky 9": /go for 9/i,
  "Ace High": /^deal$/i,
  "Three Card Poker": /^deal/i,
};
const BUY = (process.env.DUP_BUY ?? "Fortune Mouse,Thor Thunder").split(",");
const mode = process.argv[2] ?? "all";

const serverFnName = (url) => {
  try {
    const b = decodeURIComponent(new URL(url).pathname.split("/_serverFn/")[1] ?? "");
    return String(JSON.parse(Buffer.from(b.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()).export ?? "").replace(/_createServerFn_handler$/, "");
  } catch {
    return "";
  }
};

let ledger = null;
try {
  if (process.env.MYSQL_DATABASE === "maxhigh_demo") {
    const mysql = (await import("mysql2/promise")).default;
    const conn = await mysql.createConnection({ host: "127.0.0.1", port: Number(process.env.MYSQL_PORT ?? 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE });
    ledger = {
      async maxSeq() { const [[r]] = await conn.query("SELECT COALESCE(MAX(t.seq),0) s FROM transactions t JOIN users u ON u.id=t.user_id WHERE u.username=?", [USER]); return Number(r.s); },
      async bets(since) { const [rows] = await conn.query("SELECT t.game g, COUNT(*) n FROM transactions t JOIN users u ON u.id=t.user_id WHERE u.username=? AND t.seq>? AND t.type='bet' GROUP BY t.game", [USER, since]); return Object.fromEntries(rows.map((r) => [r.g, Number(r.n)])); },
      close: () => conn.end(),
    };
  }
} catch { /* ledger proof is optional */ }

const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
const posts = [];
page.on("request", (r) => { if (r.url().includes("_serverFn") && r.method() === "POST") posts.push(serverFnName(r.url())); });

const results = [];
const note = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`); };

await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.waitForSelector('button[aria-label^="Play "]', { timeout: 60000 });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: /sign in/i }).first().click();
await page.fill("#mh-username", USER);
await page.fill("#mh-password", PASS);
await page.locator("#mh-username").evaluate((el) => el.closest("form").requestSubmit());
await page.waitForFunction(() => !document.querySelector("#mh-password"), null, { timeout: 20000 });
await page.waitForTimeout(1500);

async function openGame(name) {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`button[aria-label="Play ${name}"]`);
  await page.waitForTimeout(1500);
  await page.locator(`button[aria-label="Play ${name}"]`).first().click();
  await page.getByRole("button", { name: /play now/i }).first().click();
  await page.waitForSelector('button[aria-label="Close game"]');
  await page.waitForTimeout(6000);
  posts.length = 0;
}
const wagers = (re) => posts.filter((n) => re.test(n) && !/session|config|heartbeat|jackpot/i.test(n)).length;

async function slotBurst(name) {
  await openGame(name);
  const since = ledger ? await ledger.maxSeq() : 0;
  await page.evaluate(async () => {
    const b = document.querySelector('button[aria-label="Spin"]');
    for (let i = 0; i < 12; i++) b.click();
    for (let i = 0; i < 12; i++) { await new Promise((r) => setTimeout(r, 25)); document.querySelector('button[aria-label^="Skip"], button[aria-label="Spin"]')?.click(); }
  });
  await page.waitForTimeout(3500);
  const n = wagers(/spin/i);
  const rows = ledger ? (await ledger.bets(since))[name] ?? 0 : null;
  note(`slot ${name}: 24 rapid clicks -> 1 wager`, n === 1 && (rows === null || rows === 1), `requests=${n}${rows === null ? "" : ` ledgerBetRows=${rows}`}`);
}

async function buyBurst(name) {
  await openGame(name);
  await page.getByRole("button", { name: /buy bonus/i }).first().click();
  await page.waitForSelector(".bb-confirm", { timeout: 15000 });
  await page.evaluate(() => { const b = document.querySelector(".bb-confirm"); for (let i = 0; i < 6; i++) b.click(); });
  await page.waitForTimeout(4000);
  note(`buy bonus ${name}: 6 rapid confirms -> 1 purchase`, wagers(/buy/i) === 1, `requests=${wagers(/buy/i)}`);
}

async function cardBurst(name, re) {
  await openGame(name);
  // resolve a hand left open by a previous run (Three Card Poker waits for Play/Fold)
  const fold = page.getByRole("button", { name: /^fold/i }).first();
  if (await fold.count()) { await fold.click(); await page.waitForTimeout(4500); }
  const next = page.getByRole("button", { name: /new hand/i }).first();
  if (await next.count()) { await next.click(); await page.waitForTimeout(1200); }
  posts.length = 0;
  const since = ledger ? await ledger.maxSeq() : 0;
  const clicked = await page.evaluate((src) => { const r = new RegExp(src, "i"); const b = [...document.querySelectorAll("button")].find((x) => r.test(x.textContent.trim()) && !x.disabled); if (!b) return 0; for (let i = 0; i < 6; i++) b.click(); return 6; }, re.source);
  await page.waitForTimeout(8000);
  const n = wagers(/deal/i);
  const rows = ledger ? (await ledger.bets(since))[name] ?? 0 : null;
  note(`cards ${name}: 6 rapid Deal clicks -> 1 deal`, clicked > 0 && n === 1 && (rows === null || rows === 1), `requests=${n}${rows === null ? "" : ` ledgerBetRows=${rows}`}`);
  const f2 = page.getByRole("button", { name: /^fold/i }).first();
  if (await f2.count()) { await f2.click(); await page.waitForTimeout(3500); }
}

if (mode === "all" || mode === "slots") for (const g of SLOTS) await slotBurst(g);
if (mode === "all" || mode === "cards") for (const [g, re] of Object.entries(CARDS)) await cardBurst(g, re);
if (mode === "all" || mode === "buy") for (const g of BUY) await buyBurst(g);

await ledger?.close();
await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
