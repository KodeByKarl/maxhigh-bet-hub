// Prints the catalog slot ids that have a Buy Bonus (same rule as the inventory generator), one per line.
import fs from "node:fs";
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");
const cat = read("deploy/diagnostics/uat-game-catalog.tsv").trim().split("\n").slice(1).map((l) => l.split("\t")).filter((r) => r[1] === "slot").map((r) => r[0]);
const realms = read("src/lib/realms/calibration.ts");
const NO = new Set(["coin-volcano", "fire-spike"]);
for (const id of cat) {
  const isRealms = new RegExp(`"${id}":\\s*\\{`).test(realms);
  const srv = isRealms ? read("src/server/games/realms.server.ts") : read(`src/server/games/${id}.server.ts`);
  if (!NO.has(id) && /BuyFeature|buyFeature/.test(srv)) console.log(id);
}
