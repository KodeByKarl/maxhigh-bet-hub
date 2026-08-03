/**
 * Piñata Wins — regression tests + RTP smoke + locked-combo tail stress.
 *
 * Run:
 *   npx tsx scripts/test-pinata-wins.ts
 *   npx tsx scripts/test-pinata-wins.ts --full          # 1M RTP rounds
 *   npx tsx scripts/test-pinata-wins.ts --tail          # deeper tail stress (200k)
 *   npx tsx scripts/test-pinata-wins.ts --full --tail
 */
import {
  DEFAULT_PINATA_WINS_CONFIG,
  LOCKED_GOLD_FRAME_MULT_STEPS,
  calcFreeSpinsAward,
  calcFreeSpinsRetrigger,
  normalizePinataWinsConfig,
  betPerLine,
} from "../src/lib/pinata-wins-config";
import {
  evaluatePaylines,
  resolvePinataSpin,
  resolvePinataFreeSpinsSession,
  resolvePinataPaidRound,
  setPinataWinsConfig,
  makeCell,
  type PwGrid,
} from "../src/components/maxhigh/pinata-wins";

setPinataWinsConfig(DEFAULT_PINATA_WINS_CONFIG);

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function gridFromKinds(kinds: string[][]): PwGrid {
  return kinds.map((col) =>
    col.map((k) => {
      if (k.includes("@")) {
        const [kind, mult] = k.split("@");
        return makeCell(kind as never, true, Number(mult));
      }
      return makeCell(k as never);
    }),
  );
}

// ── Locked decisions ────────────────────────────────────────────────────────
function testLockedDecisions() {
  console.log("0. Locked decisions");
  const cfg = DEFAULT_PINATA_WINS_CONFIG;
  assert(cfg.paylineCount === 20 && cfg.paylines.length === 20, "20 paylines");
  assert(cfg.reelsCount === 5 && cfg.rowsCount === 3, "5×3 grid");
  assert(cfg.fsMultApplyTiming === "same_spin", "same_spin timing");
  assert(cfg.freeSpinsRetriggerCap === null, "unlimited retriggers");
  assert(cfg.goldFrameCollectCapPerSpin === null, "no per-spin collect cap");
  assert(cfg.goldFrameApplyMode === "spin_aggregate", "aggregate apply");
  assert(cfg.maxWinMult === 5000, "5000x max win");
  assert(cfg.minBet === 0.2 && cfg.maxBet === 100, "flat bet range");
  assert(cfg.buyFeatureMult === 75, "75x buy");
  assert(cfg.freeSpinsBaseCount === 15 && cfg.freeSpinsExtraPerScatter === 2, "FS award");

  const skull = cfg.symbols.find((s) => s.kind === "golden_skull")!;
  assert(skull.pay[2] === 460, "Golden Skull 5oak locked at 460× bpl (not 1000)");

  const steps = cfg.goldFrameMults.map((m) => m.mult).sort((a, b) => a - b);
  assert(
    steps.length === LOCKED_GOLD_FRAME_MULT_STEPS.length &&
      steps.every((m, i) => m === LOCKED_GOLD_FRAME_MULT_STEPS[i]),
    "Gold Frame steps must be exactly the locked set",
  );

  for (const s of cfg.symbols) {
    if (s.wild || s.scatter) assert(s.goldFrameEligible === false, `${s.kind} not frameable`);
    else if (s.tier === "low" || s.tier === "high")
      assert(s.goldFrameEligible === true, `${s.kind} frameable`);
  }

  // normalize snaps exotic mults onto locked steps
  const snapped = normalizePinataWinsConfig({
    goldFrameMults: [{ mult: 7, weight: 1 }, { mult: 99, weight: 1 }],
  });
  assert(
    snapped.goldFrameMults.every((m) =>
      (LOCKED_GOLD_FRAME_MULT_STEPS as readonly number[]).includes(m.mult),
    ),
    "normalize snaps to locked steps",
  );
  console.log("✔ locked decisions ok\n");
}

// ── Section 2: Fixed payline evaluation ─────────────────────────────────────
function testPaylines() {
  console.log("2. Fixed payline evaluation");
  const cfg = DEFAULT_PINATA_WINS_CONFIG;
  const totalBet = 20; // 1 per line
  assert(betPerLine(totalBet, cfg) === 1, "bpl should be 1");

  const grid = gridFromKinds([
    ["taco", "chili", "sombrero"],
    ["guitar", "wild", "cactus"],
    ["maracas", "chili", "taco"],
    ["sombrero", "cactus", "guitar"],
    ["chili", "taco", "maracas"],
  ]);
  const eval1 = evaluatePaylines(grid, totalBet, cfg);
  const chiliWin = eval1.wins.find((w) => w.symbol === "chili" && w.lineIndex === 0);
  assert(!!chiliWin && chiliWin.count >= 3, "Expected chili mid-line with wild");
  assert(chiliWin!.payout === cfg.symbols.find((s) => s.kind === "chili")!.pay[0], "3x chili pay");

  const dead = gridFromKinds([
    ["chili", "taco", "maracas"],
    ["sombrero", "cactus", "guitar"],
    ["golden_skull", "chili", "taco"],
    ["maracas", "sombrero", "cactus"],
    ["guitar", "golden_skull", "chili"],
  ]);
  const eval0 = evaluatePaylines(dead, totalBet, cfg);
  assert(eval0.total === 0, "Expected no payline wins");

  const eval2 = evaluatePaylines(grid, 40, cfg);
  assert(Math.abs(eval2.total - eval1.total * 2) < 0.02, "Payout scales with stake");
  console.log("✔ paylines ok\n");
}

// ── Section 3: Cascade engine ───────────────────────────────────────────────
function testCascade() {
  console.log("3. Cascade engine");
  let sawMulti = false;
  for (let i = 0; i < 8000; i++) {
    const s = resolvePinataSpin({ totalBet: 1, seed: `cascade-${i}` });
    if (s.steps.length >= 3 && s.steps.some((st) => st.paylineWins.length > 0)) {
      const last = s.steps[s.steps.length - 1]!;
      assert(
        last.paylineWins.length === 0 || last.removed.length + last.transformToWild.length === 0,
        "last step terminal",
      );
      for (let j = 0; j < s.steps.length - 1; j++) {
        const st = s.steps[j]!;
        assert(st.removed.length + st.transformToWild.length > 0, `step ${j} should remove/transform`);
      }
      sawMulti = true;
      break;
    }
  }
  assert(sawMulti, "Never saw 3+ cascade steps in sample");
  console.log("✔ cascade ok\n");
}

// ── Section 4: Gold Frame collect + transform ───────────────────────────────
function testGoldFrame() {
  console.log("4. Gold Frame collect + transform");
  const grid = gridFromKinds([
    ["taco", "chili@5", "sombrero"],
    ["guitar", "chili", "cactus"],
    ["maracas", "chili", "taco"],
    ["sombrero", "cactus", "guitar"],
    ["chili", "taco", "maracas"],
  ]);
  const s = resolvePinataSpin({ totalBet: 20, seed: "gf-single", grid });
  assert(s.goldFrameCollected === 5, `expected collect 5, got ${s.goldFrameCollected}`);
  assert(s.goldFrameAppliedMult === 5, `expected apply 5x, got ${s.goldFrameAppliedMult}`);
  assert(s.steps[0]!.transformToWild.some(([r, row]) => r === 0 && row === 1), "should transform framed cell");
  assert(!s.steps[0]!.removed.some(([r, row]) => r === 0 && row === 1), "framed cell not removed");
  assert(s.paylineWinRaw > 0, "should have raw line win");
  assert(Math.abs(s.totalWin - s.paylineWinRaw * 5) < 0.05 || s.hitCap, "aggregate mult applied");

  // Uncapped multi-frame sum (2+3+100 — no per-spin cap)
  const grid2 = gridFromKinds([
    ["taco", "chili@2", "sombrero"],
    ["guitar", "chili@3", "cactus"],
    ["maracas", "chili@100", "taco"],
    ["sombrero", "cactus", "guitar"],
    ["chili", "taco", "maracas"],
  ]);
  const s2 = resolvePinataSpin({ totalBet: 20, seed: "gf-uncapped", grid: grid2 });
  assert(s2.goldFrameCollected === 105, `uncapped sum 2+3+100=105, got ${s2.goldFrameCollected}`);
  assert(s2.steps[0]!.goldCollected.length === 3, "three frames collected");
  assert(s2.goldFrameAppliedMult === 105, "aggregate apply uses full uncapped sum");
  console.log("✔ gold frame ok\n");
}

// ── Section 5: Scatter & Free Spins persistent mult ──────────────────────────
function testFreeSpins() {
  console.log("5. Scatter & Free Spins persistent multiplier");
  assert(calcFreeSpinsAward(3) === 15, "3 scatters → 15 FS");
  assert(calcFreeSpinsAward(4) === 17, "4 scatters → 17 FS");
  assert(calcFreeSpinsAward(5) === 19, "5 scatters → 19 FS");
  assert(calcFreeSpinsAward(2) === 0, "2 scatters → 0");
  assert(calcFreeSpinsRetrigger(3, 0) === 15, "retrigger 15");
  assert(calcFreeSpinsRetrigger(3, 9999) === 15, "unlimited retrigger ignores prior count");

  const session = resolvePinataFreeSpinsSession({
    totalBet: 1,
    freeSpinsAwarded: 8,
    seed: "fs-persist-test",
  });
  let prev = 0;
  for (const spin of session.spins) {
    assert(spin.persistentMultBefore === prev, "persistent before matches prior after");
    assert(spin.persistentMultAfter >= spin.persistentMultBefore, "mult only grows");
    // same_spin: applied mult uses after-collection total when collections occurred
    if (spin.goldFrameCollected > 0) {
      assert(
        spin.goldFrameAppliedMult === spin.persistentMultAfter || spin.goldFrameAppliedMult === 1,
        "same_spin applies collected value this spin",
      );
    }
    prev = spin.persistentMultAfter;
  }
  assert(session.persistentMultFinal === prev, "final matches last after");
  assert(session.spins.length >= 8, "at least awarded spins played");
  console.log("✔ free spins ok\n");
}

// ── Section 6: Feature buy ───────────────────────────────────────────────────
function testFeatureBuy() {
  console.log("6. Feature buy");
  const round = resolvePinataPaidRound({ totalBet: 1, featureBuy: true, seed: "buy-1" });
  assert(round.costMult === 75, "buy cost 75x");
  assert(round.base === null, "skips base spin");
  assert(!!round.freeSpins, "enters free spins");
  assert(round.freeSpins!.freeSpinsAwarded === 15, "starts with 15 FS");
  assert(round.freeSpins!.spins.length >= 15, "plays ≥15 FS");
  let prev = 0;
  for (const spin of round.freeSpins!.spins) {
    assert(spin.persistentMultAfter >= spin.persistentMultBefore, "buy FS mult grows");
    assert(spin.persistentMultBefore === prev, "buy FS persistent continuity");
    prev = spin.persistentMultAfter;
  }
  console.log("✔ feature buy ok\n");
}

// ── Section 7: Max-win cap ───────────────────────────────────────────────────
function testMaxWin() {
  console.log("7. Max-win cap (5,000x)");
  setPinataWinsConfig(normalizePinataWinsConfig({ ...DEFAULT_PINATA_WINS_CONFIG, maxWinMult: 2 }));
  for (let i = 0; i < 800; i++) {
    const s = resolvePinataSpin({ totalBet: 10, seed: `cap-${i}` });
    assert(s.totalWin <= 20.01, `cap breach ${s.totalWin}`);
  }
  for (let i = 0; i < 40; i++) {
    const r = resolvePinataPaidRound({ totalBet: 10, featureBuy: true, seed: `cap-buy-${i}` });
    assert(r.totalWin <= 20.01, `buy cap breach ${r.totalWin}`);
  }
  setPinataWinsConfig(DEFAULT_PINATA_WINS_CONFIG);
  assert(DEFAULT_PINATA_WINS_CONFIG.maxWinMult === 5000, "catalog max win 5000x");
  console.log("✔ max-win ok\n");
}

// ── No-win + single cascade smoke ───────────────────────────────────────────
function testSmokeSpins() {
  console.log("0b. Smoke: no-win / single cascade / FS trigger");
  let sawNoWin = false;
  let sawSingle = false;
  let sawFs = false;
  for (let i = 0; i < 25000; i++) {
    const s = resolvePinataSpin({ totalBet: 1, seed: `smoke-${i}` });
    if (s.totalWin === 0 && s.steps.length === 1) sawNoWin = true;
    if (s.steps.length === 2 && s.steps[0]!.paylineWins.length > 0) sawSingle = true;
    if (s.freeSpinsAwarded >= 15) sawFs = true;
    if (sawNoWin && sawSingle && sawFs) break;
  }
  assert(sawNoWin, "never saw no-win");
  assert(sawSingle, "never saw single cascade");
  assert(sawFs, "never saw FS trigger");
  console.log("✔ smoke ok\n");
}

// ── RTP simulation ──────────────────────────────────────────────────────────
function rtpSim(n = 50_000) {
  console.log(`7b. RTP / hit-frequency sim (${n.toLocaleString()} rounds)`);
  let wager = 0;
  let pay = 0;
  let hits = 0;
  let buyWager = 0;
  let buyPay = 0;
  const buyEvery = 40;

  for (let i = 0; i < n; i++) {
    if (i % buyEvery === 0) {
      const cost = DEFAULT_PINATA_WINS_CONFIG.buyFeatureMult;
      buyWager += cost;
      wager += cost;
      const r = resolvePinataPaidRound({ totalBet: 1, featureBuy: true, seed: `rtp-buy-${i}` });
      pay += r.totalWin;
      buyPay += r.totalWin;
      if (r.totalWin > 0) hits++;
    } else {
      wager += 1;
      const r = resolvePinataPaidRound({ totalBet: 1, seed: `rtp-${i}` });
      pay += r.totalWin;
      if (r.totalWin > 0) hits++;
    }
  }

  const rtp = (pay / wager) * 100;
  const hitFreq = (hits / n) * 100;
  const buyRtp = buyWager > 0 ? (buyPay / buyWager) * 100 : 0;
  console.log(`  RTP ~ ${rtp.toFixed(2)}% (target ${DEFAULT_PINATA_WINS_CONFIG.targetRtp}%)`);
  console.log(`  Hit freq ~ ${hitFreq.toFixed(2)}% (target ${DEFAULT_PINATA_WINS_CONFIG.targetHitFrequency}%)`);
  console.log(`  Feature-buy RTP ~ ${buyRtp.toFixed(2)}% (neutrality check vs base mix)`);
  assert(rtp > 70 && rtp < 130, `RTP out of band ${rtp}`);
  console.log("✔ rtp smoke ok\n");
}

/**
 * Priority stress: locked combo of
 *   aggregate apply + no per-spin collect cap + same_spin + unlimited retriggers
 * Characterizes tail / 5,000x-cap behavior — not just mean RTP.
 */
function tailStressSim(n = 80_000) {
  console.log(
    `7c. TAIL STRESS — uncapped collect + same_spin + unlimited retrigger (${n.toLocaleString()} rounds)`,
  );
  setPinataWinsConfig(DEFAULT_PINATA_WINS_CONFIG);
  const maxMult = DEFAULT_PINATA_WINS_CONFIG.maxWinMult;
  const bet = 1;

  let wager = 0;
  let pay = 0;
  let organicPay = 0;
  let organicWager = 0;
  let buyPay = 0;
  let buyWager = 0;

  let capHits = 0;
  let nearCapHits = 0; // ≥ 50% of max (2500x)
  let bigHits = 0; // ≥ 100x
  let payFromCapped = 0;
  let payFromNearCap = 0;
  let payFromTop1pct = 0;

  let maxWin = 0;
  let maxPersistentMult = 0;
  let maxSpinCollect = 0;
  let maxRetriggers = 0;
  let fsSessions = 0;
  let retriggerSessions = 0;

  const winBuckets = {
    zero: 0,
    "1-10x": 0,
    "10-100x": 0,
    "100-1000x": 0,
    "1000-5000x": 0,
    capped: 0,
  };
  const allWins: number[] = [];

  const buyEvery = 25; // heavier buy mix to stress FS tail

  for (let i = 0; i < n; i++) {
    const isBuy = i % buyEvery === 0;
    const cost = isBuy ? DEFAULT_PINATA_WINS_CONFIG.buyFeatureMult : 1;
    wager += cost;
    if (isBuy) buyWager += cost;
    else organicWager += cost;

    const r = resolvePinataPaidRound({
      totalBet: bet,
      featureBuy: isBuy,
      seed: `tail-${i}`,
    });
    const win = r.totalWin;
    pay += win;
    if (isBuy) buyPay += win;
    else organicPay += win;
    allWins.push(win);
    if (win > maxWin) maxWin = win;

    const mult = win / bet;
    if (win === 0) winBuckets.zero++;
    else if (mult < 10) winBuckets["1-10x"]++;
    else if (mult < 100) winBuckets["10-100x"]++;
    else if (mult < 1000) winBuckets["100-1000x"]++;
    else if (mult < maxMult - 0.01) winBuckets["1000-5000x"]++;
    else winBuckets.capped++;

    if (mult >= 100) bigHits++;
    if (mult >= maxMult * 0.5) {
      nearCapHits++;
      payFromNearCap += win;
    }
    if (r.hitCap || mult >= maxMult - 0.01) {
      capHits++;
      payFromCapped += win;
    }

    if (r.freeSpins) {
      fsSessions++;
      if (r.freeSpins.retriggerTotal > 0) retriggerSessions++;
      if (r.freeSpins.retriggerTotal > maxRetriggers) maxRetriggers = r.freeSpins.retriggerTotal;
      if (r.freeSpins.persistentMultFinal > maxPersistentMult) {
        maxPersistentMult = r.freeSpins.persistentMultFinal;
      }
      for (const spin of r.freeSpins.spins) {
        if (spin.goldFrameCollected > maxSpinCollect) maxSpinCollect = spin.goldFrameCollected;
      }
    }
    if (r.base && r.base.goldFrameCollected > maxSpinCollect) {
      maxSpinCollect = r.base.goldFrameCollected;
    }
  }

  // Top 1% contribution to RTP
  const sorted = [...allWins].sort((a, b) => b - a);
  const topK = Math.max(1, Math.floor(n * 0.01));
  for (let i = 0; i < topK; i++) payFromTop1pct += sorted[i]!;

  const rtp = (pay / wager) * 100;
  const orgRtp = organicWager > 0 ? (organicPay / organicWager) * 100 : 0;
  const buyRtp = buyWager > 0 ? (buyPay / buyWager) * 100 : 0;
  const capRate = (capHits / n) * 100;
  const nearCapRate = (nearCapHits / n) * 100;
  const bigRate = (bigHits / n) * 100;
  const rtpFromCap = wager > 0 ? (payFromCapped / wager) * 100 : 0;
  const rtpFromNear = wager > 0 ? (payFromNearCap / wager) * 100 : 0;
  const rtpFromTop1 = wager > 0 ? (payFromTop1pct / wager) * 100 : 0;
  const shareTop1 = pay > 0 ? (payFromTop1pct / pay) * 100 : 0;
  const shareCap = pay > 0 ? (payFromCapped / pay) * 100 : 0;

  console.log(`  Aggregate RTP ~ ${rtp.toFixed(2)}%  (organic ${orgRtp.toFixed(2)}% · buy ${buyRtp.toFixed(2)}%)`);
  console.log(`  Max win observed: ${maxWin.toFixed(2)}x (cap ${maxMult}x)`);
  console.log(`  Cap hits (≥${maxMult}x): ${capHits} (${capRate.toFixed(4)}%) · RTP in capped rounds: ${rtpFromCap.toFixed(2)}pp (${shareCap.toFixed(1)}% of paid)`);
  console.log(`  Near-cap (≥${maxMult / 2}x): ${nearCapHits} (${nearCapRate.toFixed(4)}%) · RTP share: ${rtpFromNear.toFixed(2)}pp`);
  console.log(`  ≥100x hits: ${bigHits} (${bigRate.toFixed(4)}%)`);
  console.log(`  Top 1% rounds: ${rtpFromTop1.toFixed(2)}pp of RTP (${shareTop1.toFixed(1)}% of all paid)`);
  console.log(`  Win buckets:`, winBuckets);
  console.log(`  FS sessions: ${fsSessions} · with retrigger: ${retriggerSessions} · max retrigger award: ${maxRetriggers}`);
  console.log(`  Max persistent FS mult: ${maxPersistentMult}x · max single-spin Gold Frame collect: ${maxSpinCollect}x`);

  // Hard invariants
  assert(maxWin <= maxMult + 0.01, `observed win breached cap: ${maxWin}`);
  assert(rtp > 60 && rtp < 150, `tail-stress RTP out of band ${rtp}`);

  // Soft warning thresholds (do not fail CI — inform compliance review)
  if (capRate > 0.5) {
    console.warn(`  ⚠ Cap hit rate ${capRate.toFixed(3)}% is elevated — review Gold Frame / FS strip weights`);
  }
  if (shareTop1 > 60) {
    console.warn(`  ⚠ Top 1% of rounds pays ${shareTop1.toFixed(1)}% of all returns — heavy tail concentration`);
  }
  if (shareCap > 25) {
    console.warn(`  ⚠ Capped rounds contribute ${shareCap.toFixed(1)}% of paid — RTP heavily depends on the 5,000x ceiling`);
  }

  console.log("✔ tail stress ok\n");
}

testLockedDecisions();
testPaylines();
testCascade();
testGoldFrame();
testFreeSpins();
testFeatureBuy();
testMaxWin();
testSmokeSpins();
rtpSim(process.argv.includes("--full") ? 1_000_000 : 50_000);
tailStressSim(
  process.argv.includes("--full")
    ? 500_000
    : process.argv.includes("--tail")
      ? 200_000
      : 80_000,
);
console.log("ALL PINATA WINS TESTS PASSED");
