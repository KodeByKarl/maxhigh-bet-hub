// Spec-driven Buy Bonus contract: quantity validation, price formula (server == client), and structural scans proving every buy
// handler validates through the per-game spec and no handler still hard-codes a global fixed quantity.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BUY_BONUS_FREE_SPINS,
  buyBonusTotal,
  buyBonusUnitPriceText,
  exactProduct2,
  buyBonusUnitPrice,
  getBuyBonusSpec,
  resolveBuyBonusQuantity,
} from "../src/lib/buy-bonus";

const ok = (n: string) => console.log("PASS", n);
const read = (p: string) => fs.readFileSync(p, "utf8");

// client example: bet 1, quantity 1, price 42.50, total 42.50
assert.equal(buyBonusUnitPrice(1, 42.5), 42.5);
assert.equal(buyBonusTotal(1, 42.5, 1), 42.5);
assert.equal(buyBonusTotal(2, 42.5, 3), 255);
assert.equal(buyBonusTotal(0.2, 42.5, 10), 85);
assert.equal(buyBonusTotal(1, 4.1, 10), 41);
ok("price formula: client example 1 x 42.50 = 42.50, totals scale with bet and quantity");

// range games (every template slot and Realms title)
for (const g of ["golden-panther", "zeus-strike", "abyssal-pearls"]) {
  assert.equal(getBuyBonusSpec(g).quantity.mode, "range");
  assert.equal(resolveBuyBonusQuantity(g, 1), 1);
  assert.equal(resolveBuyBonusQuantity(g, "7"), 7);
  assert.equal(resolveBuyBonusQuantity(g, 25), 25);
  for (const bad of [0, -1, 26, 2.5, "x", Number.NaN, undefined, null, ""])
    assert.throws(() => resolveBuyBonusQuantity(g, bad), /quantity/i, `${g}: ${String(bad)}`);
}
assert.equal(resolveBuyBonusQuantity("abyssal-pearls", 12, 12), 12);
assert.throws(() => resolveBuyBonusQuantity("abyssal-pearls", 13, 12), /from 1 to 12/);
ok("range specs: whole numbers within the game's cap only; a lower per-title cap narrows the range");

// Wild Panther keeps its own locked purchase
assert.equal(getBuyBonusSpec("wild-panther").quantity.mode, "locked");
assert.equal(resolveBuyBonusQuantity("wild-panther"), BUY_BONUS_FREE_SPINS);
assert.equal(resolveBuyBonusQuantity("wild-panther", 10), 10);
assert.throws(() => resolveBuyBonusQuantity("wild-panther", 5), /exactly 10/);
ok("wild-panther: locked at 10, any other quantity refused");

// every server buy function validates through the spec and prices with the shared total
const serverDir = "src/server/games";
const NOT_IN_CATALOG = new Set(["wild-frontier-stampede.server.ts"]);
const buyServers = fs
  .readdirSync(serverDir)
  .filter((f) => f.endsWith(".server.ts") && !NOT_IN_CATALOG.has(f) && /export async function \w*[Bb]uyFeature\(/.test(read(path.join(serverDir, f))));
assert.ok(buyServers.length >= 31, `expected at least 31 buy servers, found ${buyServers.length}`);
for (const f of buyServers) {
  const s = read(path.join(serverDir, f));
  if (f === "wild-panther.server.ts") {
    assert.ok(s.includes("freeSpinsLeft: BUY_BONUS_FREE_SPINS"), "wild-panther awards its locked 10");
    continue;
  }
  assert.ok(/resolveBuyBonusQuantity\([\w.]+, data\.quantity\)/.test(s), `${f}: quantity must go through resolveBuyBonusQuantity`);
  assert.ok(s.includes("buyBonusTotal("), `${f}: cost must use the shared buyBonusTotal`);
  assert.ok(!s.includes("resolveBuyBonusSpins"), `${f}: legacy fixed-10 guard still referenced`);
}
ok(`all ${buyServers.length - 1} range-spec buy functions validate via the spec and price via buyBonusTotal`);

// slots charge the same formula the server does
const compDir = "src/components/maxhigh";
for (const f of fs.readdirSync(compDir).filter((n) => n.endsWith("Slot.tsx"))) {
  const s = read(path.join(compDir, f));
  if (!s.includes("BuyFeatureModal")) continue;
  assert.ok(!s.includes("BUY_BONUS_FREE_SPINS"), `${f}: global fixed-10 constant still used`);
}
ok("no slot references the global fixed-10 constant");

// ---- pricing and rounding regression: exact decimal arithmetic, one rounding at the end, displayed unit price agrees with the total ----
// The reported UAT case: bet 6.25, unit multiplier 42.5, quantity 3 -> unit 265.625, total 796.875 -> 796.88 (round half up, once).
assert.equal(buyBonusUnitPriceText(6.25, 42.5), "265.625");
assert.equal(buyBonusTotal(6.25, 42.5, 3), 796.88);
assert.equal(buyBonusUnitPriceText(5, 42.5), "212.50");
assert.equal(buyBonusUnitPriceText(5, 4.1), "20.50");
assert.equal(buyBonusTotal(5, 4.1, 10), 205);
ok("reported case: unit 265.625 x 3 = 796.875 -> 796.88, charged once-rounded; whole-peso cases keep two decimals");

// Binary floating point would get these wrong (1.005 * 100 = 100.49999999999999, 0.15 * 41 = 6.1499999999999995).
assert.equal(exactProduct2(1.005, 100), 100.5);
assert.equal(exactProduct2(1.005, 1), 1.01);
assert.equal(exactProduct2(0.15, 41), 6.15);
assert.equal(exactProduct2(0.145, 1), 0.15);
assert.equal(exactProduct2(0.25, 4.1, 10), exactProduct2(0.25, 41)); // Wild Panther: client unit x 10 equals the server's bet x 41
assert.equal(exactProduct2(0.1, 0.2), 0.02);
assert.equal(exactProduct2(0, 42.5, 3), 0);
ok("exact decimal ties round half up where float toFixed does not");

// Randomised comparison with an independent integer-only reference (bet in centavos, multiplier in hundredths).
let seed = 123456789;
const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n);
for (let i = 0; i < 30000; i++) {
  const betCents = 1 + rnd(2_000_000);
  const multH = 100 + rnd(12_000); // 1.00 .. 121.00
  const q = 1 + rnd(25);
  const refCents = Math.floor((2 * betCents * multH * q + 100) / 200); // round half up of betCents*multH*q/100
  const got = buyBonusTotal(betCents / 100, multH / 100, q);
  assert.equal(Math.round(got * 100), refCents, `bet ${betCents / 100} x ${multH / 100} x ${q}`);
  assert.equal(got.toFixed(2), (refCents / 100).toFixed(2));
}
ok("30,000 random bet/multiplier/quantity combinations match integer reference arithmetic");

// Displayed unit price x quantity never differs from the charged total by more than half a centavo per unit; total is monotonic in quantity.
for (const [bet, mult] of [[6.25, 42.5], [0.15, 38.75], [7.35, 21.25], [0.25, 4.1], [13, 42.5]] as const) {
  let prev = 0;
  for (let q = 1; q <= 25; q++) {
    const unit = Number(buyBonusUnitPriceText(bet, mult));
    const total = buyBonusTotal(bet, mult, q);
    assert.ok(Math.abs(unit * q - total) <= 0.005 + 1e-9, `${bet}x${mult}x${q}: ${unit}*${q} vs ${total}`);
    assert.ok(total >= prev);
    prev = total;
  }
}
ok("unit price x quantity matches the total to within the single final rounding");

// Invalid input is refused before any amount exists.
for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) assert.throws(() => buyBonusTotal(bad, 42.5, 1), /Invalid amount/);
assert.throws(() => buyBonusTotal(5, -42.5, 1), /Invalid amount/);
assert.throws(() => resolveBuyBonusQuantity("golden-panther", 26), /quantity/i);
assert.throws(() => resolveBuyBonusQuantity("golden-panther", 2.5), /quantity/i);
assert.throws(() => resolveBuyBonusQuantity("wild-panther", 11), /exactly 10/);
ok("invalid bet / multiplier / quantity throw before pricing; Wild Panther stays locked at 10");

// The server never reads a client-supplied amount: every buy handler takes only bet/mode/quantity and prices itself.
for (const f of fs.readdirSync(serverDir).filter((n) => n.endsWith(".server.ts"))) {
  const s = read(path.join(serverDir, f));
  const m = s.match(/export async function \w*[Bb]uyFeature\([^)]*\)/);
  if (!m) continue;
  assert.ok(!/(total|price|cost|amount)\s*:\s*number/.test(s.slice(s.indexOf("BuyFeature") - 600, s.indexOf("BuyFeature") + 200)), `${f}: buy input must not carry a price`);
}
ok("no buy handler accepts a client-supplied price or total");
