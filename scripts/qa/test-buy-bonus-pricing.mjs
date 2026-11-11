// Dynamic Buy Bonus pricing across several bets, every buy-enabled slot, against the LOOPBACK clone.
// For each game and bet the server must debit exactly bet x pricePerSpin x 10 (the debit divided by the bet is the same at every bet),
// exactly one debit per purchase, and the bonus is played out so nothing is left open.
//   UAT_BASE=... DB_URL=... node scripts/qa/test-buy-bonus-pricing.mjs <outFile> [bet1,bet2,...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, knownFunctions } from "./uat-client.mjs";

const outFile = process.argv[2] ?? "buy-bonus-pricing.json";
const bets = (process.argv[3] ?? "1,5,20").split(",").map(Number);
const mysql = createRequire(path.resolve("package.json"))("mysql2/promise");
const db = await mysql.createConnection(process.env.DB_URL);
const q = async (sql, p) => (await db.query(sql, p))[0];
const fns = new Set(knownFunctions());
const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const games = fs.readFileSync("C:\\Users\\Keydi\\maxhigh-evidence\\buy-bonus\\buy-games.txt", "utf8").trim().split(/\r?\n/);
const userId = (await q("SELECT id FROM users WHERE username='uat_player'"))[0].id;
await q("UPDATE users SET balance=50000000 WHERE id=?", [userId]);
const c = new Client(); await c.login("uat_player");
const seqNow = async () => Number((await q("SELECT IFNULL(MAX(seq),0) m FROM transactions"))[0].m);
const results = [];
for (const game of games) {
  const base = camel(game);
  const realms = !fns.has(`${base}SpinFn`);
  const wp = game === "wild-panther";
  const perBet = [];
  for (const bet of bets) {
    const s0 = await seqNow();
    try {
      const bought = await c.rpc(realms ? "realmsBuyFeatureFn" : `${base}BuyFeatureFn`, realms ? { gameId: game, bet, quantity: 10 } : wp ? { bet, mode: "normal" } : { bet, mode: "normal", quantity: 10 });
      const s = bought.session; let left = s.freeSpinsLeft, guard = 0;
      const first = left;
      while (left > 0 && guard++ < 400) { const r = await c.rpc(realms ? "realmsFreeSpinFn" : `${base}FreeSpinFn`, realms ? { gameId: game, sessionId: s.sessionId } : { sessionId: s.sessionId }); left = (r.session ?? r).freeSpinsLeft; }
      const rows = await q("SELECT type, amount FROM transactions WHERE user_id=? AND seq>? ORDER BY seq", [userId, s0]);
      const debits = rows.filter((r) => Number(r.amount) < 0);
      perBet.push({ bet, ok: true, initialSpins: first, debits: debits.length, debit: -debits.reduce((a, r) => a + Number(r.amount), 0), perUnit: -debits.reduce((a, r) => a + Number(r.amount), 0) / bet });
    } catch (e) { perBet.push({ bet, ok: false, error: String(e.message).slice(0, 120) }); }
  }
  const good = perBet.filter((p) => p.ok);
  const linear = good.length >= 2 && good.every((p) => Math.abs(p.perUnit - good[0].perUnit) < 0.011 * Math.max(1, good[0].perUnit) / 1 + 0.0001);
  const pass = good.length === perBet.length && linear && good.every((p) => p.debits === 1 && p.initialSpins === 10);
  results.push({ game, pass, perUnit: good[0]?.perUnit, perBet });
  console.log(`${pass ? "PASS" : "FAIL"} ${game} price per 1 bet = ${good[0]?.perUnit?.toFixed(3)} at bets ${bets.join("/")}${pass ? "" : " " + JSON.stringify(perBet).slice(0, 200)}`);
}
await db.end();
fs.writeFileSync(outFile, JSON.stringify({ bets, passed: results.filter((r) => r.pass).length, total: results.length, results }, null, 1));
console.log(`PRICING: ${results.filter((r) => r.pass).length}/${results.length} games pass`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
