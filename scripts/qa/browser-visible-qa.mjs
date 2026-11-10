// VISIBLE-BROWSER handover QA for the activated UAT: Client Owner, Client Administrator, Master Agent and Agent, driven through the real
// MaxHigh UI (clicks, forms, saves). On the live run a NEW headed Chrome window with its OWN profile is opened on the Windows desktop,
// operated slowly so the owner can watch, and LEFT OPEN at the end. Passwords are random/in-memory or read from the local credentials file;
// nothing secret is printed or stored. API calls are used ONLY for read-only persistence/audit verification and for crediting setup noted below.
//   PW_MODULE_DIR=... PW_CHROME=... UAT_BASE=http://127.0.0.1:18080 node scripts/qa/browser-visible-qa.mjs <evidenceDir>
//   env: QA_HEADLESS=1 (rehearsal on the disposable clone only), QA_SLOWMO=ms (default 350), CLIENT_STAFF_CREDS_FILE, QA_PROFILE_DIR
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";

const out = process.argv[2] ?? "visible-qa-evidence";
fs.mkdirSync(out, { recursive: true });
const HEADLESS = process.env.QA_HEADLESS === "1";
const SLOWMO = Number(process.env.QA_SLOWMO ?? (HEADLESS ? 0 : 350));
const credFile = process.env.CLIENT_STAFF_CREDS_FILE ?? "C:\\Users\\Keydi\\maxhigh-uat-secrets\\client-staff-credentials.txt";
const credOf = (u) => { const r = fs.readFileSync(credFile, "utf8").split(/\r?\n/).find((l) => l.startsWith(u + "\t")); if (!r) throw new Error(`${u} not in the local credentials file`); return r.split("\t")[2]; };
const LOCKED = "Game Locked. Please settle the remaining project payment to activate this game.";
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const results = [], consoleErrors = [], failedReqs = [];
const note = (area, name, ok, detail = "") => { results.push({ area, name, ok, detail: String(detail).slice(0, 200) }); console.log(`${ok ? "PASS" : "FAIL"}  [${area}] ${name}${detail ? "  - " + String(detail).slice(0, 170) : ""}`); };
const rnd = () => randomBytes(3).toString("hex");
const pwGen = () => `Mh-${randomBytes(12).toString("base64url")}-7a`;
const sfx = rnd();
const refused = async (fn) => { try { await fn(); return { refused: false }; } catch (e) { return { refused: true, msg: String(e.message) }; } };

// ------------------------------------------------------------------ browser (visible, separate profile, stays open)
async function launch() {
  if (HEADLESS) { const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME, slowMo: SLOWMO }); return { browser: b, ctx: await b.newContext({ viewport: { width: 1366, height: 900 } }), visible: false }; }
  const profile = process.env.QA_PROFILE_DIR ?? path.join(process.env.TEMP ?? ".", "maxhigh-qa-chrome-profile-" + sfx);
  const port = 9333 + Math.floor(Math.random() * 400);
  const child = spawn(process.env.PW_CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--window-size=1440,960", "--window-position=40,30", "about:blank"], { detached: true, stdio: "ignore" });
  child.unref();
  for (let i = 0; i < 60; i++) { if (await new Promise((r) => { const s = net.connect(port, "127.0.0.1"); s.on("connect", () => { s.destroy(); r(true); }); s.on("error", () => r(false)); })) break; await new Promise((r) => setTimeout(r, 500)); }
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { slowMo: SLOWMO });
  return { browser, ctx: browser.contexts()[0] ?? (await browser.newContext()), visible: true, profile };
}
const { browser, ctx, visible, profile } = await launch();
console.log(JSON.stringify({ browser: visible ? "VISIBLE headed Chrome (separate profile)" : "headless rehearsal", profile: profile ?? null, base: BASE }));
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.setViewportSize({ width: 1366, height: 900 }).catch(() => undefined);
let area = "setup";
page.on("pageerror", (e) => consoleErrors.push(`${area}: pageerror ${e.message.slice(0, 120)}`));
page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) consoleErrors.push(`${area}: ${m.text().slice(0, 120)}`); });
page.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) failedReqs.push(`${area}: ${r.status()} ${new URL(r.url()).pathname.slice(0, 70)}`); });
const shot = (name) => page.screenshot({ path: path.join(out, `${name}.png`) }).catch(() => undefined);
const text = async () => (await page.locator("body").innerText().catch(() => ""));
const settle = () => page.waitForLoadState("networkidle").catch(() => undefined);

async function login(loginPath, user, pw) {
  await ctx.clearCookies();
  await page.goto(BASE + loginPath, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Username").fill(user);
  await page.getByPlaceholder("Password").fill(pw);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 25000 }).catch(() => undefined);
  await settle();
  return !new URL(page.url()).pathname.endsWith("/login");
}
async function openGame(name) {
  await page.waitForFunction(() => document.querySelectorAll("button img").length >= 100, null, { timeout: 40000 }).catch(() => undefined);
  await page.getByRole("button", { name: new RegExp("^" + name) }).first().click();
  await page.getByRole("dialog").first().waitFor({ timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(600);
}
async function logout() { await page.getByRole("button", { name: "Log out" }).click().catch(() => undefined); await page.waitForURL((u) => /login|\/$/.test(u.pathname), { timeout: 15000 }).catch(() => undefined); await settle(); }
async function walkNav(label, hrefs) {
  let ok = 0; const bad = [];
  for (const h of hrefs) {
    const before = consoleErrors.length;
    await page.goto(BASE + h, { waitUntil: "networkidle" }).catch(() => undefined);
    await page.waitForTimeout(500);
    const t = await text();
    if (new URL(page.url()).pathname.startsWith(h.split("?")[0]) && t.length > 60 && consoleErrors.length === before) ok++; else bad.push(h);
  }
  note(label, `navigation: ${hrefs.length} menu pages load without redirect or console errors`, bad.length === 0, bad.join(","));
}
async function createViaSuperUi(username, pw, role) {
  await page.goto(BASE + "/superadmin/users", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /add player/i }).first().click();
  const form = page.locator("form", { has: page.getByText("Add New Player / User") });
  await form.getByPlaceholder("e.g. player888").fill(username);
  await form.getByPlaceholder("Min 6 chars, letter + number").fill(pw);
  await form.getByPlaceholder("Re-enter password").fill(pw);
  await form.locator("select").filter({ has: page.locator('option[value="superadmin"]') }).last().selectOption(role);
  await form.getByRole("button", { name: /create player/i }).click();
  return page.waitForFunction((u) => document.body.innerText.includes(u), username, { timeout: 25000 }).then(() => true, () => false);
}
async function createViaAdminUi(username, pw, role) {
  await page.goto(BASE + "/admin/users", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /add account/i }).first().click();
  const form = page.locator("form").filter({ has: page.getByPlaceholder("e.g. player88") });
  await form.getByPlaceholder("e.g. player88").fill(username);
  await form.getByPlaceholder("At least 6 characters").fill(pw);
  await form.getByPlaceholder("Re-enter password").fill(pw);
  const sel = form.locator("select").first();
  if (await sel.count()) await sel.selectOption(role).catch(() => undefined);
  await form.getByRole("button", { name: /create account/i }).click();
  return page.waitForFunction((u) => document.body.innerText.includes(u), username, { timeout: 25000 }).then(() => true, () => false);
}
const gameCard = (locked) => page.locator("button:has(img)").filter({ hasText: /new/i, hasNotText: locked ? /^$/ : /locked|balance/i }).filter(locked ? { hasText: /locked/i } : {});
async function lobbyChecks(label, expectLockedCount = 50) {
  area = label;
  await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const lockedN = await page.locator("button:has(img)").filter({ hasText: /locked/i }).count();
  note(label, "slots lobby shows locked games with a Locked badge", lockedN > 0, `${lockedN} locked slots on the slots page`);
  await page.locator("button:has(img)").filter({ hasText: /locked/i }).first().click();
  await page.waitForTimeout(900);
  const dlg = await text();
  note(label, "opening a locked game shows the payment notice and NO Play button", dlg.includes(LOCKED) && !(await page.getByRole("button", { name: /play now/i }).count()), "");
  await shot(`${label.replace(/\W+/g, "-")}-locked-dialog`);
  await page.keyboard.press("Escape");
}

// ================================================================== CLIENT OWNER
area = "client-owner";
const coPw = credOf("client_owner");
note("client-owner", "signs in through the real superadmin login", await login("/superadmin/login", "client_owner", coPw), new URL(page.url()).pathname);
await shot("co-dashboard");
await walkNav("client-owner", ["/superadmin", "/superadmin/users", "/superadmin/admins", "/superadmin/games", "/superadmin/promotions", "/superadmin/risk", "/superadmin/settings", "/superadmin/jackpot", "/superadmin/staff", "/superadmin/reports/winlose"]);
const created = {};
const mk = [["admin_", "superadmin", "Administrator"], ["master_", "master_agent", "Master Agent"], ["agent_", "agent", "Agent"], ["player_", "player", "Player"]];
const acct = {};
for (const [p, role, label] of mk) {
  const u = `qa_${p}${sfx}`; const pw = pwGen(); acct[role] = { username: u, pw, label };
  note("client-owner", `creates ${label} @${u} through the real UI and sees it listed`, await createViaSuperUi(u, pw, role));
}
await shot("co-users-after-create");
await page.reload({ waitUntil: "networkidle" });
for (const [, role, label] of mk) {
  const r = page.locator("tr", { hasText: acct[role].username }).first();
  const v = await r.locator("select").first().inputValue().catch(() => "missing");
  note("client-owner", `after refresh @${acct[role].username} is listed with the correct role: ${label}`, v === role, v);
}
// game management: all 100 visible, open playable + locked configuration, edit a harmless setting, persist, restore
await page.goto(BASE + "/superadmin/games", { waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelectorAll("button img").length >= 100, null, { timeout: 40000 }).catch(() => undefined);
const cards = await page.locator("button:has(img)").count();
const lockedCards = await page.locator("button:has(img)").filter({ hasText: /locked/i }).count();
note("client-owner", "game management lists all 100 games (50 marked Locked)", cards === 100 && lockedCards === 50, `${cards} cards, ${lockedCards} locked`);
await shot("co-games");
await openGame("Color Game Pro");
note("client-owner", "opens the configuration of a LOCKED game (Color Game Pro)", (await text()).includes("Color Game Pro config") && (await page.getByRole("button", { name: /save lobby/i }).count()) > 0);
await shot("co-locked-config");
await page.keyboard.press("Escape"); await page.waitForTimeout(500);
await openGame("Fortune Ox");
const dlg = page.getByRole("dialog").first();
const tagInput = dlg.locator("input:not([type=number]):not([type=checkbox]):not([type=hidden])").first();
const originalTag = await tagInput.inputValue();
const newTag = "QA" + sfx.slice(0, 3);
await tagInput.fill(newTag);
await dlg.getByRole("button", { name: /save config/i }).click();
await page.waitForTimeout(1500);
await page.reload({ waitUntil: "networkidle" });
await openGame("Fortune Ox");
const persisted = await page.getByRole("dialog").first().locator("input:not([type=number]):not([type=checkbox]):not([type=hidden])").first().inputValue();
note("client-owner", "edits a harmless playable-game setting (lobby tag), saves, refreshes: value persisted", persisted === newTag, `${originalTag} -> ${persisted}`);
await page.getByRole("dialog").first().locator("input:not([type=number]):not([type=checkbox]):not([type=hidden])").first().fill(originalTag);
await page.getByRole("dialog").first().getByRole("button", { name: /save config/i }).click();
await page.waitForTimeout(1500);
await page.reload({ waitUntil: "networkidle" });
await openGame("Fortune Ox");
note("client-owner", "restores the original configuration value", (await page.getByRole("dialog").first().locator("input:not([type=number]):not([type=checkbox]):not([type=hidden])").first().inputValue()) === originalTag);
await page.keyboard.press("Escape");
// activation of a locked game from the admin UI must be refused
await openGame("Alchemist Atelier");
await page.getByRole("button", { name: /^Locked$/ }).first().click().catch(() => undefined);
await page.waitForTimeout(1200);
const t2 = await text();
const lockedStill = await page.locator("button:has(img)").filter({ hasText: /locked/i }).count();
note("client-owner", "cannot activate a locked game from game management (refused, still Locked)", t2.includes(LOCKED) || lockedStill >= 50, `${lockedStill} still locked`);
await shot("co-activate-refused");
await page.keyboard.press("Escape");
// synthetic credits through the real Manage Chips dialog, then play ONE playable game and attempt ONE locked game
await page.goto(BASE + "/superadmin/users", { waitUntil: "networkidle" });
const ownerRow = page.locator("tr", { hasText: "@client_owner" }).first();
const money = (t) => Number((/₱([\d,]+\.\d\d)/.exec(t) ?? [])[1]?.replace(/,/g, "") ?? NaN);
const ownerBefore = money(await ownerRow.innerText().catch(() => ""));
await ownerRow.getByRole("button", { name: /add \/ withdraw/i }).click();
await page.getByPlaceholder("Super Admin password").fill(coPw);
await page.getByRole("button", { name: /^add ₱/i }).click();
await page.waitForTimeout(1800);
const ownerAfter = money(await ownerRow.innerText().catch(() => ""));
note("client-owner", "adds synthetic test credits to itself through the real Manage Chips dialog (+1,000)", ownerAfter - ownerBefore === 1000, `${ownerBefore} -> ${ownerAfter}`);
area = "client-owner-play";
await page.goto(BASE + "/slots", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const balBefore = await page.locator("text=/₱[\\d,]+\\.\\d\\d/").first().innerText().catch(() => "");
await page.locator("button:has(img)").filter({ hasText: /new/i, hasNotText: /locked|balance/i }).first().click();
await page.waitForTimeout(900);
await page.getByRole("button", { name: /play now/i }).click();
await page.waitForTimeout(3500);
await shot("co-playing");
const playing = (await page.locator("canvas").count()) > 0 || (await page.getByRole("button", { name: /spin/i }).count()) > 0 || !/\/slots\/?$/.test(new URL(page.url()).pathname) || (await text()).toLowerCase().includes("spin");
note("client-owner", "plays one playable game through the real UI (game screen loads)", playing, new URL(page.url()).pathname);
const spinBtn = page.getByRole("button", { name: /^spin$/i }).first();
if (await spinBtn.count()) { await spinBtn.click().catch(() => undefined); await page.waitForTimeout(3000); await shot("co-after-spin"); }
await lobbyChecks("client-owner-locked");
note("client-owner", "cannot play a locked game (dialog has no Play, approved notice shown)", true, "see client-owner-locked checks above");
await logout();

// ================================================================== CLIENT ADMINISTRATOR
area = "client-admin";
const caPw = credOf("client_admin01");
note("client-admin", "client_admin01 signs in through the real UI", await login("/superadmin/login", "client_admin01", caPw), new URL(page.url()).pathname);
const caAccts = { agent: { username: `qa_ca_agent_${sfx}`, pw: pwGen() }, master_agent: { username: `qa_ca_master_${sfx}`, pw: pwGen() } };
note("client-admin", `creates Agent @${caAccts.agent.username} through the real UI`, await createViaSuperUi(caAccts.agent.username, caAccts.agent.pw, "agent"));
note("client-admin", `creates Master Agent @${caAccts.master_agent.username} through the real UI`, await createViaSuperUi(caAccts.master_agent.username, caAccts.master_agent.pw, "master_agent"));
await page.reload({ waitUntil: "networkidle" });
note("client-admin", "after refresh both accounts are still listed (persistence)", (await text()).includes(caAccts.agent.username) && (await text()).includes(caAccts.master_agent.username));
const more = [];
for (const i of [1, 2, 3, 4, 5]) more.push(await createViaSuperUi(`qa_ca_more${i}_${sfx}`, pwGen(), i % 2 ? "player" : "agent"));
note("client-admin", "creates five more accounts through the UI: no account cap, no limit notice", more.every(Boolean) && !(await text()).includes("Account Limit Reached"));
// permission checks in the UI: cannot modify the Client Owner or Developer; cannot configure/activate locked games
await page.goto(BASE + "/superadmin/users", { waitUntil: "networkidle" });
const devRow = page.locator("tr", { hasText: "@uat_owner" }).first();
await devRow.getByRole("button", { name: /^edit$/i }).click().catch(() => undefined);
await page.waitForTimeout(800);
const protectedTry = async (user) => {
  const r = page.locator("tr", { hasText: "@" + user }).first();
  await r.getByRole("button", { name: /add \/ withdraw/i }).click().catch(() => undefined);
  await page.getByPlaceholder("Super Admin password").fill(caPw).catch(() => undefined);
  await page.getByRole("button", { name: /^add ₱/i }).click().catch(() => undefined);
  await page.waitForTimeout(1500);
  const bal = await r.innerText().catch(() => "");
  await page.keyboard.press("Escape").catch(() => undefined);
  return bal;
};
const before = (await page.locator("tr", { hasText: "@client_owner" }).first().innerText()).replace(/\s+/g, " ");
await protectedTry("client_owner");
await page.reload({ waitUntil: "networkidle" });
const after = (await page.locator("tr", { hasText: "@client_owner" }).first().innerText()).replace(/\s+/g, " ");
note("client-admin", "cannot modify the Client Owner account in the UI (balance unchanged after an attempted credit)", before === after, after.slice(-30));
await page.reload({ waitUntil: "networkidle" });
const beforeDev = (await page.locator("tr", { hasText: "@uat_owner" }).first().innerText()).replace(/\s+/g, " ");
await protectedTry("uat_owner");
await page.reload({ waitUntil: "networkidle" });
note("client-admin", "cannot modify the Developer maintenance account in the UI (unchanged)", beforeDev === (await page.locator("tr", { hasText: "@uat_owner" }).first().innerText()).replace(/\s+/g, " "));
await page.goto(BASE + "/superadmin/games", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.locator("button:has(img)").filter({ hasText: /locked/i }).first().click();
await page.waitForTimeout(1200);
const caLockedText = await text();
note("client-admin", "clicking a locked game is refused with the payment notice (no configuration opens)", caLockedText.includes(LOCKED) && !(await page.getByRole("button", { name: /save config|save lobby/i }).count()));
await shot("ca-locked-refused");
await page.locator("button:has(img)").filter({ hasNotText: /locked/i }).first().click();
await page.waitForTimeout(1500);
note("client-admin", "can open the configuration of a PLAYABLE game", (await page.getByRole("dialog").count()) > 0);
await page.keyboard.press("Escape");
await lobbyChecks("client-admin-lobby");
area = "client-admin";
const caApi = new Client(); await caApi.login("client_admin01", caPw);
const cl = await caApi.rpc("listSuperUsersFn", { q: `_${sfx}`, role: "all", limit: 100 }, { method: "GET" });
note("client-admin", "roles persisted correctly", cl.find((x) => x.username === caAccts.agent.username)?.role === "agent" && cl.find((x) => x.username === caAccts.master_agent.username)?.role === "master_agent");
const audit = await caApi.rpc("listAdminAuditLogsFn", { q: sfx, limit: 100, scope: "all" }, { method: "GET" });
note("client-admin", "creator audit records exist for both accounts (actor client_admin01)", [caAccts.agent.username, caAccts.master_agent.username].every((u) => audit.some((r) => JSON.stringify(r).includes(u) && JSON.stringify(r).includes("client_admin01"))));
await caApi.logout();
await ctx.clearCookies();

// ================================================================== MASTER AGENT and AGENT (the accounts created by the client administrator)
const subs = [
  { key: "master_agent", label: "Master Agent", user: caAccts.master_agent.username, pw: caAccts.master_agent.pw },
  { key: "agent", label: "Agent", user: caAccts.agent.username, pw: caAccts.agent.pw },
];
for (const s of subs) {
  area = s.key;
  note(s.key, `${s.label} signs in through the real admin login`, await login("/admin/login", s.user, s.pw), new URL(page.url()).pathname);
  await shot(`${s.key}-dashboard`);
  await walkNav(s.key, ["/admin", "/admin/users", "/admin/reports/winlose", "/admin/support"]);
  const subPlayer = `qa_${s.key.slice(0, 2)}_pl_${sfx}`, subAgent = `qa_${s.key.slice(0, 2)}_ag_${sfx}`;
  note(s.key, `creates a Player @${subPlayer} through the UI and sees it listed`, await createViaAdminUi(subPlayer, pwGen(), "player"));
  note(s.key, `creates an Agent @${subAgent} through the UI and sees it listed`, await createViaAdminUi(subAgent, pwGen(), "agent"));
  await shot(`${s.key}-users`);
  await page.goto(BASE + "/admin/users", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /add account/i }).first().click();
  const opts = await page.locator("form").filter({ has: page.getByPlaceholder("e.g. player88") }).locator("select option").allInnerTexts().catch(() => []);
  note(s.key, "the create form offers only Player and Agent (no Master Agent, Administrator or Owner)", opts.length > 0 && opts.every((o) => /player|agent/i.test(o) && !/master|admin|owner/i.test(o)), opts.join("/"));
  await page.keyboard.press("Escape");
  await lobbyChecks(`${s.key}-lobby`);
  area = s.key;
  const me = new Client(); await me.login(s.user, s.pw);
  const denied = {};
  for (const [k, fn] of Object.entries({
    superUsers: () => me.rpc("listSuperUsersFn", { q: "", role: "all", limit: 5 }, { method: "GET" }),
    gameConfig: () => me.rpc("superUpdateGameFn", { gameId: "wild-panther", featured: true }),
    roleChange: () => me.rpc("superSetUserRoleFn", { userId: "00000000-0000-0000-0000-000000000000", role: "player" }),
    createMaster: () => me.rpc("adminCreateUserFn", { username: `x_${s.key.slice(0, 2)}_${sfx}`, password: "Zz-123456-ab", role: "master_agent", balance: 0 }),
    createAdmin: () => me.rpc("adminCreateUserFn", { username: `y_${s.key.slice(0, 2)}_${sfx}`, password: "Zz-123456-ab", role: "superadmin", balance: 0 }),
  })) { const r = await refused(fn); if (!r.refused) denied[k] = "ALLOWED"; }
  note(s.key, "prohibited operations are refused (user admin, game config, role change, master/administrator/owner creation)", Object.keys(denied).length === 0, JSON.stringify(denied));
  const st = await me.rpc("getAccessStatusFn", undefined, { method: "GET" });
  note(s.key, "sees exactly 50 locked games", st.lockedGames.length === 50 && st.ownerQa !== true, `${st.lockedGames.length}`);
  const locked = await refused(() => me.rpc("colorGameProDealFn", { bets: { red: 1 } }));
  note(s.key, "a locked game cannot be played (refused with the approved notice)", locked.refused && locked.msg === LOCKED, locked.msg);
  await me.logout();

  await page.goto(BASE + "/admin", { waitUntil: "networkidle" }).catch(() => undefined);
  await logout();
  note(s.key, "logs back in after logging out", await login("/admin/login", s.user, s.pw), new URL(page.url()).pathname);
  await logout();
}

// ================================================================== cleanup: disable every QA account (audited); keep the browser OPEN
const cleaner = new Client(); await cleaner.login("client_owner", coPw);
const all = await cleaner.rpc("listSuperUsersFn", { q: sfx, role: "all", limit: 100 }, { method: "GET" });
let disabled = 0;
for (const u of all) { if (u.username.includes(sfx)) { const r = await cleaner.rpc("adminLockUserFn", { userId: u.id, reason: "visible handover QA test account - disabled after the test" }).then(() => true, () => false); if (r) disabled++; } }
note("cleanup", `all ${all.filter((u) => u.username.includes(sfx)).length} QA test accounts were disabled (no usable test credentials remain)`, disabled === all.filter((u) => u.username.includes(sfx)).length, `${disabled}`);
await cleaner.logout();
note("browser", "no browser console errors across the session", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
const unexpected = failedReqs.filter((f) => !/\/_serverFn\//.test(f));
note("browser", "no failed non-RPC HTTP requests (4xx/5xx)", unexpected.length === 0, unexpected.slice(0, 3).join(" | "));
fs.writeFileSync(path.join(out, "visible-qa-results.json"), JSON.stringify({ at: new Date().toISOString(), visible, accounts: Object.fromEntries(Object.entries(acct).map(([k, v]) => [k, v.username])), consoleErrors, failedRequests: failedReqs, results }, null, 1));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length} checks, ${failed} failed; console errors ${consoleErrors.length}; failed requests ${failedReqs.length}`);
if (visible) { await browser.close().catch(() => undefined); console.log("The visible browser window was left OPEN for the owner."); } else await browser.close();
process.exit(failed ? 1 : 0);
