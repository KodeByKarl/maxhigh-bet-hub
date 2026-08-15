/**
 * Gold Mine Dig: Hold & Win — diamond connecting-ways western slot math.
 * Layout: reel heights 3-4-5-4-3 (720 ways) — fuller board for phones vs 1-2-3-4-3-2-1.
 * MaxHigh React + server-authoritative pattern (not Phaser).
 */

export const GOLD_MINE_GAME_ID = "gold-mine";

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
  /**
   * Pay × totalBet × waysCount for [3, 4, 5+] consecutive reels.
   * (Stake multipliers — same model as Pug Den connecting ways.)
   */
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

export type GoldMineConfig = {
  schemaVersion: 1;
  reelsCount: number;
  rowsCount: number;
  /** Per-reel column heights — default [3,4,5,4,3]. */
  reelHeights: number[];
  /** Connecting ways product (compat field name) = ∏ reelHeights. */
  paylineCount: number;
  /** Unused — connecting ways; kept empty for admin dumps. */
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

/**
 * Phone-friendly diamond reel heights → 3×4×5×4×3 = 720 connecting ways.
 * (Replaces classic 1-2-3-4-3-2-1 / 144 ways so cells can scale larger on mobile.)
 */
export const DEFAULT_REEL_HEIGHTS = [3, 4, 5, 4, 3] as const;

export function totalConnectingWays(reelHeights: number[]): number {
  return reelHeights.reduce((acc, h) => acc * Math.max(0, h), 1);
}

export function totalCells(cfg: Pick<GoldMineConfig, "reelHeights">): number {
  return cfg.reelHeights.reduce((acc, h) => acc + Math.max(0, h), 0);
}

/** @deprecated Fixed paylines removed — connecting ways on diamond board. */
export const DEFAULT_PAYLINES_5X3_25: number[][] = [];

function rw(a: [number, number, number, number, number]): number[] {
  return [...a];
}

export const DEFAULT_GOLD_MINE_CONFIG: GoldMineConfig = {
  schemaVersion: 1,
  reelsCount: 5,
  rowsCount: 5,
  reelHeights: [...DEFAULT_REEL_HEIGHTS],
  paylineCount: totalConnectingWays([...DEFAULT_REEL_HEIGHTS]),
  paylines: [],
  minMatchLength: 3,
  freeSpinsTriggerCount: 3,
  freeSpinsBaseCount: 10,
  freeSpinsExtraPerScatter: 2,
  holdWinTriggerCount: 6,
  holdWinRespins: 3,
  holdWinCoinChance: 0.062,
  holdWinJackpotChance: 0.018,
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
      /** × totalBet × ways for 3 / 4 / 5+ (scaled for 720-way / 3-4-5-4-3 board) */
      pay: [0.04, 0.09, 0.3],
      reelWeights: rw([48, 48, 48, 48, 48]),
      reelWeightsFreeSpins: rw([44, 44, 44, 44, 44]),
    },
    {
      id: "sym_q",
      kind: "sym_q",
      name: "Queen",
      tier: "low",
      pay: [0.045, 0.11, 0.38],
      reelWeights: rw([44, 44, 44, 44, 44]),
      reelWeightsFreeSpins: rw([40, 40, 40, 40, 40]),
    },
    {
      id: "sym_k",
      kind: "sym_k",
      name: "King",
      tier: "low",
      pay: [0.06, 0.15, 0.45],
      reelWeights: rw([40, 40, 40, 40, 40]),
      reelWeightsFreeSpins: rw([36, 36, 36, 36, 36]),
    },
    {
      id: "sym_a",
      kind: "sym_a",
      name: "Ace",
      tier: "low",
      pay: [0.075, 0.19, 0.55],
      reelWeights: rw([36, 36, 36, 36, 36]),
      reelWeightsFreeSpins: rw([32, 32, 32, 32, 32]),
    },
    {
      id: "sheriff",
      kind: "sheriff",
      name: "Sheriff",
      tier: "high",
      pay: [0.09, 0.26, 0.75],
      reelWeights: rw([16, 16, 16, 16, 16]),
      reelWeightsFreeSpins: rw([14, 14, 14, 14, 14]),
    },
    {
      id: "bartender",
      kind: "bartender",
      name: "Bartender",
      tier: "high",
      pay: [0.11, 0.34, 0.9],
      reelWeights: rw([12, 12, 12, 12, 12]),
      reelWeightsFreeSpins: rw([11, 11, 11, 11, 11]),
    },
    {
      id: "banker",
      kind: "banker",
      name: "Banker",
      tier: "high",
      pay: [0.15, 0.45, 1.25],
      reelWeights: rw([10, 10, 10, 10, 10]),
      reelWeightsFreeSpins: rw([9, 9, 9, 9, 9]),
    },
    {
      id: "bandit",
      kind: "bandit",
      name: "Bandit",
      tier: "high",
      pay: [0.19, 0.55, 1.8],
      reelWeights: rw([7, 7, 7, 7, 7]),
      reelWeightsFreeSpins: rw([6, 6, 6, 6, 6]),
    },
    {
      id: "safe",
      kind: "safe",
      name: "Safe",
      tier: "high",
      pay: [0.22, 0.75, 2.25],
      reelWeights: rw([5, 5, 5, 5, 5]),
      reelWeightsFreeSpins: rw([5, 5, 5, 5, 5]),
    },
    {
      id: "wild",
      kind: "wild",
      name: "Sheriff Badge",
      tier: "wild",
      pay: [0.19, 0.55, 1.8],
      reelWeights: rw([4, 4, 4, 4, 4]),
      reelWeightsFreeSpins: rw([6, 6, 6, 6, 6]),
      wild: true,
    },
    {
      id: "scatter",
      kind: "scatter",
      name: "Gold Star",
      tier: "scatter",
      /** × total bet for 3 / 4 / 5+ anywhere */
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
      reelWeights: rw([18, 18, 18, 18, 18]),
      reelWeightsFreeSpins: rw([10, 10, 10, 10, 10]),
      bonus: true,
    },
  ],
};

/** Bet per way (compat helper) — totalBet / connecting ways. */
export function betPerLine(totalBet: number, cfg: GoldMineConfig = DEFAULT_GOLD_MINE_CONFIG): number {
  const ways = Math.max(1, cfg.paylineCount);
  return +(totalBet / ways).toFixed(6);
}

export function calcFreeSpinsAward(
  scatterCount: number,
  cfg: GoldMineConfig = DEFAULT_GOLD_MINE_CONFIG,
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

function normalizeReelHeights(raw: unknown, fallback: number[]): number[] {
  const src = Array.isArray(raw) && raw.length >= 3 ? raw : fallback;
  return src.map((h) => clamp(Math.round(num(h, 1)), 1, 8));
}

export function normalizeGoldMineConfig(raw: unknown): GoldMineConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_GOLD_MINE_CONFIG);
  const obj = raw as Partial<GoldMineConfig>;
  const d = DEFAULT_GOLD_MINE_CONFIG;

  // Prefer explicit reelHeights; migrate legacy 5×3 and classic 7-reel diamond → 3-4-5-4-3
  const classicSevenDiamond =
    Array.isArray(obj.reelHeights) &&
    obj.reelHeights.map((h) => Math.round(num(h, 0))).join(",") === "1,2,3,4,3,2,1";
  const legacyFiveByThree =
    !Array.isArray(obj.reelHeights) &&
    Math.round(num(obj.reelsCount, 0)) === 5 &&
    Math.round(num(obj.rowsCount, 0)) === 3;
  const reelHeights = normalizeReelHeights(
    classicSevenDiamond || legacyFiveByThree ? d.reelHeights : obj.reelHeights,
    d.reelHeights,
  );
  const reelsCount = reelHeights.length;
  const rowsCount = Math.max(...reelHeights, 1);
  const paylineCount = totalConnectingWays(reelHeights);

  const symbols =
    Array.isArray(obj.symbols) && obj.symbols.length > 0
      ? obj.symbols.map((s, i) => {
          const base = d.symbols.find((x) => x.id === s?.id) ?? d.symbols[Math.min(i, d.symbols.length - 1)];
          const pay = Array.isArray(s?.pay) ? s.pay : base.pay;
          const rwBase = Array.isArray(s?.reelWeights) ? s.reelWeights : base.reelWeights;
          const rwFs = Array.isArray(s?.reelWeightsFreeSpins) ? s.reelWeightsFreeSpins : base.reelWeightsFreeSpins;
          // Legacy 5-reel weight arrays → pad/truncate to diamond reel count
          const padWeights = (src: number[], fb: number[]) =>
            Array.from({ length: reelsCount }, (_, ri) =>
              clamp(num(src[ri], fb[ri] ?? src[Math.min(ri, src.length - 1)] ?? 0), 0, 10_000),
            );
          // Legacy bet-per-line pays (≥5 for lows) → stake mults if clearly old scale
          const rawPay0 = num(pay[0], base.pay[0]);
          const looksLegacyLinePay = rawPay0 >= 5 && base.pay[0] < 5;
          const scaledPay = looksLegacyLinePay
            ? ([
                clamp(rawPay0 / 25, 0, 10_000),
                clamp(num(pay[1], base.pay[1]) / 25, 0, 10_000),
                clamp(num(pay[2], base.pay[2]) / 25, 0, 10_000),
              ] as [number, number, number])
            : ([
                clamp(rawPay0, 0, 10_000),
                clamp(num(pay[1], base.pay[1]), 0, 10_000),
                clamp(num(pay[2], base.pay[2]), 0, 10_000),
              ] as [number, number, number]);
          return {
            ...base,
            ...s,
            id: typeof s?.id === "string" ? s.id : base.id,
            kind: (s?.kind as FgSymKind) || base.kind,
            name: typeof s?.name === "string" ? s.name : base.name,
            tier: s?.tier || base.tier,
            pay: scaledPay,
            reelWeights: padWeights(rwBase, base.reelWeights),
            reelWeightsFreeSpins: padWeights(rwFs, base.reelWeightsFreeSpins),
            wild: Boolean(s?.wild ?? base.wild),
            scatter: Boolean(s?.scatter ?? base.scatter),
            bonus: Boolean(s?.bonus ?? base.bonus),
          };
        })
      : structuredClone(d.symbols);

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
    reelsCount,
    rowsCount,
    reelHeights,
    paylineCount,
    paylines: [],
    minMatchLength: clamp(Math.round(num(obj.minMatchLength, d.minMatchLength)), 2, 7),
    freeSpinsTriggerCount: clamp(Math.round(num(obj.freeSpinsTriggerCount, d.freeSpinsTriggerCount)), 2, 10),
    freeSpinsBaseCount: clamp(Math.round(num(obj.freeSpinsBaseCount, d.freeSpinsBaseCount)), 1, 100),
    freeSpinsExtraPerScatter: clamp(
      Math.round(num(obj.freeSpinsExtraPerScatter, d.freeSpinsExtraPerScatter)),
      0,
      20,
    ),
    holdWinTriggerCount: clamp(Math.round(num(obj.holdWinTriggerCount, d.holdWinTriggerCount)), 3, 16),
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
