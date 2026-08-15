/**
 * Pharaoh Fire (catalog id: pharaoh-fire) — math & configuration.
 * 5×4 ways (1,024), cascade multipliers, Golden Campfire free spins,
 * Treasure Chest Hold & Collect, Explorer→Legend jackpots.
 */

export const PHARAOH_FIRE_GAME_ID = "pharaoh-fire";
export const PHARAOH_FIRE_TITLE = "Pharaoh Fire";

export type BuffaloSymKind =
  | "sym_10"
  | "sym_j"
  | "sym_q"
  | "sym_k"
  | "sym_a"
  | "lantern"
  | "wagon_wheel"
  | "campfire"
  | "elk"
  | "mountain_lion"
  | "eagle"
  | "grizzly"
  | "bison"
  | "wild"
  | "scatter"
  | "bonus";

export type BuffaloSymbolConfig = {
  id: string;
  kind: BuffaloSymKind;
  name: string;
  tier: "low" | "medium" | "premium" | "wild" | "scatter" | "bonus";
  weight: number;
  weightFreeSpins: number;
  /** Payout × bet for [3, 4, 5] consecutive reels L→R */
  pay: [number, number, number];
  wild?: boolean;
  scatter?: boolean;
  bonus?: boolean;
};

export type BuffaloJackpotTier = {
  id: "explorer" | "prospector" | "pioneer" | "legend";
  label: string;
  mult: number;
  weight: number;
};

export type BuffaloCoinValue = {
  id: string;
  mult: number;
  weight: number;
};

export type PharaohFireConfig = {
  schemaVersion: 1;
  reelsCount: number;
  minReelHeight: number;
  maxReelHeight: number;
  minConsecutiveReels: number;
  baseCascadeMultipliers: number[];
  /** Free spins: cascade ladder (increasing) */
  freeSpinsCascadeMultipliers: number[];
  /** Session-level FS multiplier starts here and +steps each FS spin */
  freeSpinsSessionMultStart: number;
  freeSpinsSessionMultStep: number;
  freeSpinsTriggerCount: number;
  freeSpinsBaseCount: number;
  freeSpinsExtraPerScatter: number;
  buyFeatureMult: number;
  anteBetMult: number;
  anteScatterWeightMult: number;
  /** Treasure Chest Hold & Collect */
  chestTriggerCount: number;
  chestRespins: number;
  chestSpawnChance: number;
  chestJackpotChance: number;
  coinValues: BuffaloCoinValue[];
  jackpots: BuffaloJackpotTier[];
  jackpotMode: "fixed" | "progressive";
  maxWinMult: number;
  targetRtp: number;
  volatility: "Low" | "Medium" | "High";
  symbols: BuffaloSymbolConfig[];
};

export const SYMBOL_NAMES: Record<BuffaloSymKind, string> = {
  sym_10: "10",
  sym_j: "J",
  sym_q: "Q",
  sym_k: "K",
  sym_a: "A",
  lantern: "Lantern",
  wagon_wheel: "Wagon Wheel",
  campfire: "Campfire",
  elk: "Elk",
  mountain_lion: "Mountain Lion",
  eagle: "Bald Eagle",
  grizzly: "Grizzly Bear",
  bison: "Bison",
  wild: "Compass Wild",
  scatter: "Golden Campfire",
  bonus: "Treasure Chest",
};

export const DEFAULT_PHARAOH_FIRE_CONFIG: PharaohFireConfig = {
  schemaVersion: 1,
  reelsCount: 5,
  minReelHeight: 4,
  maxReelHeight: 4,
  minConsecutiveReels: 3,
  baseCascadeMultipliers: [1, 2, 3, 5],
  freeSpinsCascadeMultipliers: [2, 4, 6, 10, 15],
  freeSpinsSessionMultStart: 1,
  freeSpinsSessionMultStep: 1,
  freeSpinsTriggerCount: 4,
  freeSpinsBaseCount: 10,
  freeSpinsExtraPerScatter: 2,
  buyFeatureMult: 80,
  anteBetMult: 1.25,
  anteScatterWeightMult: 1.6,
  chestTriggerCount: 6,
  chestRespins: 3,
  chestSpawnChance: 0.22,
  chestJackpotChance: 0.04,
  coinValues: [
    { id: "c1", mult: 1, weight: 40 },
    { id: "c2", mult: 2, weight: 28 },
    { id: "c3", mult: 3, weight: 16 },
    { id: "c5", mult: 5, weight: 10 },
    { id: "c8", mult: 8, weight: 4 },
    { id: "c12", mult: 12, weight: 2 },
  ],
  jackpots: [
    { id: "explorer", label: "Explorer", mult: 15, weight: 50 },
    { id: "prospector", label: "Prospector", mult: 40, weight: 30 },
    { id: "pioneer", label: "Pioneer", mult: 100, weight: 15 },
    { id: "legend", label: "Legend", mult: 500, weight: 5 },
  ],
  jackpotMode: "fixed",
  maxWinMult: 11000,
  targetRtp: 96.0,
  volatility: "High",
  symbols: [
    { id: "sym_10", kind: "sym_10", name: "10", tier: "low", weight: 130, weightFreeSpins: 100, pay: [0.014, 0.04, 0.1] },
    { id: "sym_j", kind: "sym_j", name: "J", tier: "low", weight: 120, weightFreeSpins: 95, pay: [0.018, 0.05, 0.12] },
    { id: "sym_q", kind: "sym_q", name: "Q", tier: "low", weight: 110, weightFreeSpins: 90, pay: [0.022, 0.06, 0.15] },
    { id: "sym_k", kind: "sym_k", name: "K", tier: "low", weight: 95, weightFreeSpins: 80, pay: [0.028, 0.075, 0.18] },
    { id: "sym_a", kind: "sym_a", name: "A", tier: "low", weight: 85, weightFreeSpins: 75, pay: [0.035, 0.09, 0.22] },
    { id: "lantern", kind: "lantern", name: "Lantern", tier: "medium", weight: 60, weightFreeSpins: 55, pay: [0.055, 0.14, 0.35] },
    { id: "wagon_wheel", kind: "wagon_wheel", name: "Wagon Wheel", tier: "medium", weight: 50, weightFreeSpins: 48, pay: [0.07, 0.18, 0.45] },
    { id: "campfire", kind: "campfire", name: "Campfire", tier: "medium", weight: 42, weightFreeSpins: 40, pay: [0.09, 0.22, 0.55] },
    { id: "elk", kind: "elk", name: "Elk", tier: "premium", weight: 32, weightFreeSpins: 30, pay: [0.12, 0.3, 0.75] },
    { id: "mountain_lion", kind: "mountain_lion", name: "Mountain Lion", tier: "premium", weight: 26, weightFreeSpins: 26, pay: [0.16, 0.4, 1.0] },
    { id: "eagle", kind: "eagle", name: "Bald Eagle", tier: "premium", weight: 20, weightFreeSpins: 22, pay: [0.22, 0.55, 1.4] },
    { id: "grizzly", kind: "grizzly", name: "Grizzly Bear", tier: "premium", weight: 14, weightFreeSpins: 16, pay: [0.3, 0.75, 1.9] },
    { id: "bison", kind: "bison", name: "Bison", tier: "premium", weight: 10, weightFreeSpins: 12, pay: [0.4, 1.0, 2.5] },
    { id: "wild", kind: "wild", name: "Compass", tier: "wild", weight: 8, weightFreeSpins: 14, pay: [0, 0, 0], wild: true },
    {
      id: "scatter",
      kind: "scatter",
      name: "Golden Campfire",
      tier: "scatter",
      weight: 5,
      weightFreeSpins: 3,
      /** Anywhere pays for 3 / 4 / 5+ (FS still needs triggerCount) */
      pay: [0.5, 2.0, 8.0],
      scatter: true,
    },
    { id: "bonus", kind: "bonus", name: "Treasure Chest", tier: "bonus", weight: 7, weightFreeSpins: 0, pay: [0, 0, 0], bonus: true },
  ],
};

export function calcFreeSpinsAward(
  scatterCount: number,
  cfg: PharaohFireConfig = DEFAULT_PHARAOH_FIRE_CONFIG,
): number {
  if (scatterCount < cfg.freeSpinsTriggerCount) return 0;
  const extra = scatterCount - cfg.freeSpinsTriggerCount;
  return cfg.freeSpinsBaseCount + extra * cfg.freeSpinsExtraPerScatter;
}

export function weightPercents(symbols: { id: string; weight: number }[]): Record<string, number> {
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

export function normalizePharaohFireConfig(raw: unknown): PharaohFireConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_PHARAOH_FIRE_CONFIG);
  const obj = raw as Partial<PharaohFireConfig>;
  const d = DEFAULT_PHARAOH_FIRE_CONFIG;

  const symbols =
    Array.isArray(obj.symbols) && obj.symbols.length > 0
      ? obj.symbols.map((s, i) => {
          const base = d.symbols.find((x) => x.id === s?.id) ?? d.symbols[Math.min(i, d.symbols.length - 1)]!;
          const pay = Array.isArray(s?.pay) ? s.pay : base.pay;
          return {
            ...base,
            ...s,
            id: typeof s?.id === "string" ? s.id : base.id,
            kind: (s?.kind as BuffaloSymKind) || base.kind,
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
            bonus: Boolean(s?.bonus ?? base.bonus),
          };
        })
      : structuredClone(d.symbols);

  const baseMults = Array.isArray(obj.baseCascadeMultipliers)
    ? obj.baseCascadeMultipliers.map((m) => clamp(num(m, 1), 1, 1000))
    : d.baseCascadeMultipliers;
  const fsMults = Array.isArray(obj.freeSpinsCascadeMultipliers)
    ? obj.freeSpinsCascadeMultipliers.map((m) => clamp(num(m, 1), 1, 1000))
    : d.freeSpinsCascadeMultipliers;

  const coinValues =
    Array.isArray(obj.coinValues) && obj.coinValues.length > 0
      ? obj.coinValues.map((c, i) => {
          const base = d.coinValues[Math.min(i, d.coinValues.length - 1)]!;
          return {
            id: typeof c?.id === "string" ? c.id : base.id,
            mult: clamp(num(c?.mult, base.mult), 0.1, 10_000),
            weight: clamp(num(c?.weight, base.weight), 0, 10_000),
          };
        })
      : structuredClone(d.coinValues);

  const jackpots =
    Array.isArray(obj.jackpots) && obj.jackpots.length > 0
      ? obj.jackpots.map((j, i) => {
          const base = d.jackpots[Math.min(i, d.jackpots.length - 1)]!;
          return {
            id: (j?.id as BuffaloJackpotTier["id"]) || base.id,
            label: typeof j?.label === "string" ? j.label : base.label,
            mult: clamp(num(j?.mult, base.mult), 1, 100_000),
            weight: clamp(num(j?.weight, base.weight), 0, 10_000),
          };
        })
      : structuredClone(d.jackpots);

  const vol = obj.volatility;
  const volatility: PharaohFireConfig["volatility"] =
    vol === "Low" || vol === "Medium" || vol === "High" ? vol : d.volatility;

  return {
    schemaVersion: 1,
    reelsCount: clamp(Math.round(num(obj.reelsCount, d.reelsCount)), 3, 6),
    minReelHeight: clamp(Math.round(num(obj.minReelHeight, d.minReelHeight)), 2, 6),
    maxReelHeight: clamp(Math.round(num(obj.maxReelHeight, d.maxReelHeight)), 2, 6),
    minConsecutiveReels: clamp(Math.round(num(obj.minConsecutiveReels, d.minConsecutiveReels)), 2, 5),
    baseCascadeMultipliers: baseMults.length ? baseMults : [...d.baseCascadeMultipliers],
    freeSpinsCascadeMultipliers: fsMults.length ? fsMults : [...d.freeSpinsCascadeMultipliers],
    freeSpinsSessionMultStart: clamp(num(obj.freeSpinsSessionMultStart, d.freeSpinsSessionMultStart), 1, 100),
    freeSpinsSessionMultStep: clamp(num(obj.freeSpinsSessionMultStep, d.freeSpinsSessionMultStep), 0, 50),
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
    chestTriggerCount: clamp(Math.round(num(obj.chestTriggerCount, d.chestTriggerCount)), 3, 20),
    chestRespins: clamp(Math.round(num(obj.chestRespins, d.chestRespins)), 1, 10),
    chestSpawnChance: clamp(num(obj.chestSpawnChance, d.chestSpawnChance), 0, 1),
    chestJackpotChance: clamp(num(obj.chestJackpotChance, d.chestJackpotChance), 0, 1),
    coinValues,
    jackpots,
    jackpotMode: obj.jackpotMode === "progressive" ? "progressive" : "fixed",
    maxWinMult: clamp(num(obj.maxWinMult, d.maxWinMult), 0, 100_000),
    targetRtp: clamp(num(obj.targetRtp, d.targetRtp), 80, 99),
    volatility,
    symbols,
  };
}
