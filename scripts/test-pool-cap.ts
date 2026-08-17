/**
 * Pool-cap settlement regression.
 *
 * Reproduces the Golden Panther incident: ₱5 bet vs a ₱50,000 round cap
 * (10,000×) with a ₱90,000 computed win must credit ₱50,000, not the full win.
 *
 * Run: npx tsx scripts/test-pool-cap.ts
 */
import {
  applyCapToScriptTotalWin,
  enforcePoolCap,
  remainingPoolForRound,
} from "../src/server/settlement/enforcePoolCap";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function almost(a: number, b: number, eps = 0.001) {
  return Math.abs(a - b) < eps;
}

function run() {
  console.log("==========================================");
  console.log("Pool-cap enforcement — regression");
  console.log("==========================================");

  // Exact incident: ₱5 × 10,000× = ₱50,000 cap, computed ₱90,000
  const incident = enforcePoolCap({
    gameId: "golden-panther",
    gameName: "Panther Peak",
    bet: 5,
    maxWinMult: 10_000,
    computedWin: 90_000,
    context: "regression-incident",
  });
  assert(almost(incident.remainingPool, 50_000), `remaining pool ${incident.remainingPool}`);
  assert(almost(incident.payout, 50_000), `payout must clamp to 50k, got ${incident.payout}`);
  assert(incident.clamped, "clamp must trigger");
  assert(almost(incident.excess, 40_000), `excess ${incident.excess}`);
  console.log("✓ ₱5 / 50k cap / 90k computed → payout ₱50,000");

  // Under-cap win is paid in full
  const under = enforcePoolCap({
    gameId: "golden-panther",
    bet: 5,
    maxWinMult: 10_000,
    computedWin: 12.5,
    context: "under-cap",
  });
  assert(!under.clamped, "under-cap must not clamp");
  assert(almost(under.payout, 12.5), "under-cap paid in full");
  console.log("✓ Under-cap win paid in full");

  // remainingPoolForRound shrinks after a base credit
  const remaining = remainingPoolForRound({
    bet: 5,
    maxWinMult: 10_000,
    alreadyCredited: 10_000,
  });
  assert(almost(remaining, 40_000), `remaining after 10k credit: ${remaining}`);
  const fs = enforcePoolCap({
    gameId: "golden-panther",
    bet: 5,
    maxWinMult: 10_000,
    computedWin: 90_000,
    alreadyCredited: 10_000,
    context: "fs-final-after-base",
  });
  assert(almost(fs.payout, 40_000), `FS final remaining ${fs.payout}`);
  assert(fs.clamped, "FS final clamp");
  console.log("✓ remainingPoolForRound = cap − alreadyCredited");

  // Script mutation so the client total matches the ledger
  const script = { totalWin: 90_000 };
  const applied = applyCapToScriptTotalWin(script, {
    gameId: "fire-spike",
    bet: 5,
    maxWinMult: 10_000,
    context: "script",
  });
  assert(almost(script.totalWin, 50_000), "script.totalWin mutated");
  assert(applied.clamped, "script clamp flagged");
  console.log("✓ applyCapToScriptTotalWin mutates script.totalWin");

  // maxWinMult 0 / missing → no cap
  const open = enforcePoolCap({
    gameId: "test",
    bet: 5,
    maxWinMult: 0,
    computedWin: 90_000,
    context: "uncapped",
  });
  assert(!open.clamped && almost(open.payout, 90_000), "maxWinMult 0 is uncapped");
  console.log("✓ maxWinMult 0 leaves win uncapped");

  // Zero / negative computed win
  const zero = enforcePoolCap({
    gameId: "test",
    bet: 5,
    maxWinMult: 10_000,
    computedWin: -12,
    context: "zero",
  });
  assert(almost(zero.payout, 0) && !zero.clamped, "negative win floors to 0");
  console.log("✓ Negative computed win floors to ₱0");

  console.log("\nAll pool-cap regressions passed.");
}

run();
