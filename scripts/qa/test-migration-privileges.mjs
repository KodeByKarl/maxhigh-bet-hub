// Determines the MINIMUM privileges for migration 0005 by reproducing the VPS's exact grants on a DISPOSABLE MariaDB (19307, binlog OFF
// like the VPS). Never touches any other server. Usage: node scripts/qa/test-migration-privileges.mjs <releaseDir>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mysql from "mysql2/promise";

const release = process.argv[2] ?? ".";
const root = await mysql.createConnection({ host: "127.0.0.1", port: 19307, user: "root", password: "audit-local-only" });
const [[d]] = await root.query("SELECT @@datadir AS d, @@log_bin AS lb"); if (!/m1011C/i.test(d.d)) throw new Error("refusing: not the disposable instance");
const out = []; const note = (k, v) => { out.push([k, v]); console.log(k.padEnd(78), v); };
note("server", `binlog ${d.lb ? "ON" : "OFF"} (VPS: OFF)`);
const DB = "priv_t";
const statements = fs.readFileSync(path.join(release, "drizzle/0005_account_classes_and_entitlements.sql"), "utf8").split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);

async function freshDb() {
  await root.query(`DROP DATABASE IF EXISTS ${DB}`); await root.query(`CREATE DATABASE ${DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const c = await mysql.createConnection({ host: "127.0.0.1", port: 19307, user: "root", password: "audit-local-only", database: DB });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pv-"));
  for (const f of fs.readdirSync(path.join(release, "drizzle")).filter((x) => /^000[0-3]_.*\.sql$/.test(x))) fs.copyFileSync(path.join(release, "drizzle", f), path.join(tmp, f));   // VPS ledger state: 0000-0003
  fs.cpSync(path.join(release, "drizzle/meta"), path.join(tmp, "meta"), { recursive: true });
  const { migrate } = await import(pathToFileURL(path.resolve(release, "scripts/migrate.mjs")).href);
  await migrate(c, { apply: true, directory: tmp });
  await c.query("INSERT INTO users(id,public_user_id,username,password_hash,balance,role) VALUES ('u1','u1','keep_me','x',5,'player')");
  return c;
}
const user = async (name, grants, extra = []) => {
  await root.query(`DROP USER IF EXISTS '${name}'@'127.0.0.1'`); await root.query(`CREATE USER '${name}'@'127.0.0.1' IDENTIFIED BY 'pw-${name}-test'`);
  await root.query(`GRANT ${grants} ON ${DB}.* TO '${name}'@'127.0.0.1'`); for (const g of extra) await root.query(g);
  return mysql.createConnection({ host: "127.0.0.1", port: 19307, user: name, password: `pw-${name}-test`, database: DB });
};
const run = async (c) => { let n = 0; for (const s of statements) { try { await c.query(s); n++; } catch (e) { return { n, err: `${e.code}: ${e.sqlMessage}`.slice(0, 160) }; } } return { n, err: null }; };
const VPS_MIGRATE = "SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER";   // exactly what SHOW GRANTS printed

const c0 = await freshDb();
let mig = await user("maxhigh_stage_migrate", VPS_MIGRATE);
const r1 = await run(mig);
note("1. VPS migrate account AS IS (no TRIGGER)", r1.err ? `FAILS at statement ${r1.n + 1} of ${statements.length}: ${r1.err}` : "succeeds (unexpected)");
note("   everything before the first trigger applied?", `${r1.n} statements ok; triggers now ${(await c0.query("SHOW TRIGGERS"))[0].length}`);
// minimum: TRIGGER on the one table all 5 triggers belong to
await root.query(`GRANT TRIGGER ON ${DB}.users TO 'maxhigh_stage_migrate'@'127.0.0.1'`);
mig = await mysql.createConnection({ host: "127.0.0.1", port: 19307, user: "maxhigh_stage_migrate", password: "pw-maxhigh_stage_migrate-test", database: DB });
const r2 = await run(mig);
note("2. + TRIGGER on <schema>.users ONLY (table-scoped, narrower than database-scoped)", r2.err ? `FAILS: ${r2.err}` : `succeeds; triggers ${(await c0.query("SHOW TRIGGERS"))[0].length}`);
const defs = (await c0.query("SELECT DISTINCT DEFINER d FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=?", [DB]))[0].map((x) => x.d);
note("   trigger DEFINER", defs.join(", "));
const [[lim]] = await c0.query("SELECT enforced e, max_client_accounts m, active_clients a FROM account_limits WHERE id='default'");
note("   shipped state", `enforced=${lim.e} max=${lim.m} active=${lim.a} (counts the existing client rows)`);
// revoke the temporary grant; triggers must keep working for the app account (they run with the DEFINER's other privileges)
await root.query(`REVOKE TRIGGER ON ${DB}.users FROM 'maxhigh_stage_migrate'@'127.0.0.1'`);
const gr = (await root.query("SHOW GRANTS FOR 'maxhigh_stage_migrate'@'127.0.0.1'"))[0].map((r) => Object.values(r)[0]).join(" | ");
note("3. after REVOKE TRIGGER: migrate account grants", /TRIGGER/.test(gr) ? "STILL HAS TRIGGER" : "no TRIGGER (back to the original set)");
const app = await user("maxhigh_uat_app", "SELECT, INSERT, UPDATE, DELETE");
let afterRevoke = "works"; try { await app.query("INSERT INTO users(id,public_user_id,username,password_hash,balance,role) VALUES ('u2','u2','newbie','x',0,'player')"); await app.query("UPDATE users SET balance=10 WHERE id='u2'"); } catch (e) { afterRevoke = `FAILS: ${e.code}: ${e.sqlMessage}`.slice(0, 170); }
note("   !! the app account writes a user AFTER the temporary TRIGGER grant was revoked", afterRevoke);
note("4. CONSEQUENCE", /FAILS/.test(afterRevoke) ? "the DEFINER keeps needing TRIGGER: revoking it breaks every statement that fires a trigger (user inserts and all wallet balance updates). DO NOT revoke." : "revocation is harmless (unexpected)");
// 5. the recommended path: apply 0005 as ROOT (trigger DEFINER = root@localhost). No grant to revoke, no dependency on the migrate account.
const c5 = await freshDb(); const rootRun = await run(c5);
note("5. RECOMMENDED: 0005 applied by root (privileged run, no grant)", rootRun.err ? `FAILS: ${rootRun.err}` : `succeeds; DEFINER(s): ${(await c5.query("SELECT DISTINCT DEFINER d FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=?", [DB]))[0].map((x) => x.d).join(", ")}`);
await root.query("DROP USER IF EXISTS 'maxhigh_stage_migrate'@'127.0.0.1'");
const app2 = await user("maxhigh_uat_app", "SELECT, INSERT, UPDATE, DELETE");
await app2.query("INSERT INTO users(id,public_user_id,username,password_hash,balance,role) VALUES ('u7','u7','ok1','x',0,'player')"); await app2.query("UPDATE users SET balance=7 WHERE id='u7'");
await root.query("UPDATE priv_t.account_limits SET enforced='yes', max_client_accounts=2 WHERE id='default'");
let blocked5 = false; try { await app2.query("INSERT INTO users(id,public_user_id,username,password_hash,balance,role) VALUES ('u8','u8','x8','x',0,'player'),('u9','u9','x9','x',0,'player')"); } catch (e) { blocked5 = /CLIENT_ACCOUNT_LIMIT/.test(e.message); }
note("   with NO migrate account at all: app writes work; triggers enforce when enabled", blocked5 ? "yes" : "NO");
await root.query("UPDATE priv_t.account_limits SET enforced='no' WHERE id='default'");
await c5.end(); await app2.end();
await root.query(`DROP DATABASE ${DB}`); await root.query("DROP USER IF EXISTS 'maxhigh_uat_app'@'127.0.0.1'");
for (const c of [c0, mig, app]) await c.end().catch(() => {}); await root.end();
fs.writeFileSync(process.env.OUT ?? "migration-privileges.json", JSON.stringify(out, null, 1));
