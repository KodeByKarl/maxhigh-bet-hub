// Creates the two client staff accounts on the (activated) UAT through the audited superadmin API, with random temporary passwords.
// Passwords are written ONLY to a local file (default C:\Users\Keydi\maxhigh-uat-secrets\client-staff-credentials.txt); they are never printed.
//   UAT_BASE=http://127.0.0.1:18080 node scripts/qa/create-client-staff.mjs [--apply]
// Without --apply it only checks the preconditions and prints the plan.
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Client, health } from "./uat-client.mjs";

const APPLY = process.argv.includes("--apply");
const OUT = process.env.CLIENT_STAFF_CREDS_FILE ?? "C:\\Users\\Keydi\\maxhigh-uat-secrets\\client-staff-credentials.txt";
const ACCOUNTS = [{ username: "client_admin01", displayName: "Client Admin 01" }, { username: "client_admin02", displayName: "Client Admin 02" }];
const pw = () => { const a = randomBytes(18).toString("base64url"); return `Mh-${a}-7!`; };

const h = await health();
if (!h.ok) throw new Error("UAT health failed");
const owner = new Client(); await owner.login("uat_owner");
const status = await owner.rpc("getAdminLimitStatusFn", undefined, { method: "GET" });
console.log(JSON.stringify({ release: String(h.release).slice(0, 7), limitStatus: status, apply: APPLY }));
if (!status.activeClients && status.activeClients !== 0) throw new Error("unexpected limit status");
if (!APPLY) { console.log("dry run: would create", ACCOUNTS.map((a) => a.username).join(", ")); await owner.logout(); process.exit(0); }
if (fs.existsSync(OUT)) throw new Error(`refusing to overwrite ${OUT}`);
const lines = ["MaxHigh UAT client staff credentials (TEMPORARY - deliver through a separate private channel; change at first sign-in)", ""];
for (const a of ACCOUNTS) {
  const password = pw();
  await owner.rpc("superCreateUserFn", { username: a.username, password, role: "admin", balance: 0, displayName: a.displayName });
  lines.push(`${a.username}\tadmin\t${password}`);
  console.log("created", a.username, "(role admin, 0 credits)");
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join("\n") + "\n", { mode: 0o600 });
await owner.logout();
console.log("credentials written to a local file (not printed)");
