// Fund five synthetic QA players to 100,000.00 test credits through the application's AUDITED superadmin workflows.
//   node scripts/qa/uat-fund.mjs            -> PLAN ONLY (no network, no writes)
//   node scripts/qa/uat-fund.mjs --apply    -> creates missing players at balance 0 (audit: super.user_create) and tops each up with
//                                              superAdjustBalanceFn (ledger row type 'adjust' + audit: super.balance_adjust)
// Never edits balances with SQL. Passwords of new players are generated here, stored in a private file OUTSIDE the repository,
// and are never printed. Idempotency keys are stable per (player, target), so a re-run cannot credit twice.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { Client, health, credentialsFor, RpcRejection } from "./uat-client.mjs";

const APPLY = process.argv.includes("--apply");
const TARGET = Number(process.env.UAT_FUND_TARGET ?? 100000);
const PLAYERS = (process.env.UAT_QA_PLAYERS ?? "uat_player,uat_player2,uat_player3,uat_player4,uat_player5").split(",");
const OWNER = process.env.UAT_OWNER ?? "uat_owner";
const QA_CREDS = process.env.UAT_QA_CREDS_FILE ?? "C:\\Users\\Keydi\\maxhigh-uat-secrets\\uat-qa-credentials.txt";
const RELEASE = process.env.UAT_EXPECT_RELEASE ?? "2294d79";
const say = (k, v) => console.log(`${k.padEnd(36)} ${typeof v === "string" ? v : JSON.stringify(v)}`);

if (path.resolve(QA_CREDS).toLowerCase().startsWith(path.resolve(".").toLowerCase())) throw new Error("credentials file must be outside the repository");
if (!(TARGET > 0 && TARGET <= 1_000_000)) throw new Error("target out of the safe synthetic range");

say("mode", APPLY ? "APPLY (writes through audited app flows)" : "PLAN ONLY (no network, no writes)");
say("environment", "UAT / synthetic test credits only (loopback tunnel required)");
say("players", PLAYERS);
say("target balance each", TARGET.toFixed(2));
say("method", "superCreateUserFn (balance 0) -> superAdjustBalanceFn(delta = target - current, owner password re-auth)");
say("expected audit rows", "super.user_create per new player; super.balance_adjust per top-up");
say("expected ledger rows", "one 'adjust' row (game 'Superadmin') per top-up");
say("credentials for new players", `generated locally, saved to ${QA_CREDS} (not printed)`);
if (!APPLY) { console.log("\nNothing was sent. Re-run with --apply after approval."); process.exit(0); }

const h = await health();
say("health", h);
if (!h.ok || !String(h.release).startsWith(RELEASE)) throw new Error("UAT health/release unexpected - stopping");

const owner = new Client();
const session = await owner.login(OWNER);
if (session?.role !== "superadmin") throw new Error("the funding account is not a superadmin - stopping");
const ownerPassword = credentialsFor(OWNER);
say("logged in as", { user: OWNER, role: session.role });

const rows = (r) => (Array.isArray(r) ? r : (r?.rows ?? r?.users ?? r?.items ?? []));
const listUsers = async () => rows(await owner.rpc("listSuperUsersFn", { limit: 300 }, { method: "GET" }));
let users = await listUsers();
const find = (u) => users.find((x) => x.username === u);
const secrets = fs.existsSync(QA_CREDS) ? fs.readFileSync(QA_CREDS, "utf8") : "";
const newSecrets = [];

for (const name of PLAYERS) {
  if (find(name)) { say(`exists ${name}`, { id: find(name).id, role: find(name).role }); continue; }
  const pw = randomBytes(14).toString("base64url");
  await owner.rpc("superCreateUserFn", { username: name, password: pw, role: "player", balance: 0, displayName: `UAT QA ${name}` });
  newSecrets.push(`${name}\tplayer\t${pw}`);
  say(`created ${name}`, "player, balance 0.00 (audit: super.user_create)");
}
if (newSecrets.length) {
  fs.mkdirSync(path.dirname(QA_CREDS), { recursive: true });
  fs.writeFileSync(QA_CREDS, (secrets && !secrets.endsWith("\n") ? secrets + "\n" : secrets) + newSecrets.join("\n") + "\n", { mode: 0o600 });
  if (process.platform === "win32") {
    try { execFileSync("icacls", [QA_CREDS, "/inheritance:r", "/grant:r", `${process.env.USERNAME}:F`], { stdio: "ignore" }); } catch { /* best effort */ }
  }
  say("new credentials saved", `${newSecrets.length} entries in private file (values not shown)`);
}

users = await listUsers();
for (const name of PLAYERS) {
  const u = find(name);
  if (!u) throw new Error(`player ${name} missing after creation - stopping`);
  const current = Number(u.balance);
  const delta = Number((TARGET - current).toFixed(2));
  if (delta <= 0) { say(`no top-up ${name}`, { balance: current }); continue; }
  const key = createHash("sha256").update(`uat-fund|${u.id}|${TARGET}`).digest("hex").slice(0, 36);   // stable => retry-safe
  try {
    await owner.rpc("superAdjustBalanceFn", { userId: u.id, delta, note: `UAT QA synthetic test credit to ${TARGET.toFixed(2)} (not real money)`, confirmPassword: ownerPassword }, { key });
    say(`topped up ${name}`, { from: current, delta, to: Number((current + delta).toFixed(2)) });
  } catch (e) {
    if (e instanceof RpcRejection) throw new Error(`top-up for ${name} rejected: ${e.message} - stopping`);
    throw e;
  }
}

users = await listUsers();
let ok = true;
for (const name of PLAYERS) { const b = Number(find(name)?.balance); const good = b === TARGET; ok &&= good; say(`verify ${name}`, { balance: b, atTarget: good }); }
const audit = rows(await owner.rpc("listAdminAuditLogsFn", { limit: 100, scope: "all" }, { method: "GET" }));
const count = (a) => audit.filter((r) => r.action === a).length;
say("audit rows seen (recent 100)", { "super.user_create": count("super.user_create"), "super.balance_adjust": count("super.balance_adjust") });
await owner.logout();
say("RESULT", ok ? "PASS - all players at target" : "FAIL - see above");
process.exit(ok ? 0 : 1);
