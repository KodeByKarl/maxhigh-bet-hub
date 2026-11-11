// Back-button / history behaviour on a LOOPBACK app in a phone-sized browser. Browser history only: this cannot test Android's own
// system navigation bar or gesture (that needs a physical device or emulator).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";

const out = process.argv[2] ?? "back-nav";
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const results = [];
const note = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`); };
const c = new Client(); await c.login(process.env.BR_USER ?? "uat_player5");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
await ctx.addCookies([{ name: "mh_session", value: c.cookie, url: BASE }]);
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message.slice(0, 100)));
const path_ = () => new URL(page.url()).pathname;
const wait = (ms) => page.waitForTimeout(ms);
const dialogOpen = async () => (await page.getByRole("dialog").count()) > 0;
const GAME = process.env.BR_GAME ?? "Golden Panther";

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
const startLen = await page.evaluate(() => history.length);

// 1. Back closes the info dialog and stays on the lobby
await page.getByRole("button", { name: `Play ${GAME}` }).first().click(); await wait(600);
note("info dialog opens", await dialogOpen());
note("opening the dialog added exactly one history entry", (await page.evaluate(() => history.length)) === startLen + 1);
await page.goBack(); await wait(600);
note("Back closes the info dialog and stays on the lobby", !(await dialogOpen()) && path_() === "/slots", path_());

// 2. Back from inside a game returns to the lobby (not out of the app)
await page.getByRole("button", { name: `Play ${GAME}` }).first().click(); await wait(600);
await page.getByRole("button", { name: /play now/i }).first().click(); await wait(5000);
const gameShell = page.getByRole("dialog", { name: new RegExp(`${GAME} game`, "i") });
note("game shell is open", (await gameShell.count()) > 0);
await page.goBack(); await wait(900);
note("Back from the game returns to the lobby without leaving /slots", (await gameShell.count()) === 0 && path_() === "/slots", path_());

// 3. closing with the on-screen X leaves no stale entries: one more Back goes to the PREVIOUS page, not to a ghost overlay
await page.getByRole("button", { name: `Play ${GAME}` }).first().click(); await wait(500);
await page.getByRole("button", { name: /play now/i }).first().click(); await wait(4000);
await page.getByRole("button", { name: "Close game" }).first().click(); await wait(900);
note("X closes the game", (await gameShell.count()) === 0 && path_() === "/slots");
await page.goBack(); await wait(900);
note("no duplicate/ghost history entries: the next Back goes to the previous page", path_() === "/" && !(await dialogOpen()), path_());

// 4. Back is absorbed while a round request is in flight, then works once it completes
await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
await page.getByRole("button", { name: `Play ${GAME}` }).first().click(); await wait(500);
await page.getByRole("button", { name: /play now/i }).first().click(); await wait(5000);
await page.route("**/_serverFn/**", async (route) => { if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 2500)); await route.continue(); });
const spin = page.getByRole("button", { name: /^spin$/i }).first();
const canSpin = await spin.isVisible().catch(() => false);
if (canSpin) {
  await spin.click({ force: true }); await wait(500);
  await page.goBack(); await wait(400);
  note("Back during an in-flight round is absorbed (game stays open)", (await gameShell.count()) > 0 && path_() === "/slots");
  await wait(3500);
  await page.goBack(); await wait(900);
  note("Back works again once the round has completed", (await gameShell.count()) === 0 && path_() === "/slots");
} else note("in-flight Back guard", false, "could not find the Spin button for this game");
await page.unroute("**/_serverFn/**");

note("no uncaught page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close(); await c.logout().catch(() => {});
const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(out, "back-nav-results.json"), JSON.stringify({ at: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 1));
console.log(`\n${results.length} checks, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
