// Static audit: every server function that can place a wager or start a round must pass its game id to withFinancialOperation(),
// because the server-side game-access gate hooks there. Prints calls WITHOUT a game id so each can be reviewed.
//   node scripts/audit-game-gate-coverage.mjs [--json]
import fs from "node:fs";
import path from "node:path";

const dir = "src/functions";
const calls = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  let i = 0;
  while ((i = text.indexOf("withFinancialOperation(", i)) !== -1) {
    // balanced-paren scan to the end of the call
    let depth = 0, j = i + "withFinancialOperation".length, inStr = null;
    for (; j < text.length; j++) {
      const ch = text[j];
      if (inStr) { if (ch === "\\") j++; else if (ch === inStr) inStr = null; continue; }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
      if (ch === "(") depth++;
      if (ch === ")") { depth--; if (depth === 0) break; }
    }
    const call = text.slice(i, j + 1);
    const name = /withFinancialOperation\(\s*["'`]([^"'`]+)["'`]/.exec(call)?.[1] ?? "(dynamic)";
    // last top-level argument after the handler: a string literal or an expression like data.gameId
    const tail = call.slice(call.lastIndexOf("}") > -1 ? call.lastIndexOf("}") : 0);
    const gameArg = /,\s*(?:["'`]([a-z0-9-]+)["'`]|((?:data|input)\.gameId))\s*,?\s*\)\s*$/.exec(call.replace(/\s+/g, " "));
    calls.push({ file, action: name, gameId: gameArg ? (gameArg[1] ?? gameArg[2]) : null, snippet: tail.replace(/\s+/g, " ").slice(-70) });
    i = j;
  }
}
const without = calls.filter((c) => !c.gameId);
if (process.argv.includes("--json")) console.log(JSON.stringify({ total: calls.length, withGameId: calls.length - without.length, without }, null, 1));
else {
  console.log(`withFinancialOperation calls: ${calls.length}; with a game id: ${calls.length - without.length}; without: ${without.length}`);
  for (const c of without) console.log(`  NO GAME ID  ${c.file}  ${c.action}`);
}
