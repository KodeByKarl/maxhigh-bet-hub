// Unit + structural tests for the fixed 10-spin Buy Bonus contract. Static scan of the real source files, so a future change cannot silently
// reintroduce a player-chosen quantity, a server that accepts one, or a template slot that stalls after a purchase.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BUY_BONUS_FREE_SPINS, resolveBuyBonusSpins } from "../src/lib/buy-bonus";

const ok = (n: string) => console.log("PASS", n);
const read = (p: string) => fs.readFileSync(p, "utf8");

// ---- the shared guard
assert.equal(BUY_BONUS_FREE_SPINS, 10);
assert.equal(resolveBuyBonusSpins(), 10);
assert.equal(resolveBuyBonusSpins(undefined), 10);
assert.equal(resolveBuyBonusSpins(null), 10);
assert.equal(resolveBuyBonusSpins(10), 10);
assert.equal(resolveBuyBonusSpins("10"), 10);
assert.equal(resolveBuyBonusSpins(10.2), 10);
for (const bad of [0, 1, 5, 9, 11, 25, 50, -10, Number.NaN, Number.POSITIVE_INFINITY, "abc", "9", {}]) {
  assert.throws(() => resolveBuyBonusSpins(bad), /exactly 10 free spins/, String(bad));
}
ok("resolveBuyBonusSpins: absent or 10 is accepted, every other quantity is refused");

// ---- every server buy function uses the guard (or the constant) and no longer accepts a free quantity
const serverDir = "src/server/games";
const serverFiles = fs.readdirSync(serverDir).filter((f) => f.endsWith(".server.ts"));
// wild-frontier-stampede is not in the 100-game catalog, is not routed and its RPC answers "Unknown game" without debiting: out of scope.
const NOT_IN_CATALOG = new Set(["wild-frontier-stampede.server.ts"]);
const buyServers = serverFiles.filter((f) => !NOT_IN_CATALOG.has(f) && /export async function \w*[Bb]uyFeature\(/.test(read(path.join(serverDir, f))));
assert.ok(buyServers.length >= 31, `expected at least 31 buy servers, found ${buyServers.length}`);
for (const f of buyServers) {
  const s = read(path.join(serverDir, f));
  if (f === "wild-panther.server.ts") {
    assert.ok(s.includes("freeSpinsLeft: BUY_BONUS_FREE_SPINS"), "wild-panther awards exactly BUY_BONUS_FREE_SPINS");
    assert.ok(!/freeSpinsLeft: cfg\.freeSpinsBase,\s*\n\s*fsSessionWin: "0\.00",\s*\n\s*fsBombAcc: "0\.00",\s*\n\s*fsSpinsPlayed: 0,\s*\n\s*\}\);\s*\n\s*const created/.test(s), "wild-panther purchase must not use the configurable base");
    continue;
  }
  assert.ok(s.includes("resolveBuyBonusSpins(data.quantity)"), `${f} must resolve the quantity through resolveBuyBonusSpins`);
  assert.ok(!/quantity > 50/.test(s) && !s.includes('"Invalid quantity"'), `${f} still accepts a free quantity range`);
}
ok(`all ${buyServers.length} server buy functions enforce exactly 10 initial free spins`);

// ---- no dialog offers a quantity selector; each states the fixed spins
const compDir = "src/components/maxhigh";
const modals = fs.readdirSync(compDir, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(compDir, d.name, "BuyFeatureModal.tsx"))).map((d) => path.join(compDir, d.name, "BuyFeatureModal.tsx"));
assert.ok(modals.length >= 31, `expected at least 31 buy dialogs, found ${modals.length}`);
for (const m of modals) {
  const s = read(m);
  assert.ok(!/nudgeQty|label="Quantity"|setQuantity/.test(s), `${m} still has a quantity selector`);
  assert.ok(s.includes("BUY_BONUS_FREE_SPINS") || s.includes("<BuyBonusModal"), `${m} must show the fixed free-spin count (directly or via the shared modal, asserted below)`);
  assert.ok(s.includes("<BuyBonusModal"), `${m} must render the shared BuyBonusModal (Confirm Buy Bonus / Cancel live there)`);
  assert.ok(!/Buy &amp; Play|setBuyBet|nudgeBet|Stepper/.test(s), `${m} still has bet/quantity steppers`);
}
const shared = read("src/components/maxhigh/buy-bonus/BuyBonusModal.tsx");
assert.ok(shared.includes("Confirm Buy Bonus") && /Cancel/.test(shared) && shared.includes("BUY_BONUS_FREE_SPINS"), "shared modal must offer Confirm Buy Bonus and Cancel and show the fixed spins");
assert.ok(!/nudgeQty|label="Quantity"|setQuantity|<input|<select/.test(shared), "shared modal has no quantity/bet control");
ok(`all ${modals.length} Buy Bonus dialogs: no quantity selector, fixed 10 free spins shown`);

// ---- every template slot: counter n/N, counter hidden during the scatter intro, and the auto-chain dependency (baseline stall fix)
const slots = fs.readdirSync(compDir).filter((f) => f.endsWith("Slot.tsx"));
const withIntro = slots.filter((f) => read(path.join(compDir, f)).includes("playBuyScatterIntro"));
assert.ok(withIntro.length >= 30, `expected at least 30 template slots, found ${withIntro.length}`);
for (const f of withIntro) {
  const s = read(path.join(compDir, f));
  assert.ok(s.includes("freeSpinsProgress("), `${f}: free-spin counter n/N`);
  assert.ok(/buyPresenting,\s*\n\s*fsPaused,/.test(s), `${f}: the automatic free-spin chain must depend on buyPresenting (otherwise the first bonus spin never starts by itself)`);
  assert.ok(/inFree && triggerModalCount == null && !buyPresenting/.test(s), `${f}: the counter stays hidden until the announcement is dismissed`);
  assert.ok(s.includes("BUY_BONUS_FREE_SPINS") || f === "WildPantherSlot.tsx", `${f}: deck price is the price of the fixed 10 spins`);
  assert.ok(!/BUY_FS_START_BET\s*\*/.test(s) && /bet=\{bet\}/.test(s) && s.includes("autoClose"), `${f}: dialog gets the current bet, announcement auto-closes`);
}
assert.ok(read(path.join(compDir, "WildPantherSlot.tsx")).includes("freeSpinsProgress("));
ok(`${withIntro.length} template slots + Wild Panther: n/N counter, hidden during the intro, chain dependency present`);

// ---- games without Buy Bonus are untouched
for (const f of ["AceHighSlot.tsx", "CoinVolcanoSlot.tsx", "FireSpikeSlot.tsx"]) {
  const s = read(path.join(compDir, f));
  assert.ok(!s.includes("freeSpinsProgress") && !s.includes("buy-bonus") && !s.includes("buyPresenting"), `${f} must not be modified`);
}
for (const f of ["ace-high.server.ts", "coin-volcano.server.ts", "fire-spike.server.ts"]) {
  assert.ok(!read(path.join(serverDir, f)).includes("buy-bonus"), `${f} must not be modified`);
}
ok("Ace High, Coin Volcano and Fire Spike are untouched");
console.log("PASS 5 buy-bonus contract checks");
