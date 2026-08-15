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
  symbols: GodlyGatesSymbolConfig[];
};

export const DEFAULT_GODLY_GATES_CONFIG: GodlyGatesConfig = {
  schemaVersion: 1,
  deadSpinChancePercent: 30,
  seedWinLengthMin: 3,
  seedWinLengthMax: 5,
  seedWildChancePercent: 15,
  freeSpinsWildChancePercent: 8,
  cascadeWildChancePercent: 10,
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
  symbols: [
    { id: "ten", kind: "ten", label: "10", weight: 22, pay: [0.6, 1.5, 4, 8] },
    { id: "jack", kind: "jack", label: "J", weight: 20, pay: [0.8, 2, 5, 10] },
    { id: "queen", kind: "queen", label: "Q", weight: 18, pay: [1, 2.5, 6, 12] },
    { id: "king", kind: "king", label: "K", weight: 16, pay: [1.2, 3, 8, 16] },
    { id: "ace", kind: "ace", label: "A", weight: 14, pay: [1.5, 4, 10, 20] },
    { id: "scarab", kind: "scarab", label: "Scarab", weight: 10, pay: [2, 6, 15, 35] },
    { id: "ankh", kind: "ankh", label: "Ankh", weight: 8, pay: [2.5, 8, 18, 40] },
    { id: "horus", kind: "horus", label: "Horus", weight: 6, pay: [3, 10, 22, 50] },
    { id: "anubis", kind: "anubis", label: "Anubis", weight: 5, pay: [4, 12, 28, 70] },
    { id: "pharaoh", kind: "pharaoh", label: "Pharaoh", weight: 4, pay: [5, 15, 35, 100] },
    {
      id: "wild",
      kind: "wild",
      label: "WILD",
      weight: 3.5,
      pay: [0, 0, 0, 0],
      wild: true,
    },
    {
      id: "scatter",
      kind: "scatter",
      label: "SCATTER",
      weight: 2.5,
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

/** Original ways ×bet pays — too small vs ₱20–₱100 PH stakes. */
const LEGACY_DEFAULT_PAYS: Record<string, number[]> = {
  ten: [0.15, 0.4, 1, 2],
  jack: [0.2, 0.5, 1.2, 2.5],
  queen: [0.25, 0.6, 1.4, 3],
  king: [0.3, 0.75, 1.8, 4],
  ace: [0.4, 1, 2.2, 5],
  scarab: [0.6, 1.5, 4, 10],
  ankh: [0.8, 2, 5, 12],
  horus: [1, 2.5, 6, 15],
  anubis: [1.2, 3, 8, 20],
  pharaoh: [1.5, 4, 10, 30],
};

function isLegacyDefaultPay(id: string, pay: unknown): boolean {
  const legacy = LEGACY_DEFAULT_PAYS[id];
  if (!legacy || !Array.isArray(pay) || pay.length < legacy.length) return false;
  return legacy.every((n, i) => num(pay[i], NaN) === n);
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
