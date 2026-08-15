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
  deadSpinChancePercent: 38,
  seedMelonBiasPercent: 30,
  seedClusterMin: 5,
  seedClusterMax: 8,
  bombChanceBasePercent: 0,
  bombChanceFreeSpinsPercent: 0,
  bombTable: [{ mult: 2, weight: 1 }],
  positionMultTiers: [2, 4, 8, 16, 32, 64, 128],
  freeSpinsTriggerCount: 3,
  freeSpinsRetriggerCount: 3,
  freeSpinsBase: 10,
  freeSpinsRetrigger: 10,
  freeSpinsByScatterCount: [
    { count: 3, spins: 10 },
    { count: 4, spins: 12 },
    { count: 5, spins: 15 },
    { count: 6, spins: 20 },
    { count: 7, spins: 30 },
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
  symbols: [
    { id: "grape", kind: "grape", label: "Red bear", weight: 18, pay: [1, 2, 5] },
    { id: "plum", kind: "plum", label: "Orange bear", weight: 16, pay: [1, 2.5, 6] },
    { id: "melon", kind: "melon", label: "Purple bear", weight: 14, pay: [1.2, 3, 8] },
    { id: "apple", kind: "apple", label: "Green star", weight: 12, pay: [1.5, 4, 10] },
    { id: "blue", kind: "blue", label: "Pink bean", weight: 10, pay: [2, 5, 12] },
    { id: "green", kind: "green", label: "Pink candy", weight: 8, pay: [2.5, 6, 18] },
    { id: "purple", kind: "purple", label: "Cyan candy", weight: 6, pay: [4, 10, 25] },
    { id: "heart", kind: "heart", label: "Orange heart", weight: 5, pay: [6, 15, 40] },
    {
      id: "lollipop",
      kind: "lollipop",
      label: "Rocket",
      weight: 2.8,
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

/** Original cluster ×bet pays — too small vs ₱20–₱100 PH stakes. */
const LEGACY_DEFAULT_PAYS: Record<string, number[]> = {
  grape: [0.2, 0.4, 1],
  plum: [0.2, 0.5, 1.2],
  melon: [0.25, 0.6, 1.5],
  apple: [0.3, 0.8, 2],
  blue: [0.4, 1, 2.5],
  green: [0.5, 1.5, 4],
  purple: [0.8, 2, 6],
  heart: [1, 3, 10],
};

function isLegacyDefaultPay(id: string, pay: unknown): boolean {
  const legacy = LEGACY_DEFAULT_PAYS[id];
  if (!legacy || !Array.isArray(pay) || pay.length < legacy.length) return false;
  return legacy.every((n, i) => num(pay[i], NaN) === n);
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
