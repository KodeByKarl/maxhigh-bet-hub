// Dynamic Buy Bonus pricing across several bets, every buy-enabled slot, against the LOOPBACK clone.
// For each game and bet the server must debit exactly bet x pricePerSpin x 10 (the debit divided by the bet is the same at every bet),
// exactly one debit per purchase, and the bonus is played out so nothing is left open.
//   UAT_BASE=... DB_URL=... node scripts/qa/test-buy-bonus-pricing.mjs <outFile> [bet1,bet2,...]
//
// Aurora Spire is different: its purchase quantity is the player's choice (1..25) and the price per spin follows a calibrated curve, so
// it is ALSO checked against its own documented configuration (the "Aurora Spire" section at the end). Run that section on its own:
//   GAMES=aurora-spire SKIP_LEGACY=1 UAT_BASE=... DB_URL=... node --import tsx scripts/qa/test-buy-bonus-pricing.mjs <outFile>
// (tsx lets the script import the same pricing functions the server uses, so expected totals are never re-typed here).
// The legacy per-game check (every game, quantity 10, linear in the bet) is unchanged for every other title.
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
const games = process.env.GAMES
  ? process.env.GAMES.split(",")
  : fs.readFileSync("C:\\Users\\Keydi\\maxhigh-evidence\\buy-bonus\\buy-games.txt", "utf8").trim().split(/\r?\n/);
const userId = (await q("SELECT id FROM users WHERE username='uat_player'"))[0].id;
await q("UPDATE users SET balance=50000000 WHERE id=?", [userId]);
const c = new Client(); await c.login("uat_player");
const seqNow = async () => Number((await q("SELECT IFNULL(MAX(seq),0) m FROM transactions"))[0].m);
const results = [];
for (const game of process.env.SKIP_LEGACY ? [] : games) {
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

// ───────── Aurora Spire: configured quantity (1..25), calibrated curve, exact totals, limits, balance, duplicates ─────────
if (games.includes("aurora-spire")) {
  const ID = "aurora-spire";
  const { realmsDefaultConfig, realmsBuyPricePerSpin, realmsBuyMaxQuantity } = await import("../../src/lib/realms/index.ts");
  const { buyBonusTotal } = await import("../../src/lib/buy-bonus.ts");
  const { BET_STEPS } = await import("../../src/components/maxhigh/realms/engine/paytable.ts");
  const cfg = realmsDefaultConfig(ID); // the clone runs on the calibrated defaults; the server reads the same values
  const checks = [];
  const check = (name, ok, detail = "") => { checks.push(ok); console.log(`${ok ? "PASS" : "FAIL"} [aurora-spire] ${name}${detail ? "  - " + detail : ""}`); };
  const rpc = async (fn, data) => { try { return { ok: true, value: await c.rpc(fn, data) }; } catch (e) { return { ok: false, error: String(e.message) }; } };
  const openSessions = async () => (await q("SELECT id FROM play_sessions WHERE user_id=? AND game_id=? AND status='open'", [userId, ID])).length;
  const playOut = async (session) => { let left = session.freeSpinsLeft, g = 0; while (left > 0 && g++ < 400) { const r = await rpc("realmsFreeSpinFn", { gameId: ID, sessionId: session.sessionId }); if (!r.ok) throw new Error(r.error); left = r.value.session.freeSpinsLeft; } };
  const fractional = BET_STEPS.find((b) => !Number.isInteger(b) && b >= 0.5) ?? BET_STEPS[1];
  const auroraBets = [...new Set([...bets, fractional])];
  check("configuration: purchasable maximum follows the session cap", realmsBuyMaxQuantity(cfg) === Math.min(50, cfg.maxFsSessionSpins), `max ${realmsBuyMaxQuantity(cfg)}`);

  // 1) every quantity x bet: spins granted == quantity, exactly one debit == the exact configured total (cent rounding included)
  for (const quantity of [1, 2, 3, 10, 12, 25]) {
    for (const bet of auroraBets) {
      const expected = buyBonusTotal(bet, realmsBuyPricePerSpin(ID, cfg, quantity), quantity);
      const s0 = await seqNow();
      const r = await rpc("realmsBuyFeatureFn", { gameId: ID, bet, quantity });
      if (!r.ok) { check(`qty ${quantity} bet ${bet}`, false, r.error.slice(0, 100)); continue; }
      const rows = await q("SELECT type, amount FROM transactions WHERE user_id=? AND seq>? ORDER BY seq", [userId, s0]);
      const debits = rows.filter((x) => x.type === "bet");
      const paid = debits.length === 1 ? -Number(debits[0].amount) : NaN;
      check(`qty ${quantity} bet ${bet}: ${quantity} spins, one debit of ${expected.toFixed(2)}`, r.value.session.freeSpinsLeft === quantity && debits.length === 1 && Math.abs(paid - expected) < 0.0001, `spins ${r.value.session.freeSpinsLeft}, debit ${paid}`);
      await playOut(r.value.session);
    }
  }
  check("every purchase was played out: no session left open", (await openSessions()) === 0);

  // 2) server-side limits: refused with no debit and no session
  for (const bad of [0, 26, 30, 31, 1.5, -1, null]) {
    const s0 = await seqNow();
    const r = await rpc("realmsBuyFeatureFn", { gameId: ID, bet: 1, quantity: bad });
    const rows = await q("SELECT 1 FROM transactions WHERE user_id=? AND seq>?", [userId, s0]);
    check(`quantity ${JSON.stringify(bad)} is rejected without a debit or session`, !r.ok && rows.length === 0 && (await openSessions()) === 0, r.ok ? "ACCEPTED" : r.error.slice(0, 80));
  }

  // 3) insufficient balance: refused, nothing debited, nothing opened (balance restored afterwards)
  await q("UPDATE users SET balance=? WHERE id=?", [1, userId]);
  {
    const s0 = await seqNow();
    const r = await rpc("realmsBuyFeatureFn", { gameId: ID, bet: 5, quantity: 1 });
    const rows = await q("SELECT 1 FROM transactions WHERE user_id=? AND seq>?", [userId, s0]);
    const [{ balance }] = await q("SELECT balance FROM users WHERE id=?", [userId]);
    check("insufficient balance is refused with no debit, no session, balance unchanged", !r.ok && /insufficient/i.test(r.error) && rows.length === 0 && Number(balance) === 1 && (await openSessions()) === 0, r.ok ? "ACCEPTED" : r.error.slice(0, 80));
  }
  await q("UPDATE users SET balance=50000000 WHERE id=?", [userId]);

  // 4) duplicate handling: simultaneous identical purchases never double-charge; a purchase while a bonus is open is refused
  {
    const s0 = await seqNow();
    const both = await Promise.all([rpc("realmsBuyFeatureFn", { gameId: ID, bet: 1, quantity: 2 }), rpc("realmsBuyFeatureFn", { gameId: ID, bet: 1, quantity: 2 })]);
    const rows = await q("SELECT type FROM transactions WHERE user_id=? AND seq>?", [userId, s0]);
    check("two simultaneous purchases: one debit, one open session", rows.filter((x) => x.type === "bet").length === 1 && (await openSessions()) === 1 && both.some((x) => x.ok));
    const third = await rpc("realmsBuyFeatureFn", { gameId: ID, bet: 1, quantity: 1 });
    check("a purchase while a bonus is open is refused", !third.ok, third.ok ? "ACCEPTED" : third.error.slice(0, 80));
    const first = both.find((x) => x.ok);
    await playOut(first.value.session);
    check("session settles and closes", (await openSessions()) === 0);
  }
  results.push({ game: ID, pass: checks.every(Boolean), perUnit: null, perBet: [{ section: "aurora-spire configured quantity", checks: checks.length, passed: checks.filter(Boolean).length }] });
  console.log(`AURORA: ${checks.filter(Boolean).length}/${checks.length} checks pass`);
}
await db.end();
fs.writeFileSync(outFile, JSON.stringify({ bets, passed: results.filter((r) => r.pass).length, total: results.length, results }, null, 1));
console.log(`PRICING: ${results.filter((r) => r.pass).length}/${results.length} games pass`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
