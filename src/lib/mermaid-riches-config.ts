/**
 * Mermaid Riches math config — shared by engine (client) and Superadmin (server).
 * Defaults match the original hardcoded Sweet Bonanza-style values.
 */

export const MERMAID_RICHES_GAME_ID = "mermaid-riches";

export type MermaidRichesSymKind =
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

export type MermaidRichesBombEntry = { mult: number; weight: number };

export type MermaidRichesScatterCashTier = {
  count: number;
  /** × bet */
  mult: number;
};

export type MermaidRichesSymbolConfig = {
  id: string;
  kind: MermaidRichesSymKind;
  label: string;
  /** Relative spawn weight (0 = never from pool; bombs use separate chance) */
  weight: number;
  /** Payout × bet for [min, min+2, min+4] matching symbols */
  pay: [number, number, number];
  scatter?: boolean;
  bomb?: boolean;
};

export type MermaidRichesConfig = {
  schemaVersion: 1;
  /** Chance (0–100) the initial board is NOT force-seeded with a winning cluster */
  deadSpinChancePercent: number;
  /** When seeding a win, bias toward melon (0–100) */
  seedMelonBiasPercent: number;
  seedClusterMin: number;
  seedClusterMax: number;
  /** Per-cell chance to become a bomb instead of the picked symbol */
  bombChanceBasePercent: number;
  bombChanceFreeSpinsPercent: number;
  bombTable: MermaidRichesBombEntry[];
  /** Candy cane (lollipop) free-spins */
  freeSpinsTriggerCount: number;
  freeSpinsRetriggerCount: number;
  freeSpinsBase: number;
  freeSpinsRetrigger: number;
  /** Ante multiplies scatter weight by this factor */
  anteScatterWeightMult: number;
  scatterCashTiers: MermaidRichesScatterCashTier[];
  buyFeatureMult: number;
  superBuyFeatureMult: number;
  anteBetMult: number;
  minCluster: number;
  symbols: MermaidRichesSymbolConfig[];
};

export const SYMBOL_LABELS: Record<MermaidRichesSymKind, string> = {
  grape: "Grape",
  plum: "Plum",
  melon: "Melon",
  apple: "Apple",
  blue: "Blue candy",
  green: "Green candy",
  purple: "Purple candy",
  heart: "Heart",
  lollipop: "Candy cane",
  bomb: "Multiplier bomb",
};

export const DEFAULT_MERMAID_RICHES_CONFIG: MermaidRichesConfig = {
  schemaVersion: 1,
  deadSpinChancePercent: 38,
  seedMelonBiasPercent: 35,
  seedClusterMin: 8,
  seedClusterMax: 12,
  bombChanceBasePercent: 4,
  bombChanceFreeSpinsPercent: 22,
  bombTable: [
    { mult: 2, weight: 28 },
    { mult: 3, weight: 22 },
    { mult: 4, weight: 16 },
    { mult: 5, weight: 12 },
    { mult: 8, weight: 8 },
    { mult: 10, weight: 6 },
    { mult: 12, weight: 3 },
    { mult: 15, weight: 2 },
    { mult: 20, weight: 1.5 },
    { mult: 25, weight: 1 },
    { mult: 50, weight: 0.4 },
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
    { id: "grape", kind: "grape", label: "Grape", weight: 18, pay: [1, 3, 8] },
    { id: "plum", kind: "plum", label: "Plum", weight: 16, pay: [1.2, 3.5, 10] },
    { id: "melon", kind: "melon", label: "Melon", weight: 14, pay: [1.5, 4, 12] },
    { id: "apple", kind: "apple", label: "Apple", weight: 12, pay: [2, 5, 20] },
    { id: "blue", kind: "blue", label: "Blue candy", weight: 10, pay: [2.5, 6, 25] },
    { id: "green", kind: "green", label: "Green candy", weight: 8, pay: [4, 10, 35] },
    { id: "purple", kind: "purple", label: "Purple candy", weight: 6, pay: [6, 18, 50] },
    { id: "heart", kind: "heart", label: "Heart", weight: 5, pay: [12, 30, 80] },
    {
      id: "lollipop",
      kind: "lollipop",
      label: "Candy cane",
      weight: 3.2,
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

/** Original Sweet Bonanza-style ×bet pays — too small vs ₱20–₱100 PH stakes. */
const LEGACY_DEFAULT_PAYS: Record<string, number[]> = {
  grape: [0.25, 0.75, 2],
  plum: [0.4, 0.9, 4],
  melon: [0.5, 1, 5],
  apple: [1, 1.5, 10],
  blue: [1.5, 2, 12],
  green: [2, 5, 15],
  purple: [2.5, 10, 25],
  heart: [10, 25, 50],
};

function isLegacyDefaultPay(id: string, pay: unknown): boolean {
  const legacy = LEGACY_DEFAULT_PAYS[id];
  if (!legacy || !Array.isArray(pay) || pay.length < legacy.length) return false;
  return legacy.every((n, i) => num(pay[i], NaN) === n);
}

/** Merge partial / stored JSON onto defaults (safe for DB blobs). */
export function normalizeMermaidRichesConfig(raw: unknown): MermaidRichesConfig {
  const d = DEFAULT_MERMAID_RICHES_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Record<string, unknown>;

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: MermaidRichesSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => s && typeof s === "object" && (s as { id?: string }).id === def.id,
    ) as Partial<MermaidRichesSymbolConfig> | undefined;
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
  const bombTable: MermaidRichesBombEntry[] =
    bombIn && bombIn.length > 0
      ? bombIn
          .map((b) => {
            const row = b as Partial<MermaidRichesBombEntry>;
            return {
              mult: clamp(num(row.mult, 2), 1, 10_000),
              weight: clamp(num(row.weight, 1), 0, 10_000),
            };
          })
          .filter((b) => b.weight > 0 || b.mult > 0)
      : d.bombTable.map((b) => ({ ...b }));

  const tiersIn = Array.isArray(o.scatterCashTiers) ? o.scatterCashTiers : null;
  const scatterCashTiers: MermaidRichesScatterCashTier[] =
    tiersIn && tiersIn.length > 0
      ? tiersIn
          .map((t) => {
            const row = t as Partial<MermaidRichesScatterCashTier>;
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

export function configToCellSyms(cfg: MermaidRichesConfig): {
  id: string;
  kind: MermaidRichesSymKind;
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

/** Per-cell spawn % from relative weights (excludes bombs with weight 0). */
export function weightPercents(weights: { id: string; weight: number }[]): Record<string, number> {
  const total = weights.reduce((a, w) => a + Math.max(0, w.weight), 0);
  const out: Record<string, number> = {};
  for (const w of weights) {
    out[w.id] = total > 0 ? +((Math.max(0, w.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}

export function bombTablePercents(table: MermaidRichesBombEntry[]): Record<number, number> {
  const total = table.reduce((a, b) => a + Math.max(0, b.weight), 0);
  const out: Record<number, number> = {};
  for (const b of table) {
    out[b.mult] = total > 0 ? +((Math.max(0, b.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}
