/**
 * Crazy Sevens — classic 3-reel / 1-payline slot math config.
 * Inspired by Slotland-style fruit machine mechanics.
 *
 * ============================================================================
 * CONFIG-PENDING / DESIGN CONFIRMATION REQUIRED before launch.
 * Source material is a consumer review page — nearly every figure is provisional.
 * Do NOT treat placeholders as confirmed for compliance or real-money pricing.
 * ============================================================================
 *
 * Working interpretations (confirmed as the build basis — exact numbers still config-pending):
 * - Exactly 2 Double Wilds → 1,000× stake cash win. Mutually exclusive with Bonus Ladder.
 * - Exactly 3 Double Wilds → no cash win → Bonus Ladder trigger.
 * - Hold → free for non-Wild symbols. Double Wild holds BLOCKED (allowHoldWild=false) —
 *   unrestricted Wild-hold exploit simulated at ≈700%+ RTP and is launch-blocking.
 * - Progressive jackpot → jackpot.id="lucky-bars"; unlocks only at max bet + exactly 2 DW.
 * - Bonus Ladder → additive stack; automatic advance on number hit.
 *
 * RTP STATUS (blocking item):
 * - Placeholder target 95% (not a confirmed business figure).
 * - After DW weight=1 + Wild-hold block: ~90% game RTP (excl. JP pool) in 300k-spin sims.
 * - Must stay under 100%. Re-run `npx tsx scripts/test-lucky-bars.ts --rtp N` after any weight change.
 */

export const LUCKY_BARS_GAME_ID = "lucky-bars";

/** Platform jackpot table row id for this game's progressive pool. */
export const LUCKY_BARS_JACKPOT_ID = "lucky-bars";

export type RrSymKind =
  | "cherry"
  | "apple"
  | "banana"
  | "grape"
  | "pear"
  | "plum"
  | "watermelon"
  | "double_wild";

export type RrSymbolTier = "common" | "rare" | "wild";

export type RrSymbolConfig = {
  id: string;
  kind: RrSymKind;
  name: string;
  tier: RrSymbolTier;
  /**
   * Stake-multiplier for 3-of-a-kind on the single payline.
   * TODO/config-pending — only "up to 200 / up to 400 credits" confirmed as ceilings.
   * Provisional values below assume max-bet (5) credit ceilings:
   *   common 3-oak ≈ 40× → 200 credits at bet 5
   *   rare 3-oak ≈ 80× → 400 credits at bet 5
   */
  payMult: number;
  reelWeights: number[];
  wild?: boolean;
};

export type RrWeightedValue = {
  value: number;
  weight: number;
};

export type RrBonusLineConfig = {
  /** Positions on this ladder line (numbers are × stake; "stop" ends bonus). */
  positions: Array<{ type: "number"; value: number; weight: number } | { type: "stop"; weight: number }>;
};

export type RrBonusLadderConfig = {
  lineCount: number;
  lines: RrBonusLineConfig[];
  /**
   * After hitting a number: auto-advance to next line, or roll advanceChancePercent.
   * TODO/config-pending — working assumption: automatic.
   */
  advanceMode: "automatic" | "chance";
  advanceChancePercent: number;
  /**
   * How multipliers across lines combine.
   * TODO/config-pending — working assumption: additive (sum of × values, then × stake).
   */
  stackMode: "additive" | "multiplicative";
  configStatus: "config-pending";
};

export type RrJackpotConfig = {
  /** Jackpot table id (shared ledger). */
  poolId: string;
  /** Fraction of each bet added to this game's pool (on top of platform mega contrib). */
  contributionRate: number;
  /** Reseed floor after a win. TODO/config-pending — business/finance decision. */
  floorAmount: number;
  /** Bet must equal maxBet to unlock. */
  requireMaxBet: boolean;
  /**
   * Wild count that unlocks JP when at max bet.
   * Working assumption: exactly 2 (same as 1,000× cash case).
   */
  triggerWildCount: number;
  configStatus: "config-pending";
};

export type LuckyBarsConfig = {
  schemaVersion: 1;
  reelsCount: number;
  /**
   * Visible symbols per reel for renderer.
   * Engine always resolves the active payline row only.
   * TODO/config-pending — 3 with middle active vs 1.
   */
  visibleRowsPerReel: 1 | 3;
  /** 0-based active row when visibleRowsPerReel=3 (middle = 1). */
  activeRow: number;
  paylineCount: 1;
  minBet: number;
  maxBet: number;
  /** Exactly 2 Double Wilds → this × stake. Confirmed 1000. */
  twoWildPayMult: number;
  /**
   * Whether Double Wild substitutes into fruit 3-oak.
   * Working assumption: false (Wild only via 2-DW special / 3-DW bonus).
   * TODO/config-pending
   */
  wildSubstitutesFruit: boolean;
  /**
   * Whether any 2-of-3 non-Wild match pays a reduced prize.
   * Working assumption: false.
   * TODO/config-pending
   */
  partialMatchPays: boolean;
  /** Holds are free / unrestricted for non-Wild symbols until design says otherwise. */
  holdCostMult: number;
  holdMaxReels: number;
  /**
   * Whether players may hold Double Wild symbols.
   * FORCED false: unrestricted Wild-hold exploit ≈700%+ RTP in sim.
   * TODO/config-pending — confirm restriction with design (can't-hold-wild vs cost vs other).
   */
  allowHoldWild: boolean;
  /**
   * Placeholder RTP target for simulation only — NOT a confirmed product figure.
   * TODO/config-pending — must come from design/compliance.
   */
  targetRtp: number;
  rtpConfigStatus: "config-pending";
  volatility: "unknown";
  symbols: RrSymbolConfig[];
  jackpot: RrJackpotConfig;
  bonusLadder: RrBonusLadderConfig;
};

export const ALL_SYM_KINDS: RrSymKind[] = [
  "cherry",
  "apple",
  "banana",
  "grape",
  "pear",
  "plum",
  "watermelon",
  "double_wild",
];

export const SYMBOL_NAMES: Record<RrSymKind, string> = {
  cherry: "Cherries",
  apple: "Apples",
  banana: "Bananas",
  grape: "Grapes",
  pear: "Pears",
  plum: "Plums",
  watermelon: "Watermelons",
  double_wild: "Double Wild",
};

function rw(reels: [number, number, number]): number[] {
  return [...reels];
}

/**
 * Provisional reel weights — Double Wild is the critical lever.
 * Tune via `npx tsx scripts/test-lucky-bars.ts --rtp N`.
 */
export const DEFAULT_LUCKY_BARS_CONFIG: LuckyBarsConfig = {
  schemaVersion: 1,
  reelsCount: 3,
  visibleRowsPerReel: 3, // TODO/config-pending
  activeRow: 1,
  paylineCount: 1,
  minBet: 1,
  maxBet: 5,
  twoWildPayMult: 1_000,
  wildSubstitutesFruit: false,
  partialMatchPays: false,
  holdCostMult: 0,
  holdMaxReels: 3,
  // FORCED by RTP blocking issue — Wild-hold exploit ≈700%+; confirm with design.
  allowHoldWild: false,
  targetRtp: 95.0, // PLACEHOLDER only — config-pending
  rtpConfigStatus: "config-pending",
  volatility: "unknown",
  jackpot: {
    poolId: LUCKY_BARS_JACKPOT_ID,
    contributionRate: 0.02, // TODO/config-pending — 2% of bet into game pool
    floorAmount: 500, // TODO/config-pending
    requireMaxBet: true,
    triggerWildCount: 2,
    configStatus: "config-pending",
  },
  bonusLadder: {
    lineCount: 3,
    // TODO/config-pending — provisional boards
    lines: [
      {
        positions: [
          { type: "number", value: 2, weight: 30 },
          { type: "number", value: 3, weight: 25 },
          { type: "number", value: 5, weight: 15 },
          { type: "number", value: 10, weight: 8 },
          { type: "stop", weight: 22 },
        ],
      },
      {
        positions: [
          { type: "number", value: 3, weight: 28 },
          { type: "number", value: 5, weight: 22 },
          { type: "number", value: 10, weight: 12 },
          { type: "number", value: 15, weight: 6 },
          { type: "stop", weight: 32 },
        ],
      },
      {
        positions: [
          { type: "number", value: 5, weight: 25 },
          { type: "number", value: 10, weight: 18 },
          { type: "number", value: 20, weight: 10 },
          { type: "number", value: 50, weight: 4 },
          { type: "stop", weight: 43 },
        ],
      },
    ],
    advanceMode: "automatic",
    advanceChancePercent: 100,
    stackMode: "additive",
    configStatus: "config-pending",
  },
  symbols: [
    {
      id: "cherry",
      kind: "cherry",
      name: "Cherries",
      tier: "common",
      // TODO/config-pending — provisional ladder; ceilings "up to 200/400" at max bet
      payMult: 18,
      reelWeights: rw([40, 40, 40]),
    },
    {
      id: "apple",
      kind: "apple",
      name: "Apples",
      tier: "common",
      payMult: 22,
      reelWeights: rw([36, 36, 36]),
    },
    {
      id: "banana",
      kind: "banana",
      name: "Bananas",
      tier: "common",
      payMult: 28,
      reelWeights: rw([32, 32, 32]),
    },
    {
      id: "grape",
      kind: "grape",
      name: "Grapes",
      tier: "common",
      payMult: 38, // ≈190 credits at bet 5 (under 200 ceiling)
      reelWeights: rw([28, 28, 28]),
    },
    {
      id: "pear",
      kind: "pear",
      name: "Pears",
      tier: "rare",
      payMult: 48,
      reelWeights: rw([16, 16, 16]),
    },
    {
      id: "plum",
      kind: "plum",
      name: "Plums",
      tier: "rare",
      payMult: 60,
      reelWeights: rw([12, 12, 12]),
    },
    {
      id: "watermelon",
      kind: "watermelon",
      name: "Watermelons",
      tier: "rare",
      payMult: 80, // ≈400 credits at bet 5 (confirmed rare ceiling)
      reelWeights: rw([10, 10, 10]),
    },
    {
      id: "double_wild",
      kind: "double_wild",
      name: "Double Wild",
      tier: "wild",
      payMult: 0, // pays via twoWildPayMult / bonus — not 3-oak fruit path
      /**
       * BLOCKING RTP lever — drives 1000× cash, JP unlock, AND bonus trigger.
       * Weight 1 (was 2→~98% RTP / 3→>150%). Re-sim after every change.
       */
      reelWeights: rw([1, 1, 1]),
      wild: true,
    },
  ],
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function isWildKind(kind: RrSymKind): boolean {
  return kind === "double_wild";
}

export function normalizeLuckyBarsConfig(raw: unknown): LuckyBarsConfig {
  const d = DEFAULT_LUCKY_BARS_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Partial<LuckyBarsConfig>;

  const reelsCount = clamp(Math.round(num(o.reelsCount, d.reelsCount)), 3, 3);
  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: RrSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => (s as RrSymbolConfig)?.kind === def.kind || (s as RrSymbolConfig)?.id === def.id,
    ) as Partial<RrSymbolConfig> | undefined;
    if (!found) {
      return { ...def, reelWeights: [...def.reelWeights] };
    }
    return {
      ...def,
      name: typeof found.name === "string" && found.name.trim() ? found.name : def.name,
      payMult: clamp(num(found.payMult, def.payMult), 0, 1_000_000),
      reelWeights: Array.from({ length: reelsCount }, (_, i) =>
        clamp(
          num(Array.isArray(found.reelWeights) ? found.reelWeights[i] : undefined, def.reelWeights[i] ?? 0),
          0,
          10_000,
        ),
      ),
      wild: def.wild,
    };
  });

  const jpIn = (o.jackpot ?? {}) as Partial<RrJackpotConfig>;
  const jackpot: RrJackpotConfig = {
    poolId: typeof jpIn.poolId === "string" && jpIn.poolId ? jpIn.poolId : d.jackpot.poolId,
    contributionRate: clamp(num(jpIn.contributionRate, d.jackpot.contributionRate), 0, 0.5),
    floorAmount: clamp(num(jpIn.floorAmount, d.jackpot.floorAmount), 0, 10_000_000),
    requireMaxBet: jpIn.requireMaxBet !== false,
    triggerWildCount: clamp(Math.round(num(jpIn.triggerWildCount, d.jackpot.triggerWildCount)), 1, 3),
    configStatus: "config-pending",
  };

  const blIn = (o.bonusLadder ?? {}) as Partial<RrBonusLadderConfig>;
  const linesIn = Array.isArray(blIn.lines) ? blIn.lines : d.bonusLadder.lines;
  const lines: RrBonusLineConfig[] = d.bonusLadder.lines.map((def, li) => {
    const src = linesIn[li] as Partial<RrBonusLineConfig> | undefined;
    const posSrc = Array.isArray(src?.positions) ? src!.positions : def.positions;
    return {
      positions: posSrc.map((p, pi) => {
        const fb = def.positions[pi] ?? def.positions[0];
        const item = p as { type?: string; value?: number; weight?: number };
        if (item?.type === "stop" || fb.type === "stop") {
          return {
            type: "stop" as const,
            weight: clamp(num(item?.weight, fb.type === "stop" ? fb.weight : 20), 0, 10_000),
          };
        }
        const fbNum = fb.type === "number" ? fb : { value: 2, weight: 10 };
        return {
          type: "number" as const,
          value: clamp(num(item?.value, fbNum.value), 1, 10_000),
          weight: clamp(num(item?.weight, fbNum.weight), 0, 10_000),
        };
      }),
    };
  });

  const bonusLadder: RrBonusLadderConfig = {
    lineCount: clamp(Math.round(num(blIn.lineCount, d.bonusLadder.lineCount)), 1, 5),
    lines,
    advanceMode: blIn.advanceMode === "chance" ? "chance" : "automatic",
    advanceChancePercent: clamp(
      num(blIn.advanceChancePercent, d.bonusLadder.advanceChancePercent),
      0,
      100,
    ),
    stackMode: blIn.stackMode === "multiplicative" ? "multiplicative" : "additive",
    configStatus: "config-pending",
  };

  const visibleRows =
    o.visibleRowsPerReel === 1 || o.visibleRowsPerReel === 3
      ? o.visibleRowsPerReel
      : d.visibleRowsPerReel;

  return {
    schemaVersion: 1,
    reelsCount,
    visibleRowsPerReel: visibleRows,
    activeRow: clamp(Math.round(num(o.activeRow, d.activeRow)), 0, visibleRows - 1),
    paylineCount: 1,
    minBet: clamp(num(o.minBet, d.minBet), 0.01, 1_000_000),
    maxBet: clamp(num(o.maxBet, d.maxBet), 0.01, 1_000_000),
    twoWildPayMult: clamp(num(o.twoWildPayMult, d.twoWildPayMult), 0, 1_000_000),
    wildSubstitutesFruit: o.wildSubstitutesFruit === true,
    partialMatchPays: o.partialMatchPays === true,
    holdCostMult: clamp(num(o.holdCostMult, d.holdCostMult), 0, 100),
    holdMaxReels: clamp(Math.round(num(o.holdMaxReels, d.holdMaxReels)), 0, reelsCount),
    allowHoldWild: o.allowHoldWild === true, // default false — RTP safety
    targetRtp: clamp(num(o.targetRtp, d.targetRtp), 0, 99.5),
    rtpConfigStatus: "config-pending",
    volatility: "unknown",
    symbols,
    jackpot,
    bonusLadder,
  };
}
