import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "../../output/production-browser-tools/node_modules/playwright/index.mjs";
const queue = JSON.parse(
  execFileSync(process.execPath, ["scripts/qa/realms-overhaul.mjs", "list"], { encoding: "utf8" }),
);
const assets = queue.map(([id]) => {
  const base = fs.existsSync(`public/images/symbols/realms/${id}-v20261102-r2/p1.webp`)
    ? `${id}-v20261102-r2`
    : id;
  return `/images/symbols/realms/${base}/p1.webp?v=1`;
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("http://localhost:8080/", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  assert.equal(response.status(), 200);
  const health = await page.request.get("http://localhost:8080/api/health");
  assert.equal(health.status(), 200);
  assert.equal((await health.json()).ok, true);
  const images = await page.evaluate(
    async (paths) =>
      Promise.all(
        paths.map(async (src) => {
          const img = new Image();
          img.src = src;
          await img.decode();
          return { src, width: img.naturalWidth, height: img.naturalHeight };
        }),
      ),
    assets,
  );
  assert.equal(images.length, 22);
  assert.ok(images.every((i) => i.width > 0 && i.height > 0));
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "output/realms-overhaul/live-home.png" });
  const result = {
    frontend: response.status(),
    backend: health.status(),
    images,
    errors,
    scope: "Anonymous home and read-only health/asset requests; no real wagers",
  };
  fs.writeFileSync("output/realms-overhaul/live-smoke.json", JSON.stringify(result, null, 2));
  console.log(
    "PASS: live frontend/backend HTTP 200; all 22 spin artwork images decoded; zero page errors",
  );
} finally {
  await browser.close();
}
