import {
  DEFAULT_GALAXY_ACE_CONFIG,
  calcFreeSpinsAward,
  normalizeGalaxyAceConfig,
} from "../src/lib/galaxy-ace-config";
import { evaluateWays } from "../src/components/maxhigh/galaxy-ace/waysEngine";
import { resolveGalaxyAceSpin } from "../src/components/maxhigh/galaxy-ace/spinResolver";
import { applyGravity, makeCell, generateInitialBoard } from "../src/components/maxhigh/galaxy-ace/tumbleEngine";
import { setGalaxyAceConfig } from "../src/components/maxhigh/galaxy-ace/runtimeConfig";
import type { BoardCell } from "../src/components/maxhigh/galaxy-ace/types";

setGalaxyAceConfig(DEFAULT_GALAXY_ACE_CONFIG);

function runUnitTests() {
  console.log("==========================================");
  console.log("1. UNIT TESTS: Ways-Pay & Wild Matching");
  console.log("==========================================");

  const sym10 = DEFAULT_GALAXY_ACE_CONFIG.symbols.find((s) => s.id === "sym_10")!;
  const wildSym = DEFAULT_GALAXY_ACE_CONFIG.symbols.find((s) => s.id === "wild")!;
  const scatterSym = DEFAULT_GALAXY_ACE_CONFIG.symbols.find((s) => s.id === "scatter")!;

  const testBoard1: BoardCell[] = [
    { key: "c1", reelIndex: 0, rowIndex: 0, sym: sym10 },
    { key: "c2", reelIndex: 0, rowIndex: 1, sym: sym10 },
    { key: "c3", reelIndex: 1, rowIndex: 0, sym: sym10 },
    { key: "c4", reelIndex: 2, rowIndex: 0, sym: sym10 },
    { key: "c5", reelIndex: 2, rowIndex: 1, sym: sym10 },
    { key: "c6", reelIndex: 2, rowIndex: 2, sym: sym10 },
  ];

  const eval1 = evaluateWays(testBoard1, 1.0, [2, 1, 3, 1, 1]);
  console.log(`Test 1 (6 Ways 10 Gem): WaysCount = ${eval1.waysWins[0]?.waysCount}, Win = ₱${eval1.winAmount}`);
  if (eval1.waysWins[0]?.waysCount !== 6) {
    throw new Error(`Test 1 Failed: Expected 6 ways, got ${eval1.waysWins[0]?.waysCount}`);
  }

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

  const scatBoard: BoardCell[] = [
    { key: "s1", reelIndex: 0, rowIndex: 0, sym: scatterSym },
    { key: "s2", reelIndex: 1, rowIndex: 0, sym: scatterSym },
    { key: "s3", reelIndex: 2, rowIndex: 0, sym: scatterSym },
    { key: "s4", reelIndex: 3, rowIndex: 0, sym: sym10 },
  ];
  const evalScatOff = evaluateWays(scatBoard, 1.0, [1, 1, 1, 1, 1], { payScatter: false });
  const evalScatOn = evaluateWays(scatBoard, 1.0, [1, 1, 1, 1, 1], { payScatter: true });
  if (evalScatOff.winAmount !== 0) throw new Error("Scatter should not pay when payScatter=false");
  if (evalScatOn.winAmount <= 0) throw new Error("Scatter should pay when payScatter=true");
  if (evalScatOn.winningKeys.length !== 0) throw new Error("Scatter keys must not tumble");

  const heights = [5, 5, 5, 5, 5];
  const ways = heights.reduce((a, h) => a * h, 1);
  if (ways !== 3125) throw new Error(`Expected 3125 ways, got ${ways}`);

  console.log("✔ Unit tests passed successfully!\n");
}

function runGoldTransformTest() {
  console.log("==========================================");
  console.log("2. GOLD-PLATED → WILD TRANSFORM");
  console.log("==========================================");

  const sym10 = DEFAULT_GALAXY_ACE_CONFIG.symbols.find((s) => s.id === "sym_10")!;
  const board: BoardCell[] = [
    makeCell(sym10, 0, 0, false),
    makeCell(sym10, 1, 0, true),
    makeCell(sym10, 2, 0, false),
    makeCell(sym10, 3, 0, false),
  ];
  const goldKey = board[1].key;
  const tumble = applyGravity(board, new Set([board[0].key, goldKey, board[2].key]), [1, 1, 1, 1, 1], false, false);
  const wilds = tumble.nextBoard.filter((c) => c.sym.wild);
  if (wilds.length < 1) throw new Error("Gold win should leave a Wild on the next board");
  if (tumble.nextBoard.some((c) => c.key === goldKey)) {
    throw new Error("Gold cell key should be replaced by a new Wild cell");
  }
  console.log("✔ Gold → Wild transform OK\n");
}

function runGuaranteedGoldenReelTest() {
  console.log("==========================================");
  console.log("3. FS GUARANTEED GOLDEN REEL");
  console.log("==========================================");

  const reel = DEFAULT_GALAXY_ACE_CONFIG.guaranteedGoldenReelIndex;
  let samples = 0;
  for (let i = 0; i < 40; i++) {
    const board = generateInitialBoard([5, 5, 5, 5, 5], false, true);
    const onReel = board.filter((c) => c.reelIndex === reel && !c.sym.wild && !c.sym.scatter);
    for (const cell of onReel) {
      samples++;
      if (!cell.isGold) {
        throw new Error(`FS reel ${reel} cell not gold: ${cell.sym.id}`);
      }
    }
  }
  if (samples < 10) throw new Error("Not enough non-wild/scatter samples on guaranteed reel");
  console.log(`✔ Guaranteed golden reel ${reel} OK (${samples} cells)\n`);
}

function runFreeSpinsFormulaTest() {
  console.log("==========================================");
  console.log("4. FREE SPINS AWARD FORMULA (10 + 2×extra)");
  console.log("==========================================");

  if (calcFreeSpinsAward(2) !== 0) throw new Error("2 scatters → 0 FS");
  if (calcFreeSpinsAward(3) !== 10) throw new Error("3 scatters → 10 FS");
  if (calcFreeSpinsAward(4) !== 12) throw new Error("4 scatters → 12 FS");
  if (calcFreeSpinsAward(5) !== 14) throw new Error("5 scatters → 14 FS");
  console.log("✔ Free spins formula OK\n");
}

function runMaxWinCapTest() {
  console.log("==========================================");
  console.log("5. MAX-WIN CAP");
  console.log("==========================================");

  setGalaxyAceConfig(
    normalizeGalaxyAceConfig({
      ...DEFAULT_GALAXY_ACE_CONFIG,
      maxWinMult: 2,
    }),
  );

  let capped = false;
  for (let i = 0; i < 2000; i++) {
    const script = resolveGalaxyAceSpin({ bet: 10, ante: false, isFreeSpins: false });
    if (script.totalWin > 20.01) {
      throw new Error(`Cap breached: win ${script.totalWin} > 20`);
    }
    if (script.hitCap) capped = true;
  }
  setGalaxyAceConfig(DEFAULT_GALAXY_ACE_CONFIG);
  console.log(`✔ Max-win cap held (saw hitCap=${capped} in sample)\n`);
}

function runCascadeTerminationTests() {
  console.log("==========================================");
  console.log("6. CASCADE TERMINATION");
  console.log("==========================================");

  let maxCascadesSeen = 0;
  for (let i = 0; i < 500; i++) {
    const script = resolveGalaxyAceSpin({ bet: 1.0, ante: false, isFreeSpins: false });
    if (script.steps.length > maxCascadesSeen) maxCascadesSeen = script.steps.length;
    if (script.totalWays !== 3125) {
      throw new Error(`Expected 3125 ways, got ${script.totalWays}`);
    }
    if (script.steps.length > 50) {
      throw new Error(`Cascade Termination Failed: Exceeded 50 step cap on spin ${i}`);
    }
  }
  console.log(`✔ 500 spins terminated cleanly (Max steps: ${maxCascadesSeen})\n`);
}

function runRtpSimulation() {
  console.log("==========================================");
  console.log("7. MONTE-CARLO RTP (20,000 SPINS)");
  console.log("==========================================");

  const TOTAL_SPINS = 20000;
  const betPerSpin = 1.0;
  let totalWagered = 0;
  let totalPayout = 0;
  let totalFreeSpinsAwarded = 0;
  let freeSpinsPlayed = 0;
  let maxWinSpin = 0;
  const startTime = Date.now();

  for (let i = 0; i < TOTAL_SPINS; i++) {
    totalWagered += betPerSpin;
    const baseResult = resolveGalaxyAceSpin({ bet: betPerSpin, ante: false, isFreeSpins: false });
    let spinTotalWin = baseResult.totalWin;
    if (spinTotalWin > maxWinSpin) maxWinSpin = spinTotalWin;

    if (baseResult.freeSpinsAwarded > 0) {
      let fsRemaining = baseResult.freeSpinsAwarded;
      totalFreeSpinsAwarded += fsRemaining;
      while (fsRemaining > 0) {
        fsRemaining--;
        freeSpinsPlayed++;
        const fsResult = resolveGalaxyAceSpin({ bet: betPerSpin, ante: false, isFreeSpins: true });
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
  console.log(`- Achieved RTP: ${achievedRtp}% (Target: ${DEFAULT_GALAXY_ACE_CONFIG.targetRtp}% — provisional)`);
  console.log(`- Free Spins Awarded: ${totalFreeSpinsAwarded.toLocaleString()} (${freeSpinsPlayed.toLocaleString()} played)`);
  console.log(`- Max Single Spin Win: ₱${maxWinSpin.toFixed(2)} (${(maxWinSpin / betPerSpin).toFixed(1)}x)`);

  const rtpNum = parseFloat(achievedRtp);
  if (rtpNum < 70 || rtpNum > 130) {
    throw new Error(`RTP Out of Expected Range: ${achievedRtp}%`);
  }
  console.log("✔ RTP simulation within provisional variance band\n");
}

function main() {
  runUnitTests();
  runGoldTransformTest();
  runGuaranteedGoldenReelTest();
  runFreeSpinsFormulaTest();
  runMaxWinCapTest();
  runCascadeTerminationTests();
  runRtpSimulation();
  console.log("ALL STARLIGHT ACE TESTS PASSED");
}

main();
