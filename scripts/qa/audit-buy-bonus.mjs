// Read-only static audit of the Buy Bonus / free-spin implementation of every slot in the 100-game catalog. No game is modified.
//   node scripts/qa/audit-buy-bonus.mjs <outDir>
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] ?? "deploy/handoff";
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");
const catalog = fs.readFileSync("deploy/diagnostics/uat-game-catalog.tsv", "utf8").trim().split("\n").slice(1).map((l) => { const [id, category, title] = l.split("\t"); return { id, category, title }; });
const pascal = (id) => id.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
const num = (s, key) => { const m = new RegExp(`${key}:\\s*([0-9.]+)`).exec(s); return m ? Number(m[1]) : null; };
const realmsTuning = read("src/lib/realms/calibration.ts");
const realmsDefaults = read("src/lib/realms/defaults.ts");
const realmsComp = read("src/components/maxhigh/RealmsSlot.tsx") + read("src/components/maxhigh/realms/RealmsSlot.tsx");
const compFiles = fs.readdirSync("src/components/maxhigh").filter((f) => f.endsWith("Slot.tsx"));
const compFor = (id) => { const want = pascal(id).replace(/[^A-Za-z0-9]/g, "").toLowerCase() + "slot.tsx"; return compFiles.find((f) => f.toLowerCase() === want); };
const rows = [];
for (const g of catalog.filter((c) => c.category === "slot")) {
  const cfg = read(`src/lib/${g.id}-config.ts`);
  const realmsEntry = new RegExp(`"${g.id}":\\s*\\{([^}]*)\\}`).exec(realmsTuning);
  const isRealms = !!realmsEntry;
  const comp = isRealms ? "RealmsSlot (shared)" : compFor(g.id);
  const src = isRealms ? realmsComp : read(`src/components/maxhigh/${comp ?? ""}`);
  const server = isRealms ? read("src/server/games/realms.server.ts") : read(`src/server/games/${g.id}.server.ts`);
  const buyMult = isRealms ? num(realmsEntry[1], "buyFeatureMult") : num(cfg, "buyFeatureMult");
  const fsBase = isRealms ? null : num(cfg, "freeSpinsBase");
  const trig = isRealms ? null : num(cfg, "freeSpinsTriggerCount");
  const hasBuyServer = /BuyFeature|buyFeature/.test(server);
  const hasBuyUi = /buy/i.test(src);
  const counterLines = [...new Set((src.match(/FREE SPINS?[^`'"<{]{0,28}/g) ?? []).map((x) => x.trim()))].slice(0, 2);
  const perSpin = /pantherBuyPricePerSpin|unitMult|quantity/.test(server);
  rows.push({ id: g.id, title: g.title, model: isRealms ? "realms-shared" : "dedicated", comp: comp ?? "NOT FOUND", buyMult, fsBase, trig, hasBuyServer, hasBuyUi, perSpinPricing: perSpin, scatterUi: /scatter/i.test(src), counterText: counterLines.join(" | ") || "none found" });
}
const withBuy = rows.filter((r) => r.hasBuyServer && r.hasBuyUi);
const lowMult = rows.filter((r) => r.buyMult !== null && r.buyMult < 10);
const md = [
  "# Buy Bonus audit - slots (static, read-only; generated from the code, no game modified)",
  "",
  `Slots in the catalog: ${rows.length}. With a server buy flow AND a buy control in the UI: ${withBuy.length}. Buy multiplier below 10 in the configuration: ${lowMult.length}.`,
  "",
  "Columns: model (dedicated component/server file vs the shared Realms engine), buyMult = the `buyFeatureMult` stored in the game's configuration (its unit is defined by that game's server code: several games price per bonus SPIN and multiply by a chosen quantity), fsBase = configured starting free spins, trig = scatters needed, counter = the free-spin counter text found in the component.",
  "",
  "| Game | Model | buyMult | fsBase | trig | buy server | buy UI | per-spin pricing | scatter UI | counter text |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.title} | ${r.model} | ${r.buyMult ?? "-"} | ${r.fsBase ?? "-"} | ${r.trig ?? "-"} | ${r.hasBuyServer ? "yes" : "no"} | ${r.hasBuyUi ? "yes" : "no"} | ${r.perSpinPricing ? "yes" : "no"} | ${r.scatterUi ? "yes" : "no"} | ${r.counterText} |`),
  "",
].join("\n");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "BUY_BONUS_AUDIT_STATIC.md"), md);
fs.writeFileSync(path.join(out, "BUY_BONUS_AUDIT_STATIC.json"), JSON.stringify(rows, null, 1));
const byMult = {};
for (const r of rows) { const k = r.buyMult === null ? "none" : String(r.buyMult); byMult[k] = (byMult[k] ?? 0) + 1; }
console.log(JSON.stringify({ slots: rows.length, withBuy: withBuy.length, lowMult: lowMult.length, dedicated: rows.filter((r) => r.model === "dedicated").length, realms: rows.filter((r) => r.model === "realms-shared").length, componentNotFound: rows.filter((r) => r.comp === "NOT FOUND").map((r) => r.id), byMult }));
