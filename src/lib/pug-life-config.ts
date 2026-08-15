/**
 * Pug Den — 3-4-5-4-3 diamond / connecting-ways slot math config.
 * Inspired by Hacksaw Gaming "Pug Life" mechanics (Treat Wilds, Treat Yo'Self, Dawg's Den).
 *
 * ============================================================================
 * CONFIG-PENDING / DESIGN CONFIRMATION REQUIRED before launch.
 * Do NOT treat placeholder values as final for compliance or real-money pricing.
 * ============================================================================
 *
 * Board / wins:
 * - Reel heights 3-4-5-4-3 (5 reels, 19 cells) → 720 connecting ways
 * - Wins: 3+ matching symbols on consecutive reels from the left (ways)
 * - Treat tiers: Biscuit 2–4x, Bone 5–20x, Steak 25–200x
 * - 5+ consecutive Treat reels pays fiveTreatPayStakeMult × stake × ways (+ Treat mults)
 * - Max win 7,500× stake
 * - Base RTP target ~96.33%, high volatility
 * - Dawg's Den: pooled payout; Toaster on center reels during bonus
 * - UK markets: all bonus-buy paths disabled
 */

export const PUG_LIFE_GAME_ID = "pug-den";

export type PlSymKind =
  | "sym_10"
  | "sym_j"
  | "sym_q"
  | "sym_k"
  | "sym_a"
  | "rat"
  | "pigeon"
  | "cat"
  | "chihuahua"
  | "pug"
  | "treat_biscuit"
  | "treat_bone"
  | "treat_steak"
  | "scatter"
  | "toaster";

export type PlSymbolTier = "low" | "high" | "treat" | "scatter" | "toaster";

export type PlTreatTier = "biscuit" | "bone" | "steak";

export type PlRtpProfileId =
  | "base_96_33"
  | "featurespins"
  | "buy_treat_yoself"
  | "buy_dawgs_den";

export type PlEntryPath =
  | "base"
  | "featurespins"
  | "buy_treat_yoself"
  | "buy_dawgs_den";

export type PlWeightedValue = {
  value: number;
  weight: number;
};

export type PlSymbolConfig = {
  id: string;
  kind: PlSymKind;
  name: string;
  tier: PlSymbolTier;
  /**
   * Pay × totalBet × waysCount for [3, 4, 5+] consecutive reels.
   * TODO/config-pending — provisional ways ladder.
   */
  pay: [number, number, number];
  /** Fallback reel weights (overridden by active RTP profile). */
  reelWeights: number[];
  wild?: boolean;
  scatter?: boolean;
  treatTier?: PlTreatTier;
  toaster?: boolean;
};

export type PlRtpProfile = {
  id: PlRtpProfileId;
  entryPath: PlEntryPath;
  /** Target RTP % — config-pending for buy paths. */
  targetRtp: number;
  /** Status flag for compliance review. */
  configStatus: "confirmed" | "config-pending";
  reelWeights: Record<PlSymKind, number[]>;
};

export type PlBuyOptionConfig = {
  id: "featurespins" | "treat_yoself" | "dawgs_den";
  enabled: boolean;
  /**
   * Cost as × stake.
   * TODO/config-pending — Source A vs Source B conflict; placeholder only.
   */
  costMult: number;
  /** Documented RTP for this path — config-pending. */
  targetRtp: number;
  configStatus: "config-pending";
  notes: string;
};

export type PlTreatYoSelfConfig = {
  /** Free spins awarded on trigger. */
  initialSpins: number;
  /**
   * TODO/config-pending — exact lives count unconfirmed.
   * Placeholder: 3. Do not ship as final.
   */
  initialLives: number;
  /**
   * Life-loss rule id.
   * TODO/config-pending — most plausible: spin with no new sticky Treat consumes 1 life.
   */
  lifeLossRule: "no_new_treat";
  /** Working assumption: pay wins per spin (unlike Dawg's Den). */
  payoutMode: "per_spin" | "pooled";
  /** Min Treat Wilds in view to trigger from base game. */
  triggerTreatCount: number;
  configStatus: "config-pending";
};

export type PlDawgsDenConfig = {
  triggerScatterCount: number;
  /** Weighted 3 vs 4 free-spin contribution per triggering Scatter. */
  scatterSpinValues: PlWeightedValue[];
  /**
   * Soft bounds for awarded FS total — config-pending exact min/max/cap.
   */
  minFreeSpins: number;
  maxFreeSpins: number;
  /** Toaster only on these 0-based reel indices (4 and 5 → 3, 4). */
  toasterReels: number[];
  /**
   * Odds that a Toaster reveal is a multiplier (else cash).
   * TODO/config-pending — placeholder 50.
   */
  toasterMultChancePercent: number;
  toasterMultiplierValues: PlWeightedValue[];
  toasterCashValues: PlWeightedValue[];
  /**
   * Working assumption: sticky Toaster re-rolls value every subsequent spin.
   * TODO/config-pending — confirm vs reveal-once-and-hold.
   */
  toasterRevealMode: "reroll_each_spin" | "reveal_once";
  configStatus: "config-pending";
};

export type PlJurisdictionConfig = {
  /**
   * Markets where all bonus-buy paths must be disabled (e.g. UKGC).
   * Match against player regulatory context codes (uppercase).
   */
  bonusBuyDisabledMarkets: string[];
};

export type PugLifeConfig = {
  schemaVersion: 1;
  reelsCount: number;
  /** Max rows (tallest reel). */
  rowsCount: number;
  /** Per-reel visible row counts — default 3-4-5-4-3. */
  reelHeights: number[];
  /** Product of reelHeights (connecting ways). Kept as paylineCount for admin UI compat. */
  paylineCount: number;
  /** @deprecated Unused — connecting ways replaced fixed paylines. */
  paylines: number[][];
  minMatchLength: number;
  minBet: number;
  maxBet: number;
  /** Confirmed max win × stake. */
  maxWinMult: number;
  activeRtpProfile: PlRtpProfileId;
  rtpProfiles: PlRtpProfile[];
  targetRtp: number;
  volatility: "high" | "medium" | "low";
  symbols: PlSymbolConfig[];
  /**
   * Discrete Treat multiplier distributions per tier.
   * TODO/config-pending — confirm stepped values with design.
   */
  treatMultiplierTables: Record<PlTreatTier, PlWeightedValue[]>;
  /**
   * Flat × stake × ways when 5+ consecutive reels are all Treats (in addition to Treat mults).
   * TODO/config-pending — confirm applies regardless of Treat tier mix.
   */
  fiveTreatPayStakeMult: number;
  treatYoSelf: PlTreatYoSelfConfig;
  dawgsDen: PlDawgsDenConfig;
  buyOptions: PlBuyOptionConfig[];
  /**
   * Simultaneous trigger priority when both bonuses qualify on one base spin.
   * TODO/config-pending — placeholder prefers Treat Yo'Self.
   */
  dualTriggerPriority: "treat_yoself" | "dawgs_den" | "both_sequential";
  jurisdiction: PlJurisdictionConfig;
  /**
   * FeatureSpins batch size (elevated-trigger spins purchased as a pack).
   * TODO/config-pending exact pack size.
   */
  featurespinsBatchSize: number;
};

export const SYMBOL_NAMES: Record<PlSymKind, string> = {
  sym_10: "10",
  sym_j: "J",
  sym_q: "Q",
  sym_k: "K",
  sym_a: "A",
  rat: "Rat",
  pigeon: "Pigeon",
  cat: "Cat",
  chihuahua: "Chihuahua",
  pug: "Pugly the Pug",
  treat_biscuit: "Biscuit Treat",
  treat_bone: "Bone Treat",
  treat_steak: "Steak Treat",
  scatter: "Dawg's Den Scatter",
  toaster: "Toaster",
};

export const ALL_SYM_KINDS: PlSymKind[] = [
  "sym_10",
  "sym_j",
  "sym_q",
  "sym_k",
  "sym_a",
  "rat",
  "pigeon",
  "cat",
  "chihuahua",
  "pug",
  "treat_biscuit",
  "treat_bone",
  "treat_steak",
  "scatter",
  "toaster",
];

export const TREAT_KINDS: PlSymKind[] = [
  "treat_biscuit",
  "treat_bone",
  "treat_steak",
];

/**
 * Phone-friendly diamond reel heights → 3×4×5×4×3 = 720 connecting ways.
 * (Replaces classic 1-2-3-4-3-2-1 / 144 ways so cells scale larger on mobile.)
 */
export const DEFAULT_REEL_HEIGHTS = [3, 4, 5, 4, 3] as const;

export function totalConnectingWays(reelHeights: number[]): number {
  return reelHeights.reduce((acc, h) => acc * Math.max(0, h), 1);
}

/** @deprecated Fixed paylines removed — connecting ways on diamond board. */
export const DEFAULT_PAYLINES_5X4_16: number[][] = [];

function rw(reels: number[]): number[] {
  return [...reels];
}

function profileWeights(
  entries: Partial<Record<PlSymKind, number[]>>,
): Record<PlSymKind, number[]> {
  const out = {} as Record<PlSymKind, number[]>;
  const zeros = Array.from({ length: DEFAULT_REEL_HEIGHTS.length }, () => 0);
  for (const k of ALL_SYM_KINDS) {
    out[k] = rw(entries[k] ?? zeros);
  }
  return out;
}

/**
 * Provisional base-game reel weights (toaster weight 0 — never lands in base).
 * 5 reels matching DEFAULT_REEL_HEIGHTS.
 */
const BASE_WEIGHTS = profileWeights({
  sym_10: [46, 46, 46, 46, 46],
  sym_j: [44, 44, 44, 44, 44],
  sym_q: [42, 42, 42, 42, 42],
  sym_k: [40, 40, 40, 40, 40],
  sym_a: [38, 38, 38, 38, 38],
  rat: [24, 24, 24, 24, 24],
  pigeon: [20, 20, 20, 20, 20],
  cat: [15, 15, 15, 15, 15],
  chihuahua: [11, 11, 11, 11, 11],
  pug: [7, 7, 7, 7, 7],
  treat_biscuit: [2, 2, 2, 2, 2],
  treat_bone: [1, 1, 1, 1, 1],
  treat_steak: [0, 1, 0, 1, 0],
  scatter: [2, 1, 2, 1, 2],
  toaster: [0, 0, 0, 0, 0],
});

/** FeatureSpins: elevated Treat + Scatter weights. */
const FEATURESPINS_WEIGHTS = profileWeights({
  sym_10: [36, 36, 36, 36, 36],
  sym_j: [34, 34, 34, 34, 34],
  sym_q: [32, 32, 32, 32, 32],
  sym_k: [30, 30, 30, 30, 30],
  sym_a: [28, 28, 28, 28, 28],
  rat: [18, 18, 18, 18, 18],
  pigeon: [14, 14, 14, 14, 14],
  cat: [12, 12, 12, 12, 12],
  chihuahua: [8, 8, 8, 8, 8],
  pug: [5, 5, 5, 5, 5],
  treat_biscuit: [18, 18, 18, 18, 18],
  treat_bone: [8, 8, 8, 8, 8],
  treat_steak: [3, 3, 3, 3, 3],
  scatter: [12, 12, 12, 12, 12],
  toaster: [0, 0, 0, 0, 0],
});

/**
 * Dawg's Den session strips — Toaster on center reels 1–2 (0-based; tall columns).
 */
export const DAWGS_DEN_WEIGHTS = profileWeights({
  sym_10: [46, 42, 42, 42, 46],
  sym_j: [44, 40, 40, 40, 44],
  sym_q: [42, 38, 38, 38, 42],
  sym_k: [40, 36, 36, 36, 40],
  sym_a: [38, 34, 34, 34, 38],
  rat: [22, 20, 20, 20, 22],
  pigeon: [18, 16, 16, 16, 18],
  cat: [14, 12, 12, 12, 14],
  chihuahua: [10, 9, 9, 9, 10],
  pug: [6, 5, 5, 5, 6],
  treat_biscuit: [3, 2, 2, 2, 3],
  treat_bone: [1, 1, 1, 1, 1],
  treat_steak: [0, 0, 1, 0, 0],
  scatter: [0, 0, 0, 0, 0],
  toaster: [0, 4, 4, 0, 0],
});

/**
 * Treat Yo'Self session strips — no Scatter, no Toaster; Treats can land.
 */
export const TREAT_YOSELF_WEIGHTS = profileWeights({
  sym_10: [50, 50, 50, 50, 50],
  sym_j: [48, 48, 48, 48, 48],
  sym_q: [46, 46, 46, 46, 46],
  sym_k: [44, 44, 44, 44, 44],
  sym_a: [42, 42, 42, 42, 42],
  rat: [26, 26, 26, 26, 26],
  pigeon: [22, 22, 22, 22, 22],
  cat: [16, 16, 16, 16, 16],
  chihuahua: [12, 12, 12, 12, 12],
  pug: [8, 8, 8, 8, 8],
  treat_biscuit: [2, 2, 2, 2, 2],
  treat_bone: [1, 0, 1, 0, 1],
  treat_steak: [0, 0, 1, 0, 0],
  scatter: [0, 0, 0, 0, 0],
  toaster: [0, 0, 0, 0, 0],
});

export const DEFAULT_RTP_PROFILES: PlRtpProfile[] = [
  {
    id: "base_96_33",
    entryPath: "base",
    targetRtp: 96.33,
    configStatus: "confirmed",
    reelWeights: BASE_WEIGHTS,
  },
  {
    id: "featurespins",
    entryPath: "featurespins",
    // TODO/config-pending — Source A ~96.3% vs Source B ~94.2%
    targetRtp: 0,
    configStatus: "config-pending",
    reelWeights: FEATURESPINS_WEIGHTS,
  },
  {
    id: "buy_treat_yoself",
    entryPath: "buy_treat_yoself",
    targetRtp: 0,
    configStatus: "config-pending",
    reelWeights: BASE_WEIGHTS,
  },
  {
    id: "buy_dawgs_den",
    entryPath: "buy_dawgs_den",
    targetRtp: 0,
    configStatus: "config-pending",
    reelWeights: BASE_WEIGHTS,
  },
];

/**
 * Pay × totalBet × waysCount for [3, 4, 5+] consecutive reels.
 * Provisional — tune via `npx tsx scripts/test-pug-life.ts --rtp N`.
 */
export const DEFAULT_PUG_LIFE_CONFIG: PugLifeConfig = {
  schemaVersion: 1,
  reelsCount: 5,
  rowsCount: 5,
  reelHeights: [...DEFAULT_REEL_HEIGHTS],
  paylineCount: totalConnectingWays([...DEFAULT_REEL_HEIGHTS]),
  paylines: [],
  minMatchLength: 3,
  minBet: 0.1,
  maxBet: 100,
  maxWinMult: 7_500,
  activeRtpProfile: "base_96_33",
  rtpProfiles: DEFAULT_RTP_PROFILES.map((p) => ({
    ...p,
    reelWeights: Object.fromEntries(
      ALL_SYM_KINDS.map((k) => [k, [...p.reelWeights[k]]]),
    ) as Record<PlSymKind, number[]>,
  })),
  targetRtp: 96.33,
  volatility: "high",
  fiveTreatPayStakeMult: 10,
  treatMultiplierTables: {
    // Stepped discrete values within confirmed ranges — TODO/config-pending exact steps.
    // Skewed low for provisional RTP; re-tune after design sign-off.
    biscuit: [
      { value: 2, weight: 70 },
      { value: 3, weight: 20 },
      { value: 4, weight: 10 },
    ],
    bone: [
      { value: 5, weight: 45 },
      { value: 8, weight: 25 },
      { value: 10, weight: 15 },
      { value: 15, weight: 10 },
      { value: 20, weight: 5 },
    ],
    steak: [
      { value: 25, weight: 55 },
      { value: 50, weight: 25 },
      { value: 75, weight: 10 },
      { value: 100, weight: 6 },
      { value: 150, weight: 3 },
      { value: 200, weight: 1 },
    ],
  },
  treatYoSelf: {
    initialSpins: 5,
    initialLives: 3, // TODO/config-pending
    lifeLossRule: "no_new_treat",
    payoutMode: "per_spin", // TODO/config-pending — working assumption
    triggerTreatCount: 3,
    configStatus: "config-pending",
  },
  dawgsDen: {
    triggerScatterCount: 3,
    scatterSpinValues: [
      { value: 3, weight: 50 }, // TODO/config-pending odds split
      { value: 4, weight: 50 },
    ],
    minFreeSpins: 3,
    maxFreeSpins: 20,
    toasterReels: [1, 2],
    toasterMultChancePercent: 50, // TODO/config-pending
    toasterMultiplierValues: [
      { value: 2, weight: 20 },
      { value: 3, weight: 18 },
      { value: 4, weight: 15 },
      { value: 5, weight: 12 },
      { value: 10, weight: 10 },
      { value: 15, weight: 8 },
      { value: 20, weight: 6 },
      { value: 25, weight: 5 },
      { value: 50, weight: 4 },
      { value: 100, weight: 2 },
    ],
    toasterCashValues: [
      { value: 0.1, weight: 14 },
      { value: 0.2, weight: 12 },
      { value: 0.5, weight: 12 },
      { value: 1, weight: 12 },
      { value: 2, weight: 10 },
      { value: 3, weight: 8 },
      { value: 4, weight: 7 },
      { value: 5, weight: 7 },
      { value: 10, weight: 6 },
      { value: 15, weight: 4 },
      { value: 20, weight: 3 },
      { value: 25, weight: 2 },
      { value: 50, weight: 2 },
      { value: 100, weight: 1 },
    ],
    toasterRevealMode: "reroll_each_spin", // TODO/config-pending
    configStatus: "config-pending",
  },
  buyOptions: [
    {
      id: "featurespins",
      enabled: true,
      costMult: 3, // consistent across sources
      targetRtp: 0,
      configStatus: "config-pending",
      notes:
        "RTP conflict: Source A ~96.3% vs Source B 94.19–94.36%. Cost 3× stake consistent. SIGN-OFF REQUIRED.",
    },
    {
      id: "treat_yoself",
      enabled: true,
      // Provisional Source A cost so buy path is playable; confirm vs Source B 40× before launch.
      costMult: 100,
      targetRtp: 0,
      configStatus: "config-pending",
      notes:
        "Cost conflict: Source A 100× stake vs Source B 40× stake. Using provisional 100× for playtesting. SIGN-OFF REQUIRED.",
    },
    {
      id: "dawgs_den",
      enabled: true,
      // Provisional Source A cost so buy path is playable; confirm vs Source B 66.66× before launch.
      costMult: 200,
      targetRtp: 0,
      configStatus: "config-pending",
      notes:
        "Cost conflict: Source A 200× stake vs Source B 66.66× stake. Using provisional 200× for playtesting. SIGN-OFF REQUIRED.",
    },
  ],
  dualTriggerPriority: "treat_yoself", // TODO/config-pending
  jurisdiction: {
    bonusBuyDisabledMarkets: ["UK", "GB"],
  },
  featurespinsBatchSize: 50, // TODO/config-pending pack size
  symbols: [
    {
      id: "sym_10",
      kind: "sym_10",
      name: "10",
      tier: "low",
      /** Scaled for 720-way / 3-4-5-4-3 board */
      pay: [0.008, 0.015, 0.038],
      reelWeights: rw([46, 46, 46, 46, 46]),
    },
    {
      id: "sym_j",
      kind: "sym_j",
      name: "J",
      tier: "low",
      pay: [0.009, 0.018, 0.045],
      reelWeights: rw([44, 44, 44, 44, 44]),
    },
    {
      id: "sym_q",
      kind: "sym_q",
      name: "Q",
      tier: "low",
      pay: [0.01, 0.02, 0.05],
      reelWeights: rw([42, 42, 42, 42, 42]),
    },
    {
      id: "sym_k",
      kind: "sym_k",
      name: "K",
      tier: "low",
      pay: [0.012, 0.024, 0.06],
      reelWeights: rw([40, 40, 40, 40, 40]),
    },
    {
      id: "sym_a",
      kind: "sym_a",
      name: "A",
      tier: "low",
      pay: [0.015, 0.03, 0.075],
      reelWeights: rw([38, 38, 38, 38, 38]),
    },
    {
      id: "rat",
      kind: "rat",
      name: "Rat",
      tier: "high",
      pay: [0.022, 0.05, 0.12],
      reelWeights: rw([24, 24, 24, 24, 24]),
    },
    {
      id: "pigeon",
      kind: "pigeon",
      name: "Pigeon",
      tier: "high",
      pay: [0.03, 0.065, 0.15],
      reelWeights: rw([20, 20, 20, 20, 20]),
    },
    {
      id: "cat",
      kind: "cat",
      name: "Cat",
      tier: "high",
      pay: [0.038, 0.08, 0.19],
      reelWeights: rw([15, 15, 15, 15, 15]),
    },
    {
      id: "chihuahua",
      kind: "chihuahua",
      name: "Chihuahua",
      tier: "high",
      pay: [0.045, 0.1, 0.24],
      reelWeights: rw([11, 11, 11, 11, 11]),
    },
    {
      id: "pug",
      kind: "pug",
      name: "Pugly the Pug",
      tier: "high",
      pay: [0.06, 0.15, 0.38],
      reelWeights: rw([7, 7, 7, 7, 7]),
    },
    {
      id: "treat_biscuit",
      kind: "treat_biscuit",
      name: "Biscuit Treat",
      tier: "treat",
      pay: [0, 0, 0],
      reelWeights: rw([2, 2, 2, 2, 2]),
      wild: true,
      treatTier: "biscuit",
    },
    {
      id: "treat_bone",
      kind: "treat_bone",
      name: "Bone Treat",
      tier: "treat",
      pay: [0, 0, 0],
      reelWeights: rw([1, 1, 1, 1, 1]),
      wild: true,
      treatTier: "bone",
    },
    {
      id: "treat_steak",
      kind: "treat_steak",
      name: "Steak Treat",
      tier: "treat",
      pay: [0, 0, 0],
      reelWeights: rw([0, 1, 0, 1, 0]),
      wild: true,
      treatTier: "steak",
    },
    {
      id: "scatter",
      kind: "scatter",
      name: "Dawg's Den Scatter",
      tier: "scatter",
      pay: [0, 0, 0],
      reelWeights: rw([2, 1, 2, 1, 2]),
      scatter: true,
    },
    {
      id: "toaster",
      kind: "toaster",
      name: "Toaster",
      tier: "toaster",
      pay: [0, 0, 0],
      reelWeights: rw([0, 0, 0, 0, 0]),
      wild: true,
      toaster: true,
    },
  ],
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeReelHeights(raw: unknown, fallback: number[]): number[] {
  const src = Array.isArray(raw) && raw.length >= 3 ? raw : fallback;
  return src.map((h) => clamp(Math.round(num(h, 1)), 1, 8));
}

function normalizePaylines(
  raw: unknown,
  reelsCount: number,
  rowsCount: number,
  paylineCount: number,
  fallback: number[][],
): number[][] {
  // Connecting ways — paylines unused; keep empty or legacy data for admin dumps
  void reelsCount;
  void rowsCount;
  void paylineCount;
  if (!Array.isArray(raw) || raw.length === 0) return fallback.map((p) => [...p]);
  return (raw as unknown[]).map((row) =>
    Array.isArray(row) ? row.map((v) => clamp(Math.round(num(v, 0)), 0, 7)) : [],
  );
}

function normalizeWeightedValues(
  raw: unknown,
  fallback: PlWeightedValue[],
): PlWeightedValue[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallback.map((v) => ({ ...v }));
  }
  return raw.map((item, i) => {
    const fb = fallback[i] ?? fallback[0];
    const o = item as Partial<PlWeightedValue>;
    return {
      value: num(o.value, fb.value),
      weight: clamp(num(o.weight, fb.weight), 0, 10_000),
    };
  });
}

const RTP_IDS: PlRtpProfileId[] = [
  "base_96_33",
  "featurespins",
  "buy_treat_yoself",
  "buy_dawgs_den",
];

function normalizeRtpProfiles(raw: unknown, d: PugLifeConfig): PlRtpProfile[] {
  const src = Array.isArray(raw) ? raw : d.rtpProfiles;
  return RTP_IDS.map((id) => {
    const fb = d.rtpProfiles.find((p) => p.id === id) ?? d.rtpProfiles[0];
    const found = src.find((p) => (p as { id?: string })?.id === id) as
      | Partial<PlRtpProfile>
      | undefined;
    const weightsIn = found?.reelWeights ?? fb.reelWeights;
    const reelWeights = {} as Record<PlSymKind, number[]>;
    for (const k of ALL_SYM_KINDS) {
      const wSrc = weightsIn?.[k];
      const wFb = fb.reelWeights[k];
      reelWeights[k] = Array.from({ length: d.reelsCount }, (_, i) =>
        clamp(num(Array.isArray(wSrc) ? wSrc[i] : undefined, wFb[i] ?? 0), 0, 10_000),
      );
    }
    return {
      id,
      entryPath: fb.entryPath,
      targetRtp: clamp(num(found?.targetRtp, fb.targetRtp), 0, 99.5),
      configStatus: found?.configStatus === "confirmed" ? "confirmed" : fb.configStatus,
      reelWeights,
    };
  });
}

/** Resolve effective per-symbol reel weights for the active RTP profile. */
export function effectiveReelWeights(cfg: PugLifeConfig): Record<PlSymKind, number[]> {
  const profile =
    cfg.rtpProfiles.find((p) => p.id === cfg.activeRtpProfile) ?? cfg.rtpProfiles[0];
  const out = {} as Record<PlSymKind, number[]>;
  for (const s of cfg.symbols) {
    out[s.kind] = profile?.reelWeights[s.kind]
      ? [...profile.reelWeights[s.kind]]
      : [...s.reelWeights];
  }
  return out;
}

/** Percent share of each symbol weight on a given reel (for Superadmin UI). */
export function weightPercents(
  weights: Record<string, number[]>,
  reelIndex = 0,
): Record<string, number> {
  const keys = Object.keys(weights);
  const total = keys.reduce((a, k) => a + Math.max(0, weights[k]?.[reelIndex] ?? 0), 0);
  const out: Record<string, number> = {};
  for (const k of keys) {
    const w = Math.max(0, weights[k]?.[reelIndex] ?? 0);
    out[k] = total > 0 ? +((w / total) * 100).toFixed(2) : 0;
  }
  return out;
}

export function isTreatKind(kind: PlSymKind): boolean {
  return TREAT_KINDS.includes(kind);
}

export function isWildKind(kind: PlSymKind, cfg: PugLifeConfig): boolean {
  return !!cfg.symbols.find((s) => s.kind === kind)?.wild;
}

export function isScatterKind(kind: PlSymKind, cfg: PugLifeConfig): boolean {
  return !!cfg.symbols.find((s) => s.kind === kind)?.scatter;
}

export function treatTierOf(kind: PlSymKind, cfg: PugLifeConfig): PlTreatTier | null {
  return cfg.symbols.find((s) => s.kind === kind)?.treatTier ?? null;
}

/**
 * Whether bonus-buy paths are allowed for the given market/jurisdiction code.
 */
export function isBonusBuyAllowed(
  marketCode: string | null | undefined,
  cfg: PugLifeConfig,
): boolean {
  if (!marketCode) return true;
  const code = marketCode.trim().toUpperCase();
  return !cfg.jurisdiction.bonusBuyDisabledMarkets
    .map((m) => m.toUpperCase())
    .includes(code);
}

export function getBuyOption(
  id: PlBuyOptionConfig["id"],
  cfg: PugLifeConfig,
): PlBuyOptionConfig | undefined {
  return cfg.buyOptions.find((b) => b.id === id);
}

export function normalizePugLifeConfig(raw: unknown): PugLifeConfig {
  const d = DEFAULT_PUG_LIFE_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Partial<PugLifeConfig>;

  // Prefer explicit reelHeights; migrate legacy 5×4 and classic 7-reel diamond → 3-4-5-4-3
  const classicSevenDiamond =
    Array.isArray(o.reelHeights) &&
    o.reelHeights.map((h) => Math.round(num(h, 0))).join(",") === "1,2,3,4,3,2,1";
  const legacyFiveByFour =
    !Array.isArray(o.reelHeights) &&
    Math.round(num(o.reelsCount, 0)) === 5 &&
    Math.round(num(o.rowsCount, 0)) === 4;
  const reelHeights = normalizeReelHeights(
    classicSevenDiamond || legacyFiveByFour ? d.reelHeights : o.reelHeights,
    d.reelHeights,
  );
  const reelsCount = reelHeights.length;
  const rowsCount = Math.max(...reelHeights, 1);
  const paylineCount = totalConnectingWays(reelHeights);

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: PlSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => (s as PlSymbolConfig)?.kind === def.kind || (s as PlSymbolConfig)?.id === def.id,
    ) as Partial<PlSymbolConfig> | undefined;
    if (!found) {
      return {
        ...def,
        pay: [...def.pay] as [number, number, number],
        reelWeights: [...def.reelWeights],
      };
    }
    const paySrc = Array.isArray(found.pay) ? found.pay : def.pay;
    const padWeights = (src: unknown, fb: number[]) => {
      const arr = Array.isArray(src) ? src : fb;
      return Array.from({ length: reelsCount }, (_, i) =>
        clamp(num(arr[i], fb[i] ?? 0), 0, 10_000),
      );
    };
    return {
      ...def,
      name: typeof found.name === "string" && found.name.trim() ? found.name : def.name,
      pay: [
        clamp(num(paySrc[0], def.pay[0]), 0, 1_000_000),
        clamp(num(paySrc[1], def.pay[1]), 0, 1_000_000),
        clamp(num(paySrc[2], def.pay[2]), 0, 1_000_000),
      ],
      reelWeights: padWeights(found.reelWeights, def.reelWeights),
      wild: def.wild,
      scatter: def.scatter,
      treatTier: def.treatTier,
      toaster: def.toaster,
    };
  });

  const treatIn = o.treatMultiplierTables ?? d.treatMultiplierTables;
  const treatMultiplierTables: Record<PlTreatTier, PlWeightedValue[]> = {
    biscuit: normalizeWeightedValues(treatIn.biscuit, d.treatMultiplierTables.biscuit),
    bone: normalizeWeightedValues(treatIn.bone, d.treatMultiplierTables.bone),
    steak: normalizeWeightedValues(treatIn.steak, d.treatMultiplierTables.steak),
  };

  const tysIn = (o.treatYoSelf ?? {}) as Partial<PlTreatYoSelfConfig>;
  const treatYoSelf: PlTreatYoSelfConfig = {
    initialSpins: clamp(Math.round(num(tysIn.initialSpins, d.treatYoSelf.initialSpins)), 1, 50),
    initialLives: clamp(Math.round(num(tysIn.initialLives, d.treatYoSelf.initialLives)), 0, 20),
    lifeLossRule: "no_new_treat",
    payoutMode: tysIn.payoutMode === "pooled" ? "pooled" : "per_spin",
    triggerTreatCount: clamp(
      Math.round(num(tysIn.triggerTreatCount, d.treatYoSelf.triggerTreatCount)),
      1,
      20,
    ),
    configStatus: "config-pending",
  };

  const ddIn = (o.dawgsDen ?? {}) as Partial<PlDawgsDenConfig>;
  const dawgsDen: PlDawgsDenConfig = {
    triggerScatterCount: clamp(
      Math.round(num(ddIn.triggerScatterCount, d.dawgsDen.triggerScatterCount)),
      1,
      20,
    ),
    scatterSpinValues: normalizeWeightedValues(
      ddIn.scatterSpinValues,
      d.dawgsDen.scatterSpinValues,
    ),
    minFreeSpins: clamp(Math.round(num(ddIn.minFreeSpins, d.dawgsDen.minFreeSpins)), 1, 100),
    maxFreeSpins: clamp(Math.round(num(ddIn.maxFreeSpins, d.dawgsDen.maxFreeSpins)), 1, 100),
    toasterReels:
      classicSevenDiamond || !Array.isArray(ddIn.toasterReels)
        ? [...d.dawgsDen.toasterReels]
        : ddIn.toasterReels.map((r) => clamp(Math.round(num(r, 1)), 0, reelsCount - 1)),
    toasterMultChancePercent: clamp(
      num(ddIn.toasterMultChancePercent, d.dawgsDen.toasterMultChancePercent),
      0,
      100,
    ),
    toasterMultiplierValues: normalizeWeightedValues(
      ddIn.toasterMultiplierValues,
      d.dawgsDen.toasterMultiplierValues,
    ),
    toasterCashValues: normalizeWeightedValues(
      ddIn.toasterCashValues,
      d.dawgsDen.toasterCashValues,
    ),
    toasterRevealMode:
      ddIn.toasterRevealMode === "reveal_once" ? "reveal_once" : "reroll_each_spin",
    configStatus: "config-pending",
  };

  const buyIn = Array.isArray(o.buyOptions) ? o.buyOptions : d.buyOptions;
  const buyOptions: PlBuyOptionConfig[] = d.buyOptions.map((def) => {
    const found = buyIn.find((b) => (b as PlBuyOptionConfig)?.id === def.id) as
      | Partial<PlBuyOptionConfig>
      | undefined;
    return {
      ...def,
      enabled: found?.enabled !== false,
      costMult: clamp(num(found?.costMult, def.costMult), 0, 10_000),
      targetRtp: clamp(num(found?.targetRtp, def.targetRtp), 0, 99.5),
      configStatus: "config-pending",
      notes: typeof found?.notes === "string" ? found.notes : def.notes,
    };
  });

  const jurIn = (o.jurisdiction ?? {}) as Partial<PlJurisdictionConfig>;
  const jurisdiction: PlJurisdictionConfig = {
    bonusBuyDisabledMarkets: Array.isArray(jurIn.bonusBuyDisabledMarkets)
      ? jurIn.bonusBuyDisabledMarkets.map(String)
      : [...d.jurisdiction.bonusBuyDisabledMarkets],
  };

  const rtpProfiles = normalizeRtpProfiles(o.rtpProfiles, d);
  const activeRaw = o.activeRtpProfile;
  const activeRtpProfile: PlRtpProfileId = RTP_IDS.includes(activeRaw as PlRtpProfileId)
    ? (activeRaw as PlRtpProfileId)
    : d.activeRtpProfile;
  const activeProfile = rtpProfiles.find((p) => p.id === activeRtpProfile) ?? rtpProfiles[0];

  const dual =
    o.dualTriggerPriority === "dawgs_den" || o.dualTriggerPriority === "both_sequential"
      ? o.dualTriggerPriority
      : "treat_yoself";

  return {
    schemaVersion: 1,
    reelsCount,
    rowsCount,
    reelHeights,
    paylineCount,
    paylines: normalizePaylines(o.paylines, reelsCount, rowsCount, paylineCount, d.paylines),
    minMatchLength: clamp(Math.round(num(o.minMatchLength, d.minMatchLength)), 2, 7),
    minBet: clamp(num(o.minBet, d.minBet), 0.01, 1_000_000),
    maxBet: clamp(num(o.maxBet, d.maxBet), 0.01, 1_000_000),
    maxWinMult: clamp(num(o.maxWinMult, d.maxWinMult), 0, 1_000_000),
    activeRtpProfile,
    rtpProfiles,
    targetRtp: clamp(num(o.targetRtp, activeProfile.targetRtp || d.targetRtp), 0, 99.5),
    volatility: o.volatility === "medium" || o.volatility === "low" ? o.volatility : "high",
    symbols,
    treatMultiplierTables,
    fiveTreatPayStakeMult: clamp(
      num(o.fiveTreatPayStakeMult, d.fiveTreatPayStakeMult),
      0,
      10_000,
    ),
    treatYoSelf,
    dawgsDen,
    buyOptions,
    dualTriggerPriority: dual,
    jurisdiction,
    featurespinsBatchSize: clamp(
      Math.round(num(o.featurespinsBatchSize, d.featurespinsBatchSize)),
      1,
      500,
    ),
  };
}

export function betPerLine(totalBet: number, cfg: PugLifeConfig): number {
  const ways = Math.max(1, totalConnectingWays(cfg.reelHeights ?? [cfg.rowsCount]));
  return +(totalBet / ways).toFixed(6);
}
