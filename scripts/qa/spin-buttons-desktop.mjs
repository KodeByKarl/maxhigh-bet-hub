// Supplemental mouse + Space-key checks against the running local UI fixture.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const { chromium } = await import(
  pathToFileURL(
    process.env.PLAYWRIGHT_MODULE ??
      "D:/Porjects/maxhigh-bet-hub/output/production-browser-tools/node_modules/playwright/index.mjs",
  ).href
);
const inventory = JSON.parse(fs.readFileSync("docs/CODEX_SPIN_INVENTORY.json", "utf8"));
const games = inventory.games.filter((g) => g.active && g.category === "slot");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  serviceWorkers: "block",
});
await context.route("**/*", (r) =>
  r.request().url().startsWith("http://127.0.0.1:18149/") &&
  ["GET", "HEAD"].includes(r.request().method())
    ? r.continue()
    : r.abort(),
);
const results = [];
try {
  for (const g of games) {
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const result = { slug: g.slug, status: "BLOCKED" };
    try {
      await page.goto(`http://127.0.0.1:18149/?game=${g.slug}`);
      const button = page.locator('button.slot-deck__spin,button[class$="-spin"]');
      await button.waitFor();
      assert.equal(await button.isDisabled(), true, "Initial session loading should disable Spin");
      await button.evaluate((b) => b.click());
      assert.equal(
        await page.evaluate(() => window.__spinQA.calls.length),
        0,
        "Disabled activation placed an action",
      );
      result.disabledActionSuppressed = true;
      await page.waitForFunction(
        () => !document.querySelector('button.slot-deck__spin,button[class$="-spin"]').disabled,
      );
      await button.click();
      await page.waitForFunction(
        () =>
          window.__spinQA.calls.length === 1 &&
          document.querySelector("[data-slot-deck]").dataset.busy === "true",
      );
      await button.click(); // Existing busy action skips animation; it must not wager again.
      await page.waitForFunction(
        () => document.querySelector("[data-slot-deck]").dataset.busy === "false",
      );
      assert.equal(await page.evaluate(() => window.__spinQA.calls.length), 1);
      result.mouseSingleActionAndSkip = true;
      await button.focus();
      await page.keyboard.press("Space");
      await page.waitForFunction(
        () =>
          window.__spinQA.calls.length === 2 &&
          document.querySelector("[data-slot-deck]").dataset.busy === "true",
      );
      await page.waitForFunction(
        () => document.querySelector("[data-slot-deck]").dataset.busy === "false",
      );
      assert.equal(await page.evaluate(() => window.__spinQA.maxConcurrent), 1);
      result.spaceSingleAction = true;
      result.status = "VERIFIED";
    } catch (e) {
      result.error = e.message;
    } finally {
      await page.close();
    }
    results.push(result);
    fs.writeFileSync(
      path.resolve("output/spin-buttons/browser/desktop-actions.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(`${g.slug}: ${result.status}`);
  }
} finally {
  await context.close();
  await browser.close();
}
if (results.some((g) => g.status !== "VERIFIED")) process.exitCode = 1;
