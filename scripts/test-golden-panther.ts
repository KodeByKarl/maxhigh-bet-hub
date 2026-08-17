/**
 * Panther Peak — paytable, pool-cap, and RTP checks.
 *
 * Run:
 *   npx tsx scripts/test-golden-panther.ts
 *   npx tsx scripts/test-golden-panther.ts --rtp   # 25k rounds per stake
 */
import {
  DEFAULT_GOLDEN_PANTHER_CONFIG,
  GOLDEN_PANTHER_GAME_ID,
  normalizeGoldenPantherConfig,
  remainingFreeSpinsAfterSpin,
} from "../src/lib/golden-panther-config";
import { ANIM } from "../src/components/maxhigh/golden-panther/animationConfig";
import { payForCount } from "../src/components/maxhigh/golden-panther/paytable";
import { finalizeFreeSpinTotal, resolveSpin } from "../src/components/maxhigh/golden-panther/spinResolver";
import { setGoldenPantherConfig, getRuntimeSymbols } from "../src/components/maxhigh/golden-panther/runtimeConfig";
import { enforcePoolCap } from "../src/server/settlement/enforcePoolCap";

setGoldenPantherConfig(DEFAULT_GOLDEN_PANTHER_CONFIG);
const cfg = DEFAULT_GOLDEN_PANTHER_CONFIG;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function almost(a: number, b: number, eps = 0.001) {
  return Math.abs(a - b) < eps;
}

function capWin(bet: number, computed: number, context: string) {
  return enforcePoolCap({
    gameId: GOLDEN_PANTHER_GAME_ID,
    gameName: "Panther Peak",
    bet,
    maxWinMult: cfg.maxWinMult,
    computedWin: computed,
    context,
  });
}

function playRound(bet: number) {
  const paid = resolveSpin({
    bet,
    ante: false,
    isFreeSpins: false,
    collectBombsInFreeSpins: true,
  });
  const baseCap = capWin(bet, paid.totalWin, "sim-paid");
  let total = baseCap.payout;
  let fsPay = 0;
  let clamped = baseCap.clamped;
  let preClampFs = 0;
  let bombAcc = 0;
  let fsRounds = 0;
  if (paid.freeSpinsAwarded > 0) {
    fsRounds = 1;
    let left = paid.freeSpinsAwarded;
    let fsWin = 0;
    let bomb = 0;
    let played = 0;
    let guard = 0;
    while (left > 0 && guard++ < 80) {
      const fs = resolveSpin({
        bet,
        ante: false,
        isFreeSpins: true,
        collectBombsInFreeSpins: true,
        initialBombAccumulator: bomb,
      });
      fsWin += fs.totalWin;
      bomb = fs.bombAccumulator;
      played += 1;
      left = remainingFreeSpinsAfterSpin({
        leftBefore: left,
        retrigger: fs.retriggerSpins,
        playedAfter: played,
        maxSessionSpins: cfg.maxFsSessionSpins,
      });
    }
    bombAcc = bomb;
    preClampFs = finalizeFreeSpinTotal(fsWin, bomb);
    const fsCap = capWin(bet, preClampFs, "sim-fs-final");
    fsPay = fsCap.payout;
    total += fsPay;
    clamped = clamped || fsCap.clamped;
  }
  return {
    total: +total.toFixed(2),
    base: baseCap.payout,
    fsPay,
    paid,
    clamped,
    preClampFs,
    bombAcc,
    fsRounds,
  };
}

function runUnitTests() {
  console.log("==========================================");
  console.log("Panther Peak — unit / regression");
  console.log("==========================================");

  const normalized = normalizeGoldenPantherConfig(null);
  assert(normalized.maxWinMult === 10_000, "default maxWinMult 10000");
  assert(normalized.maxFsBombMult === 20, "default FS bomb ceiling 20");
  assert(normalized.maxFsSessionSpins === 25, "FS session hard stop 25");
  assert(normalized.maxBaseBombSum === 2, "base tumble bomb-sum ceiling 2");
  assert(normalized.minCluster === 12, "46-cell grid uses minCluster 12");
  assert(normalized.bombChanceFreeSpinsPercent === 3, "FS bomb chance 3%");
  assert(normalized.freeSpinsRetriggerCount === 4, "retrigger needs 4 scatters on 46-cell grid");
  const scatter = normalized.symbols.find((s) => s.scatter)!;
  assert(scatter.weight <= 1.6, `scatter weight ${scatter.weight} too high for 46 cells`);
  assert(ANIM.glowDuration >= 10_000, `glowDuration ${ANIM.glowDuration} must be ≥ 10s`);

  const pays = getRuntimeSymbols().filter((s) => !s.scatter && !s.bomb);
  const low = ["grape", "plum", "melon", "apple", "blue"] as const;
  const expectedLow: Record<(typeof low)[number], number> = {
    grape: 0.2,
    plum: 0.35,
    melon: 0.5,
    apple: 0.65,
    blue: 0.8,
  };
  const seen = new Set<number>();
  for (const id of low) {
    const sym = pays.find((s) => s.id === id)!;
    assert(almost(sym.pay[0], expectedLow[id]), `${id} min-cluster multiplier`);
    const peso = +(1 * payForCount(sym, cfg.minCluster)).toFixed(2);
    assert(almost(peso, expectedLow[id]), `₱1 ${id} win ${peso}`);
    seen.add(peso);
  }
  assert(seen.size === 5, `expected 5 distinct ₱1 cent wins, got ${[...seen]}`);

  const ram = pays.find((s) => s.id === "heart")!;
  assert(ram.pay[2] >= 500, "Ram top-tier cluster is 500×");
  const wolf = pays.find((s) => s.id === "purple")!;
  assert(wolf.pay[2] >= 150, "Wolf top-tier cluster is 150×");
  console.log("✓ Fixed multipliers + distinct sub-1x tiers (0.20 / 0.35 / 0.50 / 0.65 / 0.80)");

  // Incident: ₱5 vs 50k cap, 90k computed
  const incident = enforcePoolCap({
    gameId: GOLDEN_PANTHER_GAME_ID,
    bet: 5,
    maxWinMult: cfg.maxWinMult,
    computedWin: 90_000,
    context: "incident",
  });
  assert(almost(incident.payout, 50_000), `incident payout ${incident.payout}`);
  assert(incident.clamped, "incident must clamp");
  console.log("✓ ₱5 / 50k pool / 90k computed → clamped to ₱50,000");

  // Engine + helper: tiny cap forces clamp on a real spin if it wins big
  setGoldenPantherConfig({ ...DEFAULT_GOLDEN_PANTHER_CONFIG, maxWinMult: 2 });
  for (let i = 0; i < 400; i++) {
    const script = resolveSpin({ bet: 5, ante: false, isFreeSpins: false });
    const capped = enforcePoolCap({
      gameId: GOLDEN_PANTHER_GAME_ID,
      bet: 5,
      maxWinMult: 2,
      computedWin: script.totalWin,
      context: "tiny-cap",
    }).payout;
    assert(capped <= 10.001, `tiny cap breached ${capped}`);
    assert(script.totalWin <= 10.001, `spinResolver totalWin ${script.totalWin} above 2×`);
  }
  setGoldenPantherConfig(DEFAULT_GOLDEN_PANTHER_CONFIG);
  console.log("✓ Engine + settle helper respect a 2× cap on ₱5");

  const ceilingPay = finalizeFreeSpinTotal(10, 9_999);
  assert(almost(ceilingPay, 200), `FS bomb ceiling 20× → ₱${ceilingPay}, expected ₱200`);
  const underCeil = finalizeFreeSpinTotal(10, 8);
  assert(almost(underCeil, 80), `under-ceiling FS multiply ${underCeil}`);
  console.log("✓ FS bomb accumulator ceilings at 20× before pool cap");

  // Inflated stored pays migrate to the new table
  const migrated = normalizeGoldenPantherConfig({
    symbols: [{ id: "grape", pay: [1, 3, 8] }],
  });
  assert(almost(migrated.symbols[0].pay[0], 0.2), "legacy inflated grape pay migrates");
  console.log("✓ Stored inflated paytable migrates to current multipliers");
}

function runRtp(roundsPerStake: number) {
  console.log("\n==========================================");
  console.log(`RTP sim — ${roundsPerStake.toLocaleString()} rounds × 4 stakes`);
  console.log("==========================================");

  const stakes = [1, 5, 20, 100];
  const rtps: number[] = [];
  const cap = cfg.maxWinMult;
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("POOL_CAP_CLAMP")) return;
    origError.apply(console, args as []);
  };

  try {
    for (const bet of stakes) {
      let wagered = 0;
      let returned = 0;
      let maxPay = 0;
      let clampCount = 0;
      const peso1Wins = new Set<string>();
      let wins = 0;
      const preClampXs: number[] = [];
      const bombAccs: number[] = [];
      let fsFeatures = 0;

      for (let i = 0; i < roundsPerStake; i++) {
        wagered += bet;
        const round = playRound(bet);
        returned += round.total;
        if (round.total > maxPay) maxPay = round.total;
        if (round.clamped) clampCount++;
        if (round.fsRounds) {
          fsFeatures++;
          preClampXs.push(round.preClampFs / bet);
          bombAccs.push(round.bombAcc);
        }
        assert(round.base <= bet * cap + 0.01, `base exceeded cap: ${round.base}`);
        assert(round.fsPay <= bet * cap + 0.01, `FS exceeded cap: ${round.fsPay}`);
        if (round.total > 0) {
          wins++;
          if (bet === 1) {
            for (const step of round.paid.steps) {
              for (const c of step.clusters) {
                if (c.pay > 0 && c.pay < 2) peso1Wins.add(c.pay.toFixed(2));
              }
            }
          }
        }
      }

      const rtp = (returned / wagered) * 100;
      rtps.push(rtp);
      const clampPct = (clampCount / roundsPerStake) * 100;
      preClampXs.sort((a, b) => a - b);
      bombAccs.sort((a, b) => a - b);
      const pct = (arr: number[], p: number) =>
        arr.length ? arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0;
      console.log(
        `  ₱${bet.toFixed(0).padStart(3)}  RTP ${rtp.toFixed(2)}%  hit ${(
          (wins / roundsPerStake) *
          100
        ).toFixed(1)}%  max ₱${maxPay.toFixed(2)} (${(maxPay / bet).toFixed(1)}×)  clamp ${clampPct.toFixed(2)}%`,
      );
      if (fsFeatures > 0) {
        console.log(
          `       FS pre-clamp ×bet  p50=${pct(preClampXs, 50).toFixed(1)}  p95=${pct(preClampXs, 95).toFixed(1)}  max=${pct(preClampXs, 100).toFixed(1)}  bombAcc p50=${pct(bombAccs, 50).toFixed(0)} p95=${pct(bombAccs, 95).toFixed(0)} max=${pct(bombAccs, 100).toFixed(0)}  features ${fsFeatures}`,
        );
      }
      assert(clampPct < 8, `pool-cap should be rare, got ${clampPct.toFixed(2)}%`);
      assert(rtp > 70 && rtp < 130, `RTP should be near ~96% design, got ${rtp.toFixed(2)}%`);
      const fsRate = (fsFeatures / roundsPerStake) * 100;
      assert(fsRate < 15, `FS trigger should be uncommon, got ${fsRate.toFixed(1)}%`);
      if (bet === 1) {
        console.log(`       ₱1 cluster cent-wins: ${[...peso1Wins].sort().join(", ") || "(none this sample)"}`);
        assert(
          peso1Wins.size >= 3,
          `₱1 clusters should show ≥3 distinct cent wins, got ${[...peso1Wins]}`,
        );
      }
    }
  } finally {
    console.error = origError;
  }

  const spread = Math.max(...rtps) - Math.min(...rtps);
  const relative = (spread / Math.min(...rtps)) * 100;
  console.log(`  RTP spread across stakes: ${spread.toFixed(2)} pp (${relative.toFixed(2)}% relative)`);
  assert(relative < 25, `RTP should stay consistent across bet sizes (relative ${relative.toFixed(2)}%)`);
  console.log("✓ RTP consistent across ₱1 / ₱5 / ₱20 / ₱100; no payout exceeded pool cap");
}

runUnitTests();
const rtpRounds = process.argv.includes("--rtp") ? 25_000 : 8_000;
runRtp(rtpRounds);
console.log("\nAll Panther Peak checks passed.");
