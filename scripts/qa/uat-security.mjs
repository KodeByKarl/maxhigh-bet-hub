// Security regression probes against a LOOPBACK target (clone or tunnel). Every probe must be REFUSED and must leave
// the wallet unchanged. No probe tries to bypass a control; they confirm the controls hold.
//   node scripts/qa/uat-security.mjs --confirm [--evidence dir]
import fs from "node:fs";
import path from "node:path";
import { Client, health } from "./uat-client.mjs";

const args = process.argv.slice(2);
if (!args.includes("--confirm")) throw new Error("--confirm required");
const evidence = args.includes("--evidence") ? args[args.indexOf("--evidence") + 1] : "security-evidence";
fs.mkdirSync(evidence, { recursive: true });
const results = [];
const note = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`); };
const refused = async (fn) => { try { const r = await fn(); return { refused: false, r }; } catch (e) { return { refused: true, why: String(e.message).slice(0, 90) }; } };

console.log("health", JSON.stringify(await health()));
const player = new Client(); await player.login(process.env.SEC_PLAYER ?? "uat_player2");
const anon = new Client();
const bal0 = await player.balance();
const target = (await player.rpc("getBalanceFn", undefined, { method: "GET" })) && null;

// 1 unauthenticated access
for (const [fn, data] of [["goldenPantherSpinFn", { bet: 1, ante: false }], ["getBalanceFn", undefined], ["superAdjustBalanceFn", { userId: "x", delta: 1, note: "x", confirmPassword: "x" }], ["listSuperUsersFn", { limit: 5 }]]) {
  const o = await refused(() => anon.rpc(fn, data, { method: fn === "getBalanceFn" || fn === "listSuperUsersFn" ? "GET" : "POST" }));
  note(`anonymous ${fn} refused`, o.refused, o.why);
}
// 2 privilege escalation as a plain player
for (const [fn, data, method] of [
  ["superAdjustBalanceFn", { userId: "00000000-0000-0000-0000-000000000000", delta: 100000, note: "attack", confirmPassword: "x" }, "POST"],
  ["superCreateUserFn", { username: "sec_probe_user", password: "Probe-Pass-12345", role: "superadmin", balance: 999999, displayName: "x" }, "POST"],
  ["listSuperUsersFn", { limit: 5 }, "GET"],
]) {
  const o = await refused(() => player.rpc(fn, data, { method }));
  note(`player ${fn} refused`, o.refused, o.why);
}
// 3 cross-site / forged origin
for (const [label, opts] of [["foreign Origin (no Sec-Fetch-Site)", { origin: "https://evil.example", site: null }], ["cross-site Sec-Fetch-Site", { site: "cross-site" }]]) {
  const o = await refused(() => player.rpc("goldenPantherSpinFn", { bet: 1, ante: false }, opts));
  note(`state-changing call with ${label} refused`, o.refused, o.why);
}
// 3b a player cannot move another real account's balance (target discovered through a superadmin session)
{
  const owner = new Client(); await owner.login(process.env.SEC_OWNER ?? "uat_owner");
  const list = async () => { const r = await owner.rpc("listSuperUsersFn", { limit: 300 }, { method: "GET" }); return Array.isArray(r) ? r : (r?.rows ?? r?.users ?? []); };
  const victim = (await list()).find((u) => u.username === (process.env.SEC_VICTIM ?? "uat_player4"));
  const before = Number(victim.balance);
  for (const delta of [50000, -50000]) { const o = await refused(() => player.rpc("superAdjustBalanceFn", { userId: victim.id, delta, note: "attack", confirmPassword: "wrong" })); note(`player cannot adjust a real account by ${delta}`, o.refused, o.why); }
  const after = Number((await list()).find((u) => u.id === victim.id).balance);
  note("victim balance unchanged after attempts", after === before, `${before} -> ${after}`);
  await owner.logout();
}
// 4 forged / tampered session cookie
const forged = new Client(); forged.cookie = "A".repeat(40);
const fo = await refused(() => forged.rpc("goldenPantherSpinFn", { bet: 1, ante: false }));
note("forged session cookie refused", fo.refused, fo.why);
// 5 malformed wager values (type confusion, non-finite, overflow, client-supplied payout)
for (const [label, bet] of [["string", "1"], ["NaN", NaN], ["Infinity", Infinity], ["1e309", 1e309], ["negative", -5], ["zero", 0], ["sub-cent", 0.001], ["huge", 1e12], ["null", null]]) {
  const o = await refused(() => player.rpc("goldenPantherSpinFn", { bet, ante: false }));
  note(`malformed bet (${label}) refused`, o.refused, o.why);
}
const extra = await player.rpc("goldenPantherSpinFn", { bet: 1, ante: false, totalWin: 999999, payout: 999999, balance: 999999 }).then(() => "accepted", (e) => "rejected: " + e.message.slice(0, 60));
const afterExtra = await player.balance();
note("client-supplied payout/balance fields cannot change settlement", Math.abs(afterExtra - bal0) < 1000, `${extra}; balance moved ${(afterExtra - bal0).toFixed(2)}`);
// 6 SQL / script payloads in text inputs
const tricky = ["'; DROP TABLE users; --", "<script>alert(1)</script>", "\u0000", "a".repeat(5000)];
for (const t of tricky) { const o = await refused(() => anon.login ? anon.rpc("loginFn", { username: t, password: t }) : Promise.reject(new Error("n/a"))); note(`login with hostile string refused (${JSON.stringify(t.slice(0, 18))})`, o.refused, o.why); }
// 7 replay of a spent idempotency key does not double-charge
const key = crypto.randomUUID(); const b1 = await player.balance();
await player.rpc("goldenPantherSpinFn", { bet: 1, ante: false }, { key }).catch(() => {}); const b2 = await player.balance();
await player.rpc("goldenPantherSpinFn", { bet: 1, ante: false }, { key }).catch(() => {}); const b3 = await player.balance();
note("same Idempotency-Key replay does not re-charge", Math.abs(b3 - b2) < 1e-9, `after first ${(b2 - b1).toFixed(2)}, after replay ${(b3 - b2).toFixed(2)}`);
// 8 session fixation: logout invalidates the cookie
const old = player.cookie; await player.logout(); const stale = new Client(); stale.cookie = old;
const so = await refused(() => stale.rpc("getBalanceFn", undefined, { method: "GET" }));
note("session unusable after logout", so.refused, so.why);

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(evidence, "security-results.json"), JSON.stringify({ at: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 1));
console.log(`\n${results.length} probes, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
