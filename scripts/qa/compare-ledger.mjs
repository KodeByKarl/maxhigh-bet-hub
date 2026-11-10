// Offline comparator: reads the saved output of deploy/diagnostics/vps-db-preflight-sudo.sh and checks (a) the VPS migration ledger
// against the SHA-256 of the migration files in a release tree, (b) the 0005 preconditions, (c) the binary-log/trigger risk.
// Reads files only. Usage: node scripts/qa/compare-ledger.mjs <preflight-output.txt> [releaseDir=.]
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const [file, release = "."] = process.argv.slice(2);
if (!file) throw new Error("usage: compare-ledger.mjs <preflight-output.txt> [releaseDir]");
const text = fs.readFileSync(file, "utf8").replace(/\r/g, "");
const section = (name) => { const m = text.split(new RegExp(`^== ${name}[^\\n]*\\n`, "m"))[1]; return m ? m.split(/^== /m)[0].trim().split("\n").filter(Boolean) : []; };
const sha = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const dir = path.join(release, "drizzle");
const expected = Object.fromEntries(fs.readdirSync(dir).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort().map((f) => [f, sha(path.join(dir, f))]));
const ledger = Object.fromEntries(section("MIGRATION LEDGER").map((l) => l.split("\t")).filter((c) => c.length >= 2).map((c) => [c[0], c[1]]));
const out = []; let ok = true;
const say = (level, msg) => { out.push(`${level.padEnd(8)} ${msg}`); if (level === "BLOCKER") ok = false; };

for (const [f, h] of Object.entries(expected)) {
  const key = Object.keys(ledger).find((k) => k === f || k === f.replace(/\.sql$/, ""));
  if (!key) say(/^000[45]/.test(f) ? "PENDING" : "BLOCKER", `${f}: not in the VPS ledger${/^000[45]/.test(f) ? " (expected: will be applied by this release)" : ""}`);
  else if (ledger[key] === h) say("OK", `${f}: ledger checksum matches the release file`);
  else say("BLOCKER", `${f}: ledger ${ledger[key].slice(0, 12)}... != release ${h.slice(0, 12)}... (line endings or content differ; the migration runner would refuse)`);
}
for (const k of Object.keys(ledger)) if (!Object.keys(expected).some((f) => f === k || f.replace(/\.sql$/, "") === k)) say("WARN", `ledger has ${k}, which the release does not contain`);

const vars = Object.fromEntries(section("VARIABLES").map((l) => l.split("\t")).filter((c) => c.length >= 2).map((c) => [c[0], c[1]]));
const version = section("VERSION")[0] ?? "";
say(/^10\.11\./.test(version) ? "OK" : "WARN", `MariaDB version ${version || "unknown"} (tested on 10.11.14)`);
const binlog = (vars.log_bin ?? "").toUpperCase() === "ON", trust = vars.log_bin_trust_function_creators === "1" || (vars.log_bin_trust_function_creators ?? "").toUpperCase() === "ON";
if (binlog && !trust) say("RISK", "binary logging is ON and log_bin_trust_function_creators is OFF: CREATE TRIGGER needs SUPER (error 1419). Run the migration as an account with SUPER, or have the owner approve a reviewed settings change. Do not proceed blindly.");
else say("OK", `binary logging ${binlog ? "ON" : "OFF"}${binlog ? ", trust_function_creators ON" : ""}: trigger creation is not blocked by binlog rules`);

const pre = text.split(/^== SCHEMA STATE[^\n]*\n/m)[1]?.split(/^== /m)[0].trim() ?? "";
say(pre === "" ? "OK" : "BLOCKER", pre === "" ? "0005 objects do not exist yet (clean starting point)" : `0005 objects already exist: ${pre.split("\n").join(" | ").slice(0, 160)}`);
const trig = section("EXISTING TRIGGERS");
say(trig.length === 0 ? "OK" : "WARN", trig.length === 0 ? "no existing triggers on the staging schema" : `${trig.length} existing trigger(s): ${trig.join(" | ").slice(0, 200)}`);
// Per-account privilege checks (parsed from SHOW GRANTS output).
const grantBlock = (acct) => { const m = text.split(new RegExp("^--- '" + acct + "'@[^\\n]*\\n", "m"))[1]; return m ? m.split(/^(?:--- |== )/m)[0] : ""; };
const has = (blk, priv) => new RegExp("GRANT [^\\n]*\\b" + priv + "\\b[^\\n]* ON `?maxhigh_staging`?\\.(\\*|`?users`?)", "i").test(blk) || /ALL PRIVILEGES ON `?maxhigh_staging`?\.\*/i.test(blk);
const mig = grantBlock("maxhigh_stage_migrate"), app = grantBlock("maxhigh_uat_app");
const need = ["ALTER", "CREATE", "INSERT", "UPDATE", "SELECT"];
const missing = need.filter((p) => !has(mig, p));
say(missing.length ? "BLOCKER" : "OK", missing.length ? `migration account lacks: ${missing.join(", ")}` : "migration account has ALTER, CREATE, INSERT, UPDATE, SELECT on the staging schema");
if (!has(mig, "TRIGGER"))
  say("ACTION", "migration account has NO TRIGGER privilege: 0005 would fail at its first CREATE TRIGGER. Do NOT grant TRIGGER and revoke it afterwards (tested: revoking it makes every statement that fires a trigger fail, i.e. all user writes and wallet updates). Apply 0005 as root through the local socket so the trigger DEFINER is root@localhost (no grant needed), or keep a table-scoped TRIGGER grant permanently.");
else say("OK", "migration account already has TRIGGER (keep it while the triggers exist: the DEFINER's TRIGGER privilege is checked every time a trigger fires)");
const appOk = ["SELECT", "INSERT", "UPDATE", "DELETE"].every((p) => has(app, p));
say(appOk ? "OK" : "BLOCKER", appOk ? "app account has SELECT/INSERT/UPDATE/DELETE on the staging schema (covers the two new tables)" : "app account lacks required table privileges");
console.log(out.join("\n"));
console.log(ok ? "\nRESULT: no blocking mismatch found (review RISK/CHECK lines)." : "\nRESULT: BLOCKERS present - do not migrate.");
process.exit(ok ? 0 : 1);
