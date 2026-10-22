/**
 * Realms math config — the current cluster-tumble schema, shared by the client
 * engine, the settlement server and superadmin.
 *
 * Every title stores one of these as `game_controls.engine_config`. Defaults
 * are generated per title (see ./defaults.ts); this module only validates.
 */

/** Engine symbol ids. Themes give them names and art; the math never changes per id. */
export type RealmsSymKind =
  "l1" | "l2" | "l3" | "l4" | "l5" | "p1" | "p2" | "p3" | "scatter" | "bomb";

export const LOW_KINDS = ["l1", "l2", "l3", "l4", "l5"] as const;
export const PREMIUM_KINDS = ["p1", "p2", "p3"] as const;
export const PAY_KINDS = [...LOW_KINDS, ...PREMIUM_KINDS] as const;
export const ALL_KINDS: readonly RealmsSymKind[] = [...PAY_KINDS, "scatter", "bomb"];

export const BOMB_MULTS = [2, 3, 4, 5] as const;
export type BombMult = (typeof BOMB_MULTS)[number];

export type RealmsBombEntry = { mult: BombMult; weight: number };

export type RealmsScatterCashTier = {
  count: number;
  /** × bet */
  mult: number;
};

export type RealmsSymbolConfig = {
  id: RealmsSymKind;
  kind: RealmsSymKind;
  label: string;
  /** Relative spawn weight (0 = never from pool; bombs use their own chance) */
  weight: number;
  /** Payout × bet for [min, min+2, min+4] matching symbols */
  pay: [number, number, number];
  scatter?: boolean;
  bomb?: boolean;
};

export type RealmsConfig = {
  schemaVersion: 1;
  /** Chance (0–100) the opening board is NOT seeded with a winning cluster */
  deadSpinChancePercent: number;
  /** When seeding a win, chance (0–100) to seed the mid low symbol (l3) */
  seedBiasPercent: number;
  seedClusterMin: number;
  seedClusterMax: number;
  /** Per-cell chance to become a multiplier bomb instead of the picked symbol */
  bombChanceBasePercent: number;
  bombChanceFreeSpinsPercent: number;
  bombTable: RealmsBombEntry[];
  freeSpinsTriggerCount: number;
  freeSpinsRetriggerCount: number;
  freeSpinsBase: number;
  freeSpinsRetrigger: number;
  /** Ante multiplies scatter weight by this factor */
  anteScatterWeightMult: number;
  scatterCashTiers: RealmsScatterCashTier[];
  /** Buy Bonus price per free spin: Total = bet × this × freeSpinsBase (Buy grants the standard award) */
  buyFeatureMult: number;
  anteBetMult: number;
  minCluster: number;
  /** Max win as × bet for the round (paid spin + FS feature). 0 = uncapped. */
  maxWinMult: number;
  /** Ceiling on the collected FS bomb multiplier (applied once at feature end). 0 = uncapped. */
  maxFsBombMult: number;
  /** Hard stop on FS + retriggers. 0 = uncapped. */
  maxFsSessionSpins: number;
  /** Base game: strongest bomb on a winning tumble, capped here. 0 = uncapped. */
  maxBaseBombSum: number;
  symbols: RealmsSymbolConfig[];
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function int(v: unknown, fallback: number, min: number, max: number) {
  return clamp(Math.round(num(v, fallback)), min, max);
}

/** Map any bomb value onto the only allowed set: 2× / 3× / 4× / 5×. */
export function clampBombMult(v: unknown): BombMult {
  const n = Math.round(num(v, 2));
  if (n <= 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 4;
  return 5;
}

/**
 * Merge stored / edited JSON onto a title's defaults.
 * `cells` bounds every "how many matching symbols" field to the board size.
 */
export function normalizeRealmsConfig(
  raw: unknown,
  defaults: RealmsConfig,
  cells: number,
): RealmsConfig {
  const d = defaults;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Record<string, unknown>;

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: RealmsSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => s && typeof s === "object" && (s as { id?: unknown }).id === def.id,
    ) as Partial<RealmsSymbolConfig> | undefined;
    if (!found) return { ...def, pay: [...def.pay] };
    const pay = Array.isArray(found.pay) ? found.pay : def.pay;
    return {
      ...def,
      label: typeof found.label === "string" && found.label.trim() ? found.label : def.label,
      weight: clamp(num(found.weight, def.weight), 0, 10_000),
      pay: [
        clamp(num(pay[0], def.pay[0]), 0, 1_000_000),
        clamp(num(pay[1], def.pay[1]), 0, 1_000_000),
        clamp(num(pay[2], def.pay[2]), 0, 1_000_000),
      ],
    };
  });

  const bombWeights = new Map<BombMult, number>(
    BOMB_MULTS.map((mult) => [mult, d.bombTable.find((b) => b.mult === mult)?.weight ?? 0]),
  );
  if (Array.isArray(o.bombTable)) {
    for (const b of o.bombTable) {
      const row = b as Partial<RealmsBombEntry>;
      const n = Math.round(num(row.mult, 0));
      if (!(BOMB_MULTS as readonly number[]).includes(n)) continue;
      bombWeights.set(n as BombMult, clamp(num(row.weight, 0), 0, 10_000));
    }
  }
  const bombTable = BOMB_MULTS.map((mult) => ({ mult, weight: bombWeights.get(mult) ?? 0 }));

  const scatterCashTiers =
    Array.isArray(o.scatterCashTiers) && o.scatterCashTiers.length > 0
      ? o.scatterCashTiers
          .map((t) => {
            const row = t as Partial<RealmsScatterCashTier>;
            return {
              count: int(row.count, 3, 1, cells),
              mult: clamp(num(row.mult, 0), 0, 1_000_000),
            };
          })
          .sort((a, b) => a.count - b.count)
      : d.scatterCashTiers.map((t) => ({ ...t }));

  return {
    schemaVersion: 1,
    deadSpinChancePercent: clamp(num(o.deadSpinChancePercent, d.deadSpinChancePercent), 0, 100),
    seedBiasPercent: clamp(num(o.seedBiasPercent, d.seedBiasPercent), 0, 100),
    seedClusterMin: int(o.seedClusterMin, d.seedClusterMin, 3, cells),
    seedClusterMax: int(o.seedClusterMax, d.seedClusterMax, 3, cells),
    bombChanceBasePercent: clamp(num(o.bombChanceBasePercent, d.bombChanceBasePercent), 0, 100),
    bombChanceFreeSpinsPercent: clamp(
      num(o.bombChanceFreeSpinsPercent, d.bombChanceFreeSpinsPercent),
      0,
      100,
    ),
    bombTable,
    freeSpinsTriggerCount: int(o.freeSpinsTriggerCount, d.freeSpinsTriggerCount, 1, cells),
    freeSpinsRetriggerCount: int(o.freeSpinsRetriggerCount, d.freeSpinsRetriggerCount, 1, cells),
    freeSpinsBase: int(o.freeSpinsBase, d.freeSpinsBase, 1, 100),
    freeSpinsRetrigger: int(o.freeSpinsRetrigger, d.freeSpinsRetrigger, 0, 100),
    anteScatterWeightMult: clamp(num(o.anteScatterWeightMult, d.anteScatterWeightMult), 1, 10),
    scatterCashTiers,
    buyFeatureMult: clamp(num(o.buyFeatureMult, d.buyFeatureMult), 1, 10_000),
    anteBetMult: clamp(num(o.anteBetMult, d.anteBetMult), 1, 5),
    minCluster: int(o.minCluster, d.minCluster, 3, cells),
    maxWinMult: clamp(num(o.maxWinMult, d.maxWinMult), 0, 100_000),
    maxFsBombMult: clamp(num(o.maxFsBombMult, d.maxFsBombMult), 0, 5),
    maxFsSessionSpins: int(o.maxFsSessionSpins, d.maxFsSessionSpins, 0, 200),
    maxBaseBombSum: clamp(num(o.maxBaseBombSum, d.maxBaseBombSum), 0, 5),
    symbols,
  };
}

/** Remaining FS after this spin, honouring maxFsSessionSpins. */
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

/** Per-cell spawn % from relative weights. */
export function weightPercents(weights: { id: string; weight: number }[]): Record<string, number> {
  const total = weights.reduce((a, w) => a + Math.max(0, w.weight), 0);
  const out: Record<string, number> = {};
  for (const w of weights) {
    out[w.id] = total > 0 ? +((Math.max(0, w.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}

export function bombTablePercents(table: RealmsBombEntry[]): Record<number, number> {
  const total = table.reduce((a, b) => a + Math.max(0, b.weight), 0);
  const out: Record<number, number> = {};
  for (const b of table) {
    out[b.mult] = total > 0 ? +((Math.max(0, b.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}
