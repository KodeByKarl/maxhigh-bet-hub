// Creates the client administrator accounts on the activated UAT through the audited superadmin API, with random temporary passwords.
// Client administrators are superadmin-tier accounts that are NOT the owner (the owner is named in the compiled policy): they can create
// staff and player accounts and configure the 50 playable games, but cannot play/activate locked games or touch the owner account.
// Passwords are written ONLY to a local file (default C:\Users\Keydi\maxhigh-uat-secrets\client-staff-credentials.txt); never printed.
//   UAT_BASE=http://127.0.0.1:18080 node scripts/qa/create-client-staff.mjs [--apply] [--role superadmin|admin]
// Without --apply it only checks the preconditions and prints the plan.
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Client, health } from "./uat-client.mjs";

const APPLY = process.argv.includes("--apply");
const roleArg = process.argv.includes("--role") ? process.argv[process.argv.indexOf("--role") + 1] : "superadmin";
if (!["superadmin", "admin"].includes(roleArg)) throw new Error("--role must be superadmin or admin");
const OUT = process.env.CLIENT_STAFF_CREDS_FILE ?? "C:\\Users\\Keydi\\maxhigh-uat-secrets\\client-staff-credentials.txt";
const ACCOUNTS = [{ username: "client_admin01", displayName: "Client Admin 01" }, { username: "client_admin02", displayName: "Client Admin 02" }];
const pw = () => `Mh-${randomBytes(18).toString("base64url")}-7!`;

const h = await health();
if (!h.ok) throw new Error("UAT health failed");
const owner = new Client(); await owner.login("uat_owner");
const st = await owner.rpc("getAccessStatusFn", undefined, { method: "GET" });
console.log(JSON.stringify({ release: String(h.release).slice(0, 7), ownerSeesLockedAsQa: st.ownerQa === true, role: roleArg, apply: APPLY }));
if (!APPLY) { console.log("dry run: would create", ACCOUNTS.map((a) => a.username).join(", "), "with role", roleArg, "and 0 credits"); await owner.logout(); process.exit(0); }
if (fs.existsSync(OUT)) throw new Error(`refusing to overwrite ${OUT}`);
const lines = ["MaxHigh UAT client administrator credentials (TEMPORARY - deliver through a separate private channel; change at first sign-in)", ""];
for (const a of ACCOUNTS) {
  const password = pw();
  await owner.rpc("superCreateUserFn", { username: a.username, password, role: roleArg, balance: 0, displayName: a.displayName });
  lines.push(`${a.username}\t${roleArg}\t${password}`);
  console.log("created", a.username, `(role ${roleArg}, 0 credits)`);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join("\n") + "\n", { mode: 0o600 });
await owner.logout();
console.log("credentials written to a local file (not printed)");
