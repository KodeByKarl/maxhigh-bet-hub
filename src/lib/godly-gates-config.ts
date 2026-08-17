/**
 * Godly Gates math config — shared by engine (client) and Superadmin (server).
 * Defaults match the original hardcoded Egyptian ways values.
 */

export const GODLY_GATES_GAME_ID = "godly-gates";

export type GodlyGatesSymKind =
  | "ten"
  | "jack"
  | "queen"
  | "king"
  | "ace"
  | "scarab"
  | "ankh"
  | "horus"
  | "anubis"
  | "pharaoh"
  | "wild"
  | "scatter";

export type GodlyGatesScatterCashTier = {
  count: number;
  /** × bet */
  mult: number;
};

export type GodlyGatesFreeSpinsAward = {
  count: number;
  spins: number;
};

export type GodlyGatesSymbolConfig = {
  id: string;
  kind: GodlyGatesSymKind;
  label: string;
  /** Relative spawn weight */
  weight: number;
  /** Way pays × bet for [3, 4, 5, 6] of a kind */
  pay: [number, number, number, number];
  wild?: boolean;
  scatter?: boolean;
};

export type GodlyGatesConfig = {
  schemaVersion: 1;
  /** Chance (0–100) the opening board is NOT force-seeded with a ways hit */
  deadSpinChancePercent: number;
  seedWinLengthMin: number;
  seedWinLengthMax: number;
  /** When seeding a ways hit, chance a reel cell is wild instead of the pay symbol */
  seedWildChancePercent: number;
  /** Extra wild chance when building a free-spin board */
  freeSpinsWildChancePercent: number;
  /** Wild chance when spawning cascade refill cells in free spins */
  cascadeWildChancePercent: number;
  freeSpinsTriggerCount: number;
  freeSpinsRetriggerCount: number;
  freeSpinsRetrigger: number;
  freeSpinsAwards: GodlyGatesFreeSpinsAward[];
  scatterCashTiers: GodlyGatesScatterCashTier[];
  buyFeatureMult: number;
  fsMultStart: number;
  fsMultStep: number;
  /** Ceiling on the progressive FS cascade multiplier. 0 = uncapped. */
  maxFsMult: number;
  /** Cap on ways-count used in the pay formula (wilds can otherwise explode 5^6). 0 = uncapped. */
  maxWaysCount: number;
  /** Per-spin win ceiling during free spins (× bet). 0 = use maxWinMult. */
  maxFsSpinMult: number;
  /** Max win as × bet for the round. 0 = uncapped. */
  maxWinMult: number;
  symbols: GodlyGatesSymbolConfig[];
};

export const DEFAULT_GODLY_GATES_CONFIG: GodlyGatesConfig = {
  schemaVersion: 1,
  deadSpinChancePercent: 82,
  seedWinLengthMin: 3,
  seedWinLengthMax: 3,
  seedWildChancePercent: 3,
  freeSpinsWildChancePercent: 1,
  cascadeWildChancePercent: 1,
  freeSpinsTriggerCount: 3,
  freeSpinsRetriggerCount: 3,
  freeSpinsRetrigger: 5,
  freeSpinsAwards: [
    { count: 3, spins: 10 },
    { count: 4, spins: 12 },
    { count: 5, spins: 15 },
    { count: 6, spins: 20 },
  ],
  scatterCashTiers: [
    { count: 3, mult: 2 },
    { count: 4, mult: 8 },
    { count: 5, mult: 25 },
    { count: 6, mult: 100 },
  ],
  buyFeatureMult: 80,
  fsMultStart: 1,
  fsMultStep: 1,
  maxFsMult: 3,
  maxWaysCount: 2,
  maxFsSpinMult: 12,
  maxWinMult: 5_000,
  symbols: [
    { id: "ten", kind: "ten", label: "10", weight: 22, pay: [0.042, 0.095, 0.189, 0.378] },
    { id: "jack", kind: "jack", label: "J", weight: 20, pay: [0.052, 0.116, 0.231, 0.462] },
    { id: "queen", kind: "queen", label: "Q", weight: 18, pay: [0.063, 0.147, 0.294, 0.588] },
    { id: "king", kind: "king", label: "K", weight: 16, pay: [0.074, 0.168, 0.357, 0.672] },
    { id: "ace", kind: "ace", label: "A", weight: 14, pay: [0.095, 0.21, 0.42, 0.84] },
    { id: "scarab", kind: "scarab", label: "Scarab", weight: 10, pay: [0.147, 0.336, 0.756, 1.47] },
    { id: "ankh", kind: "ankh", label: "Ankh", weight: 8, pay: [0.189, 0.42, 0.924, 1.68] },
    { id: "horus", kind: "horus", label: "Horus", weight: 6, pay: [0.231, 0.504, 1.176, 2.1] },
    { id: "anubis", kind: "anubis", label: "Anubis", weight: 5, pay: [0.294, 0.672, 1.47, 2.94] },
    { id: "pharaoh", kind: "pharaoh", label: "Pharaoh", weight: 4, pay: [0.378, 0.84, 1.89, 3.78] },
    {
      id: "wild",
      kind: "wild",
      label: "WILD",
      weight: 1.0,
      pay: [0, 0, 0, 0],
      wild: true,
    },
    {
      id: "scatter",
      kind: "scatter",
      label: "SCATTER",
      weight: 1.6,
      pay: [0, 0, 0, 0],
      scatter: true,
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
  ten: [
    [0.15, 0.4, 1, 2],
    [0.6, 1.5, 4, 8],
    [0.2, 0.5, 1.2, 2.5],
    [0.1, 0.22, 0.45, 0.9],
    [0.04, 0.09, 0.18, 0.36],
  ],
  jack: [
    [0.2, 0.5, 1.2, 2.5],
    [0.8, 2, 5, 10],
    [0.25, 0.6, 1.5, 3],
    [0.12, 0.28, 0.55, 1.1],
    [0.05, 0.11, 0.22, 0.44],
  ],
  queen: [
    [0.25, 0.6, 1.4, 3],
    [1, 2.5, 6, 12],
    [0.3, 0.75, 1.8, 3.5],
    [0.15, 0.35, 0.7, 1.4],
    [0.06, 0.14, 0.28, 0.56],
  ],
  king: [
    [0.3, 0.75, 1.8, 4],
    [1.2, 3, 8, 16],
    [0.4, 1, 2.2, 4],
    [0.18, 0.4, 0.85, 1.6],
    [0.07, 0.16, 0.34, 0.64],
  ],
  ace: [
    [0.4, 1, 2.2, 5],
    [1.5, 4, 10, 20],
    [0.5, 1.2, 2.8, 5],
    [0.22, 0.5, 1, 2],
    [0.09, 0.2, 0.4, 0.8],
  ],
  scarab: [
    [0.6, 1.5, 4, 10],
    [2, 6, 15, 35],
    [0.8, 2, 5, 10],
    [0.35, 0.8, 1.8, 3.5],
    [0.14, 0.32, 0.72, 1.4],
  ],
  ankh: [
    [0.8, 2, 5, 12],
    [2.5, 8, 18, 40],
    [1, 2.5, 6, 12],
    [0.45, 1, 2.2, 4],
    [0.18, 0.4, 0.88, 1.6],
  ],
  horus: [
    [1, 2.5, 6, 15],
    [3, 10, 22, 50],
    [1.2, 3, 8, 15],
    [0.55, 1.2, 2.8, 5],
    [0.22, 0.48, 1.12, 2],
  ],
  anubis: [
    [1.2, 3, 8, 20],
    [4, 12, 28, 70],
    [1.5, 4, 10, 20],
    [0.7, 1.6, 3.5, 7],
    [0.28, 0.64, 1.4, 2.8],
  ],
  pharaoh: [
    [1.5, 4, 10, 30],
    [5, 15, 35, 100],
    [2, 5, 12, 25],
    [0.9, 2, 4.5, 9],
    [0.36, 0.8, 1.8, 3.6],
  ],
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
export function normalizeGodlyGatesConfig(raw: unknown): GodlyGatesConfig {
  const d = DEFAULT_GODLY_GATES_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Record<string, unknown>;

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: GodlyGatesSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => s && typeof s === "object" && (s as { id?: string }).id === def.id,
    ) as Partial<GodlyGatesSymbolConfig> | undefined;
    if (!found) return { ...def, pay: [...def.pay] as [number, number, number, number] };
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
        clamp(num(paySrc[3], def.pay[3]), 0, 1_000_000),
      ],
      wild: def.wild,
      scatter: def.scatter,
    };
  });

  const tiersIn = Array.isArray(o.scatterCashTiers) ? o.scatterCashTiers : null;
  const scatterCashTiers: GodlyGatesScatterCashTier[] =
    tiersIn && tiersIn.length > 0
      ? tiersIn
          .map((t) => {
            const row = t as Partial<GodlyGatesScatterCashTier>;
            return {
              count: clamp(Math.round(num(row.count, 3)), 1, 30),
              mult: clamp(num(row.mult, 1), 0, 1_000_000),
            };
          })
          .sort((a, b) => a.count - b.count)
      : d.scatterCashTiers.map((t) => ({ ...t }));

  const awardsIn = Array.isArray(o.freeSpinsAwards) ? o.freeSpinsAwards : null;
  const freeSpinsAwards: GodlyGatesFreeSpinsAward[] =
    awardsIn && awardsIn.length > 0
      ? awardsIn
          .map((t) => {
            const row = t as Partial<GodlyGatesFreeSpinsAward>;
            return {
              count: clamp(Math.round(num(row.count, 3)), 1, 30),
              spins: clamp(Math.round(num(row.spins, 10)), 1, 100),
            };
          })
          .sort((a, b) => a.count - b.count)
      : d.freeSpinsAwards.map((t) => ({ ...t }));

  const seedMin = clamp(Math.round(num(o.seedWinLengthMin, d.seedWinLengthMin)), 3, 6);
  const seedMax = clamp(Math.round(num(o.seedWinLengthMax, d.seedWinLengthMax)), 3, 6);

  return {
    schemaVersion: 1,
    deadSpinChancePercent: clamp(num(o.deadSpinChancePercent, d.deadSpinChancePercent), 0, 100),
    seedWinLengthMin: Math.min(seedMin, seedMax),
    seedWinLengthMax: Math.max(seedMin, seedMax),
    seedWildChancePercent: clamp(num(o.seedWildChancePercent, d.seedWildChancePercent), 0, 100),
    freeSpinsWildChancePercent: clamp(
      num(o.freeSpinsWildChancePercent, d.freeSpinsWildChancePercent),
      0,
      100,
    ),
    cascadeWildChancePercent: clamp(
      num(o.cascadeWildChancePercent, d.cascadeWildChancePercent),
      0,
      100,
    ),
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
    freeSpinsRetrigger: clamp(Math.round(num(o.freeSpinsRetrigger, d.freeSpinsRetrigger)), 0, 100),
    freeSpinsAwards,
    scatterCashTiers,
    buyFeatureMult: clamp(num(o.buyFeatureMult, d.buyFeatureMult), 1, 10_000),
    fsMultStart: clamp(num(o.fsMultStart, d.fsMultStart), 1, 100),
    fsMultStep: clamp(num(o.fsMultStep, d.fsMultStep), 0, 100),
    maxFsMult: clamp(num(o.maxFsMult, d.maxFsMult), 0, 1_000),
    maxWaysCount: clamp(Math.round(num(o.maxWaysCount, d.maxWaysCount)), 0, 10_000),
    maxFsSpinMult: clamp(num(o.maxFsSpinMult, d.maxFsSpinMult), 0, 100_000),
    maxWinMult: clamp(num(o.maxWinMult, d.maxWinMult), 0, 100_000),
    symbols,
  };
}

export function configToCellSyms(cfg: GodlyGatesConfig) {
  return cfg.symbols.map((s) => ({
    id: s.id,
    kind: s.kind,
    weight: s.weight,
    pay: [...s.pay] as [number, number, number, number],
    wild: s.wild,
    scatter: s.scatter,
  }));
}

/** Per-cell spawn % from relative weights. */
export function weightPercents(weights: { id: string; weight: number }[]): Record<string, number> {
  const total = weights.reduce((a, w) => a + Math.max(0, w.weight), 0);
  const out: Record<string, number> = {};
  for (const w of weights) {
    out[w.id] = total > 0 ? +((Math.max(0, w.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}

export function freeSpinsAwardForCount(cfg: GodlyGatesConfig, count: number): number {
  const tiers = [...cfg.freeSpinsAwards].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (count >= t.count) return t.spins;
  }
  return 0;
}
