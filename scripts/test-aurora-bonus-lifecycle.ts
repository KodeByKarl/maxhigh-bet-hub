// Aurora Spire Buy Bonus lifecycle: deterministic checks of the shared rules the server executes (no database, no RNG).
import assert from "node:assert/strict";
import {
  realmsBuyMaxQuantity,
  realmsBuyPricePerSpin,
  realmsDefaultConfig,
  getRealmsGame,
} from "../src/lib/realms";
import { remainingFreeSpinsAfterSpin } from "../src/lib/realms/schema";
import { buyBonusTotal, getBuyBonusSpec, resolveBuyBonusQuantity } from "../src/lib/buy-bonus";
import { finalizeFreeSpinTotal } from "../src/components/maxhigh/realms/engine/multiplierEngine";
import { enforcePoolCap } from "../src/server/settlement/enforcePoolCap";

const ID = "aurora-spire";
const cfg = realmsDefaultConfig(ID);
const def = getRealmsGame(ID);
let checks = 0;
const ok = (name: string) => console.log(`PASS ${name}`) || checks++;

/** Plays a session of `start` spins; `retriggers[i]` = extra spins awarded by spin i (1-based). Mirrors realmsFreeSpin on the server. */
function play(start: number, retriggers: Record<number, number> = {}) {
  let left = start,
    played = 0;
  const lefts: number[] = [];
  while (left > 0) {
    played++;
    left = remainingFreeSpinsAfterSpin({
      leftBefore: left,
      retrigger: retriggers[played] ?? 0,
      playedAfter: played,
      maxSessionSpins: cfg.maxFsSessionSpins,
    });
    lefts.push(left);
    assert.ok(played < 500, "session must terminate");
  }
  return { played, lefts };
}

// config facts the vault advertises
assert.equal(def.freeSpins, cfg.freeSpinsBase);
assert.equal(cfg.freeSpinsBase, 12);
assert.equal(cfg.freeSpinsTriggerCount, 4);
assert.equal(cfg.freeSpinsRetriggerCount, 4);
assert.equal(cfg.freeSpinsRetrigger, 4);
assert.equal(cfg.maxFsSessionSpins, 30);
assert.equal(cfg.maxWinMult, 5000);
ok(
  "Aurora config: natural award 12, trigger 4+, retrigger 4+ adds 4, session cap 30, max win 5000x",
);

// purchase quantity is the player's choice within [1, cap]; the cap never exceeds the session cap
// (session cap 30 is a ceiling for spins + retriggers; the purchasable range is the shared Buy Bonus spec, 1..25, which the server enforces)
assert.equal(realmsBuyMaxQuantity(cfg), 30);
const spec = getBuyBonusSpec(ID, realmsBuyMaxQuantity(cfg)).quantity;
assert.equal(spec.mode, "range");
assert.ok(spec.mode === "range" && spec.min === 1 && spec.max === 25);
for (const good of [1, 3, 12, 25]) assert.equal(resolveBuyBonusQuantity(ID, good), good);
for (const bad of [0, 26, 30, 31, 1.5, -1, NaN, "x", undefined])
  assert.throws(() => resolveBuyBonusQuantity(ID, bad));
ok("purchase quantity: 1..25 accepted, 0 / 26+ / fractional / missing refused");

// pricing: price per spin is a function of the purchased quantity; total = bet x price x qty; the natural award is 12 and priced as such
const p1 = realmsBuyPricePerSpin(ID, cfg, 1),
  p3 = realmsBuyPricePerSpin(ID, cfg, 3),
  p12 = realmsBuyPricePerSpin(ID, cfg, 12);
assert.equal(p1, 1.95);
assert.equal(p3, 2.4);
assert.ok(
  Math.abs(p12 - cfg.buyFeatureMult) < 0.011,
  `12-spin price per spin ${p12} equals configured buyFeatureMult ${cfg.buyFeatureMult}`,
);
assert.equal(buyBonusTotal(5, p1, 1), 9.75);
assert.equal(buyBonusTotal(5, p3, 3), 36);
assert.equal(buyBonusTotal(5, p12, 12), Math.round(5 * p12 * 12 * 100) / 100);
for (let q = 2; q <= 30; q++)
  assert.ok(
    realmsBuyPricePerSpin(ID, cfg, q) >= realmsBuyPricePerSpin(ID, cfg, q - 1),
    "price per spin never falls as the session lengthens",
  );
ok(
  "pricing: 1 spin 1.95x, 3 spins 2.4x each, 12 spins = configured buyFeatureMult, monotone curve",
);

// session lifecycle
let r = play(1);
assert.equal(r.played, 1);
ok("purchased 1 spin: exactly 1 spin, then settles");
r = play(3);
assert.deepEqual(r.lefts, [2, 1, 0]);
ok("purchased 3 spins: 3 spins, counter 3->0");
r = play(12);
assert.equal(r.played, 12);
ok("natural 12: exactly 12 spins");
r = play(12, { 5: 4 });
assert.equal(r.played, 16);
ok("one retrigger (+4) on spin 5: 16 spins");
r = play(12, { 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4 });
assert.equal(r.played, 30);
assert.equal(r.lefts.at(-1), 0);
ok("repeated retriggers stop at the 30-spin session cap");
r = play(25, { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4 });
assert.equal(r.played, 30);
ok("a 25-spin purchase with retriggers cannot pass the cap");
r = play(3, { 3: 4 });
assert.equal(r.played, 7);
ok("retrigger on the last purchased spin extends a purchased session too");

// settlement: strongest bomb applies once, win is capped at maxWinMult x bet
assert.equal(finalizeFreeSpinTotal(cfg, 10, 0), 10);
assert.equal(finalizeFreeSpinTotal(cfg, 10, 3), 30);
assert.equal(finalizeFreeSpinTotal(cfg, 10, 99), 10 * cfg.maxFsBombMult);
ok("free-spin total: bomb multiplier applied once, ceiling respected");
const cap = enforcePoolCap({
  gameId: ID,
  bet: 5,
  maxWinMult: cfg.maxWinMult,
  computedWin: 1_000_000,
  alreadyCredited: 0,
  context: "test",
});
assert.equal(cap.payout, 25_000);
assert.ok(cap.clamped);
const under = enforcePoolCap({
  gameId: ID,
  bet: 5,
  maxWinMult: cfg.maxWinMult,
  computedWin: 123.45,
  alreadyCredited: 0,
  context: "test",
});
assert.equal(under.payout, 123.45);
assert.ok(!under.clamped);
ok("max win: 5000x bet clamps an oversized payout, normal payouts pass untouched");

console.log(`PASS ${checks} Aurora bonus lifecycle groups`);
