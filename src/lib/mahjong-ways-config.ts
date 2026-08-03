/**
 * Mahjong Ways math & configuration — shared by server resolver and UI components.
 * Tunable paytable / weights / ladders live here (never hardcode in engine loops).
 */

export const MAHJONG_WAYS_GAME_ID = "mahjong-ways";

export type MahjongSymKind =
  | "sym_10"
  | "sym_j"
  | "sym_q"
  | "sym_k"
  | "sym_a"
  | "bamboo"
  | "character"
  | "dot"
  | "red_dragon"
  | "green_dragon"
  | "wild"
  | "scatter";

export type MahjongSymbolConfig = {
  id: string;
  kind: MahjongSymKind;
  name: string;
  tier: "low" | "high" | "wild" | "scatter";
  weight: number;
  weightFreeSpins: number;
  /** Payout × bet for [3 reels, 4 reels, 5 reels] consecutive matching left-to-right */
  pay: [number, number, number];
  wild?: boolean;
  scatter?: boolean;
};

export type MahjongWaysConfig = {
  schemaVersion: 1;
  reelsCount: number;
  /** Fixed 4 rows → 5×4 = 1,024 ways when all reels filled */
  minReelHeight: number;
  maxReelHeight: number;
  minConsecutiveReels: number;
  /** Base game cascade ladder: step0, step1, step2, step3+ */
  baseCascadeMultipliers: number[];
  /** Free spins cascade ladder */
  freeSpinsCascadeMultipliers: number[];
  freeSpinsTriggerCount: number;
  /** Spec: 12 base free spins on 3 scatters */
  freeSpinsBaseCount: number;
  /** +N spins per scatter beyond trigger count */
  freeSpinsExtraPerScatter: number;
  buyFeatureMult: number;
  anteBetMult: number;
  anteScatterWeightMult: number;
  /** Gold-plated spawn chance on reels 2–4 (0-indexed 1–3) */
  goldChanceInitial: number;
  goldChanceCascade: number;
  /** Cap total win as multiple of stake within one spin sequence (0 = off) */
  maxWinMult: number;
  targetRtp: number;
  symbols: MahjongSymbolConfig[];
};

export const SYMBOL_NAMES: Record<MahjongSymKind, string> = {
  sym_10: "10 Tile",
  sym_j: "J Tile",
  sym_q: "Q Tile",
  sym_k: "K Tile",
  sym_a: "A Tile",
  bamboo: "5 Bamboo (五条)",
  character: "8 Character (八万)",
  dot: "5 Circle (五饼)",
  red_dragon: "Red Dragon (紅中)",
  green_dragon: "Green Dragon (發財)",
  wild: "Golden Ingot Wild",
  scatter: "Mahjong Gold Scatter",
};

export const DEFAULT_MAHJONG_WAYS_CONFIG: MahjongWaysConfig = {
  schemaVersion: 1,
  reelsCount: 5,
  minReelHeight: 4,
  maxReelHeight: 4,
  minConsecutiveReels: 3,
  baseCascadeMultipliers: [1, 2, 3, 5],
  freeSpinsCascadeMultipliers: [2, 4, 6, 10],
  freeSpinsTriggerCount: 3,
  freeSpinsBaseCount: 12,
  freeSpinsExtraPerScatter: 2,
  buyFeatureMult: 100,
  anteBetMult: 1.25,
  anteScatterWeightMult: 1.8,
  goldChanceInitial: 0.08,
  goldChanceCascade: 0.15,
  maxWinMult: 2893,
  targetRtp: 96.9,
  symbols: [
    {
      id: "sym_10",
      kind: "sym_10",
      name: "10 Tile",
      tier: "low",
      weight: 140,
      weightFreeSpins: 110,
      pay: [0.014, 0.042, 0.11],
    },
    {
      id: "sym_j",
      kind: "sym_j",
      name: "J Tile",
      tier: "low",
      weight: 120,
      weightFreeSpins: 100,
      pay: [0.02, 0.055, 0.14],
    },
    {
      id: "sym_q",
      kind: "sym_q",
      name: "Q Tile",
      tier: "low",
      weight: 100,
      weightFreeSpins: 90,
      pay: [0.028, 0.07, 0.17],
    },
    {
      id: "sym_k",
      kind: "sym_k",
      name: "K Tile",
      tier: "low",
      weight: 85,
      weightFreeSpins: 80,
      pay: [0.035, 0.085, 0.21],
    },
    {
      id: "sym_a",
      kind: "sym_a",
      name: "A Tile",
      tier: "low",
      weight: 75,
      weightFreeSpins: 70,
      pay: [0.042, 0.11, 0.28],
    },
    {
      id: "bamboo",
      kind: "bamboo",
      name: "5 Bamboo",
      tier: "high",
      weight: 55,
      weightFreeSpins: 50,
      pay: [0.07, 0.17, 0.42],
    },
    {
      id: "character",
      kind: "character",
      name: "8 Character",
      tier: "high",
      weight: 40,
      weightFreeSpins: 40,
      pay: [0.11, 0.25, 0.62],
    },
    {
      id: "dot",
      kind: "dot",
      name: "5 Circle",
      tier: "high",
      weight: 30,
      weightFreeSpins: 30,
      pay: [0.14, 0.35, 0.83],
    },
    {
      id: "red_dragon",
      kind: "red_dragon",
      name: "Red Dragon",
      tier: "high",
      weight: 20,
      weightFreeSpins: 22,
      pay: [0.21, 0.55, 1.38],
    },
    {
      id: "green_dragon",
      kind: "green_dragon",
      name: "Green Dragon",
      tier: "high",
      weight: 10,
      weightFreeSpins: 12,
      pay: [0.35, 0.9, 2.48],
    },
    {
      id: "wild",
      kind: "wild",
      name: "Gold Ingot Wild",
      tier: "wild",
      weight: 8,
      weightFreeSpins: 12,
      pay: [0, 0, 0],
      wild: true,
    },
    {
      id: "scatter",
      kind: "scatter",
      name: "Mahjong Gold Scatter",
      tier: "scatter",
      weight: 6,
      weightFreeSpins: 4,
      pay: [0.7, 2.1, 7.0],
      scatter: true,
    },
  ],
};

/** Free spins awarded for a peak scatter count (same formula for trigger & retrigger). */
export function calcFreeSpinsAward(scatterCount: number, cfg: MahjongWaysConfig = DEFAULT_MAHJONG_WAYS_CONFIG): number {
  if (scatterCount < cfg.freeSpinsTriggerCount) return 0;
  const extra = scatterCount - cfg.freeSpinsTriggerCount;
  return cfg.freeSpinsBaseCount + extra * cfg.freeSpinsExtraPerScatter;
}

/** Relative spawn % for symbol weight editor UI. */
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

export function normalizeMahjongWaysConfig(raw: unknown): MahjongWaysConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_MAHJONG_WAYS_CONFIG);
  const obj = raw as Partial<MahjongWaysConfig>;
  const d = DEFAULT_MAHJONG_WAYS_CONFIG;

  const symbols =
    Array.isArray(obj.symbols) && obj.symbols.length > 0
      ? obj.symbols.map((s, i) => {
          const base = d.symbols.find((x) => x.id === s?.id) ?? d.symbols[Math.min(i, d.symbols.length - 1)];
          const pay = Array.isArray(s?.pay) ? s.pay : base.pay;
          return {
            ...base,
            ...s,
            id: typeof s?.id === "string" ? s.id : base.id,
            kind: (s?.kind as MahjongSymKind) || base.kind,
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
    maxWinMult: clamp(num(obj.maxWinMult, d.maxWinMult), 0, 100_000),
    targetRtp: clamp(num(obj.targetRtp, d.targetRtp), 80, 99),
    symbols,
  };
}
