import { DEFAULT_MAHJONG_WAYS_CONFIG } from "../src/lib/mahjong-ways-config";
import { evaluateWays } from "../src/components/maxhigh/mahjong-ways/waysEngine";
import { resolveMahjongSpin } from "../src/components/maxhigh/mahjong-ways/spinResolver";
import { setMahjongWaysConfig } from "../src/components/maxhigh/mahjong-ways/runtimeConfig";
import type { BoardCell } from "../src/components/maxhigh/mahjong-ways/types";

// Initialize engine runtime configuration
setMahjongWaysConfig(DEFAULT_MAHJONG_WAYS_CONFIG);

function runUnitTests() {
  console.log("==========================================");
  console.log("1. UNIT TESTS: Ways-Pay & Wild Matching");
  console.log("==========================================");

  const sym10 = DEFAULT_MAHJONG_WAYS_CONFIG.symbols.find((s) => s.id === "sym_10")!;
  const wildSym = DEFAULT_MAHJONG_WAYS_CONFIG.symbols.find((s) => s.id === "wild")!;
  const scatterSym = DEFAULT_MAHJONG_WAYS_CONFIG.symbols.find((s) => s.id === "scatter")!;

  // Case A: 3 Consecutive Reels with symbol 10 (Reel 0: 2, Reel 1: 1, Reel 2: 3) => 2 * 1 * 3 = 6 ways
  const testBoard1: BoardCell[] = [
    { key: "c1", reelIndex: 0, rowIndex: 0, sym: sym10 },
    { key: "c2", reelIndex: 0, rowIndex: 1, sym: sym10 },
    { key: "c3", reelIndex: 1, rowIndex: 0, sym: sym10 },
    { key: "c4", reelIndex: 2, rowIndex: 0, sym: sym10 },
    { key: "c5", reelIndex: 2, rowIndex: 1, sym: sym10 },
    { key: "c6", reelIndex: 2, rowIndex: 2, sym: sym10 },
  ];

  const eval1 = evaluateWays(testBoard1, 1.0, [2, 1, 3, 1, 1]);
  console.log(`Test 1 (6 Ways 10 Tile): WaysCount = ${eval1.waysWins[0]?.waysCount}, Win = ₱${eval1.winAmount}`);
  if (eval1.waysWins[0]?.waysCount !== 6) {
    throw new Error(`Test 1 Failed: Expected 6 ways, got ${eval1.waysWins[0]?.waysCount}`);
  }

  // Case B: Wild substitution test (Reel 0: 10, Reel 1: WILD, Reel 2: 10) => 1 * 1 * 1 = 1 way
  const testBoard2: BoardCell[] = [
    { key: "c10", reelIndex: 0, rowIndex: 0, sym: sym10 },
    { key: "c11", reelIndex: 1, rowIndex: 0, sym: wildSym },
    { key: "c12", reelIndex: 2, rowIndex: 0, sym: sym10 },
  ];

  const eval2 = evaluateWays(testBoard2, 1.0, [1, 1, 1, 1, 1]);
  console.log(`Test 2 (Wild Substitution): WaysCount = ${eval2.waysWins[0]?.waysCount}, Win = ₱${eval2.winAmount}`);
  if (eval2.waysWins[0]?.waysCount !== 1) {
    throw new Error(`Test 2 Failed: Expected 1 way with wild substitution, got ${eval2.waysWins[0]?.waysCount}`);
  }

  // Case C: Broken sequence test (Reel 0: 10, Reel 1: Bamboo, Reel 2: 10) => 0 ways for 10
  const testBoard3: BoardCell[] = [
    { key: "c20", reelIndex: 0, rowIndex: 0, sym: sym10 },
    { key: "c21", reelIndex: 1, rowIndex: 0, sym: scatterSym },
    { key: "c22", reelIndex: 2, rowIndex: 0, sym: sym10 },
  ];

  const eval3 = evaluateWays(testBoard3, 1.0, [1, 1, 1, 1, 1]);
  const win10 = eval3.waysWins.find((w) => w.symbolId === "sym_10");
  console.log(`Test 3 (Broken Sequence): Win10 = ${win10 ? win10.totalWinAmount : 0}`);
  if (win10) {
    throw new Error("Test 3 Failed: Expected 0 wins due to broken sequence");
  }

  console.log("✔ Unit tests passed successfully!\n");
}

function runCascadeTerminationTests() {
  console.log("==========================================");
  console.log("2. CASCADE TERMINATION & EDGE CASE TESTS");
  console.log("==========================================");

  let maxCascadesSeen = 0;
  for (let i = 0; i < 500; i++) {
    const script = resolveMahjongSpin({ bet: 1.0, ante: false, isFreeSpins: false });
    if (script.steps.length > maxCascadesSeen) {
      maxCascadesSeen = script.steps.length;
    }
    if (script.steps.length > 50) {
      throw new Error(`Cascade Termination Failed: Exceeded 50 step cap on spin ${i}`);
    }
  }

  console.log(`✔ Verified 500 spin chains: All cascade chains terminated cleanly (Max steps seen: ${maxCascadesSeen})\n`);
}

function runRtpSimulation() {
  console.log("==========================================");
  console.log("3. MONTE-CARLO RTP SIMULATION (100,000 SPINS)");
  console.log("==========================================");

  const TOTAL_SPINS = 100000;
  const betPerSpin = 1.0;
  let totalWagered = 0;
  let totalPayout = 0;

  let totalFreeSpinsAwarded = 0;
  let freeSpinsPlayed = 0;
  let maxWinSpin = 0;

  const startTime = Date.now();

  for (let i = 0; i < TOTAL_SPINS; i++) {
    totalWagered += betPerSpin;

    // Base spin
    const baseResult = resolveMahjongSpin({ bet: betPerSpin, ante: false, isFreeSpins: false });
    let spinTotalWin = baseResult.totalWin;

    if (spinTotalWin > maxWinSpin) maxWinSpin = spinTotalWin;

    // Free spins loop if triggered
    if (baseResult.freeSpinsAwarded > 0) {
      let fsRemaining = baseResult.freeSpinsAwarded;
      totalFreeSpinsAwarded += fsRemaining;

      while (fsRemaining > 0) {
        fsRemaining--;
        freeSpinsPlayed++;

        const fsResult = resolveMahjongSpin({ bet: betPerSpin, ante: false, isFreeSpins: true });
        spinTotalWin += fsResult.totalWin;

        if (fsResult.freeSpinsAwarded > 0) {
          fsRemaining += fsResult.freeSpinsAwarded;
          totalFreeSpinsAwarded += fsResult.freeSpinsAwarded;
        }
      }
    }

    totalPayout += spinTotalWin;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const achievedRtp = ((totalPayout / totalWagered) * 100).toFixed(2);

  console.log(`Simulation Completed in ${durationSec}s:`);
  console.log(`- Total Base Spins: ${TOTAL_SPINS.toLocaleString()}`);
  console.log(`- Total Wagered: ₱${totalWagered.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`);
  console.log(`- Total Payout: ₱${totalPayout.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`);
  console.log(`- Achieved RTP: ${achievedRtp}% (Target: ${DEFAULT_MAHJONG_WAYS_CONFIG.targetRtp}%)`);
  console.log(`- Total Free Spins Triggered: ${totalFreeSpinsAwarded.toLocaleString()} (${freeSpinsPlayed.toLocaleString()} played)`);
  console.log(`- Max Single Spin Win: ₱${maxWinSpin.toFixed(2)} (${(maxWinSpin / betPerSpin).toFixed(1)}x)`);

  const rtpNum = parseFloat(achievedRtp);
  if (rtpNum < 90 || rtpNum > 105) {
    throw new Error(`RTP Out of Expected Range: ${achievedRtp}%`);
  }

  console.log("✔ RTP Monte-Carlo simulation passed within target variance!\n");
}

function main() {
  console.log("Starting Mahjong Ways Game Engine Test Suite...\n");
  runUnitTests();
  runCascadeTerminationTests();
  runRtpSimulation();
  console.log("✅ ALL TESTS PASSED SUCCESSFULLY!");
}

main();
