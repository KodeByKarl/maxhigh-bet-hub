// DEVELOPER-RUN activation of the DATABASE side of the access restrictions (account classes + cap backstop).
// DRY RUN by default: prints the plan and rolls back. Never deletes or edits any other user data. Not used by the application.
// The application-side policy (locked games, cap) is separate: it is compiled into a reviewed release.
//   node scripts/dev/activate-restrictions.mjs --classify qa:uat_player,uat_player2 --classify admin:uat_owner --max-clients 2 --enforce yes [--apply]
// Required for --apply: DATABASE_URL and CONFIRM_ACTIVATE_RESTRICTIONS=<exact database name>.
import crypto from "node:crypto";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const all = (n) => args.flatMap((a, i) => (a === `--${n}` ? [args[i + 1]] : []));
const apply = args.includes("--apply");
const classify = all("classify").flatMap((s) => { const [cls, names] = s.split(":"); if (!["qa", "admin", "client"].includes(cls)) throw new Error("class must be qa|admin|client"); return names.split(",").map((u) => [cls, u.trim().toLowerCase()]); });
const maxClients = args.includes("--max-clients") ? Number(args[args.indexOf("--max-clients") + 1]) : null;
const enforce = args.includes("--enforce") ? args[args.indexOf("--enforce") + 1] : null;
if (enforce && !["yes", "no"].includes(enforce)) throw new Error("--enforce yes|no");
if (maxClients !== null && !(Number.isInteger(maxClients) && maxClients >= 0 && maxClients <= 1000)) throw new Error("--max-clients out of range");
const url = process.env.DATABASE_URL; if (!url) throw new Error("DATABASE_URL required");
const dbName = new URL(url).pathname.slice(1);
if (apply && process.env.CONFIRM_ACTIVATE_RESTRICTIONS !== dbName) throw new Error(`--apply requires CONFIRM_ACTIVATE_RESTRICTIONS=${dbName}`);

const c = await mysql.createConnection(url);
const say = (k, v) => console.log(k.padEnd(34), typeof v === "string" ? v : JSON.stringify(v));
say("mode", apply ? "APPLY" : "DRY RUN (rolled back)"); say("database", dbName);
await c.beginTransaction();
try {
  const before = (await c.query("SELECT username, role, account_class FROM users ORDER BY username"))[0];
  const [[lim0]] = await c.query("SELECT max_client_accounts m, enforced e, active_clients a FROM account_limits WHERE id='default' FOR UPDATE");
  say("before: accounts", before.map((u) => `${u.username}:${u.role}:${u.account_class}`));
  say("before: limits", lim0);
  await c.query("SET @maxhigh_class_admin = 1");
  for (const [cls, name] of classify) {
    const [res] = await c.query("UPDATE users SET account_class = ? WHERE username = ?", [cls, name]);
    if (res.affectedRows !== 1 && !before.find((u) => u.username === name && u.account_class === cls)) throw new Error(`no such account: ${name}`);
  }
  await c.query("SET @maxhigh_class_admin = 0");
  if (maxClients !== null) await c.query("UPDATE account_limits SET max_client_accounts = ? WHERE id='default'", [maxClients]);
  if (enforce) await c.query("UPDATE account_limits SET enforced = ? WHERE id='default'", [enforce]);
  const [[lim1]] = await c.query("SELECT max_client_accounts m, enforced e, active_clients a FROM account_limits WHERE id='default'");
  const [[real]] = await c.query("SELECT COUNT(*) n FROM users WHERE account_class='client' AND NOT (is_locked='yes' AND locked_by IS NOT NULL)");
  say("after: limits", lim1); say("after: real active clients", real.n);
  if (lim1.a !== real.n) throw new Error("counter drift: active_clients does not equal the real count");
  if (enforce === "yes" && real.n > lim1.m) console.log(`NOTE: ${real.n} active client accounts already exceed the cap ${lim1.m}. Nothing is disabled; only NEW client accounts are refused.`);
  if (apply) {
    await c.query("INSERT INTO audit_logs (id, actor_id, actor_username, action, target_type, target_id, summary, meta, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())",
      [crypto.randomUUID(), null, "developer-script", "restrictions.activate", "account_limit", "default", `Classified ${classify.length} account(s); max=${maxClients ?? "unchanged"}; enforced=${enforce ?? "unchanged"}`.slice(0, 500), JSON.stringify({ classify, maxClients, enforce })]);
    await c.commit(); say("RESULT", "APPLIED and committed");
  } else { await c.rollback(); say("RESULT", "dry run - nothing written"); }
} catch (e) { await c.rollback(); console.error("ABORTED, rolled back:", e.message); process.exitCode = 1; }
await c.end();
