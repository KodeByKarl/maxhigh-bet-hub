// Reproduces the VPS risk locally on a DISPOSABLE MariaDB 10.11.14 started with --log-bin (127.0.0.1:19308 only):
// does migration 0005 (CREATE TRIGGER) fail for a non-SUPER migration account when binary logging is ON?
// Read-only with respect to everything except that disposable server. Usage: node scripts/qa/test-binlog-trigger.mjs <releaseDir>
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import mysql from "mysql2/promise";

const release = process.argv[2] ?? ".";
const root = await mysql.createConnection({ host: "127.0.0.1", port: 19308, user: "root", password: "binlogRoot1" });
const [[d]] = await root.query("SELECT @@datadir AS d, @@log_bin AS lb, @@log_bin_trust_function_creators AS trust, VERSION() AS v");
if (!/m1011E/i.test(d.d)) throw new Error("refusing: not the disposable binlog instance");
const out = []; const note = (k, v) => { out.push([k, v]); console.log(k.padEnd(62), v); };
note("server", `${d.v}; log_bin=${d.lb}; log_bin_trust_function_creators=${d.trust}`);
const statements = (f) => fs.readFileSync(path.join(release, "drizzle", f), "utf8").split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
const pre = fs.readdirSync(path.join(release, "drizzle")).filter((f) => /^000[0-4]_.*\.sql$/.test(f)).sort();

async function fresh(name) {
  await root.query(`DROP DATABASE IF EXISTS ${name}`); await root.query(`CREATE DATABASE ${name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const c = await mysql.createConnection({ host: "127.0.0.1", port: 19308, user: "root", password: "binlogRoot1", database: name });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mig-"));
  for (const f of pre) fs.copyFileSync(path.join(release, "drizzle", f), path.join(tmp, f));
  fs.cpSync(path.join(release, "drizzle", "meta"), path.join(tmp, "meta"), { recursive: true });
  const { migrate } = await import(pathToFileURL(path.resolve(release, "scripts/migrate.mjs")).href);
  await migrate(c, { apply: true, directory: tmp });
  await c.query("INSERT INTO users(id,public_user_id,username,password_hash,balance,role) VALUES ('u1','u1','keep_me','x',5,'player')");
  return c;
}
async function asMigrationUser(name, grants) {
  await root.query("DROP USER IF EXISTS 'mig'@'127.0.0.1'"); await root.query("CREATE USER 'mig'@'127.0.0.1' IDENTIFIED BY 'mig-test-pw'");
  await root.query(`GRANT ${grants} ON ${name}.* TO 'mig'@'127.0.0.1'`);
  return mysql.createConnection({ host: "127.0.0.1", port: 19308, user: "mig", password: "mig-test-pw", database: name });
}
async function run005(c) {
  const done = []; for (const s of statements("0005_account_classes_and_entitlements.sql")) { try { await c.query(s); done.push("ok"); } catch (e) { return { done, error: `${e.code}: ${e.sqlMessage}`.slice(0, 200) }; } }
  return { done, error: null };
}
const triggers = async (c) => (await c.query("SHOW TRIGGERS"))[0].length;

// 1. non-SUPER account with every normal privilege INCLUDING TRIGGER, binary log ON, trust_function_creators OFF
await root.query("SET GLOBAL log_bin_trust_function_creators = 0");
let c1 = await fresh("binlog_t1"); const m1 = await asMigrationUser("binlog_t1", "ALL PRIVILEGES");
const r1 = await run005(m1);
note("1. non-SUPER account (ALL on schema incl. TRIGGER), binlog ON, trust OFF", r1.error ? `FAILS at statement ${r1.done.length + 1}: ${r1.error}` : "succeeds");
note("   state after the failure (column/tables exist, triggers missing)", `${(await c1.query("SHOW COLUMNS FROM users LIKE 'account_class'"))[0].length ? "column yes" : "column no"}; tables ${(await c1.query("SHOW TABLES LIKE 'account_%'"))[0].length}; triggers ${await triggers(c1)}`);
// 2. re-run after the cause is fixed (owner-approved setting), same account
await root.query("SET GLOBAL log_bin_trust_function_creators = 1");
const r2 = await run005(m1);
note("2. re-run by the same account after log_bin_trust_function_creators=1", r2.error ? `FAILS: ${r2.error}` : `succeeds; triggers now ${await triggers(c1)}; user row intact: ${(await c1.query("SELECT balance FROM users WHERE id='u1'"))[0][0].balance === "5.00"}`);
// 3. a SUPER-capable migration account on the strict setting
await root.query("SET GLOBAL log_bin_trust_function_creators = 0");
await fresh("binlog_t3"); await root.query("DROP USER IF EXISTS 'migsuper'@'127.0.0.1'"); await root.query("CREATE USER 'migsuper'@'127.0.0.1' IDENTIFIED BY 'x-test-pw'"); await root.query("GRANT ALL PRIVILEGES ON binlog_t3.* TO 'migsuper'@'127.0.0.1'"); await root.query("GRANT SUPER ON *.* TO 'migsuper'@'127.0.0.1'");
const m3 = await mysql.createConnection({ host: "127.0.0.1", port: 19308, user: "migsuper", password: "x-test-pw", database: "binlog_t3" });
const r3 = await run005(m3);
note("3. account WITH SUPER, binlog ON, trust OFF (no server setting changed)", r3.error ? `FAILS: ${r3.error}` : "succeeds");
// 4. the app account (no TRIGGER/ALTER) cannot be the migration account
await fresh("binlog_t4"); const m4 = await asMigrationUser("binlog_t4", "SELECT, INSERT, UPDATE, DELETE");
const r4 = await run005(m4);
note("4. app-style account (SELECT/INSERT/UPDATE/DELETE only) as migration account", r4.error ? `refused: ${r4.error}` : "unexpectedly succeeded");
// 5. runtime check: with triggers present and binlog ON, a normal app-style insert/update still works
const app = await mysql.createConnection({ host: "127.0.0.1", port: 19308, user: "root", password: "binlogRoot1", database: "binlog_t3" });
await app.query("INSERT INTO users(id,public_user_id,username,password_hash,balance,role) VALUES ('u2','u2','client_a','x',0,'player')");
await app.query("UPDATE users SET balance=10 WHERE id='u2'");
note("5. normal inserts/updates with triggers installed and binlog ON", "work (no enforcement while enforced='no')");
for (const c of [c1, m1, m3, m4, app]) await c.end().catch(() => {});
await root.end();
fs.writeFileSync(process.env.OUT ?? "binlog-trigger-results.json", JSON.stringify(out, null, 1));
