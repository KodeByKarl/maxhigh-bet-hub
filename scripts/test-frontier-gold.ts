import {
  DEFAULT_FRONTIER_GOLD_CONFIG,
  calcFreeSpinsAward,
  normalizeFrontierGoldConfig,
} from "../src/lib/frontier-gold-config";
import { resolveFrontierSpin } from "../src/components/maxhigh/frontier-gold/spinResolver";
import { setFrontierGoldConfig } from "../src/components/maxhigh/frontier-gold/runtimeConfig";
import { evaluatePaylines } from "../src/components/maxhigh/frontier-gold/paylineEngine";
import { resolveHoldAndWin } from "../src/components/maxhigh/frontier-gold/holdAndWin";
import { createRng } from "../src/components/maxhigh/frontier-gold/rng";
import type { FgGrid } from "../src/components/maxhigh/frontier-gold/types";

setFrontierGoldConfig(DEFAULT_FRONTIER_GOLD_CONFIG);

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function unitPaylines() {
  console.log("1. Paylines + wild");
  const grid: FgGrid = [
    ["sym_a", "bandit", "sym_j"],
    ["wild", "sym_q", "sym_k"],
    ["sym_a", "safe", "sym_q"],
    ["sym_j", "sym_k", "sym_a"],
    ["sym_q", "sym_j", "bandit"],
  ];
  grid[0][1] = "sym_a";
  grid[1][1] = "wild";
  grid[2][1] = "sym_a";
  const eval1 = evaluatePaylines(grid, 25, DEFAULT_FRONTIER_GOLD_CONFIG);
  assert(eval1.wins.some((w) => w.symbol === "sym_a" && w.count >= 3), "Expected A payline with wild");
  console.log("✔ paylines ok\n");
}

function holdWinAndFs() {
  console.log("2. Spins / Hold&Win / FS awards");
  const hw = resolveHoldAndWin(createRng("hw-test"), 1, DEFAULT_FRONTIER_GOLD_CONFIG, [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [0, 1],
  ]);
  assert(hw.triggerCoins.length === 6, "6 trigger coins");
  assert(hw.totalWin > 0, "hold win payout");
  assert(hw.steps.length >= 1, "at least one respin step");

  let sawHold = false;
  let sawFs = false;
  for (let i = 0; i < 40000; i++) {
    const s = resolveFrontierSpin({ totalBet: 1 });
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

unitPaylines();
holdWinAndFs();
maxCap();
rtpSmoke();
console.log("ALL FRONTIER GOLD TESTS PASSED");
