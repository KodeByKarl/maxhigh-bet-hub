// Creates the CLIENT's accounts on the activated UAT through the audited superadmin API, as the DEVELOPER maintenance account (uat_owner).
//   client_owner    : the client's primary business owner (named in the compiled policy). Full administration, configures all 100 games,
//                     plays only the 50 unlocked games, cannot activate locked games, cannot modify the developer account.
//   client_admin01/02: client administrators (superadmin tier, not owners): configure the 50 playable games, create staff/players.
// All start with 0 credits. Random temporary passwords are written ONLY to a local file (default
// C:\Users\Keydi\maxhigh-uat-secrets\client-staff-credentials.txt) and never printed.
//   UAT_BASE=http://127.0.0.1:18080 node scripts/qa/create-client-staff.mjs [--apply] [--skip-admins]
// Without --apply it only checks the preconditions and prints the plan.
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Client, health } from "./uat-client.mjs";

const APPLY = process.argv.includes("--apply");
const OUT = process.env.CLIENT_STAFF_CREDS_FILE ?? "C:\\Users\\Keydi\\maxhigh-uat-secrets\\client-staff-credentials.txt";
const ACCOUNTS = [
  { username: "client_owner", displayName: "Client Owner", role: "superadmin" },
  ...(process.argv.includes("--skip-admins") ? [] : [
    { username: "client_admin01", displayName: "Client Admin 01", role: "superadmin" },
    { username: "client_admin02", displayName: "Client Admin 02", role: "superadmin" },
  ]),
];
const pw = () => `Mh-${randomBytes(18).toString("base64url")}-7!`;

const h = await health();
if (!h.ok) throw new Error("UAT health failed");
const dev = new Client(); await dev.login("uat_owner");
const st = await dev.rpc("getAccessStatusFn", undefined, { method: "GET" });
console.log(JSON.stringify({ release: String(h.release).slice(0, 7), developerQaMode: st.ownerQa === true, apply: APPLY, accounts: ACCOUNTS.map((a) => a.username) }));
if (!APPLY) { console.log("dry run: would create", ACCOUNTS.map((a) => `${a.username} (${a.role})`).join(", "), "with 0 credits"); await dev.logout(); process.exit(0); }
if (fs.existsSync(OUT)) throw new Error(`refusing to overwrite ${OUT}`);
const lines = ["MaxHigh UAT client credentials (TEMPORARY - deliver each through a separate private channel; change at first sign-in)", ""];
for (const a of ACCOUNTS) {
  const password = pw();
  await dev.rpc("superCreateUserFn", { username: a.username, password, role: a.role, balance: 0, displayName: a.displayName });
  lines.push(`${a.username}\t${a.role}\t${password}`);
  console.log("created", a.username, `(role ${a.role}, 0 credits)`);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join("\n") + "\n", { mode: 0o600 });
await dev.logout();
console.log("credentials written to a local file (not printed)");
