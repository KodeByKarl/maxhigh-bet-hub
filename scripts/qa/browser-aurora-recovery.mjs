// Browser regression: a recovered Aurora Spire bonus keeps its n/N counter (reload, interrupted purchase response, re-entry) and
// settles exactly once. Uses a TEMPORARY player in the LOCAL demo database (.env MYSQL_*), removed afterwards.
//   PW_MODULE_DIR=<dir containing node_modules/playwright-core> PW_CHROME=<chrome.exe> BASE=http://127.0.0.1:8080 node scripts/qa/browser-aurora-recovery.mjs
// Refuses to run against any database host that is not loopback or whose name does not look like demo/test/audit/qa.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const BASE = process.env.BASE ?? "http://127.0.0.1:8080";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(BASE))
  throw new Error("Refusing: BASE must be loopback");
const root = createRequire(path.resolve("package.json"));
const mysql = root("mysql2/promise");
const { hash } = root("bcryptjs");
const { chromium } = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"))(
  "playwright-core",
);
const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^MYSQL_/.test(l))
    .map((l) => l.split("=")),
);
if (
  !["127.0.0.1", "localhost"].includes(env.MYSQL_HOST) ||
  !/demo|test|audit|qa/i.test(env.MYSQL_DATABASE ?? "")
) {
  throw new Error("Refusing: database is not a local demo/test database");
}
const db = await mysql.createConnection({
  host: env.MYSQL_HOST,
  port: Number(env.MYSQL_PORT),
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
});
const NAME = "qa_aurora_recovery";
const PASS = "qa-pass-1234";
const uid = randomUUID();
await db.query("DELETE FROM users WHERE username=?", [NAME]).catch(() => undefined);
await db.query(
  "INSERT INTO users (id, public_user_id, username, password_hash, balance, role, display_name) VALUES (?,?,?,?,?,'player',?)",
  [uid, NAME, NAME, await hash(PASS, 10), "500.00", NAME],
);
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const results = [];
const note = (n, ok, d = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  - " + d : ""}`);
};
const openSes = async () =>
  (
    await db.query(
      "SELECT free_spins_left l, fs_spins_played p FROM play_sessions WHERE user_id=? AND status='open'",
      [uid],
    )
  )[0];
const ledger = async () =>
  (await db.query("SELECT type, amount FROM transactions WHERE user_id=? ORDER BY seq", [uid]))[0];

async function login() {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: /sign in/i })
    .first()
    .click();
  await page.locator("#mh-username").fill(NAME);
  await page.locator("#mh-password").fill(PASS);
  await page.locator("#mh-password").press("Enter");
  await page.waitForTimeout(3000);
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}
const state = await login();

/** Opens the game with an in-page recorder, so no counter or button state is missed between polls. */
async function enter() {
  const ctx = await browser.newContext({
    storageState: state,
    viewport: { width: 390, height: 844 },
  });
  await ctx.addInitScript(() => {
    window.__fs = [];
    window.__bonusBtn = [];
    const sample = () => {
      const c = document.querySelector("[data-fs-counter]")?.getAttribute("data-fs-counter");
      if (c && window.__fs.at(-1) !== c) window.__fs.push(c);
      const b = document.querySelector(".slot-deck__bonus");
      if (b && window.__bonusBtn.length < 1) window.__bonusBtn.push(b.disabled);
    };
    new MutationObserver(sample).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
  await page.locator('button:has(img[src$="/aurora-spire.webp"])').first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /play now/i }).click();
  return { ctx, page };
}
async function finish(page, ms = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const b = page.locator('button[aria-label^="Free spins complete"]').first();
    if (await b.count()) {
      await page.waitForTimeout(500);
      await b.click().catch(() => undefined);
      return true;
    }
    await page.waitForTimeout(200);
  }
  return false;
}
const seq = (arr) => arr.map((c) => Number(c.split("/")[0]));
const buy = (page, qty) =>
  page.evaluate(async (q) => {
    const m = await import("/src/functions/realms.ts");
    return m.realmsBuyFeatureFn({ data: { gameId: "aurora-spire", bet: 1, quantity: q } }).then(
      () => "ok",
      (e) => "ERR " + e.message,
    );
  }, qty);

try {
  // 1) paid but never played (interrupted purchase response): re-entry shows 1/N .. N/N and the Buy button is not clickable early
  {
    const a = await enter();
    note("purchase accepted", (await buy(a.page, 3)) === "ok");
    await a.ctx.close();
    const { ctx, page } = await enter();
    const done = await finish(page);
    const fs_ = await page.evaluate(() => window.__fs);
    const btn = await page.evaluate(() => window.__bonusBtn);
    note(
      "re-entry after an unseen purchase: counter 1/3, 2/3, 3/3",
      done && fs_.join(" ") === "1/3 2/3 3/3",
      fs_.join(" "),
    );
    note(
      "Buy Bonus is disabled until the stored session has been read",
      btn.length === 0 || btn[0] === true,
      JSON.stringify(btn),
    );
    await ctx.close();
  }
  // 2) reload mid-bonus: counter continues from the settled spin count with the same total
  {
    const a = await enter();
    await buy(a.page, 5);
    await a.ctx.close();
    const b1 = await enter();
    for (let i = 0; i < 400; i++) {
      const c = await b1.page.evaluate(() => window.__fs.at(-1));
      if (c && c !== "1/5") break;
      await b1.page.waitForTimeout(100);
    }
    await b1.ctx.close(); // drop the page mid-bonus
    const open = await openSes();
    const b2 = await enter();
    const done = await finish(b2.page);
    const fs_ = await b2.page.evaluate(() => window.__fs);
    const n = seq(fs_);
    note(
      `reload mid-bonus (server had ${JSON.stringify(open)}): counter resumes, same total, ends`,
      done &&
        fs_.every((c) => c.endsWith("/5")) &&
        n.every((x, i) => i === 0 || x === n[i - 1] + 1) &&
        n.at(-1) === 5 &&
        n[0] >= 1,
      fs_.join(" "),
    );
    await b2.ctx.close();
  }
  // 3) ledger: one debit per purchase, at most one credit each, nothing left open
  const rows = await ledger();
  note(
    "two purchases: two debits, at most two credits, no open session",
    rows.filter((r) => r.type === "bet").length === 2 &&
      rows.filter((r) => r.type === "win").length <= 2 &&
      (await openSes()).length === 0,
    JSON.stringify(rows.map((r) => r.type)),
  );
} finally {
  const [refs] = await db.query(
    "SELECT TABLE_NAME t, COLUMN_NAME c FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME='users' AND REFERENCED_COLUMN_NAME='id' AND TABLE_SCHEMA=DATABASE() AND TABLE_NAME<>'users'",
  );
  for (const r of refs)
    await db.query(`DELETE FROM \`${r.t}\` WHERE \`${r.c}\`=?`, [uid]).catch(() => undefined);
  await db.query("DELETE FROM users WHERE id=?", [uid]);
  await browser.close();
  await db.end();
}
console.log(results.every(Boolean) ? "ALL PASS" : "SOME FAIL");
process.exitCode = results.every(Boolean) ? 0 : 1;
