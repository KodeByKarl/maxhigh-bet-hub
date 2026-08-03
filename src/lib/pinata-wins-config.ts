/**
 * Piñata Wins — fixed-payline + cascade hybrid with Gold Frame collect+transform
 * and a persistent Free Spins multiplier.
 *
 * LOCKED (do not re-litigate — see product sign-off):
 * - Golden Skull 5oak = 460× bet-per-line (intentional; not 1000×)
 * - Paylines = first 20 of classic 5×3 map
 * - Gold Frame: any low/high regular, any reel; not Wild/Scatter
 * - Frame steps = 2,3,5,8,10,15,20,25,50,100
 * - Apply = single aggregate mult on spin total; no per-spin collect cap
 * - FS timing = same_spin; retriggers unlimited
 * - Bet = flat ₱0.20–₱100; max win = 5,000× (ignore "$50" outlier)
 *
 * Still open (CONFIG-PENDING): other regular-symbol paytable values beyond Golden Skull;
 * Gold Frame *weight* distribution across the locked steps (RTP lever).
 */

export const PINATA_WINS_GAME_ID = "pinata-wins";

export type PwSymKind =
  | "chili"
  | "taco"
  | "maracas"
  | "sombrero"
  | "cactus"
  | "guitar"
  | "golden_skull"
  | "wild"
  | "scatter";

export type PwSymbolConfig = {
  id: string;
  kind: PwSymKind;
  name: string;
  tier: "low" | "high" | "wild" | "scatter";
  /** Pay × bet-per-line for [3, 4, 5] matches */
  pay: [number, number, number];
  /** Relative weight per reel (length = reelsCount) */
  reelWeights: number[];
  reelWeightsFreeSpins: number[];
  wild?: boolean;
  scatter?: boolean;
  /**
   * Locked: true for low/high regular tiers; false for Wild/Scatter.
   */
  goldFrameEligible?: boolean;
};

/** Discrete Gold Frame multiplier value + relative weight. */
export type PwGoldFrameMult = {
  mult: number;
  weight: number;
};

export type PwWinsConfig = {
  schemaVersion: 1;
  reelsCount: number;
  rowsCount: number;
  paylineCount: number;
  /** paylines[line][reel] = row index (0=top) */
  paylines: number[][];
  minMatchLength: number;
  freeSpinsTriggerCount: number;
  freeSpinsBaseCount: number;
  freeSpinsExtraPerScatter: number;
  /**
   * Locked: null = unlimited retriggers (Super Ace pattern).
   */
  freeSpinsRetriggerCap: number | null;
  /**
   * Locked: same_spin — collections apply on the spin they're collected, then persist.
   * next_spin retained only for sim/A-B comparison; production config must be same_spin.
   */
  fsMultApplyTiming: "same_spin" | "next_spin";
  /**
   * Chance a gold-frame-eligible symbol spawns framed on initial grid / cascade refill.
   * Primary RTP/volatility lever — tune via simulation.
   */
  goldFrameChanceInitial: number;
  goldFrameChanceCascade: number;
  /** Elevated Gold Frame rates during Free Spins (persistent-mult fuel + buy neutrality). */
  goldFrameChanceFreeSpinsInitial: number;
  goldFrameChanceFreeSpinsCascade: number;
  /** Weighted distribution across LOCKED_GOLD_FRAME_MULT_STEPS only. */
  goldFrameMults: PwGoldFrameMult[];
  /**
   * Locked: null = no per-spin collected-mult cap (only per-symbol 100x step max).
   */
  goldFrameCollectCapPerSpin: number | null;
  /**
   * Locked: single multiplier on spin aggregate win (not per-payline).
   */
  goldFrameApplyMode: "spin_aggregate";
  buyFeatureMult: number;
  /** Locked flat bet range ₱0.20–₱100. */
  minBet: number;
  maxBet: number;
  /** Locked 5,000× stake (ignore flat "$50" source outlier). */
  maxWinMult: number;
  targetRtp: number;
  /** Hit-frequency target for simulation validation (~27.7%). */
  targetHitFrequency: number;
  symbols: PwSymbolConfig[];
};

export const SYMBOL_NAMES: Record<PwSymKind, string> = {
  chili: "Chilli",
  taco: "Taco",
  maracas: "Maracas",
  sombrero: "Sombrero",
  cactus: "Cactus",
  guitar: "Guitar",
  golden_skull: "Golden Skull",
  wild: "Señorita",
  scatter: "Fiesta Star",
};

/**
 * Locked: first 20 lines of the classic 5×3 / 25-line map used elsewhere in this catalog.
 */
export const DEFAULT_PAYLINES_5X3_20: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 2, 1, 0, 1],
  [1, 0, 1, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 2, 1, 2, 0],
];

function rw(a: [number, number, number, number, number]): number[] {
  return [...a];
}

/** Locked discrete Gold Frame multiplier steps (exact set — not a continuous range). */
export const LOCKED_GOLD_FRAME_MULT_STEPS = [2, 3, 5, 8, 10, 15, 20, 25, 50, 100] as const;

/**
 * Weighted distribution across LOCKED_GOLD_FRAME_MULT_STEPS.
 * Step values are locked; relative weights remain an RTP/volatility lever.
 */
export const DEFAULT_GOLD_FRAME_MULTS: PwGoldFrameMult[] = [
  { mult: 2, weight: 50 },
  { mult: 3, weight: 22 },
  { mult: 5, weight: 12 },
  { mult: 8, weight: 6 },
  { mult: 10, weight: 4 },
  { mult: 15, weight: 2.5 },
  { mult: 20, weight: 1.5 },
  { mult: 25, weight: 1 },
  { mult: 50, weight: 0.7 },
  { mult: 100, weight: 0.3 },
];

export const DEFAULT_PINATA_WINS_CONFIG: PwWinsConfig = {
  schemaVersion: 1,
  reelsCount: 5,
  rowsCount: 3,
  paylineCount: 20,
  paylines: structuredClone(DEFAULT_PAYLINES_5X3_20),
  minMatchLength: 3,
  freeSpinsTriggerCount: 3,
  freeSpinsBaseCount: 15,
  freeSpinsExtraPerScatter: 2,
  freeSpinsRetriggerCap: null,
  fsMultApplyTiming: "same_spin",
  /** RTP lever — tuned via sim toward ~96.75%. */
  goldFrameChanceInitial: 0.023,
  goldFrameChanceCascade: 0.029,
  goldFrameChanceFreeSpinsInitial: 0.043,
  goldFrameChanceFreeSpinsCascade: 0.052,
  goldFrameMults: structuredClone(DEFAULT_GOLD_FRAME_MULTS),
  goldFrameCollectCapPerSpin: null,
  goldFrameApplyMode: "spin_aggregate",
  buyFeatureMult: 75,
  /** Locked flat ₱0.20–₱100. */
  minBet: 0.2,
  maxBet: 100,
  maxWinMult: 5000,
  targetRtp: 96.75,
  targetHitFrequency: 27.7,
  symbols: [
    {
      id: "chili",
      kind: "chili",
      name: "Chilli",
      tier: "low",
      pay: [2, 7, 21],
      reelWeights: rw([36, 36, 36, 36, 36]),
      reelWeightsFreeSpins: rw([32, 32, 32, 32, 32]),
      goldFrameEligible: true,
    },
    {
      id: "taco",
      kind: "taco",
      name: "Taco",
      tier: "low",
      pay: [2, 8, 23],
      reelWeights: rw([32, 32, 32, 32, 32]),
      reelWeightsFreeSpins: rw([28, 28, 28, 28, 28]),
      goldFrameEligible: true,
    },
    {
      id: "maracas",
      kind: "maracas",
      name: "Maracas",
      tier: "low",
      pay: [3, 10, 29],
      reelWeights: rw([28, 28, 28, 28, 28]),
      reelWeightsFreeSpins: rw([24, 24, 24, 24, 24]),
      goldFrameEligible: true,
    },
    {
      id: "sombrero",
      kind: "sombrero",
      name: "Sombrero",
      tier: "low",
      pay: [5, 14, 40],
      reelWeights: rw([24, 24, 24, 24, 24]),
      reelWeightsFreeSpins: rw([20, 20, 20, 20, 20]),
      goldFrameEligible: true,
    },
    {
      id: "cactus",
      kind: "cactus",
      name: "Cactus",
      tier: "high",
      pay: [7, 21, 69],
      reelWeights: rw([12, 12, 12, 12, 12]),
      reelWeightsFreeSpins: rw([11, 11, 11, 11, 11]),
      goldFrameEligible: true,
    },
    {
      id: "guitar",
      kind: "guitar",
      name: "Guitar",
      tier: "high",
      pay: [12, 35, 115],
      reelWeights: rw([8, 8, 8, 8, 8]),
      reelWeightsFreeSpins: rw([8, 8, 8, 8, 8]),
      goldFrameEligible: true,
    },
    {
      id: "golden_skull",
      kind: "golden_skull",
      name: "Golden Skull",
      tier: "high",
      /**
       * Locked: 460× bet-per-line for 5-of-a-kind (intentional design number).
       * Do not "correct" back to source-cited 1000×.
       */
      pay: [23, 92, 460],
      reelWeights: rw([3.5, 3.5, 3.5, 3.5, 3.5]),
      reelWeightsFreeSpins: rw([4, 4, 4, 4, 4]),
      goldFrameEligible: true,
    },
    {
      id: "wild",
      kind: "wild",
      name: "Señorita",
      tier: "wild",
      pay: [9, 29, 92],
      reelWeights: rw([2.5, 2.5, 2.5, 2.5, 2.5]),
      reelWeightsFreeSpins: rw([4, 4, 4, 4, 4]),
      wild: true,
      goldFrameEligible: false,
    },
    {
      id: "scatter",
      kind: "scatter",
      name: "Fiesta Star",
      tier: "scatter",
      /** Scatter does not pay lines; pay unused. */
      pay: [0, 0, 0],
      reelWeights: rw([2.2, 2.2, 2.2, 2.2, 2.2]),
      reelWeightsFreeSpins: rw([2.86, 2.86, 2.86, 2.86, 2.86]),
      scatter: true,
      goldFrameEligible: false,
    },
  ],
};

export function betPerLine(totalBet: number, cfg: PwWinsConfig = DEFAULT_PINATA_WINS_CONFIG): number {
  const lines = Math.max(1, cfg.paylineCount);
  return +(totalBet / lines).toFixed(6);
}

export function calcFreeSpinsAward(
  scatterCount: number,
  cfg: PwWinsConfig = DEFAULT_PINATA_WINS_CONFIG,
): number {
  if (scatterCount < cfg.freeSpinsTriggerCount) return 0;
  const extra = scatterCount - cfg.freeSpinsTriggerCount;
  return cfg.freeSpinsBaseCount + extra * cfg.freeSpinsExtraPerScatter;
}

/**
 * Retrigger award during Free Spins (same scaling as trigger).
 * Honors freeSpinsRetriggerCap when set (null = unlimited).
 */
export function calcFreeSpinsRetrigger(
  scatterCount: number,
  alreadyRetriggered: number,
  cfg: PwWinsConfig = DEFAULT_PINATA_WINS_CONFIG,
): number {
  const award = calcFreeSpinsAward(scatterCount, cfg);
  if (award <= 0) return 0;
  if (cfg.freeSpinsRetriggerCap == null) return award;
  const remaining = Math.max(0, cfg.freeSpinsRetriggerCap - alreadyRetriggered);
  return Math.min(award, remaining);
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizePinataWinsConfig(raw: unknown): PwWinsConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_PINATA_WINS_CONFIG);
  const obj = raw as Partial<PwWinsConfig>;
  const d = DEFAULT_PINATA_WINS_CONFIG;

  const symbols =
    Array.isArray(obj.symbols) && obj.symbols.length > 0
      ? obj.symbols.map((s, i) => {
          const base = d.symbols.find((x) => x.id === s?.id) ?? d.symbols[Math.min(i, d.symbols.length - 1)]!;
          const pay = Array.isArray(s?.pay) ? s.pay : base.pay;
          const rwBase = Array.isArray(s?.reelWeights) ? s.reelWeights : base.reelWeights;
          const rwFs = Array.isArray(s?.reelWeightsFreeSpins)
            ? s.reelWeightsFreeSpins
            : base.reelWeightsFreeSpins;
          return {
            ...base,
            ...s,
            id: typeof s?.id === "string" ? s.id : base.id,
            kind: (s?.kind as PwSymKind) || base.kind,
            name: typeof s?.name === "string" ? s.name : base.name,
            tier: s?.tier || base.tier,
            pay: [
              clamp(num(pay[0], base.pay[0]), 0, 10_000),
              clamp(num(pay[1], base.pay[1]), 0, 10_000),
              clamp(num(pay[2], base.pay[2]), 0, 10_000),
            ] as [number, number, number],
            reelWeights: Array.from({ length: d.reelsCount }, (_, ri) =>
              clamp(num(rwBase[ri], base.reelWeights[ri] ?? 0), 0, 10_000),
            ),
            reelWeightsFreeSpins: Array.from({ length: d.reelsCount }, (_, ri) =>
              clamp(num(rwFs[ri], base.reelWeightsFreeSpins[ri] ?? 0), 0, 10_000),
            ),
            wild: Boolean(s?.wild ?? base.wild),
            scatter: Boolean(s?.scatter ?? base.scatter),
            goldFrameEligible: Boolean(s?.goldFrameEligible ?? base.goldFrameEligible),
          };
        })
      : structuredClone(d.symbols);

  const paylines =
    Array.isArray(obj.paylines) && obj.paylines.length > 0
      ? obj.paylines.map((line) =>
          Array.isArray(line) ? line.map((r) => clamp(Math.round(num(r, 1)), 0, 2)) : [1, 1, 1, 1, 1],
        )
      : structuredClone(d.paylines);

  const goldFrameMults =
    Array.isArray(obj.goldFrameMults) && obj.goldFrameMults.length > 0
      ? obj.goldFrameMults.map((m, i) => {
          const base = d.goldFrameMults[Math.min(i, d.goldFrameMults.length - 1)]!;
          const rawMult = num(m?.mult, base.mult);
          // Snap to locked discrete step set
          let nearest: number = LOCKED_GOLD_FRAME_MULT_STEPS[0]!;
          let bestDist = Infinity;
          for (const step of LOCKED_GOLD_FRAME_MULT_STEPS) {
            const dist = Math.abs(step - rawMult);
            if (dist < bestDist) {
              bestDist = dist;
              nearest = step;
            }
          }
          return {
            mult: nearest,
            weight: clamp(num(m?.weight, base.weight), 0, 10_000),
          };
        })
      : structuredClone(d.goldFrameMults);

  // Locked: unlimited retriggers unless an explicit numeric cap is provided for A/B sims
  const retriggerCapRaw = obj.freeSpinsRetriggerCap;
  const freeSpinsRetriggerCap =
    retriggerCapRaw === null || retriggerCapRaw === undefined
      ? null
      : clamp(Math.round(num(retriggerCapRaw, 0)), 0, 10_000);

  // Locked: no per-spin collect cap (null). Numeric override only for stress A/B.
  const collectCapRaw = obj.goldFrameCollectCapPerSpin;
  const goldFrameCollectCapPerSpin =
    collectCapRaw === null || collectCapRaw === undefined
      ? null
      : clamp(num(collectCapRaw, 0), 0, 100_000);

  const timing =
    obj.fsMultApplyTiming === "next_spin" || obj.fsMultApplyTiming === "same_spin"
      ? obj.fsMultApplyTiming
      : d.fsMultApplyTiming;

  return {
    schemaVersion: 1,
    reelsCount: clamp(Math.round(num(obj.reelsCount, d.reelsCount)), 3, 6),
    rowsCount: clamp(Math.round(num(obj.rowsCount, d.rowsCount)), 2, 5),
    paylineCount: clamp(Math.round(num(obj.paylineCount, paylines.length || d.paylineCount)), 1, 50),
    paylines,
    minMatchLength: clamp(Math.round(num(obj.minMatchLength, d.minMatchLength)), 2, 5),
    freeSpinsTriggerCount: clamp(
      Math.round(num(obj.freeSpinsTriggerCount, d.freeSpinsTriggerCount)),
      2,
      10,
    ),
    freeSpinsBaseCount: clamp(Math.round(num(obj.freeSpinsBaseCount, d.freeSpinsBaseCount)), 1, 100),
    freeSpinsExtraPerScatter: clamp(
      Math.round(num(obj.freeSpinsExtraPerScatter, d.freeSpinsExtraPerScatter)),
      0,
      20,
    ),
    freeSpinsRetriggerCap,
    fsMultApplyTiming: timing,
    goldFrameChanceInitial: clamp(num(obj.goldFrameChanceInitial, d.goldFrameChanceInitial), 0, 1),
    goldFrameChanceCascade: clamp(num(obj.goldFrameChanceCascade, d.goldFrameChanceCascade), 0, 1),
    goldFrameChanceFreeSpinsInitial: clamp(
      num(obj.goldFrameChanceFreeSpinsInitial, d.goldFrameChanceFreeSpinsInitial),
      0,
      1,
    ),
    goldFrameChanceFreeSpinsCascade: clamp(
      num(obj.goldFrameChanceFreeSpinsCascade, d.goldFrameChanceFreeSpinsCascade),
      0,
      1,
    ),
    goldFrameMults,
    goldFrameCollectCapPerSpin,
    goldFrameApplyMode: "spin_aggregate",
    buyFeatureMult: clamp(num(obj.buyFeatureMult, d.buyFeatureMult), 1, 500),
    minBet: clamp(num(obj.minBet, d.minBet), 0.01, 1000),
    maxBet: clamp(num(obj.maxBet, d.maxBet), 0.01, 100_000),
    maxWinMult: clamp(num(obj.maxWinMult, d.maxWinMult), 0, 100_000),
    targetRtp: clamp(num(obj.targetRtp, d.targetRtp), 80, 99),
    targetHitFrequency: clamp(num(obj.targetHitFrequency, d.targetHitFrequency), 1, 100),
    symbols,
  };
}

/*
 * CONFIG-PENDING (only remaining open items):
 * 1. Full regular-symbol paytable values beyond locked Golden Skull 460× for 5oak
 * 2. Relative weights across LOCKED_GOLD_FRAME_MULT_STEPS (RTP lever; steps themselves locked)
 *
 * Locked — do not re-open: paylines, eligibility, frame steps, aggregate apply,
 * no collect cap, same_spin FS timing, unlimited retriggers, flat ₱0.20–₱100,
 * max win 5,000×, Golden Skull 460×.
 */
