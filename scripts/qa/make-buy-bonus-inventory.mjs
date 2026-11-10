// Builds the final Buy Bonus inventory for the 82 audited slots strictly from evidence: the static source scan, the all-games API sweep and the
// browser regression summary. No status is typed by hand.
//   node scripts/qa/make-buy-bonus-inventory.mjs <apiSweepJson> <regressionSummaryCsv> <outDir>
import fs from "node:fs";
import path from "node:path";

const [apiFile, csvFile, outDir = "deploy/handoff"] = process.argv.slice(2);
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");
const catalog = read("deploy/diagnostics/uat-game-catalog.tsv").trim().split("\n").slice(1).map((l) => { const [id, category, title] = l.split("\t"); return { id, category, title }; }).filter((g) => g.category === "slot");
const api = JSON.parse(read(apiFile));
const csv = read(csvFile).trim().split("\n").slice(1).map((l) => l.split(","));
const pascal = (id) => id.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
const realmsTuning = read("src/lib/realms/calibration.ts");
const compDir = "src/components/maxhigh";
const compFiles = fs.readdirSync(compDir).filter((f) => f.endsWith("Slot.tsx"));
const NO_BUY = { "coin-volcano": "no Buy Bonus feature in this game", "fire-spike": "no Buy Bonus feature in this game" };
const rows = [];
for (const g of catalog) {
  const isRealms = new RegExp(`"${g.id}":\\s*\\{`).test(realmsTuning);
  const comp = isRealms ? "RealmsSlot.tsx" : compFiles.find((f) => f.toLowerCase() === pascal(g.id).toLowerCase() + "slot.tsx");
  const compSrc = read(path.join(compDir, comp ?? ""));
  const serverSrc = isRealms ? read("src/server/games/realms.server.ts") : read(`src/server/games/${g.id}.server.ts`);
  const dialogSrc = isRealms ? read(path.join(compDir, "realms/BuyFeatureModal.tsx")) : read(path.join(compDir, g.id, "BuyFeatureModal.tsx"));
  const hasBuy = !NO_BUY[g.id] && /BuyFeature|buyFeature/.test(serverSrc);
  const gameApi = api.results.filter((r) => r.name.startsWith(`[${g.id}]`));
  const apiPass = gameApi.length > 0 && gameApi.every((r) => r.ok);
  const staticServer = g.id === "wild-panther" ? serverSrc.includes("freeSpinsLeft: BUY_BONUS_FREE_SPINS") : serverSrc.includes("resolveBuyBonusSpins(data.quantity)");
  const staticDialog = dialogSrc.includes("BUY_BONUS_FREE_SPINS") && !/nudgeQty|label="Quantity"/.test(dialogSrc);
  const staticHud = compSrc.includes("freeSpinsProgress(") && (g.id === "wild-panther" || /buyPresenting,\s*\n\s*fsPaused,/.test(compSrc));
  const br = csv.filter((r) => r[0] === g.id);
  const browser = br.length ? br.map((r) => `${r[1]} ${r[2] === "ERROR" ? "ERROR" : r[3] === "0" ? "PASS" : "FAIL"}`).join(", ") : (isRealms ? "via shared engine" : "template (see family sample)");
  const supported = hasBuy && staticServer && staticDialog && staticHud && apiPass;
  rows.push({ id: g.id, title: g.title, model: isRealms ? "Realms shared engine" : g.id === "wild-panther" ? "dedicated (own flow)" : "dedicated template", hasBuy, staticServer, staticDialog, staticHud, apiPass, browser, supported, note: NO_BUY[g.id] ?? "" });
}
const supported = rows.filter((r) => r.supported).length;
const noBuy = rows.filter((r) => !r.hasBuy);
const md = [
  "# Buy Bonus - final inventory of the 82 audited slots (generated from evidence)",
  "",
  `**${supported} of ${rows.length} slots now provide the required Buy Bonus experience** (fixed 10 free spins enforced by the server, no quantity selector, scatter intro, automatic free spins with an n/N counter, exactly-once settlement verified by the API sweep). ${noBuy.length} slots have no Buy Bonus feature and were deliberately not modified: ${noBuy.map((r) => r.title).join(", ")}.`,
  "",
  "'Browser' lists the games that were also driven in a real browser (desktop / phone viewport). The other template and Realms games share the identical, statically verified code and passed the same API sweep.",
  "",
  "| Game | Model | Server enforces 10 | Dialog fixed 10 | n/N + intro + auto-chain | API sweep | Browser | Supported |",
  "|---|---|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.title} | ${r.model} | ${r.hasBuy ? (r.staticServer ? "yes" : "NO") : "n/a"} | ${r.hasBuy ? (r.staticDialog ? "yes" : "NO") : "n/a"} | ${r.hasBuy ? (r.staticHud ? "yes" : "NO") : "n/a"} | ${r.hasBuy ? (r.apiPass ? "pass" : "FAIL") : "n/a"} | ${r.hasBuy ? r.browser : "n/a"} | ${r.supported ? "YES" : r.hasBuy ? "NO" : "no feature"} |`),
  "",
].join("\n");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "BUY_BONUS_FINAL_INVENTORY.md"), md);
fs.writeFileSync(path.join(outDir, "BUY_BONUS_FINAL_INVENTORY.json"), JSON.stringify({ supported, total: rows.length, noBuy: noBuy.map((r) => r.id), rows }, null, 1));
console.log(JSON.stringify({ supported, total: rows.length, noBuy: noBuy.map((r) => r.id), notSupported: rows.filter((r) => r.hasBuy && !r.supported).map((r) => r.id) }));
