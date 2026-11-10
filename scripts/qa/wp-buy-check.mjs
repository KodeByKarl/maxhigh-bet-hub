// Loopback-only: buy the Wild Panther feature at several bets, play it out, and reconcile price and settlement with the ledger.
import { Client } from "./uat-client.mjs";
const c = new Client(); await c.login(process.env.BR_USER ?? "uat_player3");
const r2 = (n) => Math.round(n * 100) / 100;
const ledger = async () => { const r = await c.rpc("listMyTransactionsFn", { tab: "all", limit: 300 }, { method: "GET" }); return Array.isArray(r) ? r : (r?.rows ?? []); };
let allOk = true;
for (const bet of [0.2, 1, 5, 200]) {
  const ids = new Set((await ledger()).map((x) => x.id)); const b0 = await c.balance();
  const buy = await c.rpc("wildPantherBuyFeatureFn", { bet, mode: "normal" });
  const sid = buy.session?.sessionId; let left = buy.session?.freeSpinsLeft, n = 0;
  while (left > 0 && n < 200) { const f = await c.rpc("wildPantherFreeSpinFn", { sessionId: sid }); left = f.session?.freeSpinsLeft ?? 0; n++; }
  const rows = (await ledger()).filter((x) => !ids.has(x.id)); const b1 = await c.balance();
  const bets = rows.filter((x) => x.type === "bet"), wins = rows.filter((x) => x.type === "win" || x.type === "jackpot");
  const price = r2(-bets.reduce((t, x) => t + Number(x.amount), 0)), paid = r2(wins.reduce((t, x) => t + Number(x.amount), 0));
  const ok = price === r2(bet * 41) && r2(b0 + rows.reduce((t, x) => t + Number(x.amount), 0)) === r2(b1) && left === 0 && n <= 100;
  allOk &&= ok;
  console.log(`bet ${bet}: price ${price} (expect ${r2(bet * 41)}) paid ${paid} (${(paid / bet).toFixed(1)}x) spins ${n} ledger-balanced ${r2(b0 + rows.reduce((t, x) => t + Number(x.amount), 0)) === r2(b1)} -> ${ok ? "PASS" : "FAIL"}`);
}
const sup = await c.rpc("wildPantherBuyFeatureFn", { bet: 1, mode: "super" }).then(() => "ACCEPTED", (e) => "refused: " + e.message.slice(0, 50));
console.log("super buy:", sup);
await c.logout();
process.exit(allOk && sup.startsWith("refused") ? 0 : 1);
