/**
 * Wild Panther math config — shared by engine (client) and Superadmin (server).
 * Defaults match the original hardcoded Sweet Bonanza-style values.
 */

export const WILD_PANTHER_GAME_ID = "wild-panther";

export type WildPantherSymKind =
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

export type WildPantherBombEntry = { mult: number; weight: number };

export type WildPantherScatterCashTier = {
  count: number;
  /** × bet */
  mult: number;
};

export type WildPantherSymbolConfig = {
  id: string;
  kind: WildPantherSymKind;
  label: string;
  /** Relative spawn weight (0 = never from pool; bombs use separate chance) */
  weight: number;
  /** Payout × bet for [min, min+2, min+4] matching symbols */
  pay: [number, number, number];
  scatter?: boolean;
  bomb?: boolean;
};

export type WildPantherConfig = {
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
  bombTable: WildPantherBombEntry[];
  /** Panther cane (lollipop) free-spins */
  freeSpinsTriggerCount: number;
  freeSpinsRetriggerCount: number;
  freeSpinsBase: number;
  freeSpinsRetrigger: number;
  /** Hard ceiling on spins played in one feature; at the ceiling further retriggers are ignored (earned wins are never reduced). */
  maxFsSessionSpins: number;
  /** Ante multiplies scatter weight by this factor */
  anteScatterWeightMult: number;
  scatterCashTiers: WildPantherScatterCashTier[];
  buyFeatureMult: number;
  superBuyFeatureMult: number;
  anteBetMult: number;
  minCluster: number;
  /** Max win as × bet for a paid spin or a whole free-spin feature. 0 = uncapped. */
  maxWinMult: number;
  symbols: WildPantherSymbolConfig[];
};

export const SYMBOL_LABELS: Record<WildPantherSymKind, string> = {
  grape: "10",
  plum: "J",
  melon: "Q",
  apple: "K",
  blue: "A",
  green: "Owl",
  purple: "Wolf",
  heart: "Ram",
  lollipop: "Scatter",
  bomb: "Wild",
};

export const DEFAULT_WILD_PANTHER_CONFIG: WildPantherConfig = {
  schemaVersion: 1,
  deadSpinChancePercent: 82,
  seedMelonBiasPercent: 35,
  seedClusterMin: 12,
  seedClusterMax: 13,
  bombChanceBasePercent: 1.5,
  bombChanceFreeSpinsPercent: 3,
  bombTable: [
    { mult: 2, weight: 34 },
    { mult: 3, weight: 28 },
    { mult: 4, weight: 22 },
    { mult: 5, weight: 16 },
  ],
  freeSpinsTriggerCount: 4,
  /** Scatters only land on opening boards (never in tumble refills). 4+ => ~7% retrigger x 5 spins = ~0.34 < 1, so features terminate (mean ~15 spins); maxFsSessionSpins is the hard ceiling. */
  freeSpinsRetriggerCount: 4,
  freeSpinsBase: 10,
  freeSpinsRetrigger: 5,
  maxFsSessionSpins: 100,
  anteScatterWeightMult: 1.27,
  scatterCashTiers: [
    { count: 3, mult: 1 },
    { count: 4, mult: 3 },
    { count: 5, mult: 5 },
    { count: 6, mult: 100 },
  ],
  /** Price of the whole 10-spin package (x bet). Calibrator output is per spin (4.1) x 10 spins = 41. */
  buyFeatureMult: 41,
  superBuyFeatureMult: 500,
  anteBetMult: 1.25,
  minCluster: 12,
  /** Matches the 10,000× max win advertised in the lobby. */
  maxWinMult: 10_000,
  symbols: [
    { id: "grape", kind: "grape", label: "10", weight: 18, pay: [0.02, 0.03, 0.08] },
    { id: "plum", kind: "plum", label: "J", weight: 16, pay: [0.03, 0.05, 0.11] },
    { id: "melon", kind: "melon", label: "Q", weight: 14, pay: [0.05, 0.06, 0.19] },
    { id: "apple", kind: "apple", label: "K", weight: 12, pay: [0.06, 0.08, 0.38] },
    { id: "blue", kind: "blue", label: "A", weight: 10, pay: [0.08, 0.24, 0.76] },
    { id: "green", kind: "green", label: "Owl", weight: 8, pay: [0.19, 0.95, 4.73] },
    { id: "purple", kind: "purple", label: "Wolf", weight: 6, pay: [0.57, 2.37, 14.19] },
    { id: "heart", kind: "heart", label: "Ram", weight: 5, pay: [1.14, 7.57, 47.31] },
    {
      id: "lollipop",
      kind: "lollipop",
      label: "Scatter",
      weight: 1.292,
      pay: [0, 0, 0],
      scatter: true,
    },
    {
      id: "bomb",
      kind: "bomb",
      label: "Wild",
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
export function normalizeWildPantherConfig(raw: unknown): WildPantherConfig {
  const d = DEFAULT_WILD_PANTHER_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Record<string, unknown>;

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: WildPantherSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => s && typeof s === "object" && (s as { id?: string }).id === def.id,
    ) as Partial<WildPantherSymbolConfig> | undefined;
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
  const bombTable: WildPantherBombEntry[] =
    bombIn && bombIn.length > 0
      ? bombIn
          .map((b) => {
            const row = b as Partial<WildPantherBombEntry>;
            return {
              mult: clamp(num(row.mult, 2), 1, 10_000),
              weight: clamp(num(row.weight, 1), 0, 10_000),
            };
          })
          .filter((b) => b.weight > 0 || b.mult > 0)
      : d.bombTable.map((b) => ({ ...b }));

  const tiersIn = Array.isArray(o.scatterCashTiers) ? o.scatterCashTiers : null;
  const scatterCashTiers: WildPantherScatterCashTier[] =
    tiersIn && tiersIn.length > 0
      ? tiersIn
          .map((t) => {
            const row = t as Partial<WildPantherScatterCashTier>;
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
    maxFsSessionSpins: clamp(Math.round(num(o.maxFsSessionSpins, d.maxFsSessionSpins)), 10, 200),
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

export function configToCellSyms(cfg: WildPantherConfig): {
  id: string;
  kind: WildPantherSymKind;
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

export function bombTablePercents(table: WildPantherBombEntry[]): Record<number, number> {
  const total = table.reduce((a, b) => a + Math.max(0, b.weight), 0);
  const out: Record<number, number> = {};
  for (const b of table) {
    out[b.mult] = total > 0 ? +((Math.max(0, b.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}
