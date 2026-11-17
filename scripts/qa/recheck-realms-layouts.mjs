// Recheck independent, already implemented layouts after the desktop refinement.
import fs from "node:fs";
import { spawn, execFileSync } from "node:child_process";
const queue = JSON.parse(
  execFileSync(process.execPath, ["scripts/qa/realms-overhaul.mjs", "list"], { encoding: "utf8" }),
).slice(0, 18);
const results = [];
async function worker() {
  while (queue.length) {
    const [game] = queue.shift();
    const file = `output/realms-overhaul/${game}/final-layout.log`;
    const log = fs.openSync(file, "w");
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/qa/realms-overhaul.mjs", "layout-qa", game], {
        windowsHide: true,
        stdio: ["ignore", log, log],
      });
      child.once("error", reject);
      child.once("exit", resolve);
    });
    fs.closeSync(log);
    results.push({ game, code, log: file });
    console.log(`${code === 0 ? "PASS" : "FAIL"} final layout ${game}`);
  }
}
await Promise.all([worker(), worker(), worker()]);
fs.writeFileSync(
  "output/realms-overhaul/final-layout-results.json",
  JSON.stringify(results, null, 2),
);
if (results.some((r) => r.code !== 0)) process.exitCode = 1;
