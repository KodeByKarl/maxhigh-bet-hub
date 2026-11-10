// Database-layer tests for migration 0005 (account classes, client-cap trigger, entitlement tables) on a DISPOSABLE MariaDB
// (127.0.0.1:19307). Never touches any other server. Run: node scripts/test-restrictions-db.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { migrate } from "./migrate.mjs";

const cfg = { host: "127.0.0.1", port: 19307, user: "root", password: process.env.CLONE_ROOT_PW ?? "audit-local-only" };
const results = [];
const test = async (name, fn) => { try { await fn(); results.push({ name, ok: true }); console.log("PASS", name); } catch (e) { results.push({ name, ok: false, err: e.message }); console.log("FAIL", name, "-", e.message.split("\n")[0]); } };
const root = await mysql.createConnection(cfg);
const [[{ d }]] = (await root.query("SELECT @@datadir AS d"));
if (!/m1011|scratchpad/i.test(d)) throw new Error("refusing: not the disposable MariaDB instance");
const conn = async (database) => mysql.createConnection({ ...cfg, database, multipleStatements: false });
async function freshDb(name, withFiles) {
  await root.query(`DROP DATABASE IF EXISTS ${name}`);
  await root.query(`CREATE DATABASE ${name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const c = await conn(name);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mig-"));
  for (const f of withFiles) fs.copyFileSync(path.join("drizzle", f), path.join(dir, f));
  fs.cpSync("drizzle/meta", path.join(dir, "meta"), { recursive: true });
  await migrate(c, { apply: true, directory: dir });
  return c;
}
const all = fs.readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();
const before = all.filter((f) => !f.startsWith("0005"));
const addUser = (c, name, role = "player", extra = {}) => c.query("INSERT INTO users(id,public_user_id,username,password_hash,balance,role,display_name) VALUES (?,?,?,?,?,?,?)", [randomUUID(), name, name, "x".repeat(60), extra.balance ?? 0, role, name]);
const snapshot = async (c) => createHash("sha256").update(JSON.stringify((await c.query("SELECT id,public_user_id,username,password_hash,balance,role,is_locked,created_at FROM users ORDER BY id"))[0])).digest("hex");

// ---------------------------------------------------------------- upgrade from the UAT-like pre-0005 state
let up = await freshDb("restr_upgrade", before);
await addUser(up, "uat_owner", "superadmin");
for (let i = 1; i <= 5; i++) await addUser(up, `uat_player${i}`, "player", { balance: 100000 });
const uBefore = await snapshot(up);
const migs = all.map((f) => path.join("drizzle", f));
await migrate(up, { apply: true, directory: "drizzle" });

await test("0005 applies on a pre-0005 database with users, preserving every existing user row byte-for-byte", async () => {
  assert.equal(await snapshot(up), uBefore);
  assert.equal((await up.query("SELECT COUNT(*) n FROM users"))[0][0].n, 6);
});
await test("superadmin classified admin, players default to client (QA classification is an explicit developer step)", async () => {
  const rows = (await up.query("SELECT username, account_class FROM users ORDER BY username"))[0];
  assert.equal(rows.find((r) => r.username === "uat_owner").account_class, "admin");
  assert.ok(rows.filter((r) => r.username.startsWith("uat_player")).every((r) => r.account_class === "client"));
});
await test("restrictions ship INACTIVE: enforced = no, max = 2, trigger does not block inserts", async () => {
  const [[lim]] = await up.query("SELECT max_client_accounts m, enforced e FROM account_limits WHERE id='default'");
  assert.deepEqual([lim.m, lim.e], [2, "no"]);
  await addUser(up, "extra_while_inactive");
  await up.query("DELETE FROM users WHERE username='extra_while_inactive'");
});
await test("account_class cannot be changed without the developer session flag", async () => {
  await assert.rejects(up.query("UPDATE users SET account_class='qa' WHERE username='uat_player1'"), /ACCOUNT_CLASS_IMMUTABLE/);
  await assert.rejects(up.query("UPDATE users SET account_class='admin' WHERE username='uat_player1'"), /ACCOUNT_CLASS_IMMUTABLE/);
});
await test("developer classification step (session flag) marks the 5 synthetic players qa without touching any other column", async () => {
  const pre = await snapshot(up);
  await up.query("SET @maxhigh_class_admin = 1");
  await up.query("UPDATE users SET account_class='qa' WHERE username LIKE 'uat\\_player%'");
  await up.query("SET @maxhigh_class_admin = 0");
  assert.equal(await snapshot(up), pre);
  assert.equal((await up.query("SELECT COUNT(*) n FROM users WHERE account_class='qa'"))[0][0].n, 5);
});
await test("when enforced: first and second client accounts are allowed, the third is rejected", async () => {
  await up.query("UPDATE account_limits SET enforced='yes' WHERE id='default'");
  await addUser(up, "client_one"); await addUser(up, "client_two");
  await assert.rejects(addUser(up, "client_three"), /CLIENT_ACCOUNT_LIMIT/);
  assert.equal((await up.query("SELECT COUNT(*) n FROM users WHERE account_class='client'"))[0][0].n, 2);
});
await test("existing admin and qa accounts keep working (rows intact, balances untouched) while the cap is enforced", async () => {
  await up.query("UPDATE users SET display_name='still ok' WHERE username IN ('uat_owner','uat_player3')");
  assert.equal((await up.query("SELECT balance FROM users WHERE username='uat_player3'"))[0][0].balance, "100000.00");
});
await test("a disabled (admin-locked) client frees a slot; re-enabling it when full is rejected", async () => {
  const owner = (await up.query("SELECT id FROM users WHERE username='uat_owner'"))[0][0].id;
  await up.query("UPDATE users SET is_locked='yes', locked_by=?, locked_until=NOW() + INTERVAL 1 YEAR WHERE username='client_two'", [owner]);
  await addUser(up, "client_replacement");                                     // slot freed by the disabled account
  await assert.rejects(up.query("UPDATE users SET is_locked='no' WHERE username='client_two'"), /CLIENT_ACCOUNT_LIMIT/);
});
await test("lifting the cap (limit raised by a developer step) allows another client", async () => {
  await up.query("UPDATE account_limits SET max_client_accounts=3 WHERE id='default'");
  await addUser(up, "client_third_after_lift");
});

await test("trigger-maintained counter equals the real number of active client accounts after inserts, locks, unlocks and deletes", async () => {
  await up.query("DELETE FROM users WHERE username='client_third_after_lift'");
  const [[c]] = await up.query("SELECT active_clients a FROM account_limits WHERE id='default'");
  const [[r]] = await up.query("SELECT COUNT(*) n FROM users WHERE account_class='client' AND NOT (is_locked='yes' AND locked_by IS NOT NULL)");
  assert.equal(c.a, r.n);
});

// ---------------------------------------------------------------- concurrency on a fresh schema
const conc = await freshDb("restr_conc", all);
await conc.query("UPDATE account_limits SET enforced='yes', max_client_accounts=2 WHERE id='default'");
await test("20 concurrent client creations on separate connections -> exactly 2 succeed, the rest are rejected by the cap", async () => {
  const conns = await Promise.all(Array.from({ length: 20 }, () => conn("restr_conc")));
  const out = await Promise.allSettled(conns.map((c, i) => addUser(c, `race_${i}`)));
  await Promise.all(conns.map((c) => c.end()));
  const ok = out.filter((o) => o.status === "fulfilled").length;
  const bad = out.filter((o) => o.status === "rejected").map((o) => o.reason.message);
  assert.equal(ok, 2, `succeeded=${ok}; failures=${[...new Set(bad)].join(" | ")}`);
  assert.ok(bad.every((m) => /CLIENT_ACCOUNT_LIMIT|Deadlock|Lock wait/.test(m)), "unexpected failure kind: " + bad.find((m) => !/CLIENT_ACCOUNT_LIMIT|Deadlock|Lock wait/.test(m)));
  assert.equal((await conc.query("SELECT COUNT(*) n FROM users"))[0][0].n, 2);
  assert.equal((await conc.query("SELECT active_clients a FROM account_limits WHERE id='default'"))[0][0].a, 2);
});

// ---------------------------------------------------------------- entitlement table
await test("entitlement_grants rejects a replayed nonce", async () => {
  const row = (n) => conc.query("INSERT INTO entitlement_grants(id,nonce,kind,payload,signature,key_id,applied_by_username) VALUES (?,?,?,?,?,?,?)", [randomUUID(), n, "unlock-games", "{}", "sig", "k1", "tester"]);
  await row("nonce-1");
  await assert.rejects(row("nonce-1"), /Duplicate/);
});

// ---------------------------------------------------------------- 0005 is re-runnable: no half-applied state is possible
const statements = fs.readFileSync("drizzle/0005_account_classes_and_entitlements.sql", "utf8").split("--> statement-breakpoint").map((x) => x.trim()).filter(Boolean);
const triggersOf = async (c) => (await c.query("SHOW TRIGGERS"))[0].map((t) => t.Trigger).sort().join(",");
await test("executing every 0005 statement a second and third time succeeds and changes nothing (idempotent)", async () => {
  const rr = await freshDb("restr_rerun", before);
  await addUser(rr, "keep_a", "player", { balance: 10 }); await addUser(rr, "keep_s", "superadmin");
  for (const s of statements) await rr.query(s);
  const snap = await snapshot(rr), trg = await triggersOf(rr);
  const lim = (await rr.query("SELECT max_client_accounts m, enforced e, active_clients a FROM account_limits"))[0][0];
  for (let i = 0; i < 2; i++) for (const s of statements) await rr.query(s);
  assert.equal(await snapshot(rr), snap);
  assert.equal(await triggersOf(rr), trg);
  assert.deepEqual((await rr.query("SELECT max_client_accounts m, enforced e, active_clients a FROM account_limits"))[0][0], lim);
  assert.equal((await rr.query("SELECT COUNT(*) n FROM account_limits"))[0][0].n, 1);
  await rr.end();
});
await test("a migration that failed midway (tables created, triggers missing) converges when simply re-run", async () => {
  const mf = await freshDb("restr_midfail", before);
  await addUser(mf, "keep_a", "player", { balance: 5 });
  // simulate failure at the first CREATE TRIGGER: everything before it applied, nothing after
  const firstTrigger = statements.findIndex((s) => /^CREATE OR REPLACE TRIGGER/i.test(s));
  for (const s of statements.slice(0, firstTrigger)) await mf.query(s);
  assert.equal(await triggersOf(mf), "");
  const snap = await snapshot(mf);
  for (const s of statements) await mf.query(s);                                  // the operator fixes the cause and re-runs
  assert.equal((await triggersOf(mf)).split(",").length, 5);
  assert.equal(await snapshot(mf), snap);
  await mf.query("UPDATE account_limits SET enforced='yes', max_client_accounts=1 WHERE id='default'");
  await assert.rejects(addUser(mf, "second_client"), /CLIENT_ACCOUNT_LIMIT/);     // the recovered triggers really enforce
  await mf.end();
});

// ---------------------------------------------------------------- rollback leaves the pre-0005 schema and data intact
await test("rollback (drop triggers, tables, column) restores the pre-0005 shape without altering user data", async () => {
  const rb = await freshDb("restr_rollback", before);
  await addUser(rb, "keep_me", "player", { balance: 42.5 });
  const pre = await snapshot(rb);
  const cols0 = (await rb.query("SHOW COLUMNS FROM users"))[0].map((r) => r.Field).join(",");
  await migrate(rb, { apply: true, directory: "drizzle" });
  for (const s of ["DROP TRIGGER users_client_cap_bi", "DROP TRIGGER users_client_cap_ai", "DROP TRIGGER users_client_cap_au", "DROP TRIGGER users_client_cap_ad", "DROP TRIGGER users_class_guard_bu", "DROP TABLE entitlement_grants", "DROP TABLE account_limits", "ALTER TABLE users DROP COLUMN account_class", "DELETE FROM _maxhigh_migrations WHERE version LIKE '0005%'"]) await rb.query(s);
  assert.equal((await rb.query("SHOW COLUMNS FROM users"))[0].map((r) => r.Field).join(","), cols0);
  assert.equal(await snapshot(rb), pre);
  await rb.end();
});

for (const c of [up, conc]) await c.end();
await root.end();
const failed = results.filter((r) => !r.ok);
fs.mkdirSync(process.env.OUT ?? "audit/remediation/evidence", { recursive: true });
fs.writeFileSync(path.join(process.env.OUT ?? "audit/remediation/evidence", "restrictions-db-results.json"), JSON.stringify({ at: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 1));
console.log(`\n${results.length} tests, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
