/**
 * Fortune Gems — regression tests + optional RTP simulation.
 * Run: npx tsx scripts/test-fortune-gems.ts
 * RTP:  npx tsx scripts/test-fortune-gems.ts --rtp 1000000
 *
 * PENDING DESIGN CONFIRMATION (documented in fortune-gems-config.ts):
 * paytable, payline paths, EX odds, RTP target, max-win 375×.
 */
import {
  DEFAULT_FORTUNE_GEMS_CONFIG,
  normalizeFortuneGemsConfig,
  spinStake,
  activeMultiplierStrip,
  FG_MULTIPLIER_VALUES,
  type FgRtpProfileId,
} from "../src/lib/fortune-gems-config";
import { evaluatePaylines } from "../src/components/maxhigh/fortune-gems/paylineEngine";
import {
  applyMultiplier,
  generateMultiplierReel,
} from "../src/components/maxhigh/fortune-gems/multiplierReel";
import { resolveFortuneGemsSpin } from "../src/components/maxhigh/fortune-gems/spinResolver";
import { setFortuneGemsConfig } from "../src/components/maxhigh/fortune-gems/runtimeConfig";
import { generateGrid } from "../src/components/maxhigh/fortune-gems/reelGenerator";
import { createRng } from "../src/components/maxhigh/fortune-gems/rng";
import type { FgGrid } from "../src/components/maxhigh/fortune-gems/types";

setFortuneGemsConfig(DEFAULT_FORTUNE_GEMS_CONFIG);
const cfg = DEFAULT_FORTUNE_GEMS_CONFIG;
const BET = 10; // 5 lines × 2 bet-per-line

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function runUnitTests() {
  console.log("==========================================");
  console.log("Fortune Gems — unit / regression tests");
  console.log("==========================================");

  // --- Section 1: config + grid ---
  const normalized = normalizeFortuneGemsConfig(null);
  assert(normalized.reelsCount === 3 && normalized.rowsCount === 3, "Grid size 3×3");
  assert(normalized.paylineCount === 5, "5 paylines");
  assert(normalized.maxWinMult === 375, "maxWinMult provisional 375 (unconfirmed)");
  assert(normalized.activeRtpProfile === "rtp_97", "default RTP profile placeholder");
  assert(normalized.exBetMult === 1.5, "EX +50%");
  assert(normalized.paylines.length === 5, "payline map length");
  assert(normalized.symbols.some((s) => s.wild), "Wild present");

  const rng = createRng("fg-grid-test");
  const g = generateGrid(rng, cfg);
  assert(g.length === 3 && g.every((c) => c.length === 3), "generateGrid 3×3");
  console.log("✓ Section 1: Config + grid generator");

  // --- Section 2: paylines ---
  const dead: FgGrid = [
    ["ruby", "emerald", "sapphire"],
    ["amethyst", "topaz", "temple"],
    ["ruby", "emerald", "sapphire"],
  ];
  const deadEval = evaluatePaylines(dead, BET, cfg);
  assert(deadEval.total === 0, `Expected no-win, got ${deadEval.total}`);
  console.log("✓ No-win payline eval");

  // Mid-line 3× Ruby only (stagger top/bottom so other lines miss)
  const rubyLine: FgGrid = [
    ["temple", "ruby", "sapphire"],
    ["amethyst", "ruby", "topaz"],
    ["emerald", "ruby", "temple"],
  ];
  const rubyEval = evaluatePaylines(rubyLine, BET, cfg);
  const rubyPay = cfg.symbols.find((s) => s.kind === "ruby")!.pay;
  const bpl = BET / cfg.paylineCount;
  assert(rubyEval.wins.length === 1, `Expected single mid-line win, got ${rubyEval.wins.length}`);
  const midLine = rubyEval.wins.find((w) => w.lineIndex === 0);
  assert(!!midLine, "Expected win on payline 0");
  assert(
    Math.abs(midLine!.payout - rubyPay * bpl) < 0.01,
    `Ruby mid-line expected ${rubyPay * bpl}, got ${midLine!.payout}`,
  );
  console.log(`✓ Payline Ruby 3-oak = ${midLine!.payout}`);

  // Stake scaling at multiple levels
  for (const stake of [1, 10, 50]) {
    const ev = evaluatePaylines(rubyLine, stake, cfg);
    const win = ev.wins.find((w) => w.lineIndex === 0);
    assert(!!win && win.count === 3, `3-oak at stake ${stake}`);
    const expected = rubyPay * (stake / cfg.paylineCount);
    assert(Math.abs(win!.payout - expected) < 0.01, `3-oak payout stake ${stake}`);
  }
  console.log("✓ 3-oak scales with stake");

  // Wild substitution: W W ruby on mid
  const wildSub: FgGrid = [
    ["temple", "wild", "sapphire"],
    ["amethyst", "wild", "topaz"],
    ["emerald", "ruby", "temple"],
  ];
  const wildSubEval = evaluatePaylines(wildSub, BET, cfg);
  const ws = wildSubEval.wins.find((w) => w.lineIndex === 0);
  assert(!!ws && ws.symbol === "ruby" && ws.count === 3, "Wild substitutes for Ruby");
  console.log("✓ Wild substitution");

  // All-Wild mid line pays Wild
  const allWildMid: FgGrid = [
    ["temple", "wild", "sapphire"],
    ["amethyst", "wild", "topaz"],
    ["emerald", "wild", "temple"],
  ];
  const allWildEval = evaluatePaylines(allWildMid, BET, cfg);
  const wildLine = allWildEval.wins.find((w) => w.lineIndex === 0);
  const wildPay = cfg.symbols.find((s) => s.kind === "wild")!.pay;
  assert(!!wildLine && wildLine.symbol === "wild", "All-wild line pays wild");
  assert(
    Math.abs(wildLine!.payout - wildPay * bpl) < 0.01,
    `Wild 3-oak expected ${wildPay * bpl}, got ${wildLine!.payout}`,
  );
  console.log(`✓ All-Wild 3-oak = ${wildLine!.payout}`);

  // Diagonals
  const diag: FgGrid = [
    ["emerald", "temple", "topaz"],
    ["temple", "emerald", "topaz"],
    ["topaz", "temple", "emerald"],
  ];
  const diagEval = evaluatePaylines(diag, BET, cfg);
  assert(
    diagEval.wins.some((w) => w.lineIndex === 3 && w.symbol === "emerald"),
    "Diagonal TL→BR emerald win",
  );
  console.log("✓ Section 2: Payline evaluation");

  // --- Section 3: multiplier reel ---
  for (const mult of FG_MULTIPLIER_VALUES) {
    const applied = applyMultiplier(100, mult);
    assert(applied === +(100 * mult).toFixed(2), `apply ${mult}x`);
  }
  assert(applyMultiplier(0, 15) === 0, "multiplier on zero win = 0");

  for (const mult of FG_MULTIPLIER_VALUES) {
    const script = resolveFortuneGemsSpin({
      totalBet: BET,
      baseBet: BET,
      seed: `mult-${mult}`,
      grid: rubyLine,
      multiplierReel: { faces: [2, mult, 3], center: mult },
    });
    const expected = +(rubyPay * bpl * mult).toFixed(2);
    const capped = Math.min(expected, BET * cfg.maxWinMult);
    assert(
      Math.abs(script.totalWin - capped) < 0.01,
      `Ruby × ${mult}x expected ~${capped}, got ${script.totalWin}`,
    );
  }
  console.log("✓ Section 3: Multiplier reel application (1×–15×)");

  // --- Section 4: EX mode ---
  assert(spinStake(10, false, cfg) === 10, "base stake unchanged");
  assert(spinStake(10, true, cfg) === 15, "EX stake +50%");
  assert(spinStake(0.1, true, cfg) === 0.15, "EX min bet uplift");

  const exStrip = activeMultiplierStrip(cfg, true);
  assert(exStrip.weights["1"] === 0, "EX strip: 1x weight is 0 (working default)");

  // EX mode never lands 1x over many draws
  const exRng = createRng("fg-ex-never-1x");
  for (let i = 0; i < 5000; i++) {
    const reel = generateMultiplierReel(exRng, cfg, true);
    assert(reel.center !== 1, `EX mode produced 1x at draw ${i}`);
  }
  console.log("✓ Section 4: EX mode stake + never 1× (5000 draws)");

  // Base mode can produce 1x
  let sawOne = false;
  const baseRng = createRng("fg-base-has-1x");
  for (let i = 0; i < 5000; i++) {
    const reel = generateMultiplierReel(baseRng, cfg, false);
    if (reel.center === 1) {
      sawOne = true;
      break;
    }
  }
  assert(sawOne, "Base mode should be able to land 1x");
  console.log("✓ Base mode can land 1×");

  // --- Section 5: max-win cap ---
  // Force huge win: all 5 lines wild + 15x
  const allWild: FgGrid = [
    ["wild", "wild", "wild"],
    ["wild", "wild", "wild"],
    ["wild", "wild", "wild"],
  ];
  const capScript = resolveFortuneGemsSpin({
    totalBet: BET,
    baseBet: BET,
    seed: "cap-test",
    grid: allWild,
    multiplierReel: { faces: [15, 15, 15], center: 15 },
  });
  assert(capScript.hitCap === true || capScript.rawTotalWin <= BET * 375, "cap logic ran");
  assert(capScript.totalWin <= +(BET * cfg.maxWinMult).toFixed(2) + 0.001, "totalWin ≤ 375×");
  if (capScript.rawTotalWin > BET * cfg.maxWinMult) {
    assert(capScript.hitCap, "hitCap when raw exceeds max");
    assert(Math.abs(capScript.totalWin - BET * cfg.maxWinMult) < 0.01, "capped at 375×");
  }
  console.log(
    `✓ Section 5: Max-win cap (raw ${capScript.rawTotalWin}, total ${capScript.totalWin}, hitCap=${capScript.hitCap})`,
  );

  // Full resolve audit fields
  const full = resolveFortuneGemsSpin({
    totalBet: 15,
    baseBet: 10,
    exMode: true,
    seed: "fg-audit-1",
  });
  assert(full.seed === "fg-audit-1", "seed logged");
  assert(full.exMode === true, "exMode flag");
  assert(full.baseBet === 10 && full.totalBet === 15, "base vs total bet");
  assert(full.grid.length === 3, "grid present");
  assert(FG_MULTIPLIER_VALUES.includes(full.multiplierReel.center as (typeof FG_MULTIPLIER_VALUES)[number]), "valid mult");
  assert(typeof full.totalWin === "number", "totalWin");
  console.log("✓ Spin script audit fields");

  console.log("\nAll unit tests passed.\n");
}

function runRtpSim(spins: number) {
  console.log("==========================================");
  console.log(`Fortune Gems — RTP simulation (${spins.toLocaleString()} spins)`);
  console.log("TODO/config-pending — RTP targets are placeholders (97 / 96.65 / 95.22)");
  console.log("==========================================");

  const profiles: FgRtpProfileId[] = ["rtp_97", "rtp_96_65", "rtp_95_22"];
  const stake = 10;

  for (const profileId of profiles) {
    const base = structuredClone(DEFAULT_FORTUNE_GEMS_CONFIG);
    base.activeRtpProfile = profileId;
    const profile = base.rtpProfiles.find((p) => p.id === profileId)!;
    base.targetRtp = profile.targetRtp;
    setFortuneGemsConfig(base);

    for (const exMode of [false, true]) {
      let wagered = 0;
      let paid = 0;
      let hits = 0;
      let caps = 0;
      const multHist: Record<number, number> = {};
      for (const v of FG_MULTIPLIER_VALUES) multHist[v] = 0;

      for (let i = 0; i < spins; i++) {
        const cost = spinStake(stake, exMode, base);
        const script = resolveFortuneGemsSpin({
          totalBet: cost,
          baseBet: stake,
          exMode,
          seed: `fg-rtp-${profileId}-${exMode ? "ex" : "base"}-${i}`,
        });
        wagered += cost;
        paid += script.totalWin;
        if (script.totalWin > 0) hits++;
        if (script.hitCap) caps++;
        multHist[script.multiplierReel.center] =
          (multHist[script.multiplierReel.center] ?? 0) + 1;
      }

      const rtp = wagered > 0 ? (paid / wagered) * 100 : 0;
      const hitRate = (hits / spins) * 100;
      console.log(
        `\n[${profileId}] ${exMode ? "EX" : "BASE"}  target=${profile.targetRtp}%`,
      );
      console.log(
        `  RTP=${rtp.toFixed(3)}%  hitRate=${hitRate.toFixed(2)}%  caps=${caps}`,
      );
      console.log(
        `  mult hist: ${FG_MULTIPLIER_VALUES.map((v) => `${v}x=${((multHist[v] / spins) * 100).toFixed(1)}%`).join("  ")}`,
      );
      if (exMode) {
        assert(multHist[1] === 0, "EX sim must never land 1x");
      }
    }
  }
  console.log("\nRTP simulation complete.\n");
}

const rtpArg = process.argv.indexOf("--rtp");
const rtpSpins =
  rtpArg >= 0 ? Math.max(1_000, Number(process.argv[rtpArg + 1]) || 100_000) : 0;

runUnitTests();
if (rtpSpins > 0) {
  runRtpSim(rtpSpins);
} else {
  console.log("Tip: run with --rtp 1000000 for Monte Carlo RTP (base + EX per profile).");
}
