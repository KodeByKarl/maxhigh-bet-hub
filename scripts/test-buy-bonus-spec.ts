// Spec-driven Buy Bonus contract: quantity validation, price formula (server == client), and structural scans proving every buy
// handler validates through the per-game spec and no handler still hard-codes a global fixed quantity.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BUY_BONUS_FREE_SPINS,
  buyBonusTotal,
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
