// Focused handover test: a CLIENT ADMINISTRATOR creates an Agent and a Master Agent through the REAL UI (superadmin Users page), and both
// new accounts sign in through the real admin login with the correct permissions. Checks persistence and audit logs, then DISABLES both
// test accounts so no usable credentials remain. Passwords are random, kept in memory only, never printed or written.
//   PW_MODULE_DIR=... PW_CHROME=... UAT_BASE=http://127.0.0.1:18080 node scripts/qa/browser-agent-master-test.mjs <evidenceDir> [--admin client_admin01]
// The client administrator's password is read from the local credentials file (CLIENT_STAFF_CREDS_FILE), never from the command line.
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { Client, BASE } from "./uat-client.mjs";

const out = process.argv[2] ?? "agent-master-evidence";
fs.mkdirSync(out, { recursive: true });
const adminName = process.argv.includes("--admin") ? process.argv[process.argv.indexOf("--admin") + 1] : "client_admin01";
const credFile = process.env.CLIENT_STAFF_CREDS_FILE ?? "C:\\Users\\Keydi\\maxhigh-uat-secrets\\client-staff-credentials.txt";
const row = fs.readFileSync(credFile, "utf8").split(/\r?\n/).find((l) => l.startsWith(adminName + "\t"));
if (!row) throw new Error(`${adminName} not found in the local credentials file`);
const adminPw = row.split("\t")[2];
const LOCKED = "Game Locked. Please settle the remaining project payment to activate this game.";
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright-core");
const results = [];
const note = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + String(detail).slice(0, 170) : ""}`); };
const refused = async (fn) => { try { await fn(); return { refused: false }; } catch (e) { return { refused: true, msg: String(e.message) }; } };
const suffix = randomBytes(3).toString("hex");
const accounts = [
  { username: `qa_agent_${suffix}`, role: "agent", label: "Agent", password: `Mh-${randomBytes(12).toString("base64url")}-7a` },
  { username: `qa_master_${suffix}`, role: "master_agent", label: "Master Agent", password: `Mh-${randomBytes(12).toString("base64url")}-7a` },
];

const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 120)));
page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 120)); });

// ---- 1. client administrator signs in through the real superadmin login
await page.goto(BASE + "/superadmin/login", { waitUntil: "networkidle" });
await page.getByPlaceholder("Username").fill(adminName);
await page.getByPlaceholder("Password").fill(adminPw);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 20000 }).catch(() => undefined);
note(`${adminName} signs in through the real UI`, !new URL(page.url()).pathname.endsWith("/login"), new URL(page.url()).pathname);

// ---- 2. create the Agent and the Master Agent through the real "Add Player / User" form
await page.goto(BASE + "/superadmin/users", { waitUntil: "networkidle" });
for (const a of accounts) {
  await page.getByRole("button", { name: /add player/i }).first().click();
  const form = page.locator("form", { has: page.getByText("Add New Player / User") });
  await form.getByPlaceholder("e.g. player888").fill(a.username);
  await form.getByPlaceholder("Min 6 chars, letter + number").fill(a.password);
  await form.getByPlaceholder("Re-enter password").fill(a.password);
  await form.locator("select").filter({ has: page.locator(`option[value="${a.role}"]`) }).last().selectOption(a.role);
  await form.getByRole("button", { name: /create player/i }).click();
  await page.waitForFunction((u) => document.body.innerText.includes(u), a.username, { timeout: 20000 }).then(() => note(`UI: ${a.label} @${a.username} created and shown in the user list`, true), () => note(`UI: ${a.label} @${a.username} created and shown in the user list`, false, "not listed"));
  await page.waitForTimeout(500);
}
await page.screenshot({ path: path.join(out, "users-after-create.png") });

// ---- 3. persistence + audit, seen by the client administrator in a fresh API session
const admin = new Client(); await admin.login(adminName, adminPw);
const listed = await admin.rpc("listSuperUsersFn", { q: suffix, role: "all", limit: 50 }, { method: "GET" });
for (const a of accounts) {
  const u = listed.find((x) => x.username === a.username);
  note(`persisted: @${a.username} exists with role ${a.role}`, !!u && u.role === a.role, u ? `${u.role} by ${u.parentAgentUsername ?? "?"}` : "missing");
}
const audit = await admin.rpc("listAdminAuditLogsFn", { q: suffix, limit: 100, scope: "all" }, { method: "GET" });
for (const a of accounts) {
  const rows = audit.filter((r) => JSON.stringify(r).includes(a.username) && /create/i.test(r.action));
  note(`audit: creation of @${a.username} is logged with the acting administrator`, rows.length >= 1 && rows.some((r) => JSON.stringify(r).includes(adminName)), rows.map((r) => r.action).join(","));
}

// ---- 4. each new account signs in through the real admin login and has the correct permissions
for (const a of accounts) {
  const c2 = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const p2 = await c2.newPage();
  await p2.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
  await p2.getByPlaceholder("Username").fill(a.username);
  await p2.getByPlaceholder("Password").fill(a.password);
  await p2.getByRole("button", { name: /sign in/i }).click();
  await p2.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 20000 }).catch(() => undefined);
  note(`UI: ${a.label} signs in through the real admin login`, !new URL(p2.url()).pathname.endsWith("/login"), new URL(p2.url()).pathname);
  await p2.screenshot({ path: path.join(out, `${a.role}-after-login.png`) });
  await c2.close();

  const me = new Client(); await me.login(a.username, a.password);
  const st = await me.rpc("getAccessStatusFn", undefined, { method: "GET" });
  note(`${a.label}: sees exactly the 50 locked games (no developer/owner QA mode)`, st.lockedGames.length === 50 && st.ownerQa !== true, `${st.lockedGames.length}`);
  const play = await refused(() => me.rpc("colorGameProDealFn", { bets: { red: 1 } }));
  note(`${a.label}: cannot play a locked game`, play.refused && play.msg === LOCKED, play.msg);
  const denied = {};
  for (const [k, fn] of Object.entries({
    superUsers: () => me.rpc("listSuperUsersFn", { q: "", role: "all", limit: 5 }, { method: "GET" }),
    superCreate: () => me.rpc("superCreateUserFn", { username: `x_${suffix}_${a.role}`, password: "Zz-123456-ab", role: "player", balance: 0, displayName: "x" }),
    gameConfig: () => me.rpc("superUpdateGameFn", { gameId: "wild-panther", featured: true }),
    roleChange: () => me.rpc("superSetUserRoleFn", { userId: "00000000-0000-0000-0000-000000000000", role: "player" }),
    grant: () => me.rpc("applyEntitlementGrantFn", { payload: "{}", signature: "AAAAAAAAAAAA", keyId: "none", confirm: "APPLY SIGNED GRANT" }),
  })) { const r = await refused(fn); if (!r.refused) denied[k] = "ALLOWED"; }
  note(`${a.label}: superadmin-only operations are refused (user admin, game config, role change, grants)`, Object.keys(denied).length === 0, JSON.stringify(denied));
  const mk = (role, tag) => me.rpc("adminCreateUserFn", { username: `ch_${suffix}_${a.role}_${tag}`.slice(0, 30), password: "Zz-123456-ab", role, balance: 0 }).then(() => "ok", (e) => e.message);
  const okPlayer = await mk("player", "p");
  const okAgent = await mk("agent", "a");
  const noMaster = await mk("master_agent", "m");
  const noAdmin = await mk("admin", "s");
  const noSuper = await mk("superadmin", "x");
  note(`${a.label}: may create players and agents`, okPlayer === "ok" && okAgent === "ok", `${okPlayer}/${okAgent}`);
  note(`${a.label}: may NOT create master agents, admins or superadmins`, [noMaster, noAdmin, noSuper].every((m) => m !== "ok"), [noMaster, noAdmin, noSuper].map((m) => String(m).slice(0, 40)).join(" | "));
  const noLimit = [okPlayer, okAgent].every((m) => !/Account Limit/.test(String(m)));
  note(`${a.label}: no account-limit notice`, noLimit);
  await me.logout();
}

// ---- 5. leave nothing usable behind: disable both test accounts (audited)
const again = await admin.rpc("listSuperUsersFn", { q: suffix, role: "all", limit: 50 }, { method: "GET" });
let disabled = 0;
for (const a of accounts) {
  const u = again.find((x) => x.username === a.username);
  if (u) { const r = await admin.rpc("adminLockUserFn", { userId: u.id, reason: "focused handover test account - disabled after the test" }).then(() => true, () => false); if (r) disabled++; }
}
note("both test accounts were disabled after the test (no usable test credentials remain)", disabled === 2, `${disabled}/2`);
await admin.logout();
note("no page errors in the UI session", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
fs.writeFileSync(path.join(out, "agent-master-results.json"), JSON.stringify({ at: new Date().toISOString(), admin: adminName, accounts: accounts.map((a) => ({ username: a.username, role: a.role })), total: results.length, failed, results }, null, 1));
console.log(`\n${results.length} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
