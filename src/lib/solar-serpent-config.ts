/**
 * Solar Serpent math config — shared by engine (client) and Superadmin (server).
 * Defaults match the original hardcoded Sweet Bonanza-style values.
 */

export const SOLAR_SERPENT_GAME_ID = "solar-serpent";

export type SolarSerpentSymKind =
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

export type SolarSerpentBombEntry = { mult: 2 | 3 | 4 | 5; weight: number };

export const SOLAR_SERPENT_BOMB_MULTS = [2, 3, 4, 5] as const;

export type SolarSerpentScatterCashTier = {
  count: number;
  /** × bet */
  mult: number;
};

export type SolarSerpentSymbolConfig = {
  id: string;
  kind: SolarSerpentSymKind;
  label: string;
  /** Relative spawn weight (0 = never from pool; bombs use separate chance) */
  weight: number;
  /** Fixed payout multiplier × bet for [min, min+2, min+4] matching symbols */
  pay: [number, number, number];
  scatter?: boolean;
  bomb?: boolean;
};

export type SolarSerpentConfig = {
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
  bombTable: SolarSerpentBombEntry[];
  /** Panther cane (lollipop) free-spins */
  freeSpinsTriggerCount: number;
  freeSpinsRetriggerCount: number;
  freeSpinsBase: number;
  freeSpinsRetrigger: number;
  /** Ante multiplies scatter weight by this factor */
  anteScatterWeightMult: number;
  scatterCashTiers: SolarSerpentScatterCashTier[];
  buyFeatureMult: number;
  superBuyFeatureMult: number;
  anteBetMult: number;
  minCluster: number;
  /** Max win as × bet for the round (paid spin + FS feature). 0 = uncapped. */
  maxWinMult: number;
  /**
   * Ceiling on collected FS bomb multiplier (applied once at feature end).
   * Separate from and well below maxWinMult. 0 = uncapped.
   */
  maxFsBombMult: number;
  /** Hard stop on FS + retriggers so sticky-scatter cascades cannot run away. 0 = uncapped. */
  maxFsSessionSpins: number;
  /** Base-game: strongest bomb on the winning tumble, capped here. 0 = uncapped. */
  maxBaseBombSum: number;
  symbols: SolarSerpentSymbolConfig[];
};

export const SYMBOL_LABELS: Record<SolarSerpentSymKind, string> = {
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

export const DEFAULT_SOLAR_SERPENT_CONFIG: SolarSerpentConfig = {
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
  freeSpinsRetriggerCount: 4,
  freeSpinsBase: 10,
  freeSpinsRetrigger: 3,
  anteScatterWeightMult: 2,
  scatterCashTiers: [
    { count: 3, mult: 1 },
    { count: 4, mult: 3 },
    { count: 5, mult: 5 },
    { count: 6, mult: 100 },
  ],
  /** Per-quantity Buy Bonus price: Price = bet × this. */
  buyFeatureMult: 42.5,
  /** Super buy unit price (5× normal). */
  superBuyFeatureMult: 212.5,
  anteBetMult: 1.25,
  minCluster: 12,
  /** ₱5 × 10,000× = ₱50,000 round cap (the incident that lacked this clamp). */
  maxWinMult: 10_000,
  /** Bombs only resolve to 2x/3x/4x/5x, including feature-end multiplier. */
  maxFsBombMult: 5,
  maxFsSessionSpins: 25,
  maxBaseBombSum: 5,
  symbols: [
    { id: "grape", kind: "grape", label: "10", weight: 18, pay: [0.2, 0.35, 0.8] },
    { id: "plum", kind: "plum", label: "J", weight: 16, pay: [0.35, 0.5, 1.2] },
    { id: "melon", kind: "melon", label: "Q", weight: 14, pay: [0.5, 0.65, 2] },
    { id: "apple", kind: "apple", label: "K", weight: 12, pay: [0.65, 0.8, 4] },
    { id: "blue", kind: "blue", label: "A", weight: 10, pay: [0.8, 2.5, 8] },
    { id: "green", kind: "green", label: "Owl", weight: 8, pay: [2, 10, 50] },
    { id: "purple", kind: "purple", label: "Wolf", weight: 6, pay: [6, 25, 150] },
    { id: "heart", kind: "heart", label: "Ram", weight: 5, pay: [12, 80, 500] },
    {
      id: "lollipop",
      kind: "lollipop",
      label: "Scatter",
      weight: 1.5,
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

/** Map any bomb value onto the only allowed set: 2x / 3x / 4x / 5x. */
export function clampBombMult(v: unknown): SolarSerpentBombEntry["mult"] {
  const n = Math.round(num(v, 2));
  if (n <= 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 4;
  return 5;
}

function num(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Old package buy was 100x / 500x for 10 spins. Unit price is now 42.5x / 212.5x per quantity. */
function migrateBuyUnitMult(v: unknown, fallback: number, superBuy = false) {
  if (typeof v === "number" && Number.isFinite(v)) {
    if (!superBuy && v === 100) return 42.5;
    if (superBuy && v === 500) return 212.5;
    return v;
  }
  return fallback;
}

/** Prior default tables — migrate stored engine JSON onto the current multipliers. */
const LEGACY_PAY_TABLES: Record<string, [number, number, number][]> = {
  grape: [
    [0.25, 0.75, 2],
    [1, 3, 8],
  ],
  plum: [
    [0.4, 0.9, 4],
    [1.2, 3.5, 10],
  ],
  melon: [
    [0.5, 1, 5],
    [1.5, 4, 12],
  ],
  apple: [
    [1, 1.5, 10],
    [2, 5, 20],
  ],
  blue: [
    [1.5, 2, 12],
    [2.5, 6, 25],
  ],
  green: [
    [2, 5, 15],
    [4, 10, 35],
  ],
  purple: [
    [2.5, 10, 25],
    [6, 18, 50],
  ],
  heart: [
    [10, 25, 50],
    [12, 30, 80],
  ],
};

function paysMatch(pay: unknown, expected: [number, number, number]): boolean {
  if (!Array.isArray(pay) || pay.length < 3) return false;
  return num(pay[0], NaN) === expected[0] && num(pay[1], NaN) === expected[1] && num(pay[2], NaN) === expected[2];
}

function isLegacyDefaultPay(id: string, pay: unknown): boolean {
  const tables = LEGACY_PAY_TABLES[id];
  if (!tables) return false;
  return tables.some((legacy) => paysMatch(pay, legacy));
}

/** Merge partial / stored JSON onto defaults (safe for DB blobs). */
export function normalizeSolarSerpentConfig(raw: unknown): SolarSerpentConfig {
  const d = DEFAULT_SOLAR_SERPENT_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Record<string, unknown>;

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: SolarSerpentSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => s && typeof s === "object" && (s as { id?: string }).id === def.id,
    ) as Partial<SolarSerpentSymbolConfig> | undefined;
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
  const bombWeights = new Map<SolarSerpentBombEntry["mult"], number>();
  for (const mult of SOLAR_SERPENT_BOMB_MULTS) {
    bombWeights.set(mult, d.bombTable.find((b) => b.mult === mult)?.weight ?? 1);
  }
  if (bombIn && bombIn.length > 0) {
    for (const b of bombIn) {
      const row = b as Partial<SolarSerpentBombEntry>;
      const n = Math.round(num(row.mult, 0));
      if (!(SOLAR_SERPENT_BOMB_MULTS as readonly number[]).includes(n)) continue;
      const weight = clamp(num(row.weight, 1), 0, 10_000);
      bombWeights.set(n as SolarSerpentBombEntry["mult"], weight);
    }
  }
  const bombTable: SolarSerpentBombEntry[] = SOLAR_SERPENT_BOMB_MULTS.map((mult) => ({
    mult,
    weight: bombWeights.get(mult) ?? 0,
  }));

  const tiersIn = Array.isArray(o.scatterCashTiers) ? o.scatterCashTiers : null;
  const scatterCashTiers: SolarSerpentScatterCashTier[] =
    tiersIn && tiersIn.length > 0
      ? tiersIn
          .map((t) => {
            const row = t as Partial<SolarSerpentScatterCashTier>;
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
    buyFeatureMult: clamp(migrateBuyUnitMult(o.buyFeatureMult, d.buyFeatureMult), 1, 10_000),
    superBuyFeatureMult: clamp(
      migrateBuyUnitMult(o.superBuyFeatureMult, d.superBuyFeatureMult, true),
      1,
      10_000,
    ),
    anteBetMult: clamp(num(o.anteBetMult, d.anteBetMult), 1, 5),
    minCluster: clamp(Math.round(num(o.minCluster, d.minCluster)), 3, 30),
    maxWinMult: clamp(num(o.maxWinMult, d.maxWinMult), 0, 100_000),
    maxFsBombMult: clamp(num(o.maxFsBombMult, d.maxFsBombMult), 0, 5),
    maxFsSessionSpins: clamp(Math.round(num(o.maxFsSessionSpins, d.maxFsSessionSpins)), 0, 200),
    maxBaseBombSum: clamp(num(o.maxBaseBombSum, d.maxBaseBombSum), 0, 5),
    symbols,
  };
}

/** Remaining FS after this spin, honoring maxFsSessionSpins. */
export function remainingFreeSpinsAfterSpin(opts: {
  leftBefore: number;
  retrigger: number;
  playedAfter: number;
  maxSessionSpins: number;
}): number {
  let left = Math.max(0, opts.leftBefore - 1 + Math.max(0, opts.retrigger));
  if (opts.maxSessionSpins > 0) {
    left = Math.min(left, Math.max(0, opts.maxSessionSpins - opts.playedAfter));
  }
  return left;
}

export function configToCellSyms(cfg: SolarSerpentConfig): {
  id: string;
  kind: SolarSerpentSymKind;
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

export function bombTablePercents(table: SolarSerpentBombEntry[]): Record<number, number> {
  const total = table.reduce((a, b) => a + Math.max(0, b.weight), 0);
  const out: Record<number, number> = {};
  for (const b of table) {
    out[b.mult] = total > 0 ? +((Math.max(0, b.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}
