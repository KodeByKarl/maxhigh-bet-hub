import {
  DEFAULT_FRONTIER_GOLD_CONFIG,
  DEFAULT_REEL_HEIGHTS,
  calcFreeSpinsAward,
  normalizeFrontierGoldConfig,
  totalCells,
  totalConnectingWays,
} from "../src/lib/frontier-gold-config";
import { resolveFrontierSpin } from "../src/components/maxhigh/frontier-gold/spinResolver";
import { setFrontierGoldConfig } from "../src/components/maxhigh/frontier-gold/runtimeConfig";
import { evaluateWays } from "../src/components/maxhigh/frontier-gold/paylineEngine";
import { resolveHoldAndWin } from "../src/components/maxhigh/frontier-gold/holdAndWin";
import { createRng } from "../src/components/maxhigh/frontier-gold/rng";
import type { FgGrid } from "../src/components/maxhigh/frontier-gold/types";

setFrontierGoldConfig(DEFAULT_FRONTIER_GOLD_CONFIG);

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function unitDiamondLayout() {
  console.log("0. Diamond layout shape");
  assert(
    DEFAULT_FRONTIER_GOLD_CONFIG.reelHeights.join(",") === [...DEFAULT_REEL_HEIGHTS].join(","),
    "reelHeights must be 3-4-5-4-3",
  );
  assert(DEFAULT_FRONTIER_GOLD_CONFIG.reelsCount === 5, "5 reels");
  assert(DEFAULT_FRONTIER_GOLD_CONFIG.rowsCount === 5, "max height 5");
  assert(totalConnectingWays(DEFAULT_FRONTIER_GOLD_CONFIG.reelHeights) === 720, "720 ways");
  assert(DEFAULT_FRONTIER_GOLD_CONFIG.paylineCount === 720, "paylineCount = ways");
  assert(totalCells(DEFAULT_FRONTIER_GOLD_CONFIG) === 19, "19 cells");
  console.log("✔ diamond shape ok\n");
}

function unitWays() {
  console.log("1. Connecting ways + wild");
  // Heights [3,4,5,4,3] — Ace on left 3 reels with wild on reel 1
  const grid: FgGrid = [
    ["sym_a", "sym_j", "sym_q"], // h=3
    ["wild", "sym_q", "sym_k", "safe"], // h=4
    ["sym_a", "safe", "sym_q", "sym_j", "bandit"], // h=5
    ["sym_q", "sym_j", "bandit", "bartender"], // h=4
    ["sym_k", "bartender", "sheriff"], // h=3
  ];
  const eval1 = evaluateWays(grid, 1, DEFAULT_FRONTIER_GOLD_CONFIG);
  assert(eval1.wins.some((w) => w.symbol === "sym_a" && w.count >= 3), "Expected Ace ways with wild");
  const aceWin = eval1.wins.find((w) => w.symbol === "sym_a")!;
  assert((aceWin.waysCount ?? 0) >= 1, "waysCount set");
  assert(aceWin.payout > 0, "Ace payout > 0");
  console.log("✔ ways ok\n");
}

function holdWinAndFs() {
  console.log("2. Spins / Hold&Win / FS awards");
  const hw = resolveHoldAndWin(createRng("hw-test"), 1, DEFAULT_FRONTIER_GOLD_CONFIG, [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [2, 1],
  ]);
  assert(hw.triggerCoins.length === 6, "6 trigger coins");
  assert(hw.totalWin > 0, "hold win payout");
  assert(hw.steps.length >= 1, "at least one respin step");

  let sawHold = false;
  let sawFs = false;
  for (let i = 0; i < 40000; i++) {
    const s = resolveFrontierSpin({ totalBet: 1 });
    // Every spin must produce a diamond-shaped grid
    assert(s.grid.length === 5, `grid reels ${s.grid.length}`);
    for (let r = 0; r < 5; r++) {
      assert(
        s.grid[r]!.length === DEFAULT_REEL_HEIGHTS[r],
        `reel ${r} height ${s.grid[r]!.length} != ${DEFAULT_REEL_HEIGHTS[r]}`,
      );
    }
    if (s.holdWin) sawHold = true;
    if (s.freeSpinsAwarded > 0) sawFs = true;
    assert(s.totalWin >= 0, "negative win");
    if (sawHold && sawFs) break;
  }
  assert(sawHold, "Never triggered Hold & Win in sample");
  assert(sawFs, "Never awarded Free Spins in sample");
  assert(calcFreeSpinsAward(3) === 10, "3 scatters → 10 FS");
  assert(calcFreeSpinsAward(4) === 12, "4 scatters → 12 FS");
  console.log("✔ hold/fs ok\n");
}

function legacyMigration() {
  console.log("2b. Legacy layouts → 3-4-5-4-3 migration");
  const fromFiveByThree = normalizeFrontierGoldConfig({
    reelsCount: 5,
    rowsCount: 3,
    paylineCount: 25,
    symbols: DEFAULT_FRONTIER_GOLD_CONFIG.symbols.map((s) => ({
      ...s,
      pay: [14, 35, 110] as [number, number, number],
      reelWeights: [10, 10, 10, 10, 10],
      reelWeightsFreeSpins: [10, 10, 10, 10, 10],
    })),
  });
  assert(fromFiveByThree.reelHeights.join(",") === "3,4,5,4,3", "5×3 → heights");
  assert(fromFiveByThree.reelsCount === 5, "5×3 → reels");
  assert(fromFiveByThree.paylineCount === 720, "5×3 → ways");
  assert(fromFiveByThree.symbols[0]!.reelWeights.length === 5, "weights length 5");
  assert(fromFiveByThree.symbols[0]!.pay[0]! < 1, "legacy pays scaled to stake mult");

  const fromSeven = normalizeFrontierGoldConfig({
    reelHeights: [1, 2, 3, 4, 3, 2, 1],
    reelsCount: 7,
    rowsCount: 4,
    paylineCount: 144,
  });
  assert(fromSeven.reelHeights.join(",") === "3,4,5,4,3", "7-diamond → heights");
  assert(fromSeven.reelsCount === 5, "7-diamond → reels");
  assert(fromSeven.paylineCount === 720, "7-diamond → ways");
  console.log("✔ migration ok\n");
}

function maxCap() {
  console.log("3. Max-win cap");
  setFrontierGoldConfig(
    normalizeFrontierGoldConfig({ ...DEFAULT_FRONTIER_GOLD_CONFIG, maxWinMult: 2 }),
  );
  for (let i = 0; i < 1500; i++) {
    const s = resolveFrontierSpin({ totalBet: 10 });
    assert(s.totalWin <= 20.01, `cap breach ${s.totalWin}`);
  }
  setFrontierGoldConfig(DEFAULT_FRONTIER_GOLD_CONFIG);
  console.log("✔ cap ok\n");
}

function rtpSmoke() {
  console.log("4. RTP smoke (20k)");
  let wager = 0;
  let pay = 0;
  for (let i = 0; i < 20000; i++) {
    wager += 1;
    const base = resolveFrontierSpin({ totalBet: 1 });
    let win = base.totalWin;
    if (base.freeSpinsAwarded > 0) {
      let left = base.freeSpinsAwarded;
      while (left > 0) {
        left--;
        const fs = resolveFrontierSpin({ totalBet: 1, isFreeSpins: true });
        win += fs.totalWin;
        left += fs.freeSpinsAwarded;
      }
    }
    pay += win;
  }
  const rtp = (pay / wager) * 100;
  console.log(`RTP ~ ${rtp.toFixed(2)}% (target ${DEFAULT_FRONTIER_GOLD_CONFIG.targetRtp}%)`);
  // Smoke band — SuperAdmin can retarget toward 96.26% with live sim
  assert(rtp > 70 && rtp < 130, `RTP out of band ${rtp}`);
  console.log("✔ rtp smoke ok\n");
}

unitDiamondLayout();
unitWays();
holdWinAndFs();
legacyMigration();
maxCap();
rtpSmoke();
console.log("ALL FRONTIER GOLD TESTS PASSED");
