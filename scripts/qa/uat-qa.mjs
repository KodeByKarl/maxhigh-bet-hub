// MaxHigh UAT functional QA runner (synthetic accounts / test credits only; talks to UAT through the loopback tunnel).
//   node scripts/qa/uat-qa.mjs --plan                       list games, families, recipes (no network)
//   node scripts/qa/uat-qa.mjs --run [--games a,b,c] [--phases functional,negative,idempotency,concurrency] [--confirm-uat]
// Every round is reconciled against the player's ledger: rows created by the round must add up to the balance change, a paid spin must
// create exactly one 'bet' row of -bet, rejected requests must change nothing. Evidence: JSON lines + summary under the evidence dir.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Client, health, knownFunctions, RpcRejection } from "./uat-client.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const PHASES = new Set(opt("phases", "functional,negative,idempotency,concurrency").split(","));
const ONLY = opt("games", "") ? new Set(opt("games").split(",")) : null;
const ROUNDS = Number(opt("rounds", 1));
const PLAYERS = (process.env.UAT_QA_PLAYERS ?? "uat_player,uat_player2,uat_player3,uat_player4,uat_player5").split(",");
const RELEASE = process.env.UAT_EXPECT_RELEASE ?? "2294d79";
const EVIDENCE = opt("evidence", path.join(process.env.UAT_EVIDENCE_DIR ?? "C:\\Users\\Keydi\\maxhigh-evidence", `g13-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`));
const fns = new Set(knownFunctions());
const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const r2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- catalog and per-family recipes
const catalog = fs.readFileSync("deploy/diagnostics/uat-game-catalog.tsv", "utf8").trim().split("\n").slice(1).map((l) => {
  const [id, category, title, min, max] = l.split("\t"); return { id, category, title, min: Number(min), max: Number(max) };
});
const CARD_RECIPES = {   // single-call deal games with a simple stake field
  baccarat: { fn: "baccaratDealFn", input: (b) => ({ playerBet: b }) },
  lucky9: { fn: "lucky9DealFn", input: (b) => ({ playerBet: b }) },
  "lucky-nine-plus": { fn: "luckyNinePlusDealFn", input: (b) => ({ playerBet: b }) },
  "ace-high": { fn: "aceHighDealFn", input: (b) => ({ baseBet: b }) },
};
const pascal = (id) => camel(id)[0].toUpperCase() + camel(id).slice(1);
let handCounter = 0;
// Three-card-style games (ante -> decision): play adds a wager equal to the ante, fold adds none. Alternate to cover both.
const anteGame = (fnPrefix, sessionFn) => ({
  family: "multistep-ante", fn: `${fnPrefix}DealFn`, input: (b) => ({ ante: b, pairPlus: 0 }), free: null,
  async cleanup(c) { const s = await c.rpc(sessionFn, undefined, { method: "GET" }); if (s?.sessionId) await c.rpc(`${fnPrefix}FoldFn`, { sessionId: s.sessionId }); },
  async finish(c, res, bet) {
    const sid = res?.sessionId ?? res?.script?.sessionId; const play = handCounter++ % 2 === 0;
    const last = await c.rpc(play ? `${fnPrefix}PlayFn` : `${fnPrefix}FoldFn`, { sessionId: sid });
    return { extra: play ? bet : 0, last, label: play ? "play" : "fold" };
  },
  async recovery(c, bet) {   // interruption: deal, "disconnect", session must be recoverable and a second deal refused
    const r = await c.rpc(`${fnPrefix}DealFn`, { ante: bet, pairPlus: 0 }); const sid = r?.sessionId ?? r?.script?.sessionId;
    const open = await c.rpc(sessionFn, undefined, { method: "GET" });
    let blocked = false; try { await c.rpc(`${fnPrefix}DealFn`, { ante: bet, pairPlus: 0 }); } catch { blocked = true; }
    await c.rpc(`${fnPrefix}FoldFn`, { sessionId: sid });
    return { ok: open?.sessionId === sid && blocked, detail: `session recoverable=${open?.sessionId === sid} second deal blocked=${blocked}` };
  },
});
const SPECIAL = {
  threecardpoker: anteGame("threeCardPoker", "getThreeCardPokerSessionFn"),
  "tongits-arena": anteGame("tongitsArena", "getTongitsArenaSessionFn"),
  "poker-showdown": anteGame("pokerShowdown", "getPokerShowdownSessionFn"),
  "color-game": { family: "spot-bet", fn: "colorGameDealFn", input: (b) => ({ bets: { red: b } }), free: null,
    async prepare(c, bet) { if (bet < 2) return { bets: { red: bet } }; const a = r2(bet / 2); return { bets: { red: a, blue: r2(bet - a) } }; }, stake: (bet) => bet },
  "color-game-pro": { family: "spot-bet", fn: "colorGameProDealFn", input: (b) => ({ bets: { red: b } }), free: null,
    async prepare(c, bet) { if (bet < 2) return { bets: { pink: bet } }; const a = r2(bet / 2); return { bets: { pink: a, green: r2(bet - a) } }; }, stake: (bet) => bet },
  "lucky-drop": (() => {
    // Resolve an open climb legally: make the most probable call; if it was right, cash out (a cash-out needs one correct call).
    const best = (run) => ((run.higher?.p ?? -1) >= (run.lower?.p ?? -1) ? "higher" : "lower");
    const close = async (c) => {
      const o = await c.rpc("getLuckyDropOpenRunFn", undefined, { method: "GET" }); if (!o?.run) return null;
      const gr = await c.rpc("luckyDropGuessFn", { pick: best(o.run) });
      return gr?.outcome === "continue" ? c.rpc("luckyDropCashoutFn", {}) : gr;
    };
    return {
      family: "multistep-climb", fn: "luckyDropStartFn", input: (b) => ({ bet: b }), free: null,
      cleanup: async (c) => { await close(c); },
      async finish(c, res) { const last = (await close(c)) ?? res; return { extra: 0, last, label: String(last?.outcome) }; },
      async recovery(c, bet) {
        await c.rpc("luckyDropStartFn", { bet }); const open = await c.rpc("getLuckyDropOpenRunFn", undefined, { method: "GET" });
        let blocked = false; try { await c.rpc("luckyDropStartFn", { bet }); } catch { blocked = true; }
        await close(c);
        return { ok: !!open?.run && blocked, detail: `open run recoverable=${!!open?.run} second start blocked=${blocked}` };
      },
    };
  })(),
  "drop-deluxe": { family: "multistep-draw", fn: "dropDeluxeDealFn", input: (b) => ({ bet: b }), free: null,
    async cleanup(c) { const o = await c.rpc("getDropDeluxeOpenHandFn", undefined, { method: "GET" }); if (o?.open ?? o?.hand) await c.rpc("dropDeluxeDrawFn", { holds: [true, true, true, true, true] }); },
    async finish(c, res) { const last = await c.rpc("dropDeluxeDrawFn", { holds: [true, false, true, false, false] }); return { extra: 0, last, label: String(last?.result) }; },
    async recovery(c, bet) {
      await c.rpc("dropDeluxeDealFn", { bet }); const open = await c.rpc("getDropDeluxeOpenHandFn", undefined, { method: "GET" });
      let blocked = false; try { await c.rpc("dropDeluxeDealFn", { bet }); } catch { blocked = true; }
      await c.rpc("dropDeluxeDrawFn", { holds: [true, true, true, true, true] });
      return { ok: !!(open?.open ?? open?.hand) && blocked, detail: `open hand recoverable=${!!(open?.open ?? open?.hand)} second deal blocked=${blocked}` };
    } },
};
// Fishing: all seven share one API. A shot needs a server-spawned fish id (deepBassSyncSpawnsFn-style call); weapons define the stake.
function fishingRecipe(id) {
  const P = pascal(id), c0 = camel(id);
  return { family: "fishing", fn: `${c0}FireShotFn`, free: null, weapons: null, P,
    async init(c) { const cfg = await c.rpc(`get${P}EngineConfigFn`, undefined, { method: "GET" }); this.weapons = (cfg.weapons ?? []).map((w) => [w.id, Number(w.betCost)]); return this.weapons; },
    async target(c) { for (let i = 0; i < 8; i++) { const s = await c.rpc(`${c0}SyncSpawnsFn`, undefined); const f = [...(s?.fish ?? [])].sort((a, b) => b.createdAt - a.createdAt)[0]; if (f) return f.instanceId; } throw new Error("no fish spawned after 8 syncs"); },
    async prepare(c, bet, weaponId) { return { weaponId: weaponId ?? this.weapons.find(([, cost]) => cost === bet)?.[0] ?? this.weapons[0][0], target: { instanceId: await this.target(c) } }; },
    negCases: () => [["invalid-weapon", { weaponId: "cannon", target: { instanceId: "x" } }], ["unknown-fish-instance", { weaponId: "mini", target: { instanceId: "fish-forged-0000" } }],
      ["overlong-instance-id", { weaponId: "mini", target: { instanceId: "f".repeat(65) } }], ["missing-target", { weaponId: "mini" }], ["client-chosen-payout-field", { weaponId: "mini", target: { instanceId: "fish-forged-0000", payoutMult: 9999 } }]],
  };
}
function recipe(g) {
  if (SPECIAL[g.id]) return SPECIAL[g.id];
  if (g.category === "fishing" && fns.has(`${camel(g.id)}FireShotFn`)) return fishingRecipe(g.id);
  const c = camel(g.id);
  if (g.category === "slot" && fns.has(`${c}SpinFn`)) {
    const betOnly = ["fire-spike", "coin-volcano"].includes(g.id);
    return { family: betOnly ? "slot-betonly" : "slot", fn: `${c}SpinFn`, free: fns.has(`${c}FreeSpinFn`) ? { fn: `${c}FreeSpinFn`, input: (sid) => ({ sessionId: sid }) } : null, input: (b) => (betOnly ? { bet: b } : { bet: b, ante: false }) };
  }
  if (g.category === "slot") return { family: "realms", fn: "realmsSpinFn", free: { fn: "realmsFreeSpinFn", input: (sid) => ({ gameId: g.id, sessionId: sid }) }, input: (b) => ({ gameId: g.id, bet: b, ante: false }) };
  if (CARD_RECIPES[g.id]) return { family: "cards-deal", ...CARD_RECIPES[g.id], free: null };
  return { family: "pending", reason: g.category === "fishing" ? "fishing: needs room state + target ids (multi-step recipe)" : "multi-step/spot-bet card game (recipe not implemented yet)" };
}
const games = catalog.filter((g) => !ONLY || ONLY.has(g.id)).map((g) => ({ ...g, r: recipe(g) }));
if (flag("run")) { const probe = new Client(); await probe.login(PLAYERS[0]); for (const g of games) if (g.r.init) await g.r.init(probe); await probe.logout(); }
const defaultBet = (g) => Math.min(g.max, Math.max(g.min, 1));
const betsFor = (g) => g.r.family === "fishing" && g.r.weapons ? g.r.weapons.map(([, cost]) => cost) : [...new Set([g.min, defaultBet(g), g.max])].map(r2);
const stakeOf = (g, bet) => (g.r.stake ? g.r.stake(bet) : bet);
const openInput = async (c, g, bet) => (g.r.prepare ? g.r.prepare(c, bet) : g.r.input(bet));
// Finish any free-spin feature left open (by an earlier phase/run) so the next bet is not refused. Bounded.
async function drainFeature(c, g) {
  if (!g.r.free) return 0;
  const getter = g.r.family === "realms" ? ["getRealmsSessionFn", { gameId: g.id }] : [`get${pascal(g.id)}SessionFn`, undefined];
  if (!fns.has(getter[0])) return 0;
  let n = 0, st = await c.rpc(getter[0], getter[1], { method: "GET" });
  let session = st?.session ?? st;
  while (session?.sessionId && Number(session.freeSpinsLeft) > 0 && n < 3000) { const fr = await c.rpc(g.r.free.fn, g.r.free.input(session.sessionId)); session = fr?.session; n++; }
  if (session?.sessionId && Number(session.freeSpinsLeft) > 0) throw new Error(`free-spin feature did not terminate after ${n} drained spins`);
  return n;
}
const tidy = async (c, g) => { if (g.r.cleanup) await g.r.cleanup(c); await drainFeature(c, g); };

if (flag("plan")) {
  const fam = {}; for (const g of games) (fam[g.r.family] ??= []).push(g.id);
  console.log(`catalog games: ${games.length}`);
  for (const [f, ids] of Object.entries(fam)) console.log(`${f.padEnd(12)} ${String(ids.length).padStart(3)}  ${ids.slice(0, 6).join(", ")}${ids.length > 6 ? ", ..." : ""}`);
  console.log(`phases: ${[...PHASES].join(",")}   players: ${PLAYERS.join(",")}   rounds per bet size: ${ROUNDS}`);
  console.log("pending recipes (reported, not failed):", games.filter((g) => g.r.family === "pending").map((g) => g.id).join(", "));
  process.exit(0);
}
if (!flag("run")) { console.log("use --plan or --run"); process.exit(2); }

// ---------------------------------------------------------------- helpers
const results = [];
fs.mkdirSync(EVIDENCE, { recursive: true });
const sink = fs.openSync(path.join(EVIDENCE, "results.jsonl"), "a");
function record(rec) { results.push(rec); fs.writeSync(sink, JSON.stringify(rec) + "\n"); if (!rec.ok) console.log(`FAIL ${rec.game} ${rec.phase} ${rec.detail ?? ""}`); }
const ledger = async (c) => { const r = await c.rpc("listMyTransactionsFn", { tab: "all", limit: 300 }, { method: "GET" }); return Array.isArray(r) ? r : (r?.rows ?? []); };

async function snapshot(c) { return { bal: await c.balance(), ids: new Set((await ledger(c)).map((r) => r.id)) }; }
async function delta(c, before) {
  const after = await c.balance();
  const rows = (await ledger(c)).filter((r) => !before.ids.has(r.id));
  return { after, rows, sum: r2(rows.reduce((s, r) => s + Number(r.amount), 0)) };
}

async function spinOnce(c, g, bet, key = randomUUID()) {
  await tidy(c, g);
  const before = await snapshot(c);
  // Fish are short-lived server-side; if the target expired between spawn and shot, take a fresh one once.
  let res = await c.rpc(g.r.fn, await openInput(c, g, bet), { key }).catch(async (e) => {
    if (g.r.family === "fishing" && /Unknown or expired fish/.test(e.message)) return c.rpc(g.r.fn, await openInput(c, g, bet), { key: randomUUID() });
    throw e;
  });
  let extra = 0, label;
  if (g.r.finish) { const fin = await g.r.finish(c, res, bet); extra = fin.extra ?? 0; label = fin.label; res = { ...fin.last, script: fin.last?.script ?? res?.script }; }
  let feature = 0;
  let session = res?.session;
  while (g.r.free && session?.sessionId && Number(session.freeSpinsLeft) > 0 && feature < 3000) {
    const fr = await c.rpc(g.r.free.fn, g.r.free.input(session.sessionId));
    session = fr?.session; feature++;
  }
  if (session?.sessionId && Number(session.freeSpinsLeft) > 0) throw new Error(`free-spin feature did not terminate after ${feature} spins (session left open)`);
  const d = await delta(c, before);
  return { before, res, feature, extra, label, ...d };
}

function reconcile(bet, o, stake = bet) {
  const bets = o.rows.filter((r) => r.type === "bet");
  // Documented extra wagers: ace-high war (tie) places one more equal bet per depth, labelled "war match" in the ledger note.
  const warRows = bets.filter((r) => /war match/i.test(String(r.note ?? r.description ?? "")) && r2(Number(r.amount)) === r2(-stake));
  const wagered = r2(stake + (o.extra ?? 0) + warRows.length * stake);
  const checks = {
    balanceArithmetic: r2(o.before.bal + o.sum) === r2(o.after),
    betRowsEqualWager: r2(bets.reduce((t, r) => t + Number(r.amount), 0)) === r2(-wagered) && bets.length >= 1 && bets.length <= 2 + warRows.length,
    noNegativeBalance: o.after >= 0,
    resultBalanceMatches: o.feature > 0 || o.res?.balance === undefined || r2(Number(o.res.balance)) === r2(o.after),
    onlyKnownRowTypes: o.rows.every((r) => ["bet", "win", "jackpot"].includes(r.type)),
  };
  const win = r2(o.rows.filter((r) => r.type === "win" || r.type === "jackpot").reduce((s, r) => s + Number(r.amount), 0));
  const scriptWin = o.res?.script?.totalWin;
  if (o.feature === 0 && typeof scriptWin === "number") checks.winRowsMatchResult = Math.abs(win - r2(scriptWin)) <= 0.01;
  return { checks, win };
}

async function refusal(c, g, label, input) {
  const before = await snapshot(c);
  let rejected = false, why = "";
  try { await c.rpc(g.r.fn, input); } catch (e) { rejected = true; why = e.message.slice(0, 80); }
  const d = await delta(c, before);
  const clean = d.rows.length === 0 && r2(d.after) === r2(before.bal);
  record({ game: g.id, phase: "negative", case: label, ok: rejected && clean, detail: rejected ? (clean ? why : "REJECTED BUT STATE CHANGED") : "NOT REJECTED" });
}

// ---------------------------------------------------------------- locked-game access check (restricted configuration)
const LOCKED_MSG = "Game temporarily unavailable. Additional games will be activated after final payment confirmation.";
async function lockedCheck(c, g) {
  const before = await snapshot(c);
  let rejected = false, msg = "";
  try { await c.rpc(g.r.fn, await openInput(c, g, r2(betsFor(g)[0]))); } catch (e) { rejected = true; msg = e.message; }
  const d = await delta(c, before);
  const clean = d.rows.length === 0 && r2(d.after) === r2(before.bal);
  record({ game: g.id, phase: "locked", ok: rejected && msg === LOCKED_MSG && clean, detail: rejected ? (msg === LOCKED_MSG ? (clean ? "refused with the approved message, no wallet/ledger change" : "REFUSED BUT STATE CHANGED") : "refused with a DIFFERENT message: " + msg.slice(0, 80)) : "NOT REFUSED - locked game accepted a wager" });
}

// ---------------------------------------------------------------- phases for one game on one authenticated player
async function testGame(c, g) {
  if (flag("locked-check")) { await lockedCheck(c, g); return; }
  if (g.r.family === "pending") { record({ game: g.id, phase: "plan", ok: true, pending: true, detail: g.r.reason }); return; }
  if (PHASES.has("functional")) {
    for (const bet of betsFor(g)) for (let i = 0; i < ROUNDS; i++) {
      try {
        const o = await spinOnce(c, g, bet);
        const { checks, win } = reconcile(bet, o, stakeOf(g, bet));
        record({ game: g.id, phase: "functional", bet, ok: Object.values(checks).every(Boolean), rowsIfFailed: Object.values(checks).every(Boolean) ? undefined : o.rows.map((r) => [r.type, r.amount, r.game, r.note ?? r.description]), checks, win, feature: o.feature, newRows: o.rows.length, detail: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(",") });
      } catch (e) {
        const stuck = /did not terminate/.test(e.message);
        record({ game: g.id, phase: "functional", bet, ok: false, defect: stuck ? "free-spin feature never ends (open session blocks further bets for this player)" : undefined, detail: e.message.slice(0, 160) });
        if (stuck) { record({ game: g.id, phase: "blocked", ok: true, pending: true, detail: "remaining phases skipped: open feature session on this player" }); return; }
      }
    }
  }
  if (PHASES.has("negative")) {
    const cases = [["zero", 0], ["negative", -1], ["fraction-of-a-cent", 0.001], ["above-game-max", Math.min(100000, r2(g.max * 1.5 + 1))]];
    if (g.min / 2 >= 0.01) cases.push(["below-game-min", r2(g.min / 2)]);
    if (g.r.negCases) { for (const [label, input] of g.r.negCases()) await refusal(c, g, label, input); }
    else for (const [label, bet] of cases) await refusal(c, g, label, g.r.input(bet));
    await tidy(c, g);
  }
  if (PHASES.has("idempotency")) {
    await tidy(c, g);
    const key = randomUUID(), bet = r2(betsFor(g)[0]);
    const before = await snapshot(c);
    let ok = true, why = "";
    const input = await openInput(c, g, bet);
    try { await c.rpc(g.r.fn, input, { key }); } catch (e) { ok = false; why = "first call failed: " + e.message.slice(0, 80); }
    try { await c.rpc(g.r.fn, input, { key }); } catch { /* a rejection of the replay is acceptable */ }
    await tidy(c, g);
    const d = await delta(c, before);
    const bets = d.rows.filter((r) => r.type === "bet" && !/war match/i.test(String(r.note ?? r.description ?? ""))).length;
    if (g.r.recovery) { try { const rec = await g.r.recovery(c, r2(betsFor(g)[0])); record({ game: g.id, phase: "recovery", ok: rec.ok, detail: rec.detail }); } catch (e) { record({ game: g.id, phase: "recovery", ok: false, detail: e.message.slice(0, 140) }); await tidy(c, g).catch(() => {}); } }
    record({ game: g.id, phase: "idempotency", ok: ok && bets === 1, detail: ok ? `bet rows after same-key replay: ${bets}` : why });
  }
}

async function concurrency(c, g) {
  if (g.r.family === "pending") return;
  await tidy(c, g);
  const bet = r2(betsFor(g)[0]), before = await snapshot(c);
  const inputs = [await openInput(c, g, bet), await openInput(c, g, bet)];
  const out = await Promise.allSettled(inputs.map((i) => c.rpc(g.r.fn, i)));
  await tidy(c, g);
  const d = await delta(c, before);
  const okCount = out.filter((o) => o.status === "fulfilled").length;
  const bets = d.rows.filter((r) => r.type === "bet" && !/war match/i.test(String(r.note ?? r.description ?? "")));
  const ok = (g.r.family === "multistep-ante" || g.r.family === "multistep-climb" || g.r.family === "multistep-draw" ? okCount === 1 : true) && bets.length === okCount && r2(before.bal + d.sum) === r2(d.after) && d.after >= 0;
  record({ game: g.id, phase: "concurrency", ok, detail: `parallel spins ok=${okCount}/2 bet rows=${bets.length} arithmetic=${r2(before.bal + d.sum) === r2(d.after)}` });
}

// ---------------------------------------------------------------- run
const h = await health(); console.log("health", JSON.stringify(h));
if (!h.ok || !String(h.release).startsWith(RELEASE)) throw new Error("UAT health/release unexpected - stopping");
if (!flag("confirm-uat")) throw new Error("--confirm-uat is required for --run (writes synthetic ledger rows)");

const clients = [];
for (const p of PLAYERS) { const c = new Client(); await c.login(p); clients.push(c); }
console.log(`logged in: ${PLAYERS.join(", ")} (one attempt each)`);
const startBalances = await Promise.all(clients.map((c) => c.balance()));
const queues = clients.map(() => []);
games.forEach((g, i) => queues[i % clients.length].push(g));
await Promise.all(clients.map(async (c, i) => { for (const g of queues[i]) { try { await testGame(c, g); } catch (e) { record({ game: g.id, phase: "runner", ok: false, detail: e.message.slice(0, 160) }); } } }));
if (PHASES.has("concurrency")) { const sample = games.filter((g) => g.r.family !== "pending").filter((_, i) => i % 20 === 0); await Promise.all(sample.map((g, i) => concurrency(clients[i % clients.length], g))); }
const endBalances = await Promise.all(clients.map((c) => c.balance()));
await Promise.all(clients.map((c) => c.logout()));

// ---------------------------------------------------------------- summary
const by = (f) => results.filter(f);
const failed = by((r) => !r.ok);
const covered = new Set(by((r) => r.ok && r.phase === "functional").map((r) => r.game));
const summary = {
  finishedUtc: new Date().toISOString(), games: games.length, gamesWithPassingFunctionalRound: covered.size,
  pendingRecipes: by((r) => r.pending).map((r) => r.game), checks: results.length, failed: failed.length,
  byPhase: Object.fromEntries([...new Set(results.map((r) => r.phase))].map((p) => [p, { total: by((r) => r.phase === p).length, failed: by((r) => r.phase === p && !r.ok).length }])),
  balances: PLAYERS.map((p, i) => ({ player: p, start: startBalances[i], end: endBalances[i] })),
  failures: failed.slice(0, 40),
};
fs.writeFileSync(path.join(EVIDENCE, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, failures: failed.length ? `${failed.length} (see summary.json)` : [] }, null, 1));
console.log(`evidence: ${EVIDENCE}`);
process.exit(failed.length ? 1 : 0);
