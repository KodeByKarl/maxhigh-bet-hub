// Builds the per-game QA inventory (markdown + JSON) strictly from evidence files. No status is typed by hand.
//   node scripts/qa/make-inventory.mjs <localResults.jsonl> <uatResults.jsonl> <outDir>
// Status rules: PASS = at least one passing functional round and zero failed checks for that game in that environment;
//               FAIL = any failed check; UNTESTED = no rows for the game in that environment.
import fs from "node:fs";
import path from "node:path";

const [localFile, uatFile, outDir] = process.argv.slice(2);
if (!localFile || !uatFile || !outDir) throw new Error("usage: make-inventory.mjs <local.jsonl> <uat.jsonl> <outDir>");
const read = (f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const catalog = fs.readFileSync("deploy/diagnostics/uat-game-catalog.tsv", "utf8").trim().split("\n").slice(1).map((l) => {
  const [id, category, title, min, max] = l.split("\t"); return { id, category, title, min, max };
});

function judge(rows, id) {
  const r = rows.filter((x) => x.game === id && !x.pending);
  if (!r.length) return { status: "UNTESTED", checks: 0, failed: 0 };
  const failed = r.filter((x) => !x.ok).length;
  const functionalPass = r.some((x) => x.phase === "functional" && x.ok);
  const phases = [...new Set(r.map((x) => x.phase))];
  return { status: failed ? "FAIL" : functionalPass ? "PASS" : "UNTESTED", checks: r.length, failed, phases };
}

const local = read(localFile), uat = read(uatFile);
const rows = catalog.map((g) => ({ ...g, local: judge(local, g.id), uat: judge(uat, g.id) }));
const count = (env, s) => rows.filter((r) => r[env].status === s).length;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "game-inventory.json"), JSON.stringify(rows, null, 1));

const lines = [
  "# MaxHigh - 100-game QA inventory",
  "",
  `Generated ${new Date().toISOString()} from evidence files only.`,
  "",
  "| Environment | PASS | FAIL | UNTESTED |",
  "|---|---|---|---|",
  `| Local disposable clone | ${count("local", "PASS")} | ${count("local", "FAIL")} | ${count("local", "UNTESTED")} |`,
  `| UAT (maxhigh_staging) | ${count("uat", "PASS")} | ${count("uat", "FAIL")} | ${count("uat", "UNTESTED")} |`,
  "",
  "UAT is only claimed for games that actually ran on UAT. A game is never marked PASS without executed evidence.",
  "",
  "| # | Game id | Title | Category | Bet range | Local | UAT |",
  "|---|---|---|---|---|---|---|",
  ...rows.map((r, i) => `| ${i + 1} | ${r.id} | ${r.title} | ${r.category} | ${r.min}-${r.max} | ${r.local.status} (${r.local.checks} checks) | ${r.uat.status}${r.uat.checks ? ` (${r.uat.checks} checks)` : ""} |`),
  "",
];
fs.writeFileSync(path.join(outDir, "GAME_INVENTORY.md"), lines.join("\n"));
console.log(JSON.stringify({ games: rows.length, local: { PASS: count("local", "PASS"), FAIL: count("local", "FAIL"), UNTESTED: count("local", "UNTESTED") }, uat: { PASS: count("uat", "PASS"), FAIL: count("uat", "FAIL"), UNTESTED: count("uat", "UNTESTED") } }));
