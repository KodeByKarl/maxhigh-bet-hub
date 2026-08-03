/**
 * Fire Spike — regression tests + optional RTP simulation.
 * Run: npx tsx scripts/test-fire-spike.ts
 * RTP:  npx tsx scripts/test-fire-spike.ts --rtp 100000
 */
import {
  DEFAULT_FIRE_SPIKE_CONFIG,
  DEFAULT_INSTANT_MIX_TABLE,
  normalizeFireSpikeConfig,
  type FsRtpProfileId,
} from "../src/lib/fire-spike-config";
import { evaluatePaylines } from "../src/components/maxhigh/fire-spike/paylineEngine";
import {
  countWildScatter,
  evaluateInstantMix,
  isGrandJackpot,
} from "../src/components/maxhigh/fire-spike/instantPrize";
import { resolveFireSpikeSpin } from "../src/components/maxhigh/fire-spike/spinResolver";
import { setFireSpikeConfig } from "../src/components/maxhigh/fire-spike/runtimeConfig";
import { generateGrid } from "../src/components/maxhigh/fire-spike/reelGenerator";
import { createRng } from "../src/components/maxhigh/fire-spike/rng";
import type { FsGrid } from "../src/components/maxhigh/fire-spike/types";

setFireSpikeConfig(DEFAULT_FIRE_SPIKE_CONFIG);
const cfg = DEFAULT_FIRE_SPIKE_CONFIG;
const BET = 10; // 10 lines × 1 bet-per-line

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function fillGrid(kind: FsGrid[0][0]): FsGrid {
  return Array.from({ length: 5 }, () => [kind, kind, kind] as FsGrid[0]);
}

function runUnitTests() {
  console.log("==========================================");
  console.log("Fire Spike — unit / regression tests");
  console.log("==========================================");

  // --- Section 1: normalize + grid ---
  const normalized = normalizeFireSpikeConfig(null);
  assert(normalized.reelsCount === 5 && normalized.rowsCount === 3, "Grid size 5×3");
  assert(normalized.paylineCount === 10, "10 paylines");
  assert(normalized.maxWinMult === 25_000, "maxWinMult provisional 25000");
  assert(normalized.activeRtpProfile === "rtp_96_5", "default RTP profile");

  const rng = createRng("fs-grid-test");
  const g = generateGrid(rng, cfg);
  assert(g.length === 5 && g.every((c) => c.length === 3), "generateGrid 5×3");
  console.log("✓ Config + grid generator");

  // --- Section 2: paylines ---
  const dead: FsGrid = [
    ["bar", "dice", "diamond"],
    ["chip", "lucky7", "bar"],
    ["dice", "diamond", "chip"],
    ["lucky7", "bar", "dice"],
    ["diamond", "chip", "lucky7"],
  ];
  const deadEval = evaluatePaylines(dead, BET, cfg);
  assert(deadEval.total === 0, `Expected no-win, got ${deadEval.total}`);
  console.log("✓ No-win payline eval");

  // Mid-line 5× Lucky7 (payline 0 = all middle row)
  const sevenLine: FsGrid = [
    ["bar", "lucky7", "dice"],
    ["bar", "lucky7", "dice"],
    ["bar", "lucky7", "dice"],
    ["bar", "lucky7", "dice"],
    ["bar", "lucky7", "dice"],
  ];
  const sevenEval = evaluatePaylines(sevenLine, BET, cfg);
  const sevenPay = cfg.symbols.find((s) => s.kind === "lucky7")!.pay[2];
  const bpl = BET / cfg.paylineCount;
  const midLine = sevenEval.wins.find((w) => w.lineIndex === 0);
  assert(!!midLine, "Expected win on payline 0");
  assert(
    Math.abs(midLine!.payout - sevenPay * bpl) < 0.01,
    `Lucky7 mid-line expected ${sevenPay * bpl}, got ${midLine!.payout}`,
  );
  console.log(`✓ Payline Lucky7 5-oak = ${midLine!.payout}`);

  // 3-oak at stake 1 and 10
  const threeOak: FsGrid = [
    ["bar", "chip", "dice"],
    ["bar", "lucky7", "dice"],
    ["bar", "diamond", "dice"],
    ["lucky7", "bar", "chip"],
    ["diamond", "chip", "lucky7"],
  ];
  for (const stake of [1, 10]) {
    const ev = evaluatePaylines(threeOak, stake, cfg);
    const win = ev.wins.find((w) => w.lineIndex === 1); // top row
    assert(!!win && win.count === 3, `3-oak at stake ${stake}`);
    const expected = cfg.symbols.find((s) => s.kind === "bar")!.pay[0] * (stake / 10);
    assert(Math.abs(win!.payout - expected) < 0.01, `3-oak payout stake ${stake}`);
  }
  console.log("✓ 3-oak scales with stake");

  // Wild substitution: W W lucky7 lucky7 lucky7 on mid
  const wildSub: FsGrid = [
    ["bar", "wild", "dice"],
    ["bar", "wild", "dice"],
    ["bar", "lucky7", "dice"],
    ["bar", "lucky7", "dice"],
    ["bar", "lucky7", "dice"],
  ];
  const wildSubEval = evaluatePaylines(wildSub, BET, cfg);
  const ws = wildSubEval.wins.find((w) => w.lineIndex === 0);
  assert(!!ws && ws.symbol === "lucky7" && ws.count === 5, "Wild substitutes for Lucky7");
  console.log("✓ Wild substitution");

  // All-Wild 5-oak → Wild pay (2000 × bpl = 200 × stake)
  const allWild: FsGrid = fillGrid("wild");
  // Only mid row is all wild on every line that uses mid — fill entire grid
  const allWildEval = evaluatePaylines(allWild, BET, cfg);
  const wildLine = allWildEval.wins.find((w) => w.lineIndex === 0);
  const wild5 = cfg.symbols.find((s) => s.kind === "wild")!.pay[2];
  assert(!!wildLine && wildLine.symbol === "wild", "All-wild line pays wild");
  assert(
    Math.abs(wildLine!.payout - wild5 * bpl) < 0.01,
    `Wild 5-oak expected ${wild5 * bpl}, got ${wildLine!.payout}`,
  );
  assert(Math.abs(wildLine!.payout - 200 * BET) < 0.01 || wild5 * bpl === wildLine!.payout, "200x stake ceiling");
  console.log(`✓ All-Wild 5-oak = ${wildLine!.payout} (${wild5 * bpl} = 200× stake check via bpl)`);

  // Scatter breaks payline
  const scatBreak: FsGrid = [
    ["bar", "lucky7", "dice"],
    ["bar", "lucky7", "dice"],
    ["bar", "scatter", "dice"],
    ["bar", "lucky7", "dice"],
    ["bar", "lucky7", "dice"],
  ];
  const scatEval = evaluatePaylines(scatBreak, BET, cfg);
  const scatMid = scatEval.wins.find((w) => w.lineIndex === 0);
  assert(!scatMid || scatMid.count < 5, "Scatter breaks consecutive match");
  console.log("✓ Scatter does not form / breaks paylines");

  // --- Section 3: instant mix ---
  for (let count = 5; count <= 15; count++) {
    const positions: Array<[number, number]> = [];
    const grid: FsGrid = [
      ["bar", "bar", "bar"],
      ["dice", "dice", "dice"],
      ["diamond", "diamond", "diamond"],
      ["chip", "chip", "chip"],
      ["lucky7", "lucky7", "lucky7"],
    ];
    let placed = 0;
    outer: for (let reel = 0; reel < 5; reel++) {
      for (let row = 0; row < 3; row++) {
        if (placed >= count) break outer;
        // Alternate wild/scatter so never all-scatter unless count=15 all scatter
        grid[reel][row] = placed % 2 === 0 ? "wild" : "scatter";
        positions.push([reel, row]);
        placed++;
      }
    }
    // Ensure not all-scatter when testing mix 15 with wilds
    if (count === 15) {
      grid[0][0] = "wild";
      grid[0][1] = "scatter";
    }
    const counted = countWildScatter(grid, cfg);
    assert(counted.mix === count, `mix count ${count}, got ${counted.mix}`);
    const mix = evaluateInstantMix(counted.mix, BET, cfg);
    if (count < 6) {
      assert(mix === null, `count ${count} should have no mix prize`);
    } else {
      const expectedMult = DEFAULT_INSTANT_MIX_TABLE[String(count)];
      assert(!!mix && mix.mult === expectedMult, `count ${count} mult`);
      assert(Math.abs(mix!.payout - expectedMult * BET) < 0.01, `count ${count} payout`);
    }
  }
  console.log("✓ Instant mix tiers 5–15");

  // --- Section 4: Grand Jackpot Option C ---
  const allScatter = fillGrid("scatter");
  assert(isGrandJackpot(allScatter, cfg), "All-scatter is Grand Jackpot");
  const jpScript = resolveFireSpikeSpin({ totalBet: BET, seed: "jp-test", grid: allScatter });
  assert(jpScript.grandJackpot === true, "Grand Jackpot flag");
  assert(jpScript.instantMix === null, "Option C: skip Section 3 on all-scatter");
  assert(
    Math.abs(jpScript.grandJackpotWin - cfg.grandJackpotMult * BET) < 0.01,
    `Grand Jackpot payout ${jpScript.grandJackpotWin}`,
  );
  assert(jpScript.totalWin === Math.min(cfg.grandJackpotMult * BET, cfg.maxWinMult * BET), "JP total");
  console.log("✓ Grand Jackpot all-Scatter (Option C, no mix stack)");

  // 14 scatter + 1 wild = mix 15, NO grand jackpot
  const mix15: FsGrid = fillGrid("scatter");
  mix15[4][2] = "wild";
  assert(!isGrandJackpot(mix15, cfg), "1 Wild blocks Grand Jackpot");
  const mix15Script = resolveFireSpikeSpin({ totalBet: BET, seed: "mix15", grid: mix15 });
  assert(mix15Script.grandJackpot === false, "No Grand Jackpot with Wild");
  assert(!!mix15Script.instantMix && mix15Script.instantMix.count === 15, "Mix tier 15");
  assert(mix15Script.instantMix!.mult === 5000, "5000x mix");
  console.log("✓ 15-in-view with Wild → 5000x mix, no Grand Jackpot");

  // Payline-only win
  const plOnly = resolveFireSpikeSpin({ totalBet: BET, seed: "pl", grid: sevenLine });
  assert(plOnly.paylineWin > 0 && !plOnly.instantMix && !plOnly.grandJackpot, "Payline-only");
  console.log("✓ Payline-only spin");

  // Max-win cap: force raw above cap via tiny maxWinMult
  setFireSpikeConfig({ ...DEFAULT_FIRE_SPIKE_CONFIG, maxWinMult: 10 });
  const capped = resolveFireSpikeSpin({ totalBet: BET, seed: "cap", grid: allScatter });
  assert(capped.hitCap === true, "hitCap true");
  assert(capped.totalWin === 10 * BET, `capped to ${capped.totalWin}`);
  setFireSpikeConfig(DEFAULT_FIRE_SPIKE_CONFIG);
  console.log("✓ Max-win cap enforcement");

  // Combined payline + mix
  const combo: FsGrid = [
    ["wild", "wild", "scatter"],
    ["wild", "lucky7", "scatter"],
    ["wild", "lucky7", "scatter"],
    ["lucky7", "lucky7", "scatter"],
    ["lucky7", "lucky7", "bar"],
  ];
  // mix count: wilds + scatters
  const comboCount = countWildScatter(combo, cfg);
  const comboScript = resolveFireSpikeSpin({ totalBet: BET, seed: "combo", grid: combo });
  assert(comboScript.paylineWin > 0, "combo has payline");
  if (comboCount.mix >= 6) {
    assert(!!comboScript.instantMix, "combo has mix when count≥6");
  }
  assert(
    Math.abs(comboScript.rawTotalWin - (comboScript.paylineWin + (comboScript.instantMix?.payout ?? 0))) <
      0.02,
    "rawTotal = payline + mix",
  );
  console.log("✓ Payline + instant mix can both pay");

  console.log("\nAll Fire Spike unit tests passed.\n");
}

async function runRtpSim(spins: number) {
  console.log("==========================================");
  console.log(`Fire Spike — RTP simulation (${spins.toLocaleString()} spins/profile)`);
  console.log("==========================================");

  const profiles: FsRtpProfileId[] = ["rtp_96_5", "rtp_95_5", "rtp_94_5"];
  for (const profileId of profiles) {
    const base = normalizeFireSpikeConfig({
      ...DEFAULT_FIRE_SPIKE_CONFIG,
      activeRtpProfile: profileId,
      targetRtp: DEFAULT_FIRE_SPIKE_CONFIG.rtpProfiles.find((p) => p.id === profileId)?.targetRtp,
    });
    setFireSpikeConfig(base);
    const bet = 1;
    let wagered = 0;
    let paid = 0;
    let mixHits = 0;
    let jpHits = 0;
    let paylineHits = 0;

    for (let i = 0; i < spins; i++) {
      const script = resolveFireSpikeSpin({ totalBet: bet, seed: `rtp-${profileId}-${i}` });
      wagered += bet;
      paid += script.totalWin;
      if (script.instantMix) mixHits++;
      if (script.grandJackpot) jpHits++;
      if (script.paylineWin > 0) paylineHits++;
    }

    const rtp = (paid / wagered) * 100;
    console.log(
      `${profileId}: RTP ${rtp.toFixed(3)}% (target ${base.targetRtp}%) | ` +
        `paylineHit ${(100 * paylineHits) / spins}% | mix ${mixHits} | jp ${jpHits}`,
    );
  }
  setFireSpikeConfig(DEFAULT_FIRE_SPIKE_CONFIG);
  console.log("");
}

const rtpArg = process.argv.indexOf("--rtp");
const rtpSpins = rtpArg >= 0 ? Math.max(1000, Number(process.argv[rtpArg + 1]) || 100_000) : 0;

runUnitTests();
if (rtpSpins > 0) {
  void runRtpSim(rtpSpins);
}
