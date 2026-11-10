// Read-mostly verification of the ACTIVATED UAT through the loopback tunnel: exactly 50 locked / 50 playable, approved notices, staff cap.
//   UAT_EXPECT_RELEASE=<sha7> node scripts/qa/verify-activation.mjs [--staff-created]
// Probes: one refused wager per locked game (no wallet change expected), one real round on a sample of playable games, the third-staff
// rejection (the probe account must NOT be created), player creation stays open (probe is rolled back by NOT creating: it only checks the message path).
import fs from "node:fs";
import { Client, health, knownFunctions } from "./uat-client.mjs";

const LOCKED = "Game Locked. Please settle the remaining project payment to activate this game.";
const LIMIT = "Account Limit Reached. Please settle the remaining project payment to add more client accounts.";
const alloc = JSON.parse(fs.readFileSync("deploy/handoff/PROPOSED_GAME_ALLOCATION.json", "utf8"));
const results = [];
const note = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  - " + String(d).slice(0, 160) : ""}`); };
const fns = new Set(knownFunctions());
const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const spinCall = (id) => (fns.has(`${camel(id)}SpinFn`) ? [`${camel(id)}SpinFn`, id === "fire-spike" || id === "coin-volcano" ? { bet: 1 } : { bet: 1, ante: false }] : ["realmsSpinFn", { gameId: id, bet: 1, ante: false }]);
const refused = async (fn) => { try { await fn(); return { refused: false }; } catch (e) { return { refused: true, msg: e.message }; } };

const want = process.env.UAT_EXPECT_RELEASE;
const h = await health();
note("UAT health and release", h.ok && (!want || String(h.release).startsWith(want)), h.release);
const p = new Client(); await p.login("uat_player3");
const st = await p.rpc("getAccessStatusFn", undefined, { method: "GET" });
note("lobby reports exactly 50 locked games equal to the approved list", st.lockedGames.length === 50 && [...st.lockedGames].sort().join() === [...alloc.locked].sort().join(), `${st.lockedGames.length}`);
note("lobby notice is the approved game message", st.message === LOCKED, st.message);
note("Wild Panther playable, Color Game Pro locked", !st.lockedGames.includes("wild-panther") && st.lockedGames.includes("color-game-pro"));
const before = await p.balance();
let refusedOk = 0, bad = [];
for (const g of alloc.locked) {
  const r = await refused(() => p.rpc(...spinCall(g)));
  if (r.refused && r.msg === LOCKED) refusedOk++; else bad.push(`${g}:${r.refused ? r.msg : "ACCEPTED"}`);
}
note("all 50 locked games refuse a wager with the approved message", refusedOk === 50, bad.slice(0, 3).join("; "));
note("refused wagers changed no balance", (await p.balance()) === before);
let playedOk = 0, failed = [];
for (const g of alloc.available) {
  const r = await refused(() => p.rpc(...spinCall(g)));
  if (!r.refused) playedOk++; else failed.push(`${g}:${r.msg}`);
}
note("all 50 playable games accept a wager", playedOk === 50, failed.slice(0, 3).join("; "));
await p.logout();

const o = new Client(); await o.login("uat_owner");
const cat = await o.rpc("listSuperGamesFn", undefined, { method: "GET" });
note("admin catalog marks the locked games Locked and none of the playable ones", cat.filter((r) => r.locked).every((r) => alloc.locked.includes(r.gameId)) && cat.filter((r) => !r.locked).every((r) => !alloc.locked.includes(r.gameId)), `${cat.filter((r) => r.locked).length} locked listed`);
const act = await refused(() => o.rpc("superUpdateGameFn", { gameId: alloc.locked[0], enabled: true }));
note("activating a locked game from the admin API is refused with the approved message", act.refused && act.msg === LOCKED, act.msg);
const lim = await o.rpc("getAdminLimitStatusFn", undefined, { method: "GET" });
note("staff-account limit status", lim.max === 2, JSON.stringify(lim));
if (process.argv.includes("--staff-created")) {
  note("two client staff accounts exist and the cap is full", lim.activeClients === 2 && lim.restricted === true);
  const third = await refused(() => o.rpc("superCreateUserFn", { username: "client_admin03_probe", password: "Probe-Pass-12345-x", role: "admin", balance: 0, displayName: "probe" }));
  note("a THIRD client staff account is rejected with the approved notice", third.refused && third.msg === LIMIT, third.msg);
  const created = await refused(() => new Client().login("client_admin03_probe"));
  note("the rejected probe account does not exist", created.refused);
  note("the admin screen notice is the approved account message", lim.message === LIMIT, lim.message);
}
await o.logout();
const failedN = results.filter((x) => !x).length;
console.log(`\n${results.length} checks, ${failedN} failed`);
process.exit(failedN ? 1 : 0);
