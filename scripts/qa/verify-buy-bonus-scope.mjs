// Proves the Buy Bonus change stayed in scope: compares the working tree with a base commit and fails if any forbidden file changed
// (pricing/RTP/calibration, wallet/ledger/operation code, policy, migrations, assets, excluded games) or if a server game file changed
// outside the quantity guard / constant / import lines.
//   node scripts/qa/verify-buy-bonus-scope.mjs <baseCommit> [outFile]
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const base = process.argv[2] ?? "dd69d82";
const outFile = process.argv[3];
const git = (...a) => execFileSync("git", ["-c", "core.autocrlf=false", ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const changed = git("diff", "--name-only", base).split("\n").filter(Boolean).concat(git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean));
const FORBIDDEN = [
  /^src\/lib\/[a-z0-9-]+-config\.ts$/, /^src\/lib\/realms\/(calibration|defaults|schema|buy-curve|lobby-catalog)\.ts$/, /^src\/lib\/realms\/engine\//,
  /^src\/components\/maxhigh\/panther-shared\/(buy-curve|buyPricing)\.ts$/, /^src\/server\/(wallet|operation|financial-locks|session|db\/)/, /^src\/server\/(access-policy|policy\/)/,
  /^src\/server\/(auth|admin|superadmin)\//, /^drizzle\//, /^public\//, /^src\/server\/games\/(ace-high|coin-volcano|fire-spike)\.server\.ts$/,
  /^src\/components\/maxhigh\/(AceHigh|CoinVolcano|FireSpike)Slot\.tsx$/, /^src\/components\/maxhigh\/(ace-high|coin-volcano|fire-spike)\//,
];
const violations = [];
for (const f of changed) if (FORBIDDEN.some((re) => re.test(f))) violations.push(`forbidden file changed: ${f}`);
// server game files: only the quantity guard, the constant, imports and the Wild Panther session line may differ
const ALLOWED_LINE = [
  /^\s*import \{ (resolveBuyBonusSpins|BUY_BONUS_FREE_SPINS) \} from "@\/lib\/buy-bonus";\s*$/,
  /^\s*const quantity = Math\.round\(data\.quantity\);\s*$/, /^\s*const quantity = resolveBuyBonusSpins\(data\.quantity\);\s*$/,
  /^\s*if \(!Number\.isFinite\(quantity\) \|\| quantity < 1 \|\| quantity > (50|maxQuantity)\) \{\s*$/, /^\s*throw new Error\("Invalid quantity"\);\s*$/,
  /^\s*throw new Error\(`Buy 1–\$\{maxQuantity\} free spins`\);\s*$/, /^\s*\}\s*$/, /^\s*const maxQuantity = realmsBuyMaxQuantity\(cfg\);\s*$/,
  /^\s*if \(quantity > maxQuantity\)\s*$/, /^\s*throw new Error\(`This title allows at most \$\{maxQuantity\} free spins per purchase`\);\s*$/,
  /^\s*freeSpinsLeft: (cfg\.freeSpinsBase|BUY_BONUS_FREE_SPINS),.*$/, /^\s*$/,
];
let serverFilesChecked = 0;
for (const f of changed.filter((x) => /^src\/server\/games\/[^/]+\.server\.ts$/.test(x))) {
  serverFilesChecked++;
  const d = git("diff", "-U0", base, "--", f).split("\n").filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
  for (const l of d) if (!ALLOWED_LINE.some((re) => re.test(l.slice(1)))) violations.push(`${f}: unexpected change: ${l.slice(0, 120)}`);
}
const groups = {
  serverGames: changed.filter((f) => /^src\/server\/games\//.test(f)).length,
  slotComponents: changed.filter((f) => /^src\/components\/maxhigh\/[A-Za-z]+Slot\.tsx$/.test(f)).length,
  dialogs: changed.filter((f) => /BuyFeatureModal\.tsx$/.test(f)).length,
  sharedUi: changed.filter((f) => /SlotControlDeck|bonus\/freeSpinsProgress/.test(f)).length,
  scriptsDocs: changed.filter((f) => /^(scripts|deploy)\//.test(f)).length,
  other: changed.filter((f) => !/^(src\/server\/games|src\/components\/maxhigh|scripts|deploy)\//.test(f)).filter((f) => f !== "src/lib/buy-bonus.ts"),
};
const report = { base, changedFiles: changed.length, serverFilesChecked, groups, violations };
console.log(JSON.stringify(report, null, 1));
if (outFile) fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
process.exit(violations.length ? 1 : 0);
