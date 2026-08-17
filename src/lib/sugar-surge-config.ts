/**
 * Sugar Surge math config — shared by engine (client) and Superadmin (server).
 * Defaults follow educational Sugar Rush–style cluster / multiplier / FS tables.
 */

export const SUGAR_SURGE_GAME_ID = "sugar-surge";

export type SugarSurgeSymKind =
  | "grape"
  | "plum"
  | "melon"
  | "apple"
  | "blue"
  | "green"
  | "purple"
  | "heart"
  | "lollipop"
  | "bomb";

export type SugarSurgeBombEntry = { mult: number; weight: number };

export type SugarSurgeScatterCashTier = {
  count: number;
  /** × bet — 0 = FS-only scatters */
  mult: number;
};

export type SugarSurgeFreeSpinAward = {
  count: number;
  spins: number;
};

export type SugarSurgeSymbolConfig = {
  id: string;
  kind: SugarSurgeSymKind;
  label: string;
  weight: number;
  /** Payout × bet for [minCluster, min+2, min+4+] adjacent matches */
  pay: [number, number, number];
  scatter?: boolean;
  bomb?: boolean;
};

export type SugarSurgeConfig = {
  schemaVersion: 1;
  deadSpinChancePercent: number;
  seedMelonBiasPercent: number;
  seedClusterMin: number;
  seedClusterMax: number;
  /** Legacy — engine no longer spawns bombs */
  bombChanceBasePercent: number;
  bombChanceFreeSpinsPercent: number;
  bombTable: SugarSurgeBombEntry[];
  /** Position multiplier ladder */
  positionMultTiers: number[];
  freeSpinsTriggerCount: number;
  freeSpinsRetriggerCount: number;
  freeSpinsBase: number;
  freeSpinsRetrigger: number;
  freeSpinsByScatterCount: SugarSurgeFreeSpinAward[];
  anteScatterWeightMult: number;
  scatterCashTiers: SugarSurgeScatterCashTier[];
  buyFeatureMult: number;
  superBuyFeatureMult: number;
  anteBetMult: number;
  minCluster: number;
  /** Max win as × bet for the round. 0 = uncapped. */
  maxWinMult: number;
  symbols: SugarSurgeSymbolConfig[];
};

export const SYMBOL_LABELS: Record<SugarSurgeSymKind, string> = {
  grape: "Red bear",
  plum: "Orange bear",
  melon: "Purple bear",
  apple: "Green star",
  blue: "Pink bean",
  green: "Pink candy",
  purple: "Cyan candy",
  heart: "Orange heart",
  lollipop: "Rocket",
  bomb: "Multiplier bomb",
};

export const DEFAULT_SUGAR_SURGE_CONFIG: SugarSurgeConfig = {
  schemaVersion: 1,
  deadSpinChancePercent: 27,
  seedMelonBiasPercent: 30,
  seedClusterMin: 5,
  seedClusterMax: 6,
  bombChanceBasePercent: 0,
  bombChanceFreeSpinsPercent: 0,
  bombTable: [{ mult: 2, weight: 1 }],
  positionMultTiers: [2, 4, 8, 16, 32, 64, 128],
  freeSpinsTriggerCount: 4,
  freeSpinsRetriggerCount: 4,
  freeSpinsBase: 10,
  freeSpinsRetrigger: 10,
  freeSpinsByScatterCount: [
    { count: 4, spins: 10 },
    { count: 5, spins: 12 },
    { count: 6, spins: 15 },
    { count: 7, spins: 20 },
  ],
  anteScatterWeightMult: 2,
  scatterCashTiers: [
    { count: 3, mult: 0 },
    { count: 4, mult: 0 },
    { count: 5, mult: 0 },
    { count: 6, mult: 0 },
  ],
  buyFeatureMult: 100,
  superBuyFeatureMult: 500,
  anteBetMult: 1.25,
  minCluster: 5,
  maxWinMult: 5_000,
  symbols: [
    { id: "grape", kind: "grape", label: "Red bear", weight: 18, pay: [0.22, 0.47, 1.12] },
    { id: "plum", kind: "plum", label: "Orange bear", weight: 16, pay: [0.22, 0.56, 1.35] },
    { id: "melon", kind: "melon", label: "Purple bear", weight: 14, pay: [0.28, 0.67, 1.68] },
    { id: "apple", kind: "apple", label: "Green star", weight: 12, pay: [0.34, 0.9, 2.24] },
    { id: "blue", kind: "blue", label: "Pink bean", weight: 10, pay: [0.45, 1.12, 2.7] },
    { id: "green", kind: "green", label: "Pink candy", weight: 8, pay: [0.56, 1.62, 4.5] },
    { id: "purple", kind: "purple", label: "Cyan candy", weight: 6, pay: [0.9, 2.24, 6.7] },
    { id: "heart", kind: "heart", label: "Orange heart", weight: 5, pay: [1.12, 3.36, 11.2] },
    {
      id: "lollipop",
      kind: "lollipop",
      label: "Rocket",
      weight: 1.55,
      pay: [0, 0, 0],
      scatter: true,
    },
    {
      id: "bomb",
      kind: "bomb",
      label: "Multiplier bomb",
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

/** Prior default tables — migrate stored engine JSON onto the current multipliers. */
const LEGACY_PAY_TABLES: Record<string, number[][]> = {
  grape: [[1, 2, 5], [0.2, 0.4, 1], [0.3, 0.6, 1.5], [0.24, 0.5, 1.2], [0.2, 0.42, 1]],
  plum: [[1, 2.5, 6], [0.2, 0.5, 1.2], [0.3, 0.75, 1.8], [0.24, 0.6, 1.45]],
  melon: [[1.2, 3, 8], [0.25, 0.6, 1.5], [0.35, 0.9, 2.2], [0.3, 0.72, 1.8], [0.25, 0.6, 1.5]],
  apple: [[1.5, 4, 10], [0.3, 0.8, 2], [0.45, 1.2, 3], [0.36, 0.95, 2.4]],
  blue: [[2, 5, 12], [0.4, 1, 2.5], [0.6, 1.5, 3.6], [0.48, 1.2, 2.9], [0.4, 1, 2.4]],
  green: [[2.5, 6, 18], [0.5, 1.5, 4], [0.75, 2.2, 6], [0.6, 1.75, 4.8], [0.5, 1.45, 4]],
  purple: [[4, 10, 25], [0.8, 2, 6], [1.2, 3, 9], [0.95, 2.4, 7.2], [0.8, 2, 6]],
  heart: [[6, 15, 40], [1, 3, 10], [1.5, 4.5, 15], [1.2, 3.6, 12]],
};

function paysMatch(pay: unknown, expected: number[]): boolean {
  if (!Array.isArray(pay) || pay.length < expected.length) return false;
  return expected.every((n, i) => num(pay[i], NaN) === n);
}

function isLegacyDefaultPay(id: string, pay: unknown): boolean {
  const tables = LEGACY_PAY_TABLES[id];
  if (!tables) return false;
  return tables.some((legacy) => paysMatch(pay, legacy));
}

/** Merge partial / stored JSON onto defaults (safe for DB blobs). */
export function normalizeSugarSurgeConfig(raw: unknown): SugarSurgeConfig {
  const d = DEFAULT_SUGAR_SURGE_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Record<string, unknown>;

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: SugarSurgeSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => s && typeof s === "object" && (s as { id?: string }).id === def.id,
    ) as Partial<SugarSurgeSymbolConfig> | undefined;
    if (!found) return { ...def, pay: [...def.pay] as [number, number, number] };
    const paySrc = isLegacyDefaultPay(def.id, found.pay)
      ? def.pay
      : Array.isArray(found.pay)
        ? found.pay
        : def.pay;
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
  const bombTable: SugarSurgeBombEntry[] =
    bombIn && bombIn.length > 0
      ? bombIn
          .map((b) => {
            const row = b as Partial<SugarSurgeBombEntry>;
            return {
              mult: clamp(num(row.mult, 2), 1, 10_000),
              weight: clamp(num(row.weight, 1), 0, 10_000),
            };
          })
          .filter((b) => b.weight > 0 || b.mult > 0)
      : d.bombTable.map((b) => ({ ...b }));

  const tiersIn = Array.isArray(o.scatterCashTiers) ? o.scatterCashTiers : null;
  const scatterCashTiers: SugarSurgeScatterCashTier[] =
    tiersIn && tiersIn.length > 0
      ? tiersIn
          .map((t) => {
            const row = t as Partial<SugarSurgeScatterCashTier>;
            return {
              count: clamp(Math.round(num(row.count, 3)), 1, 30),
              mult: clamp(num(row.mult, 0), 0, 1_000_000),
            };
          })
          .sort((a, b) => a.count - b.count)
      : d.scatterCashTiers.map((t) => ({ ...t }));

  const fsAwardIn = Array.isArray(o.freeSpinsByScatterCount) ? o.freeSpinsByScatterCount : null;
  const freeSpinsByScatterCount: SugarSurgeFreeSpinAward[] =
    fsAwardIn && fsAwardIn.length > 0
      ? fsAwardIn
          .map((t) => {
            const row = t as Partial<SugarSurgeFreeSpinAward>;
            return {
              count: clamp(Math.round(num(row.count, 3)), 1, 30),
              spins: clamp(Math.round(num(row.spins, 10)), 0, 100),
            };
          })
          .sort((a, b) => a.count - b.count)
      : d.freeSpinsByScatterCount.map((t) => ({ ...t }));

  const multIn = Array.isArray(o.positionMultTiers) ? o.positionMultTiers : null;
  const positionMultTiers =
    multIn && multIn.length > 0
      ? multIn
          .map((v) => clamp(Math.round(num(v, 2)), 1, 10_000))
          .filter((v, i, a) => a.indexOf(v) === i)
          .sort((a, b) => a - b)
      : d.positionMultTiers.map((v) => v);

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
    positionMultTiers: positionMultTiers.length ? positionMultTiers : [...d.positionMultTiers],
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
    freeSpinsByScatterCount,
    anteScatterWeightMult: clamp(num(o.anteScatterWeightMult, d.anteScatterWeightMult), 1, 10),
    scatterCashTiers,
    buyFeatureMult: clamp(num(o.buyFeatureMult, d.buyFeatureMult), 1, 10_000),
    superBuyFeatureMult: clamp(num(o.superBuyFeatureMult, d.superBuyFeatureMult), 1, 10_000),
    anteBetMult: clamp(num(o.anteBetMult, d.anteBetMult), 1, 5),
    minCluster: clamp(Math.round(num(o.minCluster, d.minCluster)), 3, 30),
    maxWinMult: clamp(num(o.maxWinMult, d.maxWinMult), 0, 100_000),
    symbols,
  };
}

export function configToCellSyms(cfg: SugarSurgeConfig): {
  id: string;
  kind: SugarSurgeSymKind;
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

export function weightPercents(weights: { id: string; weight: number }[]): Record<string, number> {
  const total = weights.reduce((a, w) => a + Math.max(0, w.weight), 0);
  const out: Record<string, number> = {};
  for (const w of weights) {
    out[w.id] = total > 0 ? +((Math.max(0, w.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}

export function bombTablePercents(table: SugarSurgeBombEntry[]): Record<number, number> {
  const total = table.reduce((a, b) => a + Math.max(0, b.weight), 0);
  const out: Record<number, number> = {};
  for (const b of table) {
    out[b.mult] = total > 0 ? +((Math.max(0, b.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}
