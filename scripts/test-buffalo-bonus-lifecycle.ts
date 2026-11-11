// Buffalo Reign Buy Bonus lifecycle: deterministic checks of the configured rules the server executes (no database, no RNG).
import assert from "node:assert/strict";
import { DEFAULT_BUFFALO_REIGN_CONFIG as cfg } from "../src/lib/buffalo-reign-config";
import { getBuyBonusSpec, buyBonusTotal, resolveBuyBonusQuantity } from "../src/lib/buy-bonus";
import { pantherBuyPricePerSpin } from "../src/components/maxhigh/panther-shared/buyPricing";
import { remainingFreeSpinsAfterSpin } from "../src/lib/realms/schema";
import { finalizeFreeSpinTotal } from "../src/components/maxhigh/buffalo-reign/multiplierEngine";
import { enforcePoolCap } from "../src/server/settlement/enforcePoolCap";

const ID = "buffalo-reign";
let checks = 0;
const ok = (name: string) => console.log(`PASS ${name}`) || checks++;
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
    assert.ok(played < 500);
  }
  return { played, lefts };
}

// configured facts the Gold Rush advertises (all read from config by the UI, never typed there)
assert.equal(cfg.freeSpinsTriggerCount, 4);
assert.equal(cfg.freeSpinsBase, 10);
assert.equal(cfg.freeSpinsRetriggerCount, 4);
assert.equal(cfg.freeSpinsRetrigger, 3);
assert.equal(cfg.maxFsSessionSpins, 25);
assert.equal(cfg.maxWinMult, 10000);
assert.equal(cfg.maxFsBombMult, 5);
assert.deepEqual(
  cfg.bombTable.map((b) => b.mult),
  [2, 3, 4, 5],
);
ok(
  "Buffalo config: natural award 10, trigger 4+, retrigger 4+ adds 3, session cap 25, Wild x2..x5 (ceiling x5), max win 10000x",
);

// purchasable quantity: shared spec 1..25 narrowed to the session cap; the server refuses everything else
const spec = getBuyBonusSpec(ID, Math.min(50, cfg.maxFsSessionSpins)).quantity;
assert.ok(spec.mode === "range" && spec.min === 1 && spec.max === 25);
for (const good of [1, 3, 10, 25]) assert.equal(resolveBuyBonusQuantity(ID, good), good);
for (const bad of [0, 26, 50, 1.5, -1, NaN, "x", undefined])
  assert.throws(() => resolveBuyBonusQuantity(ID, bad));
ok("purchase quantity: 1..25 accepted, 0 / 26+ / fractional / missing refused");

// pricing: Buffalo has no per-quantity curve, so the configured buyFeatureMult applies per spin at every quantity
for (const q of [1, 2, 3, 10, 25])
  assert.equal(
    pantherBuyPricePerSpin(ID, cfg.buyFeatureMult, cfg.freeSpinsBase, q),
    cfg.buyFeatureMult,
  );
assert.equal(buyBonusTotal(5, cfg.buyFeatureMult, 1), 212.5);
assert.equal(buyBonusTotal(1, cfg.buyFeatureMult, 10), 425);
assert.equal(buyBonusTotal(0.2, cfg.buyFeatureMult, 3), 25.5);
assert.equal(buyBonusTotal(6.25, cfg.buyFeatureMult, 7), 1859.38); // exact decimal rounding, half-up on the cent
ok("pricing: total = bet x configured multiplier x spins, exact to the cent");

let r = play(1);
assert.equal(r.played, 1);
ok("purchased 1 spin: exactly 1 spin");
r = play(3);
assert.deepEqual(r.lefts, [2, 1, 0]);
ok("purchased 3 spins: 3 spins");
r = play(10);
assert.equal(r.played, 10);
ok("natural 10: exactly 10 spins");
r = play(10, { 4: 3 });
assert.equal(r.played, 13);
ok("one retrigger (+3) on spin 4: 13 spins");
r = play(10, { 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 });
assert.equal(r.played, 25);
ok("repeated retriggers stop at the 25-spin session cap");
r = play(25, { 1: 3, 2: 3 });
assert.equal(r.played, 25);
ok("a 25-spin purchase cannot be extended past the cap");
r = play(3, { 3: 3 });
assert.equal(r.played, 6);
ok("retrigger on the last purchased spin extends a purchased session");

assert.equal(finalizeFreeSpinTotal(10, 0), 10);
assert.equal(finalizeFreeSpinTotal(10, 3), 30);
assert.equal(finalizeFreeSpinTotal(10, 99), 10 * cfg.maxFsBombMult);
ok("free-spin total: strongest Wild multiplier applied once, ceiling respected");
const cap = enforcePoolCap({
  gameId: ID,
  bet: 5,
  maxWinMult: cfg.maxWinMult,
  computedWin: 10_000_000,
  alreadyCredited: 0,
  context: "test",
});
assert.equal(cap.payout, 50_000);
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
ok("max win: 10000x bet clamps an oversized payout; normal payouts untouched");
console.log(`PASS ${checks} Buffalo bonus lifecycle groups`);
