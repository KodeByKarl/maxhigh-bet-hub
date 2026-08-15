/**
 * Manila Nights math & configuration — shared by server resolver and UI.
 * Forked from Mahjong Ways cascade pattern: 5×5 ways, Golden→Wild, FS Golden Reel.
 * Paytable / RTP / FS awards flagged config-pending until product sign-off.
 */

export const MANILA_NIGHTS_GAME_ID = "manila-nights";

export type ManilaNightsSymKind =
  | "sym_10"
  | "sym_j"
  | "sym_q"
  | "sym_k"
  | "sym_a"
  | "moon"
  | "star"
  | "castle"
  | "princess"
  | "comet"
  | "wild"
  | "scatter";

export type ManilaNightsSymbolConfig = {
  id: string;
  kind: ManilaNightsSymKind;
  name: string;
  tier: "low" | "high" | "wild" | "scatter";
  weight: number;
  weightFreeSpins: number;
  /** Payout × bet for [3 reels, 4 reels, 5 reels] consecutive matching left-to-right */
  pay: [number, number, number];
  wild?: boolean;
  scatter?: boolean;
};

export type ManilaNightsConfig = {
  schemaVersion: 1;
  reelsCount: number;
  /** Fixed 5 rows → 5×5 = 3,125 ways */
  minReelHeight: number;
  maxReelHeight: number;
  minConsecutiveReels: number;
  /** Base cascade ladder: step0, step1, step2, step3+ (cap ×5) — config-pending */
  baseCascadeMultipliers: number[];
  /** Free spins cascade ladder (cap ×10) — config-pending */
  freeSpinsCascadeMultipliers: number[];
  freeSpinsTriggerCount: number;
  /** Config-pending: 10 base FS on 3 scatters */
  freeSpinsBaseCount: number;
  freeSpinsExtraPerScatter: number;
  buyFeatureMult: number;
  anteBetMult: number;
  anteScatterWeightMult: number;
  /** Chance gold on reels 2–4 (indices 1–3) in base / non-guaranteed reels */
  goldChanceInitial: number;
  goldChanceCascade: number;
  /**
   * Free Spins: this reel index always gets gold on eligible symbols.
   * Config-pending default: middle reel (2).
   */
  guaranteedGoldenReelIndex: number;
  maxWinMult: number;
  targetRtp: number;
  symbols: ManilaNightsSymbolConfig[];
};

export const SYMBOL_NAMES: Record<ManilaNightsSymKind, string> = {
  sym_10: "10 Gem",
  sym_j: "J Gem",
  sym_q: "Q Gem",
  sym_k: "K Gem",
  sym_a: "A Gem",
  moon: "Moon Crest",
  star: "Star Crystal",
  castle: "Star Castle",
  princess: "Star Princess",
  comet: "Comet",
  wild: "Winged Wild",
  scatter: "Manila Nights Scatter",
};

/**
 * Provisional pays — heavily scaled for denser 5×5 (3,125 ways).
 * Tuned toward ~96.5% via smoke sim; still config-pending for compliance.
 */
export const DEFAULT_MANILA_NIGHTS_CONFIG: ManilaNightsConfig = {
  schemaVersion: 1,
  reelsCount: 5,
  minReelHeight: 5,
  maxReelHeight: 5,
  minConsecutiveReels: 3,
  baseCascadeMultipliers: [1, 2, 3, 5],
  freeSpinsCascadeMultipliers: [2, 4, 6, 10],
  freeSpinsTriggerCount: 3,
  freeSpinsBaseCount: 10,
  freeSpinsExtraPerScatter: 2,
  buyFeatureMult: 100,
  anteBetMult: 1.25,
  anteScatterWeightMult: 1.8,
  goldChanceInitial: 0.06,
  goldChanceCascade: 0.1,
  guaranteedGoldenReelIndex: 2,
  maxWinMult: 100_000,
  targetRtp: 96.5,
  symbols: [
    {
      id: "sym_10",
      kind: "sym_10",
      name: "10 Gem",
      tier: "low",
      weight: 160,
      weightFreeSpins: 130,
      pay: [0.0026, 0.0076, 0.0194],
    },
    {
      id: "sym_j",
      kind: "sym_j",
      name: "J Gem",
      tier: "low",
      weight: 140,
      weightFreeSpins: 115,
      pay: [0.0035, 0.0097, 0.0259],
    },
    {
      id: "sym_q",
      kind: "sym_q",
      name: "Q Gem",
      tier: "low",
      weight: 120,
      weightFreeSpins: 100,
      pay: [0.0048, 0.013, 0.0324],
    },
    {
      id: "sym_k",
      kind: "sym_k",
      name: "K Gem",
      tier: "low",
      weight: 100,
      weightFreeSpins: 90,
      pay: [0.006, 0.0162, 0.0389],
    },
    {
      id: "sym_a",
      kind: "sym_a",
      name: "A Gem",
      tier: "low",
      weight: 85,
      weightFreeSpins: 78,
      pay: [0.0076, 0.0216, 0.0518],
    },
    {
      id: "moon",
      kind: "moon",
      name: "Moon Crest",
      tier: "high",
      weight: 55,
      weightFreeSpins: 50,
      pay: [0.013, 0.0324, 0.0821],
    },
    {
      id: "star",
      kind: "star",
      name: "Star Crystal",
      tier: "high",
      weight: 40,
      weightFreeSpins: 38,
      pay: [0.0216, 0.0475, 0.1188],
    },
    {
      id: "castle",
      kind: "castle",
      name: "Star Castle",
      tier: "high",
      weight: 28,
      weightFreeSpins: 28,
      pay: [0.0302, 0.0691, 0.162],
    },
    {
      id: "princess",
      kind: "princess",
      name: "Star Princess",
      tier: "high",
      weight: 18,
      weightFreeSpins: 20,
      pay: [0.0432, 0.108, 0.2592],
    },
    {
      id: "comet",
      kind: "comet",
      name: "Comet",
      tier: "high",
      weight: 10,
      weightFreeSpins: 12,
      pay: [0.0691, 0.1728, 0.4752],
    },
    {
      id: "wild",
      kind: "wild",
      name: "Winged Wild",
      tier: "wild",
      weight: 6,
      weightFreeSpins: 9,
      pay: [0, 0, 0],
      wild: true,
    },
    {
      id: "scatter",
      kind: "scatter",
      name: "Manila Nights Scatter",
      tier: "scatter",
      weight: 4,
      weightFreeSpins: 3,
      pay: [0.1296, 0.3888, 1.188],
      scatter: true,
    },
  ],
};

export function calcFreeSpinsAward(
  scatterCount: number,
  cfg: ManilaNightsConfig = DEFAULT_MANILA_NIGHTS_CONFIG,
): number {
  if (scatterCount < cfg.freeSpinsTriggerCount) return 0;
  const extra = scatterCount - cfg.freeSpinsTriggerCount;
  return cfg.freeSpinsBaseCount + extra * cfg.freeSpinsExtraPerScatter;
}

export function weightPercents(
  symbols: { id: string; weight: number }[],
): Record<string, number> {
  const total = symbols.reduce((a, s) => a + Math.max(0, s.weight), 0);
  const out: Record<string, number> = {};
  for (const s of symbols) {
    out[s.id] = total > 0 ? +((Math.max(0, s.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeManilaNightsConfig(raw: unknown): ManilaNightsConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_MANILA_NIGHTS_CONFIG);
  const obj = raw as Partial<ManilaNightsConfig>;
  const d = DEFAULT_MANILA_NIGHTS_CONFIG;

  const symbols =
    Array.isArray(obj.symbols) && obj.symbols.length > 0
      ? obj.symbols.map((s, i) => {
          const base = d.symbols.find((x) => x.id === s?.id) ?? d.symbols[Math.min(i, d.symbols.length - 1)];
          const pay = Array.isArray(s?.pay) ? s.pay : base.pay;
          return {
            ...base,
            ...s,
            id: typeof s?.id === "string" ? s.id : base.id,
            kind: (s?.kind as ManilaNightsSymKind) || base.kind,
            name: typeof s?.name === "string" ? s.name : base.name,
            tier: s?.tier || base.tier,
            weight: clamp(num(s?.weight, base.weight), 0, 10_000),
            weightFreeSpins: clamp(num(s?.weightFreeSpins, base.weightFreeSpins), 0, 10_000),
            pay: [
              clamp(num(pay[0], base.pay[0]), 0, 1000),
              clamp(num(pay[1], base.pay[1]), 0, 1000),
              clamp(num(pay[2], base.pay[2]), 0, 1000),
            ] as [number, number, number],
            wild: Boolean(s?.wild ?? base.wild),
            scatter: Boolean(s?.scatter ?? base.scatter),
          };
        })
      : structuredClone(d.symbols);

  const baseMults = Array.isArray(obj.baseCascadeMultipliers)
    ? obj.baseCascadeMultipliers.map((m) => clamp(num(m, 1), 1, 1000))
    : d.baseCascadeMultipliers;
  const fsMults = Array.isArray(obj.freeSpinsCascadeMultipliers)
    ? obj.freeSpinsCascadeMultipliers.map((m) => clamp(num(m, 1), 1, 1000))
    : d.freeSpinsCascadeMultipliers;

  return {
    schemaVersion: 1,
    reelsCount: clamp(Math.round(num(obj.reelsCount, d.reelsCount)), 3, 6),
    minReelHeight: clamp(Math.round(num(obj.minReelHeight, d.minReelHeight)), 2, 6),
    maxReelHeight: clamp(Math.round(num(obj.maxReelHeight, d.maxReelHeight)), 2, 6),
    minConsecutiveReels: clamp(Math.round(num(obj.minConsecutiveReels, d.minConsecutiveReels)), 2, 5),
    baseCascadeMultipliers: baseMults.length ? baseMults : [...d.baseCascadeMultipliers],
    freeSpinsCascadeMultipliers: fsMults.length ? fsMults : [...d.freeSpinsCascadeMultipliers],
    freeSpinsTriggerCount: clamp(Math.round(num(obj.freeSpinsTriggerCount, d.freeSpinsTriggerCount)), 2, 10),
    freeSpinsBaseCount: clamp(Math.round(num(obj.freeSpinsBaseCount, d.freeSpinsBaseCount)), 1, 100),
    freeSpinsExtraPerScatter: clamp(
      Math.round(num(obj.freeSpinsExtraPerScatter, d.freeSpinsExtraPerScatter)),
      0,
      20,
    ),
    buyFeatureMult: clamp(num(obj.buyFeatureMult, d.buyFeatureMult), 1, 500),
    anteBetMult: clamp(num(obj.anteBetMult, d.anteBetMult), 1, 5),
    anteScatterWeightMult: clamp(num(obj.anteScatterWeightMult, d.anteScatterWeightMult), 1, 10),
    goldChanceInitial: clamp(num(obj.goldChanceInitial, d.goldChanceInitial), 0, 1),
    goldChanceCascade: clamp(num(obj.goldChanceCascade, d.goldChanceCascade), 0, 1),
    guaranteedGoldenReelIndex: clamp(
      Math.round(num(obj.guaranteedGoldenReelIndex, d.guaranteedGoldenReelIndex)),
      0,
      5,
    ),
    maxWinMult: clamp(num(obj.maxWinMult, d.maxWinMult), 0, 100_000),
    targetRtp: clamp(num(obj.targetRtp, d.targetRtp), 80, 99),
    symbols,
  };
}
