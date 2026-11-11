// API-level Buy Bonus verification against a LOOPBACK disposable clone (never the live UAT). Two parts:
//  A) SWEEP over every slot with a buy flow: out-of-spec quantities refused (nothing debited), quantity 1 at bet 1 charges exactly the client
//     reference price on the 29 template slots (42.50) and awards exactly 1 free spin, played at the base bet, a concurrent duplicate purchase yields exactly ONE
//     session and ONE debit, the session starts with exactly 10 free spins, a second purchase while open is refused, the bonus is played out to
//     the end, the payout is credited ONCE (wallet = start - price + payout), and replaying a finished session changes nothing.
//  B) FORCED scenarios on three representatives (config forced through game_controls.engine_config, restored afterwards):
//     retriggers (the total grows by the configured amount, played spins = 10 + all additions), the session spin cap, and the maximum-win cap.
//  UAT_BASE=... DB_URL=... node scripts/qa/test-buy-bonus-api.mjs <evidenceDir> [--only game1,game2] [--skip-forced]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Client, knownFunctions } from "./uat-client.mjs";

const out = process.argv[2] ?? "buy-bonus-api-evidence";
fs.mkdirSync(out, { recursive: true });
const only = process.argv.includes("--only") ? new Set(process.argv[process.argv.indexOf("--only") + 1].split(",")) : null;
const mysql = createRequire(path.resolve("package.json"))("mysql2/promise");
const db = await mysql.createConnection(process.env.DB_URL);
const q = async (sql, p) => (await db.query(sql, p))[0];
const fns = new Set(knownFunctions());
const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const catalog = fs.readFileSync("deploy/diagnostics/uat-game-catalog.tsv", "utf8").trim().split("\n").slice(1).map((l) => { const [id, category, title] = l.split("\t"); return { id, category, title }; }).filter((g) => g.category === "slot");
const NO_BUY = new Set(["ace-high", "coin-volcano", "fire-spike"]);
const results = [];
let failedGames = [];
const note = (name, ok, detail = "") => { results.push({ name, ok, detail }); if (!ok || process.env.VERBOSE) console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + String(detail).slice(0, 200) : ""}`); return ok; };

const player = "uat_player";
const userId = (await q("SELECT id FROM users WHERE username=?", [player]))[0].id;
const c = new Client(); await c.login(player);
const bal = async () => Number((await q("SELECT balance b FROM users WHERE id=?", [userId]))[0].b);
const seqNow = async () => Number((await q("SELECT IFNULL(MAX(seq),0) m FROM transactions"))[0].m);
const rows = (s) => q("SELECT type, amount, note FROM transactions WHERE user_id=? AND seq>? ORDER BY seq", [userId, s]);
const openCount = async () => Number((await q("SELECT COUNT(*) n FROM play_sessions WHERE user_id=? AND status='open'", [userId]))[0].n);
const sum = (rs, f = () => true) => +rs.filter(f).reduce((a, r) => a + Number(r.amount), 0).toFixed(2);

function api(game) {
  const isRealms = !fns.has(`${camel(game)}SpinFn`);
  const base = camel(game);
  if (isRealms) return { game, kind: "realms", buy: (quantity) => c.rpc("realmsBuyFeatureFn", { gameId: game, bet: 1, quantity }), free: (sessionId) => c.rpc("realmsFreeSpinFn", { gameId: game, sessionId }), bet: 1 };
  const bet = game === "wild-panther" ? 5 : 1;
  const wp = game === "wild-panther";
  return { game, kind: wp ? "wild-panther" : "template", bet, buy: (quantity) => c.rpc(`${base}BuyFeatureFn`, wp ? { bet, mode: "normal" } : { bet, mode: "normal", quantity }), free: (sessionId) => c.rpc(`${base}FreeSpinFn`, { sessionId }) };
}
const refusedBy = async (fn) => { try { await fn(); return null; } catch (e) { return String(e.message); } };

// plays a purchased bonus to the end; returns tracking of the server-authorised totals
async function playOut(g, session) {
  let played = session.fsSpinsPlayed ?? 0, left = session.freeSpinsLeft, total = played + left;
  const totals = [total]; const increments = [];
  let guard = 0;
  while (left > 0 && guard++ < 400) {
    const r = await g.free(session.sessionId);
    const s = r.session ?? r;
    played = s.fsSpinsPlayed; left = s.freeSpinsLeft;
    const t = played + left;
    if (t > total) increments.push(t - total);
    total = t; totals.push(t);
  }
  return { played, total, increments, finished: left === 0 };
}

async function oneBonus(g) {
  const s0 = await seqNow(), b0 = await bal();
  const bought = await g.buy(10);
  const session = bought.session;
  const out2 = { initialLeft: session.freeSpinsLeft, initialPlayed: session.fsSpinsPlayed ?? 0 };
  const res = await playOut(g, session);
  const rs = await rows(s0);
  const b1 = await bal();
  return { ...out2, ...res, debits: rs.filter((r) => Number(r.amount) < 0), wins: rs.filter((r) => r.type === "win"), walletOk: Math.abs(b1 - (b0 + sum(rs))) < 0.011, price: -sum(rs, (r) => Number(r.amount) < 0), payout: sum(rs, (r) => r.type === "win"), sessionId: session.sessionId };
}

// ============================================================ A) sweep
await q("UPDATE users SET balance=50000000 WHERE id=?", [userId]);
const games = catalog.filter((g) => (!only || only.has(g.id)) && !NO_BUY.has(g.id));
let retriggersSeen = 0, doneGames = 0;
for (const meta of games) {
  const g = api(meta.id);
  const label = `[${meta.id}]`;
  try {
    // leave nothing open from an earlier game
    if ((await openCount()) > 0) await q("UPDATE play_sessions SET status='closed', free_spins_left=0 WHERE user_id=? AND status='open'", [userId]);
    // 1) out-of-spec quantities are refused and cost nothing (Wild Panther keeps its locked 10 and takes no quantity)
    let s0 = await seqNow(), b0 = await bal();
    const bad = [];
    for (const qty of g.kind === "wild-panther" ? [] : [0, 2.5, 26]) { const m = await refusedBy(() => g.buy(qty)); if (m === null || !/quantit|at most|from 1 to|invalid/i.test(m)) bad.push(`${qty}:${m ?? "ACCEPTED"}`); }
    note(`${label} out-of-spec quantities (0, 2.5, 26) are refused by the server`, bad.length === 0, bad.join(" | "));
    note(`${label} refused quantities cost nothing and open no session`, (await bal()) === b0 && (await openCount()) === 0 && (await rows(s0)).length === 0);
    // 1b) client reference: bet 1, quantity 1 -> price 42.50 (template slots), wallet debited by exactly the price, exactly 1 free spin at the base bet
    if (g.kind === "template") {
      s0 = await seqNow(); b0 = await bal();
      const one = await g.buy(1);
      const r1 = await rows(s0);
      const d1 = r1.filter((r) => Number(r.amount) < 0);
      note(`${label} client example: bet 1 x quantity 1 charges exactly 42.50 (one ledger debit)`, d1.length === 1 && Math.abs(Number(d1[0].amount) + 42.5) < 0.0001 && Math.abs((await bal()) - (b0 - 42.5)) < 0.0001, d1.map((r) => r.amount).join(","));
      note(`${label} quantity 1 awards exactly 1 free spin on the base bet ${g.bet}`, one.session?.freeSpinsLeft === 1 && Number(one.session?.bet) === g.bet, `left ${one.session?.freeSpinsLeft}, bet ${one.session?.bet}`);
      await playOut(g, one.session);
    } else if (g.kind === "realms") {
      s0 = await seqNow(); b0 = await bal();
      const one = await g.buy(1);
      const d1 = (await rows(s0)).filter((r) => Number(r.amount) < 0);
      note(`${label} quantity 1 is purchasable: one debit equal to the wallet change, 1 free spin, base bet kept`, d1.length === 1 && Math.abs((await bal()) - (b0 + Number(d1[0].amount))) < 0.0001 && one.session?.freeSpinsLeft === 1 && Number(one.session?.bet) === g.bet, `debit ${d1[0]?.amount}, left ${one.session?.freeSpinsLeft}`);
      await playOut(g, one.session);
    }
    if ((await openCount()) > 0) await q("UPDATE play_sessions SET status='closed', free_spins_left=0 WHERE user_id=? AND status='open'", [userId]);
    // 2) concurrent duplicate purchase: exactly one wins
    s0 = await seqNow(); b0 = await bal();
    const dup = await Promise.allSettled([g.buy(10), g.buy(10), g.buy(10)]);
    const okIdx = dup.filter((d) => d.status === "fulfilled");
    const dRows = await rows(s0);
    note(`${label} three simultaneous purchases: exactly ONE succeeds, ONE debit, ONE open session`, okIdx.length === 1 && dRows.filter((r) => Number(r.amount) < 0).length === 1 && (await openCount()) === 1, `${okIdx.length} ok, ${dRows.length} ledger rows`);
    const session = okIdx[0]?.value?.session;
    note(`${label} the purchased session starts with exactly 10 free spins and none played (the scatter moment spends none)`, session?.freeSpinsLeft === 10 && (session?.fsSpinsPlayed ?? 0) === 0, `left ${session?.freeSpinsLeft}, played ${session?.fsSpinsPlayed}`);
    // 3) a second purchase while the bonus is open is refused
    const again = await refusedBy(() => g.buy(10));
    note(`${label} buying again while a bonus is open is refused`, again !== null, again ?? "ACCEPTED");
    // 4) play the whole bonus: automatic progression is the client's job; here the server must settle it exactly once
    const res = await playOut(g, session);
    const rs = await rows(s0), b1 = await bal();
    const debits = rs.filter((r) => Number(r.amount) < 0), wins = rs.filter((r) => r.type === "win");
    note(`${label} the whole bonus is playable to the end (>= 10 spins; extra spins only from a retrigger)`, res.finished && res.played >= 10 && res.played === 10 + res.increments.reduce((a, b) => a + b, 0), `played ${res.played}, increments ${res.increments.join("+") || "none"}`);
    if (res.increments.length) retriggersSeen++;
    note(`${label} exactly-once settlement: ONE purchase debit, payout credited ONCE, wallet = start - price + payout`, debits.length === 1 && wins.length <= 1 && Math.abs(b1 - (b0 + sum(rs))) < 0.011, `${debits.length} debit, ${wins.length} win rows, delta ${(b1 - b0).toFixed(2)}`);
    // 5) replaying the finished session changes nothing
    const s1 = await seqNow(), b2 = await bal();
    const replay = await refusedBy(() => g.free(session.sessionId));
    note(`${label} replaying the finished session is refused and changes nothing`, replay !== null && (await bal()) === b2 && (await rows(s1)).length === 0, replay ?? "ACCEPTED");
    doneGames++;
  } catch (e) {
    note(`${label} sweep aborted: ${e.message.slice(0, 120)}`, false);
  }
  if (results.some((r) => !r.ok && r.name.startsWith(label))) failedGames.push(meta.id);
}
console.log(`sweep: ${doneGames} games exercised, ${failedGames.length} with failures; retriggers occurred naturally in ${retriggersSeen}`);

// ============================================================ B) forced scenarios on representatives
if (!process.argv.includes("--skip-forced")) {
  const reps = ["wild-panther", "buffalo-reign", "abyssal-pearls"];
  async function withConfig(game, patch, fn) {
    const prev = (await q("SELECT engine_config c FROM game_controls WHERE game_id=?", [game]))[0]?.c ?? null;
    const merged = { ...(prev ? JSON.parse(prev) : {}), ...patch };
    await q("INSERT INTO game_controls (game_id, engine_config) VALUES (?, ?) ON DUPLICATE KEY UPDATE engine_config=VALUES(engine_config)", [game, JSON.stringify(merged)]);
    try { return await fn(); } finally { if (prev === null) await q("UPDATE game_controls SET engine_config=NULL WHERE game_id=?", [game]); else await q("UPDATE game_controls SET engine_config=? WHERE game_id=?", [prev, game]); }
  }
  for (const game of reps) {
    const g = api(game); const label = `[${game}]`;
    if ((await openCount()) > 0) await q("UPDATE play_sessions SET status='closed', free_spins_left=0 WHERE user_id=? AND status='open'", [userId]);
    // retriggers: 2 scatters retrigger and add 5 spins; generous session cap
    let seen = null, tries = 0;
    await withConfig(game, { freeSpinsRetriggerCount: 2, freeSpinsRetrigger: 5, maxFsSessionSpins: 200 }, async () => {
      while (!seen && tries++ < 25) { const b = await oneBonus(g); if (b.increments.length) seen = b; else if (b.debits.length !== 1) { seen = b; } }
    });
    note(`${label} RETRIGGER occurs and is handled: the total grows by the awarded spins, played = 10 + additions`, !!seen && seen.increments.length > 0 && seen.played === 10 + seen.increments.reduce((a, b) => a + b, 0), seen ? `increments ${seen.increments.join("+")}, played ${seen.played}, tries ${tries}` : "no retrigger in 25 bonuses");
    note(`${label} retriggered bonus still settles exactly once`, !!seen && seen.debits.length === 1 && seen.wins.length <= 1 && seen.walletOk, seen ? `${seen.debits.length} debit, ${seen.wins.length} win` : "");
    note(`${label} retriggered bonus: initial award was exactly 10`, !!seen && seen.initialLeft === 10 && seen.initialPlayed === 0);
    // session spin cap: retriggers cannot run past maxFsSessionSpins
    let capped = null;
    await withConfig(game, { freeSpinsRetriggerCount: 2, freeSpinsRetrigger: 5, maxFsSessionSpins: 12 }, async () => { for (let k = 0; k < 25 && !capped; k++) { const b = await oneBonus(g); if (b.total >= 12) capped = b; else if (b.debits.length !== 1) capped = b; } });
    note(`${label} session spin limit holds: a retriggered bonus never plays more than maxFsSessionSpins`, !!capped && capped.played <= 12 && capped.finished, capped ? `played ${capped.played} (limit 12)` : "limit never reached");
    // maximum win: round total (bonus payout) is capped at maxWinMult x bet
    const cap = 3, bet = g.bet;
    const wins = [];
    await withConfig(game, { maxWinMult: cap }, async () => { for (let k = 0; k < 14; k++) { const b = await oneBonus(g); wins.push({ payout: b.payout, finished: b.finished, once: b.debits.length === 1 && b.wins.length <= 1 && b.walletOk }); } });
    note(`${label} MAXIMUM WIN limit: no bonus payout exceeds maxWinMult x bet (${cap} x ${bet})`, wins.every((w) => w.payout <= cap * bet + 0.011), `max payout ${Math.max(...wins.map((w) => w.payout)).toFixed(2)} vs cap ${(cap * bet).toFixed(2)}`);
    note(`${label} capped bonuses still finish and settle exactly once`, wins.every((w) => w.finished && w.once));
  }
}
await db.end();
fs.writeFileSync(path.join(out, "buy-bonus-api-results.json"), JSON.stringify({ at: new Date().toISOString(), gamesExercised: doneGames, failedGames, retriggersSeen, total: results.length, failed: results.filter((r) => !r.ok).length, results }, null, 1));
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length} checks, ${failed} failed; games with failures: ${failedGames.join(",") || "none"}`);
process.exit(failed ? 1 : 0);
