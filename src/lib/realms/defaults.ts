/**
 * Default math per title = volatility profile + board scaling + calibration.
 *
 * Nothing here is hand-tuned per title: identity lives in ./catalog.ts and the
 * four measured numbers (pay scale, scatter weight, buy price, ante price) live
 * in the generated ./calibration.ts.
 */
import type { RealmsGameDef, RealmsVolatility } from "./catalog";
import type { RealmsConfig, RealmsSymKind, RealmsSymbolConfig } from "./schema";

export type RealmsTuning = {
  /** Multiplies the whole pay table so the title lands on the target RTP. */
  payScale: number;
  /** Scatter spawn weight relative to the pay-symbol weights. */
  scatterWeight: number;
  buyFeatureMult: number;
  /** Scatter-weight boost while Ante is on, sized so Ante spins return TARGET_RTP. */
  anteScatterWeightMult: number;
};

export const TARGET_RTP = 0.96;

/** Ante always costs 1.25× the bet; its scatter boost is calibrated instead. */
export const ANTE_BET_MULT = 1.25;

type Profile = {
  deadSpinChancePercent: number;
  bombChanceBasePercent: number;
  bombChanceFreeSpinsPercent: number;
  /** Weights for 2× / 3× / 4× / 5× */
  bombWeights: [number, number, number, number];
  freeSpinsRetrigger: number;
  /** Target paid spins per free-spin trigger (solved into scatter weight). */
  triggerEvery: number;
  /** Premium (p1–p3) pay multiplier before calibration. */
  premiumShape: number;
  /** Spawn weights for l1–l5, p1–p3. */
  weights: [number, number, number, number, number, number, number, number];
  /** Scatter cash for trigger+2 scatters (× bet). */
  topScatterCash: number;
  maxWinMult: number;
};

export const PROFILES: Record<RealmsVolatility, Profile> = {
  Medium: {
    deadSpinChancePercent: 74,
    bombChanceBasePercent: 1.2,
    bombChanceFreeSpinsPercent: 2.5,
    bombWeights: [40, 30, 20, 10],
    freeSpinsRetrigger: 4,
    triggerEvery: 170,
    premiumShape: 0.7,
    weights: [18, 16, 14, 12, 10, 9, 7, 6],
    topScatterCash: 50,
    maxWinMult: 5_000,
  },
  High: {
    deadSpinChancePercent: 80,
    bombChanceBasePercent: 1.5,
    bombChanceFreeSpinsPercent: 3,
    bombWeights: [34, 28, 22, 16],
    freeSpinsRetrigger: 3,
    triggerEvery: 240,
    premiumShape: 1,
    weights: [18, 16, 14, 12, 10, 8, 6, 5],
    topScatterCash: 100,
    maxWinMult: 10_000,
  },
  "Very High": {
    deadSpinChancePercent: 85,
    bombChanceBasePercent: 1.8,
    bombChanceFreeSpinsPercent: 3.5,
    bombWeights: [28, 26, 24, 22],
    freeSpinsRetrigger: 3,
    triggerEvery: 340,
    premiumShape: 1.4,
    weights: [18, 16, 14, 12, 10, 7, 5, 4],
    topScatterCash: 200,
    maxWinMult: 20_000,
  },
};

/** Base pay table (× bet for min / min+2 / min+4 matches) before shaping. */
const BASE_PAYS: Record<Exclude<RealmsSymKind, "scatter" | "bomb">, [number, number, number]> = {
  l1: [0.2, 0.35, 0.8],
  l2: [0.35, 0.5, 1.2],
  l3: [0.5, 0.65, 2],
  l4: [0.65, 0.8, 4],
  l5: [0.8, 2.5, 8],
  p1: [2, 10, 50],
  p2: [6, 25, 150],
  p3: [12, 80, 500],
};

export const LOW_RANK_LABELS = ["10", "J", "Q", "K", "A"] as const;

/** Matches needed to win, scaled to board size. */
export function minClusterFor(cells: number): number {
  if (cells <= 24) return 6;
  if (cells <= 30) return 7;
  if (cells <= 36) return 8;
  return 9;
}

export const FREE_SPINS_TRIGGER_COUNT = 4;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function buildRealmsDefaults(def: RealmsGameDef, tuning: RealmsTuning): RealmsConfig {
  const p = PROFILES[def.volatility];
  const cells = def.board.cols * def.board.rows;
  const minCluster = minClusterFor(cells);
  const trigger = FREE_SPINS_TRIGGER_COUNT;

  const payKinds = ["l1", "l2", "l3", "l4", "l5", "p1", "p2", "p3"] as const;
  const paySymbols: RealmsSymbolConfig[] = payKinds.map((kind, i) => {
    const shape = kind.startsWith("p") ? p.premiumShape : 1;
    const pay = BASE_PAYS[kind].map((v) => round2(v * shape * tuning.payScale)) as [
      number,
      number,
      number,
    ];
    const label = i < 5 ? LOW_RANK_LABELS[i] : def.premiums[i - 5].name;
    return { id: kind, kind, label, weight: p.weights[i], pay };
  });

  return {
    schemaVersion: 1,
    deadSpinChancePercent: p.deadSpinChancePercent,
    seedBiasPercent: 35,
    seedClusterMin: minCluster + 1,
    seedClusterMax: minCluster + 3,
    bombChanceBasePercent: p.bombChanceBasePercent,
    bombChanceFreeSpinsPercent: p.bombChanceFreeSpinsPercent,
    bombTable: [
      { mult: 2, weight: p.bombWeights[0] },
      { mult: 3, weight: p.bombWeights[1] },
      { mult: 4, weight: p.bombWeights[2] },
      { mult: 5, weight: p.bombWeights[3] },
    ],
    freeSpinsTriggerCount: trigger,
    freeSpinsRetriggerCount: trigger,
    freeSpinsBase: def.freeSpins,
    freeSpinsRetrigger: p.freeSpinsRetrigger,
    anteScatterWeightMult: tuning.anteScatterWeightMult,
    scatterCashTiers: [
      { count: trigger - 1, mult: 1 },
      { count: trigger, mult: 3 },
      { count: trigger + 1, mult: 5 },
      { count: trigger + 2, mult: p.topScatterCash },
    ],
    buyFeatureMult: tuning.buyFeatureMult,
    anteBetMult: ANTE_BET_MULT,
    minCluster,
    maxWinMult: p.maxWinMult,
    maxFsBombMult: 5,
    maxFsSessionSpins: Math.max(25, Math.round(def.freeSpins * 2.5)),
    maxBaseBombSum: 5,
    symbols: [
      ...paySymbols,
      {
        id: "scatter",
        kind: "scatter",
        label: def.scatter.name,
        weight: tuning.scatterWeight,
        pay: [0, 0, 0],
        scatter: true,
      },
      { id: "bomb", kind: "bomb", label: def.bomb.name, weight: 0, pay: [0, 0, 0], bomb: true },
    ],
  };
}

/**
 * Binomial estimate of P(≥ trigger scatters on an opening board) for a given
 * scatter weight. Seeded clusters and bombs shift it slightly; calibration
 * measures the real rate.
 */
export function triggerProbability(def: RealmsGameDef, scatterWeight: number): number {
  const p = PROFILES[def.volatility];
  const cells = def.board.cols * def.board.rows;
  const payWeight = p.weights.reduce((a, b) => a + b, 0);
  const q = (scatterWeight / (payWeight + scatterWeight)) * (1 - p.bombChanceBasePercent / 100);
  let below = 0;
  let term = (1 - q) ** cells;
  for (let k = 0; k < FREE_SPINS_TRIGGER_COUNT; k++) {
    below += term;
    term *= ((cells - k) / (k + 1)) * (q / (1 - q));
  }
  return 1 - below;
}

/** Scatter weight whose trigger probability matches `rate` (bisection). */
export function scatterWeightForRate(def: RealmsGameDef, rate: number): number {
  const payWeight = PROFILES[def.volatility].weights.reduce((a, b) => a + b, 0);
  let lo = 0;
  let hi = payWeight;
  for (let i = 0; i < 60; i++) {
    const w = (lo + hi) / 2;
    if (triggerProbability(def, w) < rate) lo = w;
    else hi = w;
  }
  return (lo + hi) / 2;
}

export function solveScatterWeight(def: RealmsGameDef): number {
  return round2(scatterWeightForRate(def, 1 / PROFILES[def.volatility].triggerEvery));
}
