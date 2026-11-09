// Disposable LOCAL clone of the UAT setup for proving QA tooling before it touches UAT.
//   CLONE_ROOT_PW=... node scripts/qa/local-clone.mjs setup     (MariaDB on 127.0.0.1:19307, app on 127.0.0.1:18081)
//   node scripts/qa/local-clone.mjs teardown
// The clone has: migrated schema, the approved UAT-only risk row, uat_owner (superadmin) and uat_player (1000.00) with random passwords
// in a temp credentials file, platform_settings + jackpot rows. It is never reachable from outside this machine.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { hash } from "bcryptjs";

const PORT = Number(process.env.CLONE_DB_PORT ?? 19307), APP_PORT = Number(process.env.CLONE_APP_PORT ?? 18081);
const ROOT_PW = process.env.CLONE_ROOT_PW, DB = "qa_clone";
const state = path.join(os.tmpdir(), "qa-clone.json");
const conn = (database) => mysql.createConnection({ host: "127.0.0.1", port: PORT, user: "root", password: ROOT_PW, database, multipleStatements: false });

async function teardown() {
  if (fs.existsSync(state)) {
    const s = JSON.parse(fs.readFileSync(state, "utf8"));
    try { if (s.pid) process.kill(s.pid); } catch { /* already gone */ }
    if (s.dir) fs.rmSync(s.dir, { recursive: true, force: true });
    fs.rmSync(state, { force: true });
  }
  const c = await conn(); await c.query(`DROP DATABASE IF EXISTS ${DB}`); await c.end();
  console.log("clone removed");
}

async function setup() {
  if (!ROOT_PW) throw new Error("CLONE_ROOT_PW required");
  const c0 = await conn();
  const [[{ d }]] = await c0.query("SELECT @@datadir AS d");
  if (!/m1011|scratchpad/i.test(d)) throw new Error("refusing: not the disposable MariaDB instance");
  await c0.query(`DROP DATABASE IF EXISTS ${DB}`);
  await c0.query(`CREATE DATABASE ${DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await c0.end();
  const url = `mysql://root:${encodeURIComponent(ROOT_PW)}@127.0.0.1:${PORT}/${DB}`;
  execFileSync(process.execPath, ["scripts/migrate.mjs", "--apply"], { env: { ...process.env, DATABASE_URL: url, CONFIRM_SCHEMA_MIGRATIONS: DB }, stdio: "ignore" });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-clone-"));
  const ownerPw = randomBytes(14).toString("base64url"), playerPw = randomBytes(14).toString("base64url");
  const c = await conn(DB);
  await c.query("DELETE FROM risk_controls");
  await c.query("INSERT INTO risk_controls(id,max_single_bet,max_daily_payout,max_weekly_limit,auto_flag_large_wins,large_win_threshold) VALUES ('default',100000,100000000,1000000000,'yes',10000)");
  await c.query("INSERT INTO platform_settings(id,maintenance_mode,min_deposit,max_deposit,min_withdraw,max_withdraw) VALUES ('default','no',1,1000000,1,1000000) ON DUPLICATE KEY UPDATE id=id");
  await c.query("INSERT INTO jackpot(id,amount,enabled,display_amount) VALUES ('mega',50000,'yes',0) ON DUPLICATE KEY UPDATE id=id");
  for (const [name, role, bal, pw] of [["uat_owner", "superadmin", 0, ownerPw], ["uat_player", "player", 1000, playerPw]])
    await c.query("INSERT INTO users(id,public_user_id,username,password_hash,balance,role,display_name) VALUES (?,?,?,?,?,?,?)", [randomUUID(), name, name, await hash(pw, 4), bal, role, name]);
  await c.end();
  const creds = path.join(dir, "creds.txt");
  fs.writeFileSync(creds, `uat_owner\tsuperadmin\t${ownerPw}\nuat_player\tplayer\t${playerPw}\n`);
  const log = fs.openSync(path.join(dir, "server.log"), "w");
  const child = spawn(process.execPath, [".output/server/index.mjs"], {
    detached: true, windowsHide: true, stdio: ["ignore", log, log],
    env: { ...process.env, NODE_ENV: "production", HOST: "127.0.0.1", NITRO_HOST: "127.0.0.1", PORT: String(APP_PORT), NITRO_PORT: String(APP_PORT), DATABASE_URL: url, RELEASE_SHA: "2294d79-localclone", OPERATION_COMPRESSION: "0" },
  });
  child.unref();
  fs.writeFileSync(state, JSON.stringify({ pid: child.pid, dir }));
  for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://127.0.0.1:${APP_PORT}/api/health`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
  console.log(JSON.stringify({ UAT_BASE: `http://127.0.0.1:${APP_PORT}`, UAT_CREDS_FILE: creds, UAT_QA_CREDS_FILE: path.join(dir, "qa-creds.txt"), UAT_EXPECT_RELEASE: "2294d79-localclone", serverLog: path.join(dir, "server.log") }));
}

await (process.argv[2] === "teardown" ? teardown() : setup());
