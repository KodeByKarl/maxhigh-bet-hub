// Builds preflight-format text from a DISPOSABLE pre-0005 database so scripts/qa/compare-ledger.mjs can be exercised offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mysql from "mysql2/promise";
const release = process.argv[2], outFile = process.argv[3], mode = process.argv[4] ?? "ok";
const root = await mysql.createConnection({ host: "127.0.0.1", port: 19308, user: "root", password: "binlogRoot1" });
const [[d]] = await root.query("SELECT @@datadir AS d"); if (!/m1011E/i.test(d.d)) throw new Error("refusing: not the disposable instance");
await root.query("DROP DATABASE IF EXISTS pf_demo"); await root.query("CREATE DATABASE pf_demo CHARACTER SET utf8mb4");
const c = await mysql.createConnection({ host: "127.0.0.1", port: 19308, user: "root", password: "binlogRoot1", database: "pf_demo" });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-"));
for (const f of fs.readdirSync(path.join(release, "drizzle")).filter((x) => /^000[0-4]_.*\.sql$/.test(x))) fs.copyFileSync(path.join(release, "drizzle", f), path.join(tmp, f));
fs.cpSync(path.join(release, "drizzle", "meta"), path.join(tmp, "meta"), { recursive: true });
const { migrate } = await import(pathToFileURL(path.resolve(release, "scripts/migrate.mjs")).href);
await migrate(c, { apply: true, directory: tmp });
if (mode === "crlf") await c.query("UPDATE _maxhigh_migrations SET checksum = REPEAT('a',64) WHERE version LIKE '0001%'");   // simulate a CRLF-based ledger
const rows = (await c.query("SELECT version, checksum, applied_at FROM _maxhigh_migrations ORDER BY version"))[0];
const [vars] = await root.query("SHOW VARIABLES WHERE Variable_name IN ('log_bin','log_bin_trust_function_creators')");
const text = ["== VERSION", (await root.query("SELECT VERSION() v"))[0][0].v, "== VARIABLES", ...vars.map((v) => `${v.Variable_name}\t${v.Value}`),
  "== MIGRATION LEDGER (version <TAB> checksum <TAB> applied_at)", ...rows.map((r) => `${r.version}\t${r.checksum}\t${r.applied_at.toISOString()}`),
  "== SCHEMA STATE for 0005 (all three must be EMPTY before migrating)", "", "== EXISTING TRIGGERS in pf_demo", "", "== GRANTS", "GRANT ALL PRIVILEGES ON `maxhigh_staging`.* TO `maxhigh_migrator`@`localhost`", "== done"].join("\n");
fs.writeFileSync(outFile, text); await c.end(); await root.query("DROP DATABASE pf_demo"); await root.end(); console.log("wrote", outFile, rows.length, "ledger rows");
