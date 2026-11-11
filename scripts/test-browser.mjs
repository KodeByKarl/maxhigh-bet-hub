import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import { hash } from "bcryptjs";
import { toCrossJSONAsync } from "seroval";
import { discoverRpcIds } from "./perf/rpc.mjs";
const { chromium } = await import(pathToFileURL(path.join(process.argv[2], "index.mjs")));
const out = process.env.BROWSER_OUTPUT ?? "audit/remediation/evidence/browser";
fs.mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:18765";
const db = await mysql.createConnection({
  host: "127.0.0.1",
  port: 19307,
  user: "root",
  password: "audit-local-only",
  database: "audit_remediation_fresh",
});
await db.query("SET time_zone = '+00:00'");
const password = "Browser-fixture-9!",
  username = "browser_" + randomBytes(5).toString("hex"),
  id = randomUUID(),
  staff = randomUUID(),
  token = randomBytes(32).toString("hex");
await db.query(
  "INSERT INTO users(id,public_user_id,username,password_hash,balance,role) VALUES (?,?,?,?,100,'player'),(?,?,?,?,100,'superadmin')",
  [
    id,
    username,
    username,
    await hash(password, 4),
    staff,
    username + "s",
    username + "s",
    await hash(password, 4),
  ],
);
await db.query(
  "INSERT INTO sessions(id,user_id,token,expires_at,last_seen_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR),UTC_TIMESTAMP())",
  [randomUUID(), staff, token],
);
await db.query(
  "INSERT INTO reward_entitlements(id,user_id,title,amount) VALUES (?,?,'Browser issued reward',5)",
  [randomUUID(), id],
);
const log = fs.openSync(out + "/server.txt", "w");
const server = spawn(process.execPath, [".output/server/index.mjs"], {
  windowsHide: true,
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOST: "127.0.0.1",
    PORT: "18765",
    DATABASE_URL: "mysql://root:audit-local-only@127.0.0.1:19307/audit_remediation_fresh",
  },
  stdio: ["ignore", log, log],
});
const results = { checks: [], viewports: [], pageErrors: [], cspErrors: [], requests: [] };
let browser;
const check = async (name, fn) => {
  try {
    await fn();
    results.checks.push({ name, status: "PASSED" });
  } catch (error) {
    results.checks.push({ name, status: "FAILED", error: error.message });
  }
};
try {
  let healthy = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/api/health")).ok) {
        healthy = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(healthy);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.route("**/*", (r) =>
    r.request().url().startsWith(base) || r.request().url().startsWith("data:")
      ? r.continue()
      : r.abort(),
  );
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => results.pageErrors.push(e.message));
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to execute|Hydration failed/i.test(m.text()))
      results.cspErrors.push(m.text());
  });
  page.on("request", (r) => {
    if (r.resourceType() === "script") results.requests.push(new URL(r.url()).pathname);
  });
  await check("responsive homepage and named lobby controls", async () => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(base, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      const metrics = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        width: innerWidth,
        h1: document.querySelectorAll("h1").length,
      }));
      assert.ok(metrics.documentWidth <= width + 1);
      assert.ok(metrics.h1 > 0);
      results.viewports.push(metrics);
      await page.screenshot({ path: out + "/home-" + width + ".png", fullPage: true });
    }
  });
  await check("real browser login and authenticated hydration", async () => {
    await page
      .getByRole("button", { name: /^sign in$/i })
      .first()
      .click();
    await page.locator("#mh-username").fill(username);
    await page.locator("#mh-password").fill(password);
    await page.locator("#mh-password").press("Enter");
    await page.locator("#mh-username").waitFor({ state: "hidden" });
    assert.ok((await context.cookies()).some((c) => c.name === "mh_session"));
  });
  const openProfile = async () => {
    await page.getByRole("button", { name: "Profile menu", exact: true }).click();
  };
  await check("temporary session-check overload retains UI identity", async () => {
    const identifier = discoverRpcIds().get("getSessionFn");
    assert.ok(identifier);
    const pattern = "**/_serverFn/" + identifier + "**";
    let intercepted;
    const received = new Promise((resolve) => (intercepted = resolve));
    const reject = async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Service temporarily unavailable",
      });
      intercepted();
    };
    await page.route(pattern, reject);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await Promise.race([received,page.waitForTimeout(10000).then(()=>{throw Error("Session poll was not intercepted");})]);
    await page.waitForTimeout(300);
    await page.unroute(pattern, reject);
    await page.getByRole("button", { name: "Profile menu", exact: true }).waitFor();
  });
  await check("persisted reward claim from actual UI", async () => {
    await openProfile();
    await page.getByRole("button", { name: /Gifts/ }).click();
    await page.getByText("Browser issued reward", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Claim", exact: true }).click();
    await page.getByRole("button", { name: "Claimed", exact: true }).waitFor();
    const [[row]] = await db.query("SELECT balance FROM users WHERE id=?", [id]);
    assert.equal(Number(row.balance), 105);
    await page.keyboard.press("Escape");
  });
  await check("fairness commitment panel loads own seed", async () => {
    await openProfile();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: /Privacy/ }).click();
    await page.getByText(/Server seed hash:/).waitFor();
    await page.getByRole("button", { name: "Rotate and reveal previous seed" }).click();
    await page.getByText(/Previous server seed:/).waitFor();
    await page.keyboard.press("Escape");
  });
  await check("player cannot enter staff game management", async () => {
    await page.goto(base + "/superadmin/games", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Superadmin only", exact: true }).waitFor();
  });
  await check(
    "wallet retry after lost committed response and reload creates one request",
    async () => {
      const openWallet = async () => {
        await page.goto(base, { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Wallet", exact: true }).click();
        await page.getByRole("button", { name: "Fund In/Out · Play Summary", exact: true }).click();
        await page.getByLabel("Wallet request type").selectOption("withdraw");
        await page.getByLabel("Amount", { exact: true }).fill("10");
      };
      await openWallet();
      let dropped = false;
      const intercept = async (route) => {
        if (!dropped && route.request().method() === "POST") {
          dropped = true;
          await route.fetch();
          await route.abort("failed");
        } else await route.continue();
      };
      await page.route("**/_serverFn/**", intercept);
      await page.getByRole("button", { name: "Submit request", exact: true }).click();
      await page
        .getByText(/Failed to fetch|fetch failed|NetworkError/i)
        .first()
        .waitFor();
      await page.unroute("**/_serverFn/**", intercept);
      assert.ok(dropped);
      await openWallet();
      await page.getByRole("button", { name: "Submit request", exact: true }).click();
      await page.getByText(/Request submitted for staff review/).waitFor();
      const [[row]] = await db.query(
        "SELECT COUNT(*) AS n FROM wallet_requests WHERE user_id=? AND type='withdraw' AND amount=10",
        [id],
      );
      assert.equal(Number(row.n), 1);
      await page.keyboard.press("Escape");
    },
  );
  await check("retryable service error after commit preserves intent across reload", async () => {
    const openWallet = async () => {
      await page.goto(base, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Wallet", exact: true }).click();
      await page.getByRole("button", { name: "Fund In/Out · Play Summary", exact: true }).click();
      await page.getByLabel("Wallet request type").selectOption("withdraw");
      await page.getByLabel("Amount", { exact: true }).fill("11");
    };
    await openWallet();
    let intercepted = false;
    const intercept = async (route) => {
      if (!intercepted && route.request().method() === "POST") {
        intercepted = true;
        const response = await route.fetch();
        const headers = { ...response.headers() };
        delete headers["content-length"];
        delete headers["content-encoding"];
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify(
            await toCrossJSONAsync({
              error: new Error("Financial service unavailable. Retry with the same operation key."),
            }),
          ),
        });
      } else await route.continue();
    };
    await page.route("**/_serverFn/**", intercept);
    await page.getByRole("button", { name: "Submit request", exact: true }).click();
    await page.getByText(/Financial service unavailable/).waitFor();
    await page.unroute("**/_serverFn/**", intercept);
    assert.ok(intercepted);
    await openWallet();
    await page.getByRole("button", { name: "Submit request", exact: true }).click();
    await page.getByText(/Request submitted for staff review/).waitFor();
    const [[row]] = await db.query(
      "SELECT COUNT(*) AS n FROM wallet_requests WHERE user_id=? AND type='withdraw' AND amount=11",
      [id],
    );
    assert.equal(Number(row.n), 1);
    await page.keyboard.press("Escape");
  });
  await check("authoritative session revocation still signs out the client", async () => {
    const cookie = (await context.cookies()).find((item) => item.name === "mh_session");
    assert.ok(cookie);
    await db.query("DELETE FROM sessions WHERE user_id=? AND token=?", [id, cookie.value]);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page
      .getByRole("button", { name: "Profile menu", exact: true })
      .waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: /^sign in$/i })
      .first()
      .waitFor();
  });
  await check("superadmin game catalog and lazy configuration load", async () => {
    await context.clearCookies();
    await context.addCookies([
      { name: "mh_session", value: token, url: base, httpOnly: true, sameSite: "Lax" },
    ]);
    await page.goto(base + "/superadmin/games", { waitUntil: "networkidle" });
    await page.getByText("Golden Panther", { exact: true }).first().waitFor();
    await page.screenshot({ path: out + "/staff-games.png", fullPage: true });
    const buttons = await page.getByRole("button").allTextContents();
    results.staffButtons = buttons.filter((x) => /config|engine/i.test(x));
    await page.getByText("Golden Panther", { exact: true }).first().click();
    await page.getByRole("dialog").waitFor();
    await page
      .getByRole("dialog")
      .getByText(/RTP|Paytable|Engine/i)
      .first()
      .waitFor();
    await page.screenshot({ path: out + "/staff-config.png" });
  });
  await check("no hydration, JavaScript or CSP execution errors", async () => {
    assert.deepEqual(results.pageErrors, []);
    assert.deepEqual(results.cspErrors, []);
  });
} finally {
  fs.writeFileSync(out + "/results.json", JSON.stringify(results, null, 2));
  await browser?.close();
  server.kill();
  fs.closeSync(log);
  await db.end();
}
console.log(JSON.stringify(results.checks, null, 2));
if (results.checks.some((x) => x.status !== "PASSED")) process.exitCode = 1;
