/**
 * Super Ace — unit + Monte-Carlo regression suite.
 * Run: npx tsx scripts/test-royal-ace.ts
 */
import {
  DEFAULT_ROYAL_ACE_CONFIG,
  applyRtpProfile,
  calcFreeSpinsAward,
  normalizeRoyalAceConfig,
  type SaRtpProfileId,
  type RoyalAceConfig,
} from "../src/lib/royal-ace-config";
import { evaluateWays } from "../src/components/maxhigh/royal-ace/waysEngine";
import { resolveRoyalAceSpin } from "../src/components/maxhigh/royal-ace/spinResolver";
import {
  applyGravity,
  makeCell,
  generateInitialBoard,
} from "../src/components/maxhigh/royal-ace/tumbleEngine";
import { setRoyalAceConfig } from "../src/components/maxhigh/royal-ace/runtimeConfig";
import type { BoardCell } from "../src/components/maxhigh/royal-ace/types";

function withConfig(cfg: RoyalAceConfig) {
  setRoyalAceConfig(cfg);
}

withConfig(DEFAULT_ROYAL_ACE_CONFIG);

function runUnitTests() {
  console.log("==========================================");
  console.log("1. UNIT TESTS: Ways-Pay & Dual Wild Matching");
  console.log("==========================================");

  const symJ = DEFAULT_ROYAL_ACE_CONFIG.symbols.find((s) => s.id === "sym_j")!;
  const little = DEFAULT_ROYAL_ACE_CONFIG.symbols.find((s) => s.id === "little_joker")!;
  const big = DEFAULT_ROYAL_ACE_CONFIG.symbols.find((s) => s.id === "big_joker")!;
  const scatterSym = DEFAULT_ROYAL_ACE_CONFIG.symbols.find((s) => s.id === "scatter")!;

  const testBoard1: BoardCell[] = [
    { key: "c1", reelIndex: 0, rowIndex: 0, sym: symJ },
    { key: "c2", reelIndex: 0, rowIndex: 1, sym: symJ },
    { key: "c3", reelIndex: 1, rowIndex: 0, sym: symJ },
    { key: "c4", reelIndex: 2, rowIndex: 0, sym: symJ },
    { key: "c5", reelIndex: 2, rowIndex: 1, sym: symJ },
    { key: "c6", reelIndex: 2, rowIndex: 2, sym: symJ },
  ];

  const eval1 = evaluateWays(testBoard1, 1.0, [2, 1, 3, 1, 1]);
  console.log(
    `Test 1 (6 Ways Jack): WaysCount = ${eval1.waysWins[0]?.waysCount}, Win = ₱${eval1.winAmount}`,
  );
  if (eval1.waysWins[0]?.waysCount !== 6) {
    throw new Error(`Test 1 Failed: Expected 6 ways, got ${eval1.waysWins[0]?.waysCount}`);
  }

  const testBoard2: BoardCell[] = [
    { key: "c10", reelIndex: 0, rowIndex: 0, sym: symJ },
    { key: "c11", reelIndex: 1, rowIndex: 0, sym: little },
    { key: "c12", reelIndex: 2, rowIndex: 0, sym: symJ },
  ];
  const eval2 = evaluateWays(testBoard2, 1.0, [1, 1, 1, 1, 1]);
  if (eval2.waysWins[0]?.waysCount !== 1) {
    throw new Error(
      `Test 2 Failed: Expected 1 way with Little Joker, got ${eval2.waysWins[0]?.waysCount}`,
    );
  }

  const testBoard2b: BoardCell[] = [
    { key: "c13", reelIndex: 0, rowIndex: 0, sym: symJ },
    { key: "c14", reelIndex: 1, rowIndex: 0, sym: big },
    { key: "c15", reelIndex: 2, rowIndex: 0, sym: little },
  ];
  const eval2b = evaluateWays(testBoard2b, 1.0, [1, 1, 1, 1, 1]);
  if (eval2b.waysWins[0]?.waysCount !== 1) {
    throw new Error("Test 2b Failed: Big + Little Joker should substitute");
  }
  console.log("Test 2/2b (Little & Big Joker substitution): OK");

  const testBoard3: BoardCell[] = [
    { key: "c20", reelIndex: 0, rowIndex: 0, sym: symJ },
    { key: "c21", reelIndex: 1, rowIndex: 0, sym: scatterSym },
    { key: "c22", reelIndex: 2, rowIndex: 0, sym: symJ },
  ];
  const eval3 = evaluateWays(testBoard3, 1.0, [1, 1, 1, 1, 1]);
  if (eval3.waysWins.find((w) => w.symbolId === "sym_j")) {
    throw new Error("Test 3 Failed: Expected 0 wins due to broken sequence");
  }

  const scatBoard: BoardCell[] = [
    { key: "s1", reelIndex: 0, rowIndex: 0, sym: scatterSym },
    { key: "s2", reelIndex: 1, rowIndex: 0, sym: scatterSym },
    { key: "s3", reelIndex: 2, rowIndex: 0, sym: scatterSym },
    { key: "s4", reelIndex: 3, rowIndex: 0, sym: symJ },
  ];
  const evalScatOff = evaluateWays(scatBoard, 1.0, [1, 1, 1, 1, 1], { payScatter: false });
  const evalScatOn = evaluateWays(scatBoard, 1.0, [1, 1, 1, 1, 1], { payScatter: true });
  if (evalScatOff.winAmount !== 0) throw new Error("Scatter should not pay when payScatter=false");
  if (evalScatOn.winAmount <= 0) throw new Error("Scatter should pay when payScatter=true");
  if (evalScatOn.winningKeys.length !== 0) throw new Error("Scatter keys must not tumble");

  const heights = [4, 4, 4, 4, 4];
  const ways = heights.reduce((a, h) => a * h, 1);
  if (ways !== 1024) throw new Error(`Expected 1024 ways (4^5), got ${ways}`);

  console.log("✔ Unit tests passed successfully!\n");
}

function runJokerTransformTests() {
  console.log("==========================================");
  console.log("2. GOLDEN CARD → LITTLE / BIG JOKER");
  console.log("==========================================");

  const symJ = DEFAULT_ROYAL_ACE_CONFIG.symbols.find((s) => s.id === "sym_j")!;

  withConfig(
    normalizeRoyalAceConfig({
      ...DEFAULT_ROYAL_ACE_CONFIG,
      jokerTransformWeights: { little_joker: 100, big_joker: 0 },
    }),
  );
  {
    const board: BoardCell[] = [
      makeCell(symJ, 0, 0, false),
      makeCell(symJ, 1, 0, true),
      makeCell(symJ, 2, 0, false),
      makeCell(symJ, 3, 0, false),
    ];
    const goldKey = board[1].key;
    const tumble = applyGravity(
      board,
      new Set([board[0].key, goldKey, board[2].key]),
      [1, 1, 1, 1, 1],
      false,
      false,
    );
    const little = tumble.nextBoard.filter((c) => c.sym.kind === "little_joker");
    if (little.length < 1) throw new Error("Forced Little Joker transform failed");
    if (tumble.jokerTransformKeys.length < 1) throw new Error("Missing jokerTransformKeys");
    if (tumble.nextBoard.some((c) => c.key === goldKey)) {
      throw new Error("Gold cell key should be replaced");
    }
    console.log("✔ Golden → Little Joker OK");
  }

  withConfig(
    normalizeRoyalAceConfig({
      ...DEFAULT_ROYAL_ACE_CONFIG,
      jokerTransformWeights: { little_joker: 0, big_joker: 100 },
    }),
  );
  {
    const board: BoardCell[] = [
      makeCell(symJ, 0, 0, false),
      makeCell(symJ, 1, 0, true),
      makeCell(symJ, 2, 0, false),
    ];
    const tumble = applyGravity(
      board,
      new Set(board.map((c) => c.key)),
      [1, 1, 1, 1, 1],
      false,
      false,
    );
    const big = tumble.nextBoard.filter((c) => c.sym.kind === "big_joker");
    if (big.length < 1) throw new Error("Forced Big Joker transform failed");
    console.log("✔ Golden → Big Joker OK\n");
  }

  withConfig(DEFAULT_ROYAL_ACE_CONFIG);
}

function runFreeSpinsAwardTests() {
  console.log("==========================================");
  console.log("3. FREE SPINS: 10 TRIGGER / +5 RETRIGGER");
  console.log("==========================================");

  if (calcFreeSpinsAward(2) !== 0) throw new Error("2 scatters → 0 FS");
  if (calcFreeSpinsAward(3) !== 10) throw new Error("3 scatters → 10 FS");
  if (calcFreeSpinsAward(5) !== 10) throw new Error("5 scatters still → 10 FS (flat)");
  if (calcFreeSpinsAward(3, DEFAULT_ROYAL_ACE_CONFIG, { isRetrigger: true }) !== 5) {
    throw new Error("Retrigger should award +5");
  }
  if (calcFreeSpinsAward(8, DEFAULT_ROYAL_ACE_CONFIG, { isRetrigger: true }) !== 5) {
    throw new Error("Retrigger remains flat +5 regardless of scatter count");
  }

  // Uncapped double retrigger accumulation
  let left = 10;
  left = left - 1 + calcFreeSpinsAward(3, DEFAULT_ROYAL_ACE_CONFIG, { isRetrigger: true });
  left = left - 1 + calcFreeSpinsAward(4, DEFAULT_ROYAL_ACE_CONFIG, { isRetrigger: true });
  if (left !== 18) throw new Error(`Expected 18 after two retriggers, got ${left}`);

  console.log("✔ Free spins award / double retrigger OK\n");
}

function runMaxWinCapTest() {
  console.log("==========================================");
  console.log("4. MAX-WIN CAP (1,500×)");
  console.log("==========================================");

  withConfig(
    normalizeRoyalAceConfig({
      ...DEFAULT_ROYAL_ACE_CONFIG,
      maxWinMult: 2,
    }),
  );

  let capped = false;
  for (let i = 0; i < 2000; i++) {
    const script = resolveRoyalAceSpin({ bet: 10, ante: false, isFreeSpins: false });
    if (script.totalWin > 20.01) {
      throw new Error(`Cap breached: win ${script.totalWin} > 20`);
    }
    if (script.hitCap) capped = true;
  }

  // Confirm production default is 1500
  withConfig(DEFAULT_ROYAL_ACE_CONFIG);
  if (DEFAULT_ROYAL_ACE_CONFIG.maxWinMult !== 1500) {
    throw new Error(`Expected maxWinMult 1500, got ${DEFAULT_ROYAL_ACE_CONFIG.maxWinMult}`);
  }
  console.log(`✔ Max-win cap held (saw hitCap=${capped} in sample); default 1500× OK\n`);
}

function runCascadeTerminationTests() {
  console.log("==========================================");
  console.log("5. CASCADE TERMINATION + 1,024 WAYS");
  console.log("==========================================");

  let maxCascadesSeen = 0;
  let multiCascade = 0;
  for (let i = 0; i < 500; i++) {
    const script = resolveRoyalAceSpin({ bet: 1.0, ante: false, isFreeSpins: false });
    if (script.steps.length > maxCascadesSeen) maxCascadesSeen = script.steps.length;
    if (script.steps.length >= 3) multiCascade++;
    if (script.totalWays !== 1024) {
      throw new Error(`Expected 1024 ways, got ${script.totalWays}`);
    }
    if (script.steps.length > 50) {
      throw new Error(`Cascade Termination Failed: Exceeded 50 step cap on spin ${i}`);
    }
  }
  console.log(
    `✔ 500 spins terminated cleanly (Max steps: ${maxCascadesSeen}, ≥3 cascades: ${multiCascade})\n`,
  );
}

function runFsGoldJokerFrequencySmoke() {
  console.log("==========================================");
  console.log("6. FS ELEVATED GOLD / JOKER FREQUENCY");
  console.log("==========================================");

  const samples = 200;
  let baseGold = 0;
  let baseJoker = 0;
  let fsGold = 0;
  let fsJoker = 0;
  let baseCells = 0;
  let fsCells = 0;

  for (let i = 0; i < samples; i++) {
    const base = generateInitialBoard([4, 4, 4, 4, 4], false, false);
    const fs = generateInitialBoard([4, 4, 4, 4, 4], false, true);
    for (const c of base) {
      baseCells++;
      if (c.isGold) baseGold++;
      if (c.sym.wild) baseJoker++;
    }
    for (const c of fs) {
      fsCells++;
      if (c.isGold) fsGold++;
      if (c.sym.wild) fsJoker++;
    }
  }

  const baseGoldRate = baseGold / baseCells;
  const fsGoldRate = fsGold / fsCells;
  const baseJokerRate = baseJoker / baseCells;
  const fsJokerRate = fsJoker / fsCells;

  console.log(
    `Base gold ${(baseGoldRate * 100).toFixed(2)}% · FS gold ${(fsGoldRate * 100).toFixed(2)}%`,
  );
  console.log(
    `Base joker ${(baseJokerRate * 100).toFixed(2)}% · FS joker ${(fsJokerRate * 100).toFixed(2)}%`,
  );

  // Guaranteed middle reel in FS should push gold rate above base
  if (fsGoldRate <= baseGoldRate) {
    throw new Error(
      `Expected FS gold rate > base (${fsGoldRate} vs ${baseGoldRate}) via guaranteedGoldenReel`,
    );
  }
  if (fsJokerRate < baseJokerRate) {
    throw new Error(
      `Expected FS joker rate ≥ base (${fsJokerRate} vs ${baseJokerRate}) via weightFreeSpins`,
    );
  }
  console.log("✔ FS elevated gold/joker frequency OK\n");
}

function runRtpSimulationPerProfile() {
  console.log("==========================================");
  console.log("7. MONTE-CARLO RTP PER PROFILE (15k SPINS)");
  console.log("==========================================");

  const TOTAL_SPINS = 15_000;
  const betPerSpin = 1.0;
  const profiles: SaRtpProfileId[] = ["rtp_97_0", "rtp_96_5", "rtp_94_38"];

  for (const profileId of profiles) {
    const cfg = applyRtpProfile(
      normalizeRoyalAceConfig({
        ...DEFAULT_ROYAL_ACE_CONFIG,
        activeRtpProfile: profileId,
      }),
    );
    withConfig(cfg);

    let totalWagered = 0;
    let totalPayout = 0;
    let hits = 0;
    let cascadeDepthSum = 0;
    let freeSpinsPlayed = 0;
    let maxWinSpin = 0;

    for (let i = 0; i < TOTAL_SPINS; i++) {
      totalWagered += betPerSpin;
      const baseResult = resolveRoyalAceSpin({
        bet: betPerSpin,
        ante: false,
        isFreeSpins: false,
      });
      let spinTotalWin = baseResult.totalWin;
      cascadeDepthSum += baseResult.steps.length;
      if (baseResult.totalWin > 0 || baseResult.freeSpinsAwarded > 0) hits++;
      if (spinTotalWin > maxWinSpin) maxWinSpin = spinTotalWin;

      let fsLeft = baseResult.freeSpinsAwarded;
      while (fsLeft > 0) {
        const fs = resolveRoyalAceSpin({
          bet: betPerSpin,
          ante: false,
          isFreeSpins: true,
        });
        freeSpinsPlayed++;
        spinTotalWin += fs.totalWin;
        cascadeDepthSum += fs.steps.length;
        fsLeft = fsLeft - 1 + fs.freeSpinsAwarded;
        if (spinTotalWin > maxWinSpin) maxWinSpin = spinTotalWin;
        if (freeSpinsPlayed > TOTAL_SPINS * 20) break; // safety
      }
      totalPayout += spinTotalWin;
    }

    const rtp = (totalPayout / totalWagered) * 100;
    const hitRate = (hits / TOTAL_SPINS) * 100;
    const avgCascade = cascadeDepthSum / (TOTAL_SPINS + freeSpinsPlayed);

    console.log(`--- ${profileId} (target ${cfg.targetRtp}%) ---`);
    console.log(`  RTP: ${rtp.toFixed(2)}% · Hit rate: ${hitRate.toFixed(2)}%`);
    console.log(
      `  Avg cascade depth: ${avgCascade.toFixed(2)} · Max win: ${maxWinSpin.toFixed(2)}× · FS played: ${freeSpinsPlayed}`,
    );

    if (rtp < 50 || rtp > 160) {
      throw new Error(`${profileId}: RTP ${rtp.toFixed(2)}% outside sanity band 50–160%`);
    }
  }

  withConfig(DEFAULT_ROYAL_ACE_CONFIG);
  console.log("✔ Per-profile Monte-Carlo sanity OK\n");
}

function main() {
  runUnitTests();
  runJokerTransformTests();
  runFreeSpinsAwardTests();
  runMaxWinCapTest();
  runCascadeTerminationTests();
  runFsGoldJokerFrequencySmoke();
  runRtpSimulationPerProfile();
  console.log("==========================================");
  console.log("ALL SUPER ACE TESTS PASSED");
  console.log("==========================================");
}

main();
