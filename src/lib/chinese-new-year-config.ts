/**
 * Chinese New Year math config — shared by engine (client) and Superadmin (server).
 */

export const CHINESE_NEW_YEAR_GAME_ID = "chinese-new-year";

export type ChineseNewYearSymKind =
  | "rat"
  | "snake"
  | "horse"
  | "goat"
  | "pig"
  | "dog"
  | "rooster"
  | "tiger"
  | "monkey"
  | "dragon";

export type ChineseNewYearBombEntry = { mult: number; weight: number };

export type ChineseNewYearScatterCashTier = {
  count: number;
  /** × bet */
  mult: number;
};

export type ChineseNewYearSymbolConfig = {
  id: string;
  kind: ChineseNewYearSymKind;
  label: string;
  /** Relative spawn weight */
  weight: number;
  /** Payout × bet for [min, min+2, min+4] matching symbols */
  pay: [number, number, number];
  scatter?: boolean;
  bomb?: boolean;
};

export type ChineseNewYearConfig = {
  schemaVersion: 1;
  deadSpinChancePercent: number;
  seedMelonBiasPercent: number;
  seedClusterMin: number;
  seedClusterMax: number;
  bombChanceBasePercent: number;
  bombChanceFreeSpinsPercent: number;
  bombTable: ChineseNewYearBombEntry[];
  freeSpinsTriggerCount: number;
  freeSpinsRetriggerCount: number;
  freeSpinsBase: number;
  freeSpinsRetrigger: number;
  anteScatterWeightMult: number;
  scatterCashTiers: ChineseNewYearScatterCashTier[];
  buyFeatureMult: number;
  superBuyFeatureMult: number;
  anteBetMult: number;
  minCluster: number;
  symbols: ChineseNewYearSymbolConfig[];
};

export const SYMBOL_LABELS: Record<ChineseNewYearSymKind, string> = {
  rat: "Rat",
  snake: "Snake",
  horse: "Horse",
  goat: "Goat",
  pig: "Pig",
  dog: "Dog",
  rooster: "Rooster",
  tiger: "Tiger (Wild)",
  monkey: "Monkey (Scatter)",
  dragon: "Dragon (Bonus)",
};

export const DEFAULT_CHINESE_NEW_YEAR_CONFIG: ChineseNewYearConfig = {
  schemaVersion: 1,
  deadSpinChancePercent: 22,
  seedMelonBiasPercent: 35,
  seedClusterMin: 8,
  seedClusterMax: 12,
  bombChanceBasePercent: 5,
  bombChanceFreeSpinsPercent: 25,
  bombTable: [
    { mult: 2, weight: 28 },
    { mult: 3, weight: 22 },
    { mult: 4, weight: 16 },
    { mult: 5, weight: 12 },
    { mult: 8, weight: 8 },
    { mult: 10, weight: 6 },
    { mult: 15, weight: 3 },
    { mult: 20, weight: 2 },
    { mult: 25, weight: 1.5 },
    { mult: 50, weight: 0.5 },
    { mult: 100, weight: 0.1 },
  ],
  freeSpinsTriggerCount: 4,
  freeSpinsRetriggerCount: 3,
  freeSpinsBase: 10,
  freeSpinsRetrigger: 5,
  anteScatterWeightMult: 2,
  scatterCashTiers: [
    { count: 3, mult: 1 },
    { count: 4, mult: 3 },
    { count: 5, mult: 5 },
    { count: 6, mult: 100 },
  ],
  buyFeatureMult: 100,
  superBuyFeatureMult: 500,
  anteBetMult: 1.25,
  minCluster: 8,
  symbols: [
    { id: "rat", kind: "rat", label: "Rat", weight: 18, pay: [0.3, 0.8, 2.5] },
    { id: "snake", kind: "snake", label: "Snake", weight: 16, pay: [0.4, 1.0, 4.0] },
    { id: "horse", kind: "horse", label: "Horse", weight: 14, pay: [0.6, 1.2, 6.0] },
    { id: "goat", kind: "goat", label: "Goat", weight: 12, pay: [1.0, 2.0, 10.0] },
    { id: "pig", kind: "pig", label: "Pig", weight: 10, pay: [1.5, 3.0, 15.0] },
    { id: "dog", kind: "dog", label: "Dog", weight: 8, pay: [2.5, 6.0, 25.0] },
    { id: "rooster", kind: "rooster", label: "Rooster", weight: 6, pay: [4.0, 12.0, 40.0] },
    { id: "dragon", kind: "dragon", label: "Dragon", weight: 4, pay: [10.0, 30.0, 100.0] },
    {
      id: "monkey",
      kind: "monkey",
      label: "Monkey (Scatter)",
      weight: 3.5,
      pay: [0, 0, 0],
      scatter: true,
    },
    {
      id: "tiger",
      kind: "tiger",
      label: "Tiger (Wild)",
      weight: 0,
      pay: [0, 0, 0],
      bomb: true,
    },
  ],
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function normalizeChineseNewYearConfig(raw: unknown): ChineseNewYearConfig {
  const d = DEFAULT_CHINESE_NEW_YEAR_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Record<string, unknown>;

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: ChineseNewYearSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => s && typeof s === "object" && (s as { id?: string }).id === def.id,
    ) as Partial<ChineseNewYearSymbolConfig> | undefined;
    if (!found) return { ...def, pay: [...def.pay] as [number, number, number] };
    const paySrc = Array.isArray(found.pay) ? found.pay : def.pay;
    return {
      ...def,
      label: typeof found.label === "string" && found.label.trim() ? found.label : def.label,
      weight: clamp(num(found.weight, def.weight), 0, 10_000),
      pay: [
        clamp(num(paySrc[0], def.pay[0]), 0, 1_000_000),
        clamp(num(paySrc[1], def.pay[1]), 0, 1_000_000),
        clamp(num(paySrc[2], def.pay[2]), 0, 1_000_000),
      ],
      scatter: def.scatter,
      bomb: def.bomb,
    };
  });

  const bombIn = Array.isArray(o.bombTable) ? o.bombTable : null;
  const bombTable: ChineseNewYearBombEntry[] =
    bombIn && bombIn.length > 0
      ? bombIn
          .map((b) => {
            const row = b as Partial<ChineseNewYearBombEntry>;
            return {
              mult: clamp(num(row.mult, 2), 1, 10_000),
              weight: clamp(num(row.weight, 1), 0, 10_000),
            };
          })
          .filter((b) => b.weight > 0 || b.mult > 0)
      : d.bombTable.map((b) => ({ ...b }));

  const tiersIn = Array.isArray(o.scatterCashTiers) ? o.scatterCashTiers : null;
  const scatterCashTiers: ChineseNewYearScatterCashTier[] =
    tiersIn && tiersIn.length > 0
      ? tiersIn
          .map((t) => {
            const row = t as Partial<ChineseNewYearScatterCashTier>;
            return {
              count: clamp(Math.round(num(row.count, 3)), 1, 30),
              mult: clamp(num(row.mult, 1), 0, 1_000_000),
            };
          })
          .sort((a, b) => a.count - b.count)
      : d.scatterCashTiers.map((t) => ({ ...t }));

  return {
    schemaVersion: 1,
    deadSpinChancePercent: clamp(num(o.deadSpinChancePercent, d.deadSpinChancePercent), 0, 100),
    seedMelonBiasPercent: clamp(num(o.seedMelonBiasPercent, d.seedMelonBiasPercent), 0, 100),
    seedClusterMin: clamp(Math.round(num(o.seedClusterMin, d.seedClusterMin)), 3, 30),
    seedClusterMax: clamp(Math.round(num(o.seedClusterMax, d.seedClusterMax)), 3, 30),
    bombChanceBasePercent: clamp(num(o.bombChanceBasePercent, d.bombChanceBasePercent), 0, 100),
    bombChanceFreeSpinsPercent: clamp(
      num(o.bombChanceFreeSpinsPercent, d.bombChanceFreeSpinsPercent),
      0,
      100,
    ),
    bombTable: bombTable.length ? bombTable : d.bombTable.map((b) => ({ ...b })),
    freeSpinsTriggerCount: clamp(
      Math.round(num(o.freeSpinsTriggerCount, d.freeSpinsTriggerCount)),
      1,
      30,
    ),
    freeSpinsRetriggerCount: clamp(
      Math.round(num(o.freeSpinsRetriggerCount, d.freeSpinsRetriggerCount)),
      1,
      30,
    ),
    freeSpinsBase: clamp(Math.round(num(o.freeSpinsBase, d.freeSpinsBase)), 1, 100),
    freeSpinsRetrigger: clamp(Math.round(num(o.freeSpinsRetrigger, d.freeSpinsRetrigger)), 0, 100),
    anteScatterWeightMult: clamp(num(o.anteScatterWeightMult, d.anteScatterWeightMult), 1, 10),
    scatterCashTiers,
    buyFeatureMult: clamp(num(o.buyFeatureMult, d.buyFeatureMult), 1, 10_000),
    superBuyFeatureMult: clamp(num(o.superBuyFeatureMult, d.superBuyFeatureMult), 1, 10_000),
    anteBetMult: clamp(num(o.anteBetMult, d.anteBetMult), 1, 5),
    minCluster: clamp(Math.round(num(o.minCluster, d.minCluster)), 3, 30),
    symbols,
  };
}

export function configToCellSyms(cfg: ChineseNewYearConfig): {
  id: string;
  kind: ChineseNewYearSymKind;
  weight: number;
  pay: [number, number, number];
  scatter?: boolean;
  bomb?: boolean;
}[] {
  return cfg.symbols.map((s) => ({
    id: s.id,
    kind: s.kind,
    weight: s.weight,
    pay: [...s.pay] as [number, number, number],
    scatter: s.scatter,
    bomb: s.bomb,
  }));
}
