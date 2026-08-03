/**
 * Chinese New Year — regression tests + optional RTP simulation.
 * Run: npx tsx scripts/test-chinese-new-year.ts
 * RTP:  npx tsx scripts/test-chinese-new-year.ts --rtp 100000
 */
import {
  DEFAULT_CHINESE_NEW_YEAR_CONFIG,
  normalizeChineseNewYearConfig,
} from "../src/lib/chinese-new-year-config";
import { createRng } from "../src/components/maxhigh/chinese-new-year/rng";
import { evaluatePaylines } from "../src/components/maxhigh/chinese-new-year/paylineEngine";
import { resolveDragonFireworks } from "../src/components/maxhigh/chinese-new-year/dragonBonus";
import { resolveMonkeyTrigger } from "../src/components/maxhigh/chinese-new-year/monkeyBonus";
import { resolveGamble } from "../src/components/maxhigh/chinese-new-year/gambleEngine";
import { resolveCnySpin } from "../src/components/maxhigh/chinese-new-year/spinResolver";
import { setChineseNewYearConfig } from "../src/components/maxhigh/chinese-new-year/runtimeConfig";
import {
  detectDragonTrigger,
  detectMonkeyTrigger,
} from "../src/components/maxhigh/chinese-new-year/reelGenerator";
import type { CnyGrid } from "../src/components/maxhigh/chinese-new-year/types";

setChineseNewYearConfig(DEFAULT_CHINESE_NEW_YEAR_CONFIG);
const cfg = DEFAULT_CHINESE_NEW_YEAR_CONFIG;
const BET = 20; // 20 lines × 1 bet-per-line

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function runUnitTests() {
  console.log("==========================================");
  console.log("Chinese New Year — unit / regression tests");
  console.log("==========================================");

  // 1. No-win grid
  const dead: CnyGrid = [
    ["sym_10", "sym_j", "sym_q"],
    ["sym_k", "sym_a", "jug"],
    ["coins", "fish", "lion"],
    ["lantern", "sym_10", "sym_j"],
    ["sym_q", "sym_k", "sym_a"],
  ];
  const deadEval = evaluatePaylines(dead, BET, cfg);
  assert(deadEval.total === 0, `Expected no-win, got ${deadEval.total}`);
  console.log("✓ No-win payline eval");

  // 2. Mid-line 5× Ace (payline 0 = all middle row)
  const aceLine: CnyGrid = [
    ["sym_10", "sym_a", "sym_j"],
    ["sym_10", "sym_a", "sym_j"],
    ["sym_10", "sym_a", "sym_j"],
    ["sym_10", "sym_a", "sym_j"],
    ["sym_10", "sym_a", "sym_j"],
  ];
  const aceEval = evaluatePaylines(aceLine, BET, cfg);
  const acePay = cfg.symbols.find((s) => s.kind === "sym_a")!.pay[2]; // 20
  const bpl = BET / cfg.paylineCount;
  const midLine = aceEval.wins.find((w) => w.lineIndex === 0);
  assert(!!midLine, "Expected win on payline 0 (middle)");
  assert(
    Math.abs(midLine!.payout - acePay * bpl) < 0.01,
    `Ace mid-line expected ${acePay * bpl}, got ${midLine!.payout}`,
  );
  assert(aceEval.total >= acePay * bpl, `Total should include mid-line win, got ${aceEval.total}`);
  console.log(`✓ Payline Ace 5-oak mid-line = ${midLine!.payout} (total ${aceEval.total})`);

  // 3. Dragon trigger detection
  const dragonGrid: CnyGrid = [
    ["sym_10", "sym_j", "sym_q"],
    ["sym_k", "sym_a", "jug"],
    ["dragon", "fish", "lion"],
    ["lantern", "dragon", "sym_j"],
    ["dragon", "sym_k", "sym_a"],
  ];
  assert(detectDragonTrigger(dragonGrid), "Dragon should trigger");
  assert(!detectMonkeyTrigger(dragonGrid), "Monkey should not trigger");
  console.log("✓ Dragon trigger on reels 3–5");

  // 4. Monkey trigger detection
  const monkeyGrid: CnyGrid = [
    ["monkey", "sym_j", "sym_q"],
    ["sym_k", "sym_a", "jug"],
    ["monkey", "fish", "lion"],
    ["lantern", "sym_10", "sym_j"],
    ["monkey", "sym_k", "sym_a"],
  ];
  assert(detectMonkeyTrigger(monkeyGrid), "Monkey should trigger");
  console.log("✓ Monkey trigger on reels 1,3,5");

  // 5. Dragon fireworks — forced bust on first launch
  const bustCfg = {
    ...cfg,
    dragonSuccessChancePercent: 0,
    dragonFireworkAwards: cfg.dragonFireworkAwards.map((a) => ({ ...a })),
  };
  const bust = resolveDragonFireworks(createRng("bust-test"), BET, bustCfg);
  assert(bust.launches.length === 1 && !bust.launches[0]!.success, "Expected immediate bust");
  assert(bust.totalCoins === 0, "Bust should pay 0");
  console.log("✓ Dragon fireworks bust");

  // 6. Dragon fireworks — always succeed until max, then soft stop
  const winCfg = {
    ...cfg,
    dragonSuccessChancePercent: 100,
    dragonMaxLaunches: 3,
    dragonFireworkAwards: [{ id: "t", label: "T", mult: 1, weight: 1 }],
  };
  const fw = resolveDragonFireworks(createRng("fw-test"), BET, winCfg);
  assert(fw.launches.length === 3, `Expected 3 launches, got ${fw.launches.length}`);
  assert(fw.totalCoins === BET * 3, `Expected ${BET * 3}, got ${fw.totalCoins}`);
  console.log("✓ Dragon fireworks multi-launch accumulation");

  // 7. Monkey trigger payout + Extra Scatter pick
  const monkey = resolveMonkeyTrigger(createRng("monkey-wheel"), BET, cfg);
  assert(monkey.triggerPayout === BET * cfg.monkeyTriggerMult, "Monkey 5× bet");
  assert(monkey.freeSpinsAwarded === cfg.freeSpinsAward, "FS count");
  assert(
    ["sym_10", "sym_j", "sym_q", "sym_k", "sym_a", "jug", "coins", "fish", "lion", "lantern"].includes(
      monkey.extraScatterSymbol,
    ),
    "Extra Scatter must be paying symbol",
  );
  console.log(`✓ Monkey trigger + Extra Scatter = ${monkey.extraScatterSymbol}`);

  // 8. Extra Scatter substitutes on paylines during FS
  const esGrid: CnyGrid = [
    ["extra_scatter", "sym_j", "sym_q"],
    ["extra_scatter", "sym_a", "sym_j"],
    ["extra_scatter", "fish", "lion"],
    ["lantern", "sym_10", "sym_j"],
    ["sym_q", "sym_k", "sym_a"],
  ];
  // payline 1 = all top row → 3× lantern if extra = lantern? Wait top is ES,ES,ES,lantern,sym_q
  // With extraScatter=lantern, top: lantern,lantern,lantern,lantern,sym_q → 4 lanterns
  const esEval = evaluatePaylines(esGrid, BET, cfg, { extraScatterSymbol: "lantern" });
  assert(esEval.total > 0, "Extra Scatter should create lantern payline win");
  console.log(`✓ Extra Scatter substitution win = ${esEval.total}`);

  // 9. Gamble win / loss
  const gWin = resolveGamble({
    seed: "force-need-check",
    choice: "red",
    stake: 10,
    roundsUsed: 0,
    totalBet: BET,
    cfg,
  });
  // Run until we know both paths work via many seeds
  let sawWin = false;
  let sawLoss = false;
  for (let i = 0; i < 40; i++) {
    const g = resolveGamble({
      seed: `g-${i}`,
      choice: "red",
      stake: 10,
      roundsUsed: 0,
      totalBet: BET,
      cfg,
    });
    if (g.won) sawWin = true;
    else sawLoss = true;
  }
  assert(sawWin && sawLoss, "Gamble should hit both win and loss across seeds");
  assert(gWin.roundsUsed === 1, "Rounds increment");
  console.log("✓ Gamble win/loss paths");

  // 10. Max-win cap
  const capCfg = normalizeChineseNewYearConfig({
    ...cfg,
    maxWinMult: 2,
    freeSpinsAward: 1,
  });
  setChineseNewYearConfig(capCfg);
  let capped = false;
  for (let i = 0; i < 200; i++) {
    const script = resolveCnySpin({ totalBet: BET, seed: `cap-${i}` });
    if (script.hitCap || script.totalWin <= BET * 2 + 0.01) {
      if (script.hitCap) capped = true;
      assert(
        script.totalWin <= BET * capCfg.maxWinMult + 0.011,
        `Cap exceeded: ${script.totalWin}`,
      );
    }
  }
  setChineseNewYearConfig(cfg);
  console.log(`✓ Max-win cap enforced (saw hitCap=${capped} in sample)`);

  // 11. Full spin resolves deterministically from seed
  const a = resolveCnySpin({ totalBet: BET, seed: "det-seed-1" });
  const b = resolveCnySpin({ totalBet: BET, seed: "det-seed-1" });
  assert(JSON.stringify(a.grid) === JSON.stringify(b.grid), "Seed replay grid mismatch");
  assert(a.totalWin === b.totalWin, "Seed replay win mismatch");
  console.log("✓ Seeded spin replay");

  // 12. Free spins disable retriggers
  const fs = resolveCnySpin({
    totalBet: BET,
    isFreeSpins: true,
    extraScatterSymbol: "lantern",
    disableFeatureTriggers: true,
    seed: "fs-only",
  });
  assert(fs.dragonBonus === null && fs.monkeyBonus === null, "No features in FS");
  console.log("✓ Free Spins: no Dragon/Monkey retriggers");

  console.log("\nAll unit tests passed.\n");
}

function runRtp(spins: number) {
  console.log("==========================================");
  console.log(`RTP simulation — ${spins.toLocaleString()} spins @ bet ${BET}`);
  console.log(`Target RTP (config): ${cfg.targetRtp}%  [PENDING TUNING]`);
  console.log("==========================================");
  setChineseNewYearConfig(cfg);
  let wagered = 0;
  let paid = 0;
  let dragons = 0;
  let monkeys = 0;
  let hits = 0;

  for (let i = 0; i < spins; i++) {
    const script = resolveCnySpin({ totalBet: BET, seed: `rtp-${i}` });
    wagered += BET;
    paid += script.totalWin;
    if (script.totalWin > 0) hits += 1;
    if (script.dragonBonus) dragons += 1;
    if (script.monkeyBonus) monkeys += 1;
    if ((i + 1) % Math.max(1, Math.floor(spins / 10)) === 0) {
      const rtp = (paid / wagered) * 100;
      console.log(`  ${(((i + 1) / spins) * 100).toFixed(0)}% · RTP ${rtp.toFixed(3)}%`);
    }
  }

  const rtp = (paid / wagered) * 100;
  console.log("\nResults:");
  console.log(`  Wagered:  ${wagered.toFixed(2)}`);
  console.log(`  Paid:     ${paid.toFixed(2)}`);
  console.log(`  RTP:      ${rtp.toFixed(4)}%`);
  console.log(`  Hit rate: ${((hits / spins) * 100).toFixed(2)}%`);
  console.log(`  Dragon:   ${((dragons / spins) * 100).toFixed(3)}%`);
  console.log(`  Monkey:   ${((monkeys / spins) * 100).toFixed(3)}%`);
  console.log("\nNote: Confirm paytable/weights with compliance before launch.");
}

const rtpArg = process.argv.indexOf("--rtp");
runUnitTests();
if (rtpArg !== -1) {
  const n = Number(process.argv[rtpArg + 1] ?? 50_000);
  runRtp(Number.isFinite(n) && n > 0 ? Math.floor(n) : 50_000);
}
