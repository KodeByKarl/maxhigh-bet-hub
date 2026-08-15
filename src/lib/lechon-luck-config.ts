/**
 * Lechon Luck — fixed-payline slot math config (Play'n GO–style).
 * Shared by server resolver, client playback, and Superadmin editor.
 *
 * PENDING DESIGN CONFIRMATION (do not treat as final for compliance):
 * - Exact paytable / reel-strip RTP tuning (target ~96.02%)
 * - Free Spins count on Monkey trigger (placeholder: freeSpinsAward)
 * - Gamble format/odds (placeholder: red/black even-odds)
 * - Wild symbol (none — omitted until product confirms)
 * - Exact row/payline counts (placeholder: 3 rows / 20 lines)
 */

export const LECHON_LUCK_GAME_ID = "lechon-luck";

/** Paying + feature symbols. No dedicated Wild until design confirms. */
export type CnySymKind =
  | "sym_10"
  | "sym_j"
  | "sym_q"
  | "sym_k"
  | "sym_a"
  | "jug"
  | "coins"
  | "fish"
  | "lion"
  | "lantern"
  | "dragon"
  | "monkey"
  /** Free-spins-only Extra Scatter token (substitutes as selected paying symbol). */
  | "extra_scatter";

export type CnySymbolTier = "low" | "high" | "feature" | "extra";

export type CnySymbolConfig = {
  id: string;
  kind: CnySymKind;
  name: string;
  tier: CnySymbolTier;
  /**
   * Pay × bet-per-line for [3, 4, 5] consecutive matches.
   * Royals target ~≤1× total bet on a 5-oak line; themed ~≤5× total bet.
   */
  pay: [number, number, number];
  /** Relative weight per reel index (length = reelsCount). 0 = never on that reel. */
  reelWeights: number[];
  /** Weight used during Free Spins (Extra Scatter may be non-zero only here). */
  reelWeightsFreeSpins: number[];
  dragon?: boolean;
  monkey?: boolean;
  /** Only appears during Free Spins as Extra Scatter substitute. */
  extraScatter?: boolean;
};

export type CnyFireworkAward = {
  id: string;
  label: string;
  /** × total bet */
  mult: number;
  weight: number;
};

export type LechonLuckConfig = {
  schemaVersion: 2;
  reelsCount: number;
  rowsCount: number;
  /** Active payline count; each line is `rows` indices (one row per reel). */
  paylineCount: number;
  /**
   * Payline map: paylines[lineIndex][reelIndex] = row index (0 = top).
   * Length must equal paylineCount; each entry length = reelsCount.
   */
  paylines: number[][];
  minMatchLength: number;
  /** TODO/config-pending — Free Spins awarded on Monkey trigger. */
  freeSpinsAward: number;
  /** Immediate payout on Monkey trigger as × total bet. */
  monkeyTriggerMult: number;
  /** Chance a firework launch succeeds (else bust). 0–100. */
  dragonSuccessChancePercent: number;
  /** Soft cap on launches before forced bust (safety). */
  dragonMaxLaunches: number;
  dragonFireworkAwards: CnyFireworkAward[];
  /**
   * TODO/config-pending — Gamble format: "red_black" even-odds card.
   * Do not hardcode alternate formats without product sign-off.
   */
  gambleFormat: "red_black";
  gambleWinMult: number;
  gambleMaxRounds: number;
  /** Min/max total stake (currency-agnostic; platform may clamp further). */
  minBet: number;
  maxBet: number;
  /** Cap total resolved win as × stake (0 = off). Spec target: 12000. */
  maxWinMult: number;
  /** Target RTP % for simulation/docs — tune via weights, not code. */
  targetRtp: number;
  /** Autoplay default: decline gamble. */
  autoplayDeclineGamble: boolean;
  symbols: CnySymbolConfig[];
};

export const SYMBOL_NAMES: Record<CnySymKind, string> = {
  sym_10: "10",
  sym_j: "Jack",
  sym_q: "Queen",
  sym_k: "King",
  sym_a: "Ace",
  jug: "Fortune Jug",
  coins: "Gold Coins",
  fish: "Koi Fish",
  lion: "Lion Dance",
  lantern: "Red Lantern",
  dragon: "Dragon (Fireworks)",
  monkey: "Monkey (Free Spins)",
  extra_scatter: "Extra Scatter",
};

/** Classic 5×3 / 20 fixed paylines (row: 0 top, 1 mid, 2 bottom). */
export const DEFAULT_PAYLINES_5X3_20: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 2, 1, 0, 1],
  [1, 0, 1, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 2, 1, 2, 0],
];

/**
 * Per-reel weights: Dragon only reels 3–5 (idx 2–4); Monkey only reels 1,3,5 (idx 0,2,4).
 * Values are relative — RTP simulation tunes these.
 */
function rw(reels: [number, number, number, number, number]): number[] {
  return [...reels];
}

export const DEFAULT_LECHON_LUCK_CONFIG: LechonLuckConfig = {
  schemaVersion: 2,
  reelsCount: 5,
  rowsCount: 3,
  paylineCount: 20,
  paylines: DEFAULT_PAYLINES_5X3_20.map((p) => [...p]),
  minMatchLength: 3,
  // TODO/config-pending — confirm Free Spins count with design (placeholder 8).
  freeSpinsAward: 8,
  monkeyTriggerMult: 5,
  dragonSuccessChancePercent: 68,
  dragonMaxLaunches: 25,
  dragonFireworkAwards: [
    { id: "small", label: "Small", mult: 0.5, weight: 36 },
    { id: "medium", label: "Medium", mult: 1.2, weight: 28 },
    { id: "large", label: "Large", mult: 2.5, weight: 18 },
    { id: "grand", label: "Grand", mult: 5, weight: 12 },
    { id: "mega", label: "Mega", mult: 10, weight: 6 },
  ],
  // TODO/config-pending — confirm gamble format/odds with design.
  gambleFormat: "red_black",
  gambleWinMult: 2,
  gambleMaxRounds: 5,
  minBet: 0.5,
  maxBet: 600,
  maxWinMult: 12_000,
  targetRtp: 96.02,
  autoplayDeclineGamble: true,
  symbols: [
    {
      id: "sym_10",
      kind: "sym_10",
      name: "10",
      tier: "low",
      // × bet-per-line — PENDING compliance (50k sim ~96% with these weights)
      pay: [20, 65, 160],
      reelWeights: rw([40, 38, 36, 38, 40]),
      reelWeightsFreeSpins: rw([34, 32, 30, 32, 34]),
    },
    {
      id: "sym_j",
      kind: "sym_j",
      name: "Jack",
      tier: "low",
      pay: [24, 72, 180],
      reelWeights: rw([36, 34, 32, 34, 36]),
      reelWeightsFreeSpins: rw([30, 28, 26, 28, 30]),
    },
    {
      id: "sym_q",
      kind: "sym_q",
      name: "Queen",
      tier: "low",
      pay: [32, 80, 210],
      reelWeights: rw([30, 28, 26, 28, 30]),
      reelWeightsFreeSpins: rw([26, 24, 22, 24, 26]),
    },
    {
      id: "sym_k",
      kind: "sym_k",
      name: "King",
      tier: "low",
      pay: [40, 105, 240],
      reelWeights: rw([24, 22, 20, 22, 24]),
      reelWeightsFreeSpins: rw([20, 18, 16, 18, 20]),
    },
    {
      id: "sym_a",
      kind: "sym_a",
      name: "Ace",
      tier: "low",
      pay: [48, 130, 320],
      reelWeights: rw([18, 16, 14, 16, 18]),
      reelWeightsFreeSpins: rw([16, 14, 12, 14, 16]),
    },
    {
      id: "jug",
      kind: "jug",
      name: "Fortune Jug",
      tier: "high",
      pay: [80, 240, 640],
      reelWeights: rw([12, 12, 10, 12, 12]),
      reelWeightsFreeSpins: rw([12, 12, 10, 12, 12]),
    },
    {
      id: "coins",
      kind: "coins",
      name: "Gold Coins",
      tier: "high",
      pay: [100, 320, 800],
      reelWeights: rw([9, 9, 8, 9, 9]),
      reelWeightsFreeSpins: rw([9, 9, 8, 9, 9]),
    },
    {
      id: "fish",
      kind: "fish",
      name: "Koi Fish",
      tier: "high",
      pay: [120, 400, 1100],
      reelWeights: rw([7, 7, 6, 7, 7]),
      reelWeightsFreeSpins: rw([7, 7, 6, 7, 7]),
    },
    {
      id: "lion",
      kind: "lion",
      name: "Lion Dance",
      tier: "high",
      pay: [160, 560, 1600],
      reelWeights: rw([4, 4, 4, 4, 4]),
      reelWeightsFreeSpins: rw([4, 4, 4, 4, 4]),
    },
    {
      id: "lantern",
      kind: "lantern",
      name: "Red Lantern",
      tier: "high",
      pay: [200, 720, 2000],
      reelWeights: rw([3, 3, 3, 3, 3]),
      reelWeightsFreeSpins: rw([3, 3, 3, 3, 3]),
    },
    {
      id: "dragon",
      kind: "dragon",
      name: "Dragon",
      tier: "feature",
      pay: [0, 0, 0],
      reelWeights: rw([0, 0, 5.5, 5.5, 5.5]),
      reelWeightsFreeSpins: rw([0, 0, 0, 0, 0]),
      dragon: true,
    },
    {
      id: "monkey",
      kind: "monkey",
      name: "Monkey",
      tier: "feature",
      pay: [0, 0, 0],
      reelWeights: rw([5.0, 0, 5.0, 0, 5.0]),
      reelWeightsFreeSpins: rw([0, 0, 0, 0, 0]),
      monkey: true,
    },
    {
      id: "extra_scatter",
      kind: "extra_scatter",
      name: "Extra Scatter",
      tier: "extra",
      pay: [0, 0, 0],
      reelWeights: rw([0, 0, 0, 0, 0]),
      reelWeightsFreeSpins: rw([12, 12, 12, 12, 12]),
      extraScatter: true,
    },
  ],
};function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function normalizePaylines(
  raw: unknown,
  reels: number,
  rows: number,
  count: number,
  fallback: number[][],
): number[][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallback.slice(0, count).map((p) => p.slice(0, reels));
  }
  const out: number[][] = [];
  for (let i = 0; i < count; i++) {
    const src = Array.isArray(raw[i]) ? (raw[i] as unknown[]) : fallback[i] ?? fallback[0];
    const line: number[] = [];
    for (let r = 0; r < reels; r++) {
      line.push(clamp(Math.round(num(src[r], fallback[i]?.[r] ?? 1)), 0, rows - 1));
    }
    out.push(line);
  }
  return out;
}

export function normalizeLechonLuckConfig(raw: unknown): LechonLuckConfig {
  const d = DEFAULT_LECHON_LUCK_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Record<string, unknown>;

  const reelsCount = clamp(Math.round(num(o.reelsCount, d.reelsCount)), 3, 7);
  const rowsCount = clamp(Math.round(num(o.rowsCount, d.rowsCount)), 2, 5);
  const paylineCount = clamp(Math.round(num(o.paylineCount, d.paylineCount)), 1, 50);

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: CnySymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => s && typeof s === "object" && (s as { id?: string }).id === def.id,
    ) as Partial<CnySymbolConfig> | undefined;
    if (!found) {
      return {
        ...def,
        pay: [...def.pay] as [number, number, number],
        reelWeights: [...def.reelWeights],
        reelWeightsFreeSpins: [...def.reelWeightsFreeSpins],
      };
    }
    const paySrc = Array.isArray(found.pay) ? found.pay : def.pay;
    const padWeights = (src: unknown, fb: number[]) => {
      const arr = Array.isArray(src) ? src : fb;
      return Array.from({ length: reelsCount }, (_, i) =>
        clamp(num(arr[i], fb[i] ?? 0), 0, 10_000),
      );
    };
    return {
      ...def,
      name: typeof found.name === "string" && found.name.trim() ? found.name : def.name,
      pay: [
        clamp(num(paySrc[0], def.pay[0]), 0, 1_000_000),
        clamp(num(paySrc[1], def.pay[1]), 0, 1_000_000),
        clamp(num(paySrc[2], def.pay[2]), 0, 1_000_000),
      ],
      reelWeights: padWeights(found.reelWeights, def.reelWeights),
      reelWeightsFreeSpins: padWeights(found.reelWeightsFreeSpins, def.reelWeightsFreeSpins),
      dragon: def.dragon,
      monkey: def.monkey,
      extraScatter: def.extraScatter,
    };
  });

  const awardsIn = Array.isArray(o.dragonFireworkAwards) ? o.dragonFireworkAwards : null;
  const dragonFireworkAwards: CnyFireworkAward[] =
    awardsIn && awardsIn.length > 0
      ? awardsIn
          .map((a, i) => {
            const row = a as Partial<CnyFireworkAward>;
            const fb = d.dragonFireworkAwards[i] ?? d.dragonFireworkAwards[0];
            return {
              id: typeof row.id === "string" && row.id ? row.id : fb.id,
              label: typeof row.label === "string" && row.label ? row.label : fb.label,
              mult: clamp(num(row.mult, fb.mult), 0, 10_000),
              weight: clamp(num(row.weight, fb.weight), 0, 10_000),
            };
          })
          .filter((a) => a.weight > 0)
      : d.dragonFireworkAwards.map((a) => ({ ...a }));

  return {
    schemaVersion: 2,
    reelsCount,
    rowsCount,
    paylineCount,
    paylines: normalizePaylines(o.paylines, reelsCount, rowsCount, paylineCount, d.paylines),
    minMatchLength: clamp(Math.round(num(o.minMatchLength, d.minMatchLength)), 2, 5),
    freeSpinsAward: clamp(Math.round(num(o.freeSpinsAward, d.freeSpinsAward)), 1, 50),
    monkeyTriggerMult: clamp(num(o.monkeyTriggerMult, d.monkeyTriggerMult), 0, 100),
    dragonSuccessChancePercent: clamp(
      num(o.dragonSuccessChancePercent, d.dragonSuccessChancePercent),
      0,
      100,
    ),
    dragonMaxLaunches: clamp(Math.round(num(o.dragonMaxLaunches, d.dragonMaxLaunches)), 1, 100),
    dragonFireworkAwards: dragonFireworkAwards.length
      ? dragonFireworkAwards
      : d.dragonFireworkAwards.map((a) => ({ ...a })),
    gambleFormat: "red_black",
    gambleWinMult: clamp(num(o.gambleWinMult, d.gambleWinMult), 1.1, 10),
    gambleMaxRounds: clamp(Math.round(num(o.gambleMaxRounds, d.gambleMaxRounds)), 1, 20),
    minBet: clamp(num(o.minBet, d.minBet), 0.01, 1_000_000),
    maxBet: clamp(num(o.maxBet, d.maxBet), 0.01, 1_000_000),
    maxWinMult: clamp(num(o.maxWinMult, d.maxWinMult), 0, 1_000_000),
    targetRtp: clamp(num(o.targetRtp, d.targetRtp), 80, 99.5),
    autoplayDeclineGamble:
      typeof o.autoplayDeclineGamble === "boolean"
        ? o.autoplayDeclineGamble
        : d.autoplayDeclineGamble,
    symbols,
  };
}

export function payingSymbolKinds(cfg: LechonLuckConfig = DEFAULT_LECHON_LUCK_CONFIG): CnySymKind[] {
  return cfg.symbols
    .filter((s) => s.tier === "low" || s.tier === "high")
    .map((s) => s.kind);
}

export function betPerLine(totalBet: number, cfg: LechonLuckConfig): number {
  const lines = Math.max(1, cfg.paylineCount);
  return +(totalBet / lines).toFixed(6);
}

/** Relative spawn % for Superadmin symbol weight editor (uses reel 0 base weight). */
export function weightPercents(
  symbols: { id: string; reelWeights: number[] }[],
  reelIndex = 0,
): Record<string, number> {
  const total = symbols.reduce((a, s) => a + Math.max(0, s.reelWeights[reelIndex] ?? 0), 0);
  const out: Record<string, number> = {};
  for (const s of symbols) {
    const w = Math.max(0, s.reelWeights[reelIndex] ?? 0);
    out[s.id] = total > 0 ? +((w / total) * 100).toFixed(2) : 0;
  }
  return out;
}
