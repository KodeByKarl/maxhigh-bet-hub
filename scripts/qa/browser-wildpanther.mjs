// Opens Wild Panther in a real browser on the loopback clone, captures console errors, screenshots, and the rules/paytable text.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";
const out = process.argv[2] ?? "browser-wp";
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const c = new Client(); await c.login(process.env.BR_USER ?? "uat_player5");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));
const failed = [];
page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
const card = page.getByRole("button", { name: "Play Wild Panther" }).first();
console.log("card visible:", await card.isVisible().catch(() => false));
await card.click({ timeout: 8000 }).catch((e) => console.log("click failed:", e.message.slice(0, 100)));
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(out, "wild-panther-open.png") });
await page.getByRole("button", { name: /play now/i }).first().click({ timeout: 8000 }).catch((e) => console.log("play now failed", e.message.slice(0, 80)));
await page.waitForTimeout(6000);
await page.screenshot({ path: path.join(out, "wild-panther-ingame.png") });
console.log("buttons:", JSON.stringify((await page.getByRole("button").allInnerTexts()).concat(await page.locator("button[aria-label]").evaluateAll((b) => b.map((x) => x.getAttribute("aria-label")))).map((x) => x.trim()).filter(Boolean).slice(0, 40)));
const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
console.log("mentions balance/bet UI:", /bet/i.test(text), "| url:", page.url());
// try to open the in-game paytable / info
for (const label of [/paytable/i, /info/i, /menu/i, /rules/i]) {
  const b = page.getByRole("button", { name: label }).first();
  if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(800); const t = (await page.locator("body").innerText()).replace(/\s+/g, " "); const m = t.match(/Scatter[^.]{0,260}\./); if (m) { console.log("RULES TEXT:", m[0]); break; } }
}
await page.screenshot({ path: path.join(out, "wild-panther-rules.png") });
console.log("console errors:", errors.length, errors.slice(0, 3));
console.log("failed requests:", failed.length, failed.slice(0, 5));
await browser.close();
await c.logout().catch(() => {});
