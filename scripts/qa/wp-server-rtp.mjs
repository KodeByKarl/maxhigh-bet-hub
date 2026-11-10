// Loopback-only: play many REAL paid Wild Panther spins (with features) through the server and compare wagered vs paid per ledger.
// Noise is large for N this size; this is an integration cross-check, not a replacement for the seeded validator.
import { Client } from "./uat-client.mjs";
const N = Number(process.env.WP_SPINS ?? 2500), ANTE = process.env.WP_ANTE === "1", BET = Number(process.env.WP_BET ?? 1);
const users = (process.env.WP_USERS ?? "uat_player,uat_player2,uat_player3,uat_player4,uat_player5").split(",");
const r2 = (n) => Math.round(n * 100) / 100;
async function run(u) {
  const c = new Client(); await c.login(u);
  const ledger = async () => { const r = await c.rpc("listMyTransactionsFn", { tab: "all", limit: 300 }, { method: "GET" }); return Array.isArray(r) ? r : (r?.rows ?? []); };
  const b0 = await c.balance(); let features = 0, maxFeat = 0, spins = 0, paidSum = 0, wagered = 0;
  for (let i = 0; i < N; i++) {
    const res = await c.rpc("wildPantherSpinFn", { bet: BET, ante: ANTE }); spins++;
    wagered += ANTE ? BET * 1.25 : BET;
    let s = res.session, n = 0;
    if (s?.sessionId && s.freeSpinsLeft > 0) { features++; while (s?.sessionId && s.freeSpinsLeft > 0 && n < 200) { const f = await c.rpc("wildPantherFreeSpinFn", { sessionId: s.sessionId }); s = f.session; n++; } maxFeat = Math.max(maxFeat, n + 1); }
  }
  const b1 = await c.balance(); await c.logout();
  return { user: u, spins, features, maxFeatureSpins: maxFeat, wagered: r2(wagered), netChange: r2(b1 - b0), paid: r2(b1 - b0 + wagered) };
}
const out = await Promise.all(users.map(run));
const wag = out.reduce((a, x) => a + x.wagered, 0), paid = out.reduce((a, x) => a + x.paid, 0);
console.log(out.map((x) => JSON.stringify(x)).join("\n"));
console.log(JSON.stringify({ totalSpins: out.reduce((a, x) => a + x.spins, 0), wagered: r2(wag), paid: r2(paid), observedRtp: +(paid / wag).toFixed(4), note: "single noisy sample; engine validator is the authority" }));
