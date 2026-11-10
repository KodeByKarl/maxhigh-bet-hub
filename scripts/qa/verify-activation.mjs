// Verification of the ACTIVATED UAT through the loopback tunnel: exactly 50 playable / 50 locked for clients, developer maintenance
// access to all 100, client-owner view (all 100 games configurable, locked ones not playable), no account cap, approved notice.
// Uses the synthetic QA players, the developer account and (with --client-owner) the client owner's credentials from the local file.
//   UAT_EXPECT_RELEASE=<sha7> node scripts/qa/verify-activation.mjs
import fs from "node:fs";
import { Client, health, knownFunctions } from "./uat-client.mjs";

const LOCKED = "Game Locked. Please settle the remaining project payment to activate this game.";
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
note("client lobby reports exactly 50 locked games equal to the approved list", st.lockedGames.length === 50 && [...st.lockedGames].sort().join() === [...alloc.locked].sort().join(), `${st.lockedGames.length}`);
note("client lobby notice is the approved game message", st.message === LOCKED, st.message);
note("Wild Panther playable, Color Game Pro locked", !st.lockedGames.includes("wild-panther") && st.lockedGames.includes("color-game-pro"));
const before = await p.balance();
let refusedOk = 0; const bad = [];
for (const g of alloc.locked) { const r = await refused(() => p.rpc(...spinCall(g))); if (r.refused && r.msg === LOCKED) refusedOk++; else bad.push(`${g}:${r.refused ? r.msg : "ACCEPTED"}`); }
note("all 50 locked games refuse a client wager with the approved message", refusedOk === 50, bad.slice(0, 3).join("; "));
note("refused wagers changed no balance", (await p.balance()) === before);
let playedOk = 0; const failed = [];
for (const g of alloc.available) { const r = await refused(() => p.rpc(...spinCall(g))); if (!r.refused) playedOk++; else failed.push(`${g}:${r.msg}`); }
note("all 50 playable games accept a client wager", playedOk === 50, failed.slice(0, 3).join("; "));
await p.logout();

const o = new Client(); await o.login("uat_owner");
const ost = await o.rpc("getAccessStatusFn", undefined, { method: "GET" });
note("developer lobby is in QA mode: all 100 games available to the developer maintenance account", ost.lockedGames.length === 0 && ost.ownerQa === true);
const cat = await o.rpc("listSuperGames" + "Fn", undefined, { method: "GET" });
note("developer admin catalog lists all 100 games; 50 flagged locked for clients", cat.length === 100 && cat.filter((r) => r.locked).length === 50 && cat.filter((r) => r.ownerQa).length === 50, `${cat.length} listed`);
const adm = await o.rpc("getAdminLimitStatusFn", undefined, { method: "GET" });
note("no account limit: admin screens show no notice", adm.restricted === false && adm.message === null, JSON.stringify(adm));
await o.logout();
if (process.argv.includes("--client-owner")) {
  const credFile = process.env.CLIENT_STAFF_CREDS_FILE ?? "C:\\Users\\Keydi\\maxhigh-uat-secrets\\client-staff-credentials.txt";
  const row = fs.readFileSync(credFile, "utf8").split(/\r?\n/).find((l) => l.startsWith("client_owner\t"));
  if (!row) throw new Error("client_owner not found in the local credentials file");
  const co = new Client(); await co.login("client_owner", row.split("\t")[2]);
  const cst = await co.rpc("getAccessStatusFn", undefined, { method: "GET" });
  note("client owner lobby: exactly the 50 locked games (no developer QA mode)", cst.lockedGames.length === 50 && cst.ownerQa !== true);
  const ccat = await co.rpc("listSuperGamesFn", undefined, { method: "GET" });
  note("client owner admin catalog: all 100 games, 50 Locked, none restricted from configuration", ccat.length === 100 && ccat.filter((r) => r.locked).length === 50 && ccat.every((r) => !r.configLocked));
  const cp = await refused(() => co.rpc(...spinCall(alloc.locked[0])));
  note("client owner cannot play a locked game", cp.refused && cp.msg === LOCKED, cp.msg);
  const cact = await refused(() => co.rpc("superUpdateGameFn", { gameId: alloc.locked[0], enabled: true }));
  note("client owner cannot activate a locked game", cact.refused && cact.msg === LOCKED, cact.msg);
  await co.logout();
}
const failedN = results.filter((x) => !x).length;
console.log(`\n${results.length} checks, ${failedN} failed`);
process.exit(failedN ? 1 : 0);
