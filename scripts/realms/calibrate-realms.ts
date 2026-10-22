/**
 * Calibrate the 50 Realms titles and write src/lib/realms/calibration.ts.
 *
 * For each title:
 *   1. scatter weight → hits the volatility profile's trigger rate
 *   2. pay scale      → round RTP lands on TARGET_RTP
 *   3. buy price      → Buy Bonus returns TARGET_RTP of its price
 *   4. ante boost     → Ante spins (1.25× bet) return TARGET_RTP of their price
 *
 * RTP is split as base + scatter cash + triggerRate × featureValue; base and
 * feature value scale linearly with the pay table, scatter cash does not.
 * Seeded RNG keeps the output deterministic.
 *
 *   npx tsx scripts/realms/calibrate-realms.ts --shard 0/4   (writes a shard JSON)
 *   npx tsx scripts/realms/calibrate-realms.ts --merge 4     (writes calibration.ts)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REALMS_GAMES, type RealmsGameDef } from "../../src/lib/realms/catalog";
import {
  ANTE_BET_MULT,
  PROFILES,
  TARGET_RTP,
  buildRealmsDefaults,
  scatterWeightForRate,
  solveScatterWeight,
  triggerProbability,
  type RealmsTuning,
} from "../../src/lib/realms/defaults";
import { remainingFreeSpinsAfterSpin, type RealmsConfig } from "../../src/lib/realms/schema";
import { finalizeFreeSpinTotal } from "../../src/components/maxhigh/realms/engine/multiplierEngine";
import { buildBoard } from "../../src/components/maxhigh/realms/engine/gridState";
import { scatterCashPay } from "../../src/components/maxhigh/realms/engine/paytable";
import { resolveSpin } from "../../src/components/maxhigh/realms/engine/spinResolver";
import { createEngineCtx } from "../../src/components/maxhigh/realms/engine/types";
import { mulberry32 } from "../realms-sim";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SHARD_DIR = path.join(os.tmpdir(), "realms-calibration");
const OUT = path.join(ROOT, "src/lib/realms/calibration.ts");

const BASE_SPINS = 160_000;
const BOARDS = 1_200_000;
const FEATURES = 8_000;

/**
 * Scatters never spawn during tumbles, so a spin's scatter count (and with it
 * the free-spin trigger and scatter cash) is decided by its opening board.
 * Sampling opening boards alone is cheap, so these two rates get a far larger
 * sample than full spins could.
 */
function measureScatters(cfg: RealmsConfig, def: RealmsGameDef, ante: boolean, seed: number) {
  const rng = mulberry32(seed);
  const ctx = createEngineCtx(cfg, def.board, rng);
  let triggers = 0;
  let cash = 0;
  for (let i = 0; i < BOARDS; i++) {
    let scatters = 0;
    for (const cell of buildBoard(ctx, ante, false, true)) if (cell.sym.scatter) scatters += 1;
    if (scatters >= cfg.freeSpinsTriggerCount) triggers += 1;
    cash += scatterCashPay(cfg, scatters, 1);
  }
  return { triggerRate: triggers / BOARDS, cash: cash / BOARDS };
}

/** Average tumble win per paid spin at bet 1 (scatter cash excluded). */
function measureTumbleWins(
  cfg: RealmsConfig,
  def: RealmsGameDef,
  ante: boolean,
  seed: number,
): number {
  const ctx = createEngineCtx(cfg, def.board, mulberry32(seed));
  let base = 0;
  for (let i = 0; i < BASE_SPINS; i++) {
    const s = resolveSpin(ctx, {
      bet: 1,
      ante,
      isFreeSpins: false,
    });
    base += s.totalWin - s.scatterPay;
  }
  return base / BASE_SPINS;
}

/** Average paid amount of one feature of `spins` free spins at bet 1. */
function measureFeature(
  cfg: RealmsConfig,
  def: RealmsGameDef,
  spins: number,
  seed: number,
): number {
  const rng = mulberry32(seed);
  let total = 0;
  for (let f = 0; f < FEATURES; f++) {
    const ctx = createEngineCtx(cfg, def.board, rng);
    let left = spins;
    let played = 0;
    let win = 0;
    let bomb = 0;
    while (left > 0) {
      const s = resolveSpin(ctx, {
        bet: 1,
        ante: false,
        isFreeSpins: true,
        initialBombAccumulator: bomb,
      });
      win = +(win + s.totalWin).toFixed(2);
      bomb = s.bombAccumulator;
      played += 1;
      left = remainingFreeSpinsAfterSpin({
        leftBefore: left,
        retrigger: s.retriggerSpins,
        playedAfter: played,
        maxSessionSpins: cfg.maxFsSessionSpins,
      });
    }
    total += Math.min(
      finalizeFreeSpinTotal(cfg, win, bomb),
      cfg.maxWinMult > 0 ? cfg.maxWinMult : Infinity,
    );
  }
  return total / FEATURES;
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}

function calibrate(def: RealmsGameDef) {
  const t0 = Date.now();
  const seed = def.no * 7919;
  const target = PROFILES[def.volatility].triggerEvery;
  let tuning: RealmsTuning = {
    payScale: 1,
    scatterWeight: solveScatterWeight(def),
    buyFeatureMult: 1,
    anteScatterWeightMult: 1,
  };

  // 1. Scatter weight: secant search on the board-sampled trigger rate.
  const rateFor = (weight: number, ante: boolean, mult: number, salt: number) =>
    measureScatters(
      buildRealmsDefaults(def, { ...tuning, scatterWeight: weight, anteScatterWeightMult: mult }),
      def,
      ante,
      seed + salt,
    );
  const wantRate = 1 / target;
  let w0 = tuning.scatterWeight;
  let r0 = rateFor(w0, false, 1, 1).triggerRate;
  let w1 = w0 * (wantRate / Math.max(r0, 1e-6)) ** 0.35;
  let r1 = rateFor(w1, false, 1, 2).triggerRate;
  for (let pass = 0; pass < 6 && Math.abs(r1 - wantRate) / wantRate > 0.01; pass++) {
    const next = Math.max(0.01, w1 + ((wantRate - r1) * (w1 - w0)) / (r1 - r0 || 1e-9));
    [w0, r0, w1] = [w1, r1, next];
    r1 = rateFor(w1, false, 1, 3 + pass).triggerRate;
  }
  tuning = { ...tuning, scatterWeight: +w1.toFixed(3) };
  const scat = rateFor(tuning.scatterWeight, false, 1, 20);

  // 2. Pay scale: tumble wins and feature value are linear in it, scatter cash is not.
  const cfg1 = buildRealmsDefaults(def, tuning);
  const tumble1 = measureTumbleWins(cfg1, def, false, seed + 30);
  const feature1 = measureFeature(cfg1, def, def.freeSpins, seed + 11);
  const scalable = tumble1 + scat.triggerRate * feature1;
  const payScale = +((TARGET_RTP - scat.cash) / scalable).toFixed(4);
  tuning = { ...tuning, payScale };

  // 3. Buy price: one unit = one free spin, priced at the feature's value per spin.
  const cfg2 = buildRealmsDefaults(def, tuning);
  const feature2 = measureFeature(cfg2, def, def.freeSpins, seed + 23);
  tuning = {
    ...tuning,
    buyFeatureMult: +roundTo(feature2 / def.freeSpins / TARGET_RTP, 0.05).toFixed(2),
  };

  // 4. Ante boost (bet × 1.25): secant search so ante spins return TARGET_RTP.
  //    Value(m) = tumble wins + scatter cash(m) + triggerRate(m) × feature value.
  const want = ANTE_BET_MULT * TARGET_RTP;
  const tumbleAnte = measureTumbleWins(cfg2, def, true, seed + 40);
  const anteValueAt = (mult: number, salt: number) => {
    const r = rateFor(tuning.scatterWeight, true, mult, salt);
    return tumbleAnte + r.cash + r.triggerRate * feature2;
  };
  const modelBias = scat.triggerRate / triggerProbability(def, tuning.scatterWeight);
  const startRate =
    scat.triggerRate +
    (want - (payScale * tumble1 + scat.cash + scat.triggerRate * feature2)) / feature2;
  let m0 = 1;
  let v0 = anteValueAt(m0, 50);
  let m1 = Math.min(
    10,
    Math.max(
      1.01,
      scatterWeightForRate(def, Math.max(scat.triggerRate, startRate) / modelBias) /
        tuning.scatterWeight,
    ),
  );
  let v1 = anteValueAt(m1, 51);
  for (let pass = 0; pass < 8 && Math.abs(v1 - want) / want > 0.0025; pass++) {
    const next = Math.min(10, Math.max(1, m1 + ((want - v1) * (m1 - m0)) / (v1 - v0 || 1e-9)));
    [m0, v0, m1] = [m1, v1, next];
    v1 = anteValueAt(m1, 52 + pass);
  }
  tuning = { ...tuning, anteScatterWeightMult: +m1.toFixed(3) };
  const anteValue = v1;

  const predicted = scat.cash + payScale * scalable;
  console.log(
    `${String(def.no).padStart(2)} ${def.id.padEnd(22)} trig 1/${(1 / scat.triggerRate).toFixed(0)} ` +
      `scale ${payScale} buy ${tuning.buyFeatureMult}× anteBoost ${tuning.anteScatterWeightMult}× ` +
      `rtp≈${(predicted * 100).toFixed(2)}% anteRtp≈${((anteValue / ANTE_BET_MULT) * 100).toFixed(2)}% ` +
      `(${((Date.now() - t0) / 1000).toFixed(0)}s)`,
  );
  return [def.id, tuning] as const;
}

function writeCalibration(entries: [string, RealmsTuning][]) {
  const byId = new Map(entries);
  const lines = REALMS_GAMES.map((g) => {
    const t = byId.get(g.id);
    if (!t) throw new Error(`missing calibration for ${g.id}`);
    return `  "${g.id}": { payScale: ${t.payScale}, scatterWeight: ${t.scatterWeight}, buyFeatureMult: ${t.buyFeatureMult}, anteScatterWeightMult: ${t.anteScatterWeightMult} },`;
  });
  const src = `/**
 * GENERATED by scripts/realms/calibrate-realms.ts — do not edit by hand.
 * Re-run the script after changing a title's board, volatility or profile.
 */
import type { RealmsTuning } from "./defaults";

export const REALMS_TUNING: Record<string, RealmsTuning> = {
${lines.join("\n")}
};
`;
  fs.writeFileSync(OUT, src);
  console.log(`wrote ${path.relative(ROOT, OUT)} (${lines.length} titles)`);
}

const args = process.argv.slice(2);
const shardArg = args[args.indexOf("--shard") + 1];
const mergeArg = args[args.indexOf("--merge") + 1];

if (args.includes("--shard") && shardArg) {
  const [i, n] = shardArg.split("/").map(Number);
  const mine = REALMS_GAMES.filter((g) => (g.no - 1) % n === i);
  const results = mine.map(calibrate);
  fs.mkdirSync(SHARD_DIR, { recursive: true });
  fs.writeFileSync(path.join(SHARD_DIR, `shard-${i}.json`), JSON.stringify(results));
} else if (args.includes("--merge") && mergeArg) {
  const n = Number(mergeArg);
  const all: [string, RealmsTuning][] = [];
  for (let i = 0; i < n; i++) {
    all.push(
      ...(JSON.parse(fs.readFileSync(path.join(SHARD_DIR, `shard-${i}.json`), "utf8")) as [
        string,
        RealmsTuning,
      ][]),
    );
  }
  writeCalibration(all);
} else {
  writeCalibration(REALMS_GAMES.map(calibrate) as [string, RealmsTuning][]);
}
