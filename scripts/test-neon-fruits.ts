/**
 * Crazy Sevens — regression tests + optional RTP simulation.
 * Run: npx tsx scripts/test-neon-fruits.ts
 * RTP:  npx tsx scripts/test-neon-fruits.ts --rtp 100000
 */
import {
  DEFAULT_NEON_FRUITS_CONFIG,
  normalizeNeonFruitsConfig,
  type NeonFruitsConfig,
} from "../src/lib/neon-fruits-config";
import { applyHoldReels, normalizeHoldMask } from "../src/lib/slot-primitives/holdReels";
import { evaluatePayline, shouldTriggerBonus, shouldTriggerJackpot } from "../src/components/maxhigh/neon-fruits/paylineEngine";
import { resolveReelsWithHold, generateReels, sanitizeHoldMask } from "../src/components/maxhigh/neon-fruits/reelGenerator";
import { createRng } from "../src/components/maxhigh/neon-fruits/rng";
import { setNeonFruitsConfig } from "../src/components/maxhigh/neon-fruits/runtimeConfig";
import { resolveNeonFruitsSpin } from "../src/components/maxhigh/neon-fruits/spinResolver";
import { resolveBonusLadder } from "../src/components/maxhigh/neon-fruits/bonusLadder";
import type { RrReels } from "../src/components/maxhigh/neon-fruits/types";

setNeonFruitsConfig(DEFAULT_NEON_FRUITS_CONFIG);
const cfg = DEFAULT_NEON_FRUITS_CONFIG;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function runUnitTests() {
  console.log("==========================================");
  console.log("Crazy Sevens — unit / regression tests");
  console.log("==========================================");

  // --- Section 1: config + generator ---
  const n = normalizeNeonFruitsConfig(null);
  assert(n.reelsCount === 3, "3 reels");
  assert(n.minBet === 1 && n.maxBet === 5, "bet 1–5");
  assert(n.twoWildPayMult === 1000, "1000× two-wild");
  assert(n.rtpConfigStatus === "config-pending", "RTP flagged pending");

  const g = generateReels(createRng("rr-gen"), cfg);
  assert(g.length === 3, "generate 3 symbols");
  console.log("✓ Section 1: config + reel generator");

  // --- Section 2: hold mechanic ---
  const prev: RrReels = ["cherry", "apple", "banana"];
  const held = normalizeHoldMask([true, false, true], 3);
  const heldResult = resolveReelsWithHold({
    rng: createRng("rr-hold"),
    cfg,
    previous: prev,
    held,
  });
  assert(heldResult.reels[0] === "cherry", "reel 0 held");
  assert(heldResult.reels[2] === "banana", "reel 2 held");
  assert(heldResult.reels[1] !== undefined, "reel 1 re-rolled");

  const noneHeld = applyHoldReels({
    previous: prev,
    generated: ["grape", "pear", "plum"],
    held: [false, false, false],
  });
  assert(noneHeld.join(",") === "grape,pear,plum", "0 held = full re-roll");

  const allHeld = applyHoldReels({
    previous: prev,
    generated: ["grape", "pear", "plum"],
    held: [true, true, true],
  });
  assert(allHeld.join(",") === "cherry,apple,banana", "3 held = full preserve");

  // Wild-hold sanitization (RTP safety — allowHoldWild=false)
  assert(cfg.allowHoldWild === false, "allowHoldWild forced false for RTP");
  const wildPrev: RrReels = ["double_wild", "cherry", "apple"];
  const stripped = sanitizeHoldMask([true, true, false], wildPrev, cfg);
  assert(stripped[0] === false, "cannot hold Double Wild");
  assert(stripped[1] === true, "can hold fruit");
  const wildHoldSpin = resolveReelsWithHold({
    rng: createRng("rr-wild-hold"),
    cfg,
    previous: wildPrev,
    held: [true, false, false],
  });
  // Reel 0 was "held" by client but must re-roll because Wild hold is illegal
  assert(wildHoldSpin.held[0] === false, "sanitized hold mask drops Wild");
  console.log("✓ Section 2: hold mechanic + Wild-hold block");

  // --- Section 3: payline ---
  const dead = evaluatePayline(["cherry", "apple", "banana"], 5, cfg);
  assert(dead.kind === "none" && dead.payout === 0, "no-win");

  const cherries = evaluatePayline(["cherry", "cherry", "cherry"], 5, cfg);
  assert(cherries.kind === "fruit" && cherries.symbol === "cherry", "cherry 3-oak");
  assert(cherries.payout === cfg.symbols.find((s) => s.kind === "cherry")!.payMult * 5, "cherry payout");

  const melon = evaluatePayline(["watermelon", "watermelon", "watermelon"], 5, cfg);
  assert(melon.kind === "fruit", "rare watermelon kind");
  assert(
    melon.payout === cfg.symbols.find((s) => s.kind === "watermelon")!.payMult * 5,
    "rare watermelon payout",
  );

  const twoWild = evaluatePayline(["double_wild", "double_wild", "cherry"], 5, cfg);
  assert(twoWild.kind === "two_wild", "2 DW kind");
  assert(twoWild.payout === 1000 * 5, `2 DW 1000× got ${twoWild.payout}`);

  const twoWildLowBet = evaluatePayline(["double_wild", "apple", "double_wild"], 2, cfg);
  assert(twoWildLowBet.payout === 1000 * 2, "2 DW scales with bet");

  const threeWild = evaluatePayline(["double_wild", "double_wild", "double_wild"], 5, cfg);
  assert(threeWild.kind === "three_wild" && threeWild.payout === 0, "3 DW no cash");
  assert(shouldTriggerBonus(threeWild) === true, "3 DW → bonus");
  assert(shouldTriggerBonus(twoWild) === false, "2 DW no bonus");
  console.log("✓ Section 3: payline + 2-DW 1000× + 3-DW bonus gate");

  // --- Section 4: jackpot max-bet gate ---
  const jpMax = shouldTriggerJackpot(twoWild, 5, cfg);
  assert(jpMax.ok === true, "2 DW at max bet → JP eligible");

  const jpLow = shouldTriggerJackpot(twoWildLowBet, 2, cfg);
  assert(jpLow.ok === false, "2 DW below max → no JP");

  const jpScript = resolveNeonFruitsSpin({
    totalBet: 5,
    seed: "jp-max",
    reels: ["double_wild", "double_wild", "grape"],
    jackpotPoolAmount: 1234.56,
  });
  assert(jpScript.payline.payout === 5000, "1000× cash still paid");
  assert(jpScript.jackpot.triggered === true, "JP triggered");
  assert(jpScript.jackpot.amount === 1234.56, "JP amount");
  assert(Math.abs(jpScript.totalWin - (5000 + 1234.56)) < 0.01, "cash + JP");

  const noJpScript = resolveNeonFruitsSpin({
    totalBet: 3,
    seed: "jp-low",
    reels: ["double_wild", "double_wild", "grape"],
    jackpotPoolAmount: 9999,
  });
  assert(noJpScript.jackpot.triggered === false, "no JP below max");
  assert(noJpScript.payline.payout === 3000, "still 1000× cash");
  console.log("✓ Section 4: progressive jackpot max-bet gate");

  // --- Section 5: bonus ladder ---
  // Force stop on line 1 via weighted board override
  const stopCfg: NeonFruitsConfig = {
    ...cfg,
    bonusLadder: {
      ...cfg.bonusLadder,
      lines: [
        { positions: [{ type: "stop", weight: 100 }] },
        { positions: [{ type: "number", value: 10, weight: 100 }] },
        { positions: [{ type: "number", value: 20, weight: 100 }] },
      ],
    },
  };
  const stopSession = resolveBonusLadder({
    rng: createRng("bonus-stop"),
    totalBet: 5,
    cfg: stopCfg,
  });
  assert(stopSession.steps[0]?.outcome === "stop", "stop line 1");
  assert(stopSession.payout === 0, "stop → 0 payout");
  assert(stopSession.stoppedOnLine === 0, "stoppedOnLine 0");

  const clearCfg: NeonFruitsConfig = {
    ...cfg,
    bonusLadder: {
      ...cfg.bonusLadder,
      advanceMode: "automatic",
      stackMode: "additive",
      lines: [
        { positions: [{ type: "number", value: 2, weight: 100 }] },
        { positions: [{ type: "number", value: 3, weight: 100 }] },
        { positions: [{ type: "number", value: 5, weight: 100 }] },
      ],
    },
  };
  const clearSession = resolveBonusLadder({
    rng: createRng("bonus-clear"),
    totalBet: 5,
    cfg: clearCfg,
  });
  assert(clearSession.clearedAll === true, "cleared all 3");
  assert(clearSession.combinedMult === 2 + 3 + 5, "additive 10");
  assert(clearSession.payout === 50, "10 × bet 5 = 50");

  const bonusSpin = resolveNeonFruitsSpin({
    totalBet: 5,
    seed: "bonus-spin",
    reels: ["double_wild", "double_wild", "double_wild"],
    cfg: clearCfg,
  });
  assert(bonusSpin.bonus?.triggered === true, "bonus triggered from 3 DW");
  assert(bonusSpin.payline.payout === 0, "no cash on 3 DW");
  assert(bonusSpin.totalWin === bonusSpin.bonus!.payout, "total = bonus only");
  console.log("✓ Section 5: bonus ladder stop vs clear-all");

  // Full resolve smoke
  const smoke = resolveNeonFruitsSpin({ totalBet: 1, seed: "smoke", held: [false, false, false] });
  assert(smoke.reels.length === 3 && smoke.audit.seed === smoke.seed, "smoke");
  console.log("✓ Full spin resolve smoke");

  console.log("==========================================");
  console.log("All Crazy Sevens unit tests passed");
  console.log("==========================================");
}

function runRtp(spins: number) {
  console.log(`\nRTP simulation — ${spins.toLocaleString()} spins`);
  console.log(`  NOTE: targetRtp=${cfg.targetRtp}% is PLACEHOLDER (config-pending)`);
  console.log(`  Jackpot pool awards EXCLUDED from game RTP (external progressive)`);
  setNeonFruitsConfig(DEFAULT_NEON_FRUITS_CONFIG);
  const bet = 5;
  const target = cfg.targetRtp;

  const runScenario = (label: string, holdStrategy: "none" | "hold_single_wild") => {
    let wagered = 0;
    let fruitWon = 0;
    let twoWildWon = 0;
    let bonusWon = 0;
    let fruit = 0;
    let twoWild = 0;
    let threeWild = 0;
    let jpHits = 0;
    let bonusHits = 0;
    let prev: RrReels | null = null;

    for (let i = 0; i < spins; i++) {
      let held = [false, false, false];
      if (holdStrategy === "hold_single_wild" && prev) {
        const wildIdx = prev
          .map((s, idx) => (s === "double_wild" ? idx : -1))
          .filter((idx) => idx >= 0);
        // Classic exploit: hold exactly one Wild, re-spin the rest
        if (wildIdx.length === 1) {
          held = [false, false, false];
          held[wildIdx[0]!] = true;
        }
      }

      const s = resolveNeonFruitsSpin({
        totalBet: bet,
        seed: `rtp-${holdStrategy}-${i}`,
        previousReels: prev,
        held,
        jackpotPoolAmount: 500,
      });
      wagered += bet;
      if (s.payline.kind === "fruit") {
        fruit++;
        fruitWon += s.payline.payout;
      }
      if (s.payline.kind === "two_wild") {
        twoWild++;
        twoWildWon += s.payline.payout;
      }
      if (s.payline.kind === "three_wild") threeWild++;
      if (s.jackpot.triggered) jpHits++;
      if (s.bonus?.triggered) {
        bonusHits++;
        bonusWon += s.bonus.payout;
      }
      prev = s.reels;
    }

    const won = fruitWon + twoWildWon + bonusWon;
    const rtp = (won / wagered) * 100;
    console.log(`\n  [${label}]`);
    console.log(`  Game RTP: ${rtp.toFixed(3)}%  (placeholder target ${target}%)`);
    console.log(
      `    Fruit ${((fruitWon / wagered) * 100).toFixed(2)}% · 2-DW ${((twoWildWon / wagered) * 100).toFixed(2)}% · Bonus ${((bonusWon / wagered) * 100).toFixed(2)}%`,
    );
    console.log(
      `  Hits — fruit ${fruit} · 2DW ${twoWild} (${((twoWild / spins) * 100).toFixed(3)}%) · 3DW ${threeWild} · JP ${jpHits} · bonus ${bonusHits}`,
    );

    if (rtp >= 100) {
      console.log(`  ✗ BLOCKING: game RTP ${rtp.toFixed(3)}% ≥ 100%`);
      process.exitCode = 1;
    } else if (rtp > target) {
      console.log(`  ⚠ Under 100% but above placeholder target`);
    } else {
      console.log(`  ✓ Under placeholder target ${target}%`);
    }
    return rtp;
  };

  runScenario("no holds", "none");
  runScenario("hold single Wild (player exploit)", "hold_single_wild");
}

runUnitTests();

const rtpArg = process.argv.indexOf("--rtp");
if (rtpArg >= 0) {
  const n = Number(process.argv[rtpArg + 1] ?? 100_000);
  runRtp(Number.isFinite(n) && n > 0 ? Math.floor(n) : 100_000);
}
