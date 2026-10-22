/**
 * Calibrate the 30 Panther titles to the RTP each one advertises.
 *
 *   npx tsx scripts/calibrate-panther.ts --shard 0/10     (one process per shard; engines use module globals)
 *   npx tsx scripts/calibrate-panther.ts --merge 10       (prints the summary, writes panther-calibration.json)
 *
 * Per title: fix broken free-spin frequency (scatter weight), scale the pay table
 * to the advertised RTP, size the Ante scatter boost so 1.25× Ante spins return
 * the same RTP, and price the Buy Bonus per quantity so every purchase does too.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { slotGames } from "../src/lib/games";
import { LOBBY_VISIBLE_GAME_IDS } from "../src/lib/playable-games";
import {
  loadPanther,
  maxWinOf,
  playFeature,
  scatterOf,
  withPayScale,
  type PantherCfg,
  type PantherGame,
} from "./panther-sim";

const ROOT = path.resolve(import.meta.dirname, "..");
const SHARD_DIR = path.join(os.tmpdir(), "panther-calibration");
const OUT = path.join(ROOT, "scripts/panther-calibration.json");

const BOARDS = 800_000;
const SPINS = 250_000;
const FEATURES = 12_000;
const TRIGGER_TARGET = 1 / 250;
const TRIGGER_OK = [1 / 400, 1 / 120] as const;

/** The RTP each title already advertises in the lobby catalog. */
function advertisedRtp(id: string): number {
  const raw = slotGames.find((g) => g.id === id)?.rtp ?? "96.5%";
  return Number(raw.replace(/[^\d.]/g, "")) / 100;
}

function withScatter(
  cfg: PantherCfg,
  weight: number,
  anteMult = cfg.anteScatterWeightMult,
): PantherCfg {
  const out = structuredClone(cfg);
  scatterOf(out).weight = weight;
  out.anteScatterWeightMult = anteMult;
  return out;
}

/** Trigger rate + scatter cash per spin, from opening boards only (scatters never spawn in tumbles). */
function scatterRates(g: PantherGame, cfg: PantherCfg, ante: boolean) {
  g.setConfig(cfg);
  let triggers = 0;
  let cash = 0;
  for (let i = 0; i < BOARDS; i++) {
    const n = g.board(ante).filter((c) => c.sym.scatter).length;
    if (n >= cfg.freeSpinsTriggerCount) triggers++;
    cash += g.scatterCash(n);
  }
  return { trigger: triggers / BOARDS, cash: cash / BOARDS };
}

/** Average tumble win per paid spin (scatter cash excluded). */
function tumbleWins(g: PantherGame, cfg: PantherCfg, ante: boolean) {
  g.setConfig(cfg);
  let sum = 0;
  const cap = maxWinOf(cfg);
  for (let i = 0; i < SPINS; i++) {
    const s = g.spin({ ante, isFreeSpins: false, acc: 0 });
    sum += Math.min(s.totalWin, cap) - s.scatterPay;
  }
  return sum / SPINS;
}

function featureValue(g: PantherGame, cfg: PantherCfg, spins: number, features = FEATURES) {
  g.setConfig(cfg);
  let sum = 0;
  for (let f = 0; f < features; f++) sum += playFeature(g, cfg, spins);
  return sum / features;
}

function metrics(g: PantherGame, cfg: PantherCfg, buyPricePerSpin: (q: number) => number) {
  const base = scatterRates(g, cfg, false);
  const tumble = tumbleWins(g, cfg, false);
  const F = featureValue(g, cfg, cfg.freeSpinsBase);
  const ante = scatterRates(g, cfg, true);
  const tumbleAnte = tumbleWins(g, cfg, true);
  const rtp = tumble + base.cash + base.trigger * F;
  const anteRtp = (tumbleAnte + ante.cash + ante.trigger * F) / cfg.anteBetMult;
  const buyRtp = (q: number) =>
    featureValue(g, cfg, q, Math.max(1500, Math.ceil(40_000 / q))) / (q * buyPricePerSpin(q));
  return {
    rtp,
    triggerEvery: 1 / base.trigger,
    anteRtp,
    buy1: buyRtp(1),
    buyStd: buyRtp(cfg.freeSpinsBase),
  };
}

const round = (n: number, step: number) => Math.round(n / step) * step;

async function calibrate(id: string) {
  const t0 = Date.now();
  const g = await loadPanther(id);
  const target = advertisedRtp(id);
  const d = g.defaults;
  const before = metrics(g, d, () => d.buyFeatureMult);

  // 1. Free-spin frequency: only titles outside a sane range are retuned.
  let cfg = structuredClone(d);
  const now = scatterRates(g, cfg, false).trigger;
  if (now < TRIGGER_OK[0] || now > TRIGGER_OK[1]) {
    let w0 = scatterOf(cfg).weight;
    let r0 = now;
    let w1 = w0 * (TRIGGER_TARGET / Math.max(r0, 1e-6)) ** 0.35;
    let r1 = scatterRates(g, withScatter(cfg, w1), false).trigger;
    for (let i = 0; i < 8 && Math.abs(r1 - TRIGGER_TARGET) / TRIGGER_TARGET > 0.03; i++) {
      const next = Math.max(0.01, w1 + ((TRIGGER_TARGET - r1) * (w1 - w0)) / (r1 - r0 || 1e-9));
      [w0, r0, w1] = [w1, r1, next];
      r1 = scatterRates(g, withScatter(cfg, w1), false).trigger;
    }
    cfg = withScatter(cfg, +w1.toFixed(3));
  }

  // 2. Pay scale to the advertised RTP (tumble wins + feature are linear in it; scatter cash is not).
  const sr = scatterRates(g, cfg, false);
  const scalable = tumbleWins(g, cfg, false) + sr.trigger * featureValue(g, cfg, cfg.freeSpinsBase);
  let payScale = (target - sr.cash) / scalable;
  // One corrective pass on fresh samples (caps and rounding make it slightly non-linear).
  const trial = withPayScale(cfg, payScale);
  const measured =
    tumbleWins(g, trial, false) + sr.trigger * featureValue(g, trial, cfg.freeSpinsBase);
  payScale *= (target - sr.cash) / measured;
  cfg = withPayScale(cfg, payScale);

  // 3. Ante boost: secant search so a 1.25× ante spin returns the target RTP.
  const F = featureValue(g, cfg, cfg.freeSpinsBase);
  const tumbleAnte = tumbleWins(g, cfg, true);
  const anteValue = (m: number) => {
    const r = scatterRates(g, withScatter(cfg, scatterOf(cfg).weight, m), true);
    return (tumbleAnte + r.cash + r.trigger * F) / cfg.anteBetMult;
  };
  let m0 = 1;
  let v0 = anteValue(m0);
  let m1 = 1.3;
  let v1 = anteValue(m1);
  for (let i = 0; i < 8 && Math.abs(v1 - target) > 0.003; i++) {
    const next = Math.min(10, Math.max(1, m1 + ((target - v1) * (m1 - m0)) / (v1 - v0 || 1e-9)));
    [m0, v0, m1] = [m1, v1, next];
    v1 = anteValue(m1);
  }
  cfg = withScatter(cfg, scatterOf(cfg).weight, +m1.toFixed(3));

  // 4. Buy price per spin for every purchasable quantity (non-decreasing).
  const maxQ =
    typeof cfg.maxFsSessionSpins === "number" && cfg.maxFsSessionSpins > 0
      ? Math.min(50, cfg.maxFsSessionSpins)
      : 50;
  const sampleQs = [1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].filter((q) => q <= maxQ);
  if (sampleQs[sampleQs.length - 1] !== maxQ) sampleQs.push(maxQ);
  const raw = sampleQs.map(
    (q) => featureValue(g, cfg, q, Math.max(4000, Math.ceil(600_000 / q))) / q,
  );
  const fit: number[] = [];
  for (const v of raw) fit.push(Math.max(v, fit[fit.length - 1] ?? 0));
  const curve: number[] = [];
  for (let q = 1; q <= maxQ; q++) {
    const j = sampleQs.findIndex((x) => x >= q);
    const v =
      sampleQs[j] === q || j === 0
        ? fit[j]!
        : fit[j - 1]! +
          ((fit[j]! - fit[j - 1]!) * (q - sampleQs[j - 1]!)) / (sampleQs[j]! - sampleQs[j - 1]!);
    curve.push(+Math.max(0.05, round(v / target, 0.05)).toFixed(2));
  }
  cfg.buyFeatureMult = curve[cfg.freeSpinsBase - 1]!;

  const after = metrics(g, cfg, (q) => curve[Math.min(curve.length, q) - 1]!);
  const result = {
    id,
    target,
    old: {
      scatterWeight: scatterOf(d).weight,
      anteScatterWeightMult: d.anteScatterWeightMult,
      buyFeatureMult: d.buyFeatureMult,
      pays: d.symbols.map((s) => s.pay),
    },
    new: {
      scatterWeight: scatterOf(cfg).weight,
      anteScatterWeightMult: cfg.anteScatterWeightMult,
      buyFeatureMult: cfg.buyFeatureMult,
      pays: cfg.symbols.map((s) => s.pay),
      buyCurve: curve,
      payScale: +payScale.toFixed(4),
    },
    before,
    after,
  };
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  console.log(
    `${id.padEnd(16)} target ${pct(target)} | RTP ${pct(before.rtp)} → ${pct(after.rtp)} | FS 1/${before.triggerEvery.toFixed(0)} → 1/${after.triggerEvery.toFixed(0)} | ` +
      `ante ${pct(before.anteRtp)} → ${pct(after.anteRtp)} | buy×1 ${pct(before.buy1)} → ${pct(after.buy1)} | buy×${d.freeSpinsBase} ${pct(before.buyStd)} → ${pct(after.buyStd)} | ` +
      `price ${d.buyFeatureMult}× → ${cfg.buyFeatureMult}× (${((Date.now() - t0) / 1000).toFixed(0)}s)`,
  );
  return result;
}

const args = process.argv.slice(2);
const ids = [...LOBBY_VISIBLE_GAME_IDS];
if (args[0] === "--shard") {
  const [i, n] = args[1]!.split("/").map(Number);
  const mine = ids.filter((_, k) => k % n! === i);
  const out = [];
  for (const id of mine) out.push(await calibrate(id));
  fs.mkdirSync(SHARD_DIR, { recursive: true });
  fs.writeFileSync(path.join(SHARD_DIR, `shard-${i}.json`), JSON.stringify(out));
} else if (args[0] === "--merge") {
  const all = [];
  for (let i = 0; i < Number(args[1]); i++)
    all.push(...JSON.parse(fs.readFileSync(path.join(SHARD_DIR, `shard-${i}.json`), "utf8")));
  all.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
  console.log(`wrote ${path.relative(ROOT, OUT)} (${all.length} titles)`);
} else {
  for (const id of args.length ? args : ids) await calibrate(id);
}
