/**
 * Frontier Gold: Hold & Win — fixed-payline western slot math.
 * MaxHigh React + server-authoritative pattern (not Phaser).
 * Paytable / RTP / jackpot weights are config-pending until product sign-off.
 */

export const FRONTIER_GOLD_GAME_ID = "frontier-gold";

export type FgSymKind =
  | "sym_a"
  | "sym_k"
  | "sym_q"
  | "sym_j"
  | "safe"
  | "banker"
  | "bartender"
  | "bandit"
  | "sheriff"
  | "wild"
  | "scatter"
  | "bonus";

export type FgSymbolConfig = {
  id: string;
  kind: FgSymKind;
  name: string;
  tier: "low" | "high" | "wild" | "scatter" | "bonus";
  /** Pay × bet-per-line for [3, 4, 5] matches */
  pay: [number, number, number];
  /** Relative weight per reel (length = reelsCount) */
  reelWeights: number[];
  reelWeightsFreeSpins: number[];
  wild?: boolean;
  scatter?: boolean;
  bonus?: boolean;
};

export type FgCoinValue = {
  id: string;
  /** × total bet */
  mult: number;
  weight: number;
};

export type FgJackpotTier = {
  id: "mini" | "minor" | "major" | "grand";
  label: string;
  /** × total bet */
  mult: number;
  weight: number;
};

export type FrontierGoldConfig = {
  schemaVersion: 1;
  reelsCount: number;
  rowsCount: number;
  paylineCount: number;
  paylines: number[][];
  minMatchLength: number;
  freeSpinsTriggerCount: number;
  freeSpinsBaseCount: number;
  freeSpinsExtraPerScatter: number;
  /** Bonus coins needed to trigger Hold & Win */
  holdWinTriggerCount: number;
  holdWinRespins: number;
  /** Chance a empty cell spawns a coin during Hold & Win respin (0–1) */
  holdWinCoinChance: number;
  /** Chance a Hold & Win coin is a jackpot instead of a value coin (0–1) */
  holdWinJackpotChance: number;
  coinValues: FgCoinValue[];
  jackpots: FgJackpotTier[];
  buyFeatureMult: number;
  minBet: number;
  maxBet: number;
  maxWinMult: number;
  targetRtp: number;
  symbols: FgSymbolConfig[];
};

export const SYMBOL_NAMES: Record<FgSymKind, string> = {
  sym_a: "Ace",
  sym_k: "King",
  sym_q: "Queen",
  sym_j: "Jack",
  safe: "Safe",
  banker: "Banker",
  bartender: "Bartender",
  bandit: "Bandit",
  sheriff: "Sheriff",
  wild: "Sheriff Badge",
  scatter: "Gold Star",
  bonus: "Gold Coin",
};

/** Classic 5×3 / 25 fixed paylines (0=top, 1=mid, 2=bottom). */
export const DEFAULT_PAYLINES_5X3_25: number[][] = [
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
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 0, 2, 0, 1],
];

function rw(a: [number, number, number, number, number]): number[] {
  return [...a];
}

export const DEFAULT_FRONTIER_GOLD_CONFIG: FrontierGoldConfig = {
  schemaVersion: 1,
  reelsCount: 5,
  rowsCount: 3,
  paylineCount: 25,
  paylines: structuredClone(DEFAULT_PAYLINES_5X3_25),
  minMatchLength: 3,
  freeSpinsTriggerCount: 3,
  freeSpinsBaseCount: 10,
  freeSpinsExtraPerScatter: 2,
  holdWinTriggerCount: 6,
  holdWinRespins: 3,
  holdWinCoinChance: 0.085,
  holdWinJackpotChance: 0.02,
  coinValues: [
    { id: "c1", mult: 1, weight: 48 },
    { id: "c2", mult: 2, weight: 30 },
    { id: "c5", mult: 5, weight: 14 },
    { id: "c10", mult: 10, weight: 5 },
    { id: "c20", mult: 20, weight: 2 },
    { id: "c50", mult: 50, weight: 0.8 },
    { id: "c100", mult: 100, weight: 0.2 },
  ],
  jackpots: [
    { id: "mini", label: "Mini", mult: 15, weight: 85 },
    { id: "minor", label: "Minor", mult: 40, weight: 12 },
    { id: "major", label: "Major", mult: 150, weight: 2.8 },
    { id: "grand", label: "Grand", mult: 1000, weight: 0.2 },
  ],
  buyFeatureMult: 100,
  minBet: 0.25,
  maxBet: 35,
  maxWinMult: 10257,
  targetRtp: 96.26,
  symbols: [
    {
      id: "sym_j",
      kind: "sym_j",
      name: "Jack",
      tier: "low",
      /** × bet-per-line for 3 / 4 / 5 */
      pay: [14, 35, 110],
      reelWeights: rw([48, 48, 48, 48, 48]),
      reelWeightsFreeSpins: rw([44, 44, 44, 44, 44]),
    },
    {
      id: "sym_q",
      kind: "sym_q",
      name: "Queen",
      tier: "low",
      pay: [18, 48, 140],
      reelWeights: rw([44, 44, 44, 44, 44]),
      reelWeightsFreeSpins: rw([40, 40, 40, 40, 40]),
    },
    {
      id: "sym_k",
      kind: "sym_k",
      name: "King",
      tier: "low",
      pay: [22, 60, 180],
      reelWeights: rw([40, 40, 40, 40, 40]),
      reelWeightsFreeSpins: rw([36, 36, 36, 36, 36]),
    },
    {
      id: "sym_a",
      kind: "sym_a",
      name: "Ace",
      tier: "low",
      pay: [28, 75, 220],
      reelWeights: rw([36, 36, 36, 36, 36]),
      reelWeightsFreeSpins: rw([32, 32, 32, 32, 32]),
    },
    {
      id: "sheriff",
      kind: "sheriff",
      name: "Sheriff",
      tier: "high",
      pay: [25, 70, 220],
      reelWeights: rw([16, 16, 16, 16, 16]),
      reelWeightsFreeSpins: rw([14, 14, 14, 14, 14]),
    },
    {
      id: "bartender",
      kind: "bartender",
      name: "Bartender",
      tier: "high",
      pay: [30, 90, 280],
      reelWeights: rw([12, 12, 12, 12, 12]),
      reelWeightsFreeSpins: rw([11, 11, 11, 11, 11]),
    },
    {
      id: "banker",
      kind: "banker",
      name: "Banker",
      tier: "high",
      pay: [40, 120, 350],
      reelWeights: rw([10, 10, 10, 10, 10]),
      reelWeightsFreeSpins: rw([9, 9, 9, 9, 9]),
    },
    {
      id: "bandit",
      kind: "bandit",
      name: "Bandit",
      tier: "high",
      pay: [50, 150, 500],
      reelWeights: rw([7, 7, 7, 7, 7]),
      reelWeightsFreeSpins: rw([6, 6, 6, 6, 6]),
    },
    {
      id: "safe",
      kind: "safe",
      name: "Safe",
      tier: "high",
      pay: [60, 200, 600],
      reelWeights: rw([5, 5, 5, 5, 5]),
      reelWeightsFreeSpins: rw([5, 5, 5, 5, 5]),
    },
    {
      id: "wild",
      kind: "wild",
      name: "Sheriff Badge",
      tier: "wild",
      pay: [50, 150, 500],
      reelWeights: rw([4, 4, 4, 4, 4]),
      reelWeightsFreeSpins: rw([6, 6, 6, 6, 6]),
      wild: true,
    },
    {
      id: "scatter",
      kind: "scatter",
      name: "Gold Star",
      tier: "scatter",
      /** × total bet for 3 / 4 / 5 anywhere */
      pay: [2, 5, 20],
      reelWeights: rw([3, 3, 3, 3, 3]),
      reelWeightsFreeSpins: rw([2, 2, 2, 2, 2]),
      scatter: true,
    },
    {
      id: "bonus",
      kind: "bonus",
      name: "Gold Coin",
      tier: "bonus",
      pay: [0, 0, 0],
      reelWeights: rw([27, 27, 27, 27, 27]),
      reelWeightsFreeSpins: rw([14, 14, 14, 14, 14]),
      bonus: true,
    },
  ],
};

export function betPerLine(totalBet: number, cfg: FrontierGoldConfig = DEFAULT_FRONTIER_GOLD_CONFIG): number {
  const lines = Math.max(1, cfg.paylineCount);
  return +(totalBet / lines).toFixed(6);
}

export function calcFreeSpinsAward(
  scatterCount: number,
  cfg: FrontierGoldConfig = DEFAULT_FRONTIER_GOLD_CONFIG,
): number {
  if (scatterCount < cfg.freeSpinsTriggerCount) return 0;
  const extra = scatterCount - cfg.freeSpinsTriggerCount;
  return cfg.freeSpinsBaseCount + extra * cfg.freeSpinsExtraPerScatter;
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeFrontierGoldConfig(raw: unknown): FrontierGoldConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_FRONTIER_GOLD_CONFIG);
  const obj = raw as Partial<FrontierGoldConfig>;
  const d = DEFAULT_FRONTIER_GOLD_CONFIG;

  const symbols =
    Array.isArray(obj.symbols) && obj.symbols.length > 0
      ? obj.symbols.map((s, i) => {
          const base = d.symbols.find((x) => x.id === s?.id) ?? d.symbols[Math.min(i, d.symbols.length - 1)];
          const pay = Array.isArray(s?.pay) ? s.pay : base.pay;
          const rwBase = Array.isArray(s?.reelWeights) ? s.reelWeights : base.reelWeights;
          const rwFs = Array.isArray(s?.reelWeightsFreeSpins) ? s.reelWeightsFreeSpins : base.reelWeightsFreeSpins;
          return {
            ...base,
            ...s,
            id: typeof s?.id === "string" ? s.id : base.id,
            kind: (s?.kind as FgSymKind) || base.kind,
            name: typeof s?.name === "string" ? s.name : base.name,
            tier: s?.tier || base.tier,
            pay: [
              clamp(num(pay[0], base.pay[0]), 0, 10_000),
              clamp(num(pay[1], base.pay[1]), 0, 10_000),
              clamp(num(pay[2], base.pay[2]), 0, 10_000),
            ] as [number, number, number],
            reelWeights: d.reelsCount
              ? Array.from({ length: d.reelsCount }, (_, ri) => clamp(num(rwBase[ri], base.reelWeights[ri] ?? 0), 0, 10_000))
              : [...base.reelWeights],
            reelWeightsFreeSpins: Array.from({ length: d.reelsCount }, (_, ri) =>
              clamp(num(rwFs[ri], base.reelWeightsFreeSpins[ri] ?? 0), 0, 10_000),
            ),
            wild: Boolean(s?.wild ?? base.wild),
            scatter: Boolean(s?.scatter ?? base.scatter),
            bonus: Boolean(s?.bonus ?? base.bonus),
          };
        })
      : structuredClone(d.symbols);

  const paylines =
    Array.isArray(obj.paylines) && obj.paylines.length > 0
      ? obj.paylines.map((line) =>
          Array.isArray(line) ? line.map((r) => clamp(Math.round(num(r, 1)), 0, 2)) : [1, 1, 1, 1, 1],
        )
      : structuredClone(d.paylines);

  const coinValues =
    Array.isArray(obj.coinValues) && obj.coinValues.length > 0
      ? obj.coinValues.map((c, i) => {
          const base = d.coinValues[Math.min(i, d.coinValues.length - 1)];
          return {
            id: typeof c?.id === "string" ? c.id : base.id,
            mult: clamp(num(c?.mult, base.mult), 0.1, 10_000),
            weight: clamp(num(c?.weight, base.weight), 0, 10_000),
          };
        })
      : structuredClone(d.coinValues);

  const jackpots =
    Array.isArray(obj.jackpots) && obj.jackpots.length > 0
      ? obj.jackpots.map((j, i) => {
          const base = d.jackpots[Math.min(i, d.jackpots.length - 1)];
          return {
            id: (j?.id as FgJackpotTier["id"]) || base.id,
            label: typeof j?.label === "string" ? j.label : base.label,
            mult: clamp(num(j?.mult, base.mult), 1, 100_000),
            weight: clamp(num(j?.weight, base.weight), 0, 10_000),
          };
        })
      : structuredClone(d.jackpots);

  return {
    schemaVersion: 1,
    reelsCount: clamp(Math.round(num(obj.reelsCount, d.reelsCount)), 3, 6),
    rowsCount: clamp(Math.round(num(obj.rowsCount, d.rowsCount)), 2, 5),
    paylineCount: clamp(Math.round(num(obj.paylineCount, paylines.length || d.paylineCount)), 1, 50),
    paylines,
    minMatchLength: clamp(Math.round(num(obj.minMatchLength, d.minMatchLength)), 2, 5),
    freeSpinsTriggerCount: clamp(Math.round(num(obj.freeSpinsTriggerCount, d.freeSpinsTriggerCount)), 2, 10),
    freeSpinsBaseCount: clamp(Math.round(num(obj.freeSpinsBaseCount, d.freeSpinsBaseCount)), 1, 100),
    freeSpinsExtraPerScatter: clamp(
      Math.round(num(obj.freeSpinsExtraPerScatter, d.freeSpinsExtraPerScatter)),
      0,
      20,
    ),
    holdWinTriggerCount: clamp(Math.round(num(obj.holdWinTriggerCount, d.holdWinTriggerCount)), 3, 15),
    holdWinRespins: clamp(Math.round(num(obj.holdWinRespins, d.holdWinRespins)), 1, 10),
    holdWinCoinChance: clamp(num(obj.holdWinCoinChance, d.holdWinCoinChance), 0, 1),
    holdWinJackpotChance: clamp(num(obj.holdWinJackpotChance, d.holdWinJackpotChance), 0, 1),
    coinValues,
    jackpots,
    buyFeatureMult: clamp(num(obj.buyFeatureMult, d.buyFeatureMult), 1, 500),
    minBet: clamp(num(obj.minBet, d.minBet), 0.01, 1000),
    maxBet: clamp(num(obj.maxBet, d.maxBet), 0.01, 100_000),
    maxWinMult: clamp(num(obj.maxWinMult, d.maxWinMult), 0, 100_000),
    targetRtp: clamp(num(obj.targetRtp, d.targetRtp), 80, 99),
    symbols,
  };
}
