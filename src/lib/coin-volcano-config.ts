/**
 * Coin Volcano — base-game-only 5×3 / 10-payline slot math config.
 * Shared by server resolver, client playback, and Superadmin editor.
 *
 * PENDING DESIGN CONFIRMATION (config-pending — do not treat as final for compliance):
 * - Full regular-symbol payline ladder (bars/dice/diamonds/chips/Lucky 7s provisional)
 * - Wild 3/4/5-oak breakdown (only 200x stake ceiling confirmed; provisional × bet-per-line)
 * - Exact shapes of the 10 paylines (using classic first-10 of 5×3 map)
 * - RTP profile reel-strip tuning (targets 96.5 / 95.5 / 94.5)
 * - maxWinMult default 25000 (Grand Jackpot figure; 27000 cited once as possible artifact)
 *
 * Locked product rules:
 * - No free spins, cascade, Hold & Win, or bonus buy
 * - Instant Wild+Scatter mix prizes at count ≥ 6 (× stake)
 * - All-Scatter grid → Grand Jackpot only; skip Section 3 mix entirely (Option C)
 */

export const COIN_VOLCANO_GAME_ID = "coin-volcano";

export type McSymKind =
  | "bar"
  | "dice"
  | "diamond"
  | "chip"
  | "lucky7"
  | "wild"
  | "scatter";

export type FsSymbolTier = "low" | "high" | "wild" | "scatter";

export type FsRtpProfileId = "rtp_96_5" | "rtp_95_5" | "rtp_94_5";

export type FsSymbolConfig = {
  id: string;
  kind: McSymKind;
  name: string;
  tier: FsSymbolTier;
  /**
   * Pay × bet-per-line for [3, 4, 5] consecutive matches.
   * Wild 5-oak provisional [50, 200, 2000] → 5x / 20x / 200x total stake on 10 lines.
   */
  pay: [number, number, number];
  /** Base relative weight per reel (overridden by active RTP profile). */
  reelWeights: number[];
  wild?: boolean;
  scatter?: boolean;
};

/** Per-symbol reel weight overrides for one RTP profile. */
export type FsRtpProfile = {
  id: FsRtpProfileId;
  /** Target RTP % for docs / simulation. */
  targetRtp: number;
  /** kind → weights[reelIndex] */
  reelWeights: Record<McSymKind, number[]>;
};

export type CoinVolcanoConfig = {
  schemaVersion: 1;
  reelsCount: number;
  rowsCount: number;
  paylineCount: number;
  /**
   * Payline map: paylines[lineIndex][reelIndex] = row index (0 = top).
   * Length must equal paylineCount; each entry length = reelsCount.
   */
  paylines: number[][];
  minMatchLength: number;
  minBet: number;
  maxBet: number;
  /**
   * Cap total resolved win as × stake (0 = off).
   * TODO/config-pending — default 25000 (Grand Jackpot); confirm vs 27000 metadata.
   */
  maxWinMult: number;
  /** Active RTP profile id — selects reelWeights used by generateGrid. */
  activeRtpProfile: FsRtpProfileId;
  rtpProfiles: FsRtpProfile[];
  /**
   * Instant Wild+Scatter mix: count-in-view → × total stake.
   * Confirmed table from product; counts below 6 are absent (no prize).
   */
  instantMixTable: Record<string, number>;
  /** Grand Jackpot × total stake when all 15 cells are Scatter. */
  grandJackpotMult: number;
  /** Mirror of active profile target for Superadmin display. */
  targetRtp: number;
  symbols: FsSymbolConfig[];
};

export const SYMBOL_NAMES: Record<McSymKind, string> = {
  bar: "Gold Bars",
  dice: "Lucky Dice",
  diamond: "Cash Diamond",
  chip: "Chip Stack",
  lucky7: "Lucky 7",
  wild: "Money Wild",
  scatter: "Coin Volcano",
};

/** Classic 5×3 / first 10 fixed paylines (row: 0 top, 1 mid, 2 bottom). TODO/config-pending exact paths. */
export const DEFAULT_PAYLINES_5X3_10: number[][] = [
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
];

/** Confirmed instant-mix × stake table (count ≥ 6). */
export const DEFAULT_INSTANT_MIX_TABLE: Record<string, number> = {
  "6": 1,
  "7": 2,
  "8": 8,
  "9": 25,
  "10": 50,
  "11": 150,
  "12": 500,
  "13": 1000,
  "14": 2500,
  "15": 5000,
};

function rw(reels: [number, number, number, number, number]): number[] {
  return [...reels];
}

const SYM_KINDS: McSymKind[] = [
  "bar",
  "dice",
  "diamond",
  "chip",
  "lucky7",
  "wild",
  "scatter",
];

function profileWeights(
  entries: Record<McSymKind, [number, number, number, number, number]>,
): Record<McSymKind, number[]> {
  const out = {} as Record<McSymKind, number[]>;
  for (const k of SYM_KINDS) {
    out[k] = rw(entries[k]);
  }
  return out;
}

/**
 * Provisional RTP reel-strip profiles.
 * Higher RTP → slightly more Wild/Scatter and high symbols.
 * Tune via simulation before live.
 */
export const DEFAULT_RTP_PROFILES: FsRtpProfile[] = [
  {
    id: "rtp_96_5",
    targetRtp: 96.5,
    reelWeights: profileWeights({
      bar: [46, 46, 46, 46, 46],
      dice: [44, 44, 44, 44, 44],
      diamond: [40, 40, 40, 40, 40],
      chip: [38, 38, 38, 38, 38],
      lucky7: [18, 18, 18, 18, 18],
      wild: [5, 5, 5, 5, 5],
      scatter: [4, 4, 4, 4, 4],
    }),
  },
  {
    id: "rtp_95_5",
    targetRtp: 95.5,
    reelWeights: profileWeights({
      bar: [48, 48, 48, 48, 48],
      dice: [46, 46, 46, 46, 46],
      diamond: [42, 42, 42, 42, 42],
      chip: [40, 40, 40, 40, 40],
      lucky7: [16, 16, 16, 16, 16],
      wild: [4, 4, 4, 4, 4],
      scatter: [3, 3, 3, 3, 3],
    }),
  },
  {
    id: "rtp_94_5",
    targetRtp: 94.5,
    reelWeights: profileWeights({
      bar: [50, 50, 50, 50, 50],
      dice: [48, 48, 48, 48, 48],
      diamond: [44, 44, 44, 44, 44],
      chip: [42, 42, 42, 42, 42],
      lucky7: [14, 14, 14, 14, 14],
      wild: [3, 3, 3, 3, 3],
      scatter: [3, 3, 3, 3, 3],
    }),
  },
];

export const DEFAULT_COIN_VOLCANO_CONFIG: CoinVolcanoConfig = {
  schemaVersion: 1,
  reelsCount: 5,
  rowsCount: 3,
  paylineCount: 10,
  paylines: DEFAULT_PAYLINES_5X3_10.map((p) => [...p]),
  minMatchLength: 3,
  minBet: 0.1,
  maxBet: 50,
  // TODO/config-pending — confirm 25000 vs 27000 with compliance.
  maxWinMult: 25_000,
  activeRtpProfile: "rtp_96_5",
  rtpProfiles: DEFAULT_RTP_PROFILES.map((p) => ({
    id: p.id,
    targetRtp: p.targetRtp,
    reelWeights: Object.fromEntries(
      SYM_KINDS.map((k) => [k, [...p.reelWeights[k]]]),
    ) as Record<McSymKind, number[]>,
  })),
  instantMixTable: { ...DEFAULT_INSTANT_MIX_TABLE },
  grandJackpotMult: 25_000,
  targetRtp: 96.5,
    symbols: [
    {
      id: "bar",
      kind: "bar",
      name: "Gold Bars",
      tier: "low",
      // TODO/config-pending — provisional ladder (× bet-per-line); tune via --rtp sim
      pay: [7, 20, 60],
      reelWeights: rw([46, 46, 46, 46, 46]),
    },
    {
      id: "dice",
      kind: "dice",
      name: "Lucky Dice",
      tier: "low",
      pay: [8, 24, 77],
      reelWeights: rw([44, 44, 44, 44, 44]),
    },
    {
      id: "diamond",
      kind: "diamond",
      name: "Cash Diamond",
      tier: "low",
      pay: [10, 31, 94],
      reelWeights: rw([40, 40, 40, 40, 40]),
    },
    {
      id: "chip",
      kind: "chip",
      name: "Chip Stack",
      tier: "low",
      pay: [12, 39, 116],
      reelWeights: rw([38, 38, 38, 38, 38]),
    },
    {
      id: "lucky7",
      kind: "lucky7",
      name: "Lucky 7",
      tier: "high",
      // TODO/config-pending — likely top regular payline symbol
      pay: [20, 61, 193],
      reelWeights: rw([18, 18, 18, 18, 18]),
    },
    {
      id: "wild",
      kind: "wild",
      name: "Money Wild",
      tier: "wild",
      // TODO/config-pending — 5-oak = 2000×bpl = 200× stake on 10 lines
      pay: [50, 200, 2000],
      reelWeights: rw([5, 5, 5, 5, 5]),
      wild: true,
    },
    {
      id: "scatter",
      kind: "scatter",
      name: "Coin Volcano",
      tier: "scatter",
      pay: [0, 0, 0],
      reelWeights: rw([4, 4, 4, 4, 4]),
      scatter: true,
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

function normalizePaylines(
  raw: unknown,
  reelsCount: number,
  rowsCount: number,
  paylineCount: number,
  fallback: number[][],
): number[][] {
  const src = Array.isArray(raw) ? raw : fallback;
  const out: number[][] = [];
  for (let i = 0; i < paylineCount; i++) {
    const fb = fallback[i] ?? fallback[0] ?? Array.from({ length: reelsCount }, () => 1);
    const row = Array.isArray(src[i]) ? (src[i] as unknown[]) : fb;
    out.push(
      Array.from({ length: reelsCount }, (_, r) =>
        clamp(Math.round(num(row[r], fb[r] ?? 1)), 0, rowsCount - 1),
      ),
    );
  }
  return out;
}

const RTP_IDS: FsRtpProfileId[] = ["rtp_96_5", "rtp_95_5", "rtp_94_5"];

function normalizeRtpProfiles(raw: unknown, d: CoinVolcanoConfig): FsRtpProfile[] {
  const src = Array.isArray(raw) ? raw : d.rtpProfiles;
  return RTP_IDS.map((id) => {
    const fb = d.rtpProfiles.find((p) => p.id === id) ?? d.rtpProfiles[0];
    const found = src.find((p) => (p as { id?: string })?.id === id) as
      | Partial<FsRtpProfile>
      | undefined;
    const weightsIn = found?.reelWeights ?? fb.reelWeights;
    const reelWeights = {} as Record<McSymKind, number[]>;
    for (const k of SYM_KINDS) {
      const wSrc = weightsIn?.[k];
      const wFb = fb.reelWeights[k];
      reelWeights[k] = Array.from({ length: d.reelsCount }, (_, i) =>
        clamp(num(Array.isArray(wSrc) ? wSrc[i] : undefined, wFb[i] ?? 0), 0, 10_000),
      );
    }
    return {
      id,
      targetRtp: clamp(num(found?.targetRtp, fb.targetRtp), 80, 99.5),
      reelWeights,
    };
  });
}

/** Resolve effective per-symbol reel weights for the active RTP profile. */
export function effectiveReelWeights(cfg: CoinVolcanoConfig): Record<McSymKind, number[]> {
  const profile =
    cfg.rtpProfiles.find((p) => p.id === cfg.activeRtpProfile) ?? cfg.rtpProfiles[0];
  const out = {} as Record<McSymKind, number[]>;
  for (const s of cfg.symbols) {
    out[s.kind] = profile?.reelWeights[s.kind]
      ? [...profile.reelWeights[s.kind]]
      : [...s.reelWeights];
  }
  return out;
}

export function normalizeCoinVolcanoConfig(raw: unknown): CoinVolcanoConfig {
  const d = DEFAULT_COIN_VOLCANO_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Partial<CoinVolcanoConfig>;

  const reelsCount = clamp(Math.round(num(o.reelsCount, d.reelsCount)), 3, 7);
  const rowsCount = clamp(Math.round(num(o.rowsCount, d.rowsCount)), 2, 5);
  const paylineCount = clamp(Math.round(num(o.paylineCount, d.paylineCount)), 1, 50);

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: FsSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => (s as FsSymbolConfig)?.kind === def.kind || (s as FsSymbolConfig)?.id === def.id,
    ) as Partial<FsSymbolConfig> | undefined;
    if (!found) {
      return {
        ...def,
        pay: [...def.pay] as [number, number, number],
        reelWeights: [...def.reelWeights],
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
      wild: def.wild,
      scatter: def.scatter,
    };
  });

  const mixIn =
    o.instantMixTable && typeof o.instantMixTable === "object"
      ? (o.instantMixTable as Record<string, unknown>)
      : null;
  const instantMixTable: Record<string, number> = { ...d.instantMixTable };
  if (mixIn) {
    for (let c = 6; c <= 15; c++) {
      const key = String(c);
      instantMixTable[key] = clamp(num(mixIn[key], d.instantMixTable[key] ?? 0), 0, 1_000_000);
    }
  }

  const rtpProfiles = normalizeRtpProfiles(o.rtpProfiles, d);
  const activeRaw = o.activeRtpProfile;
  const activeRtpProfile: FsRtpProfileId = RTP_IDS.includes(activeRaw as FsRtpProfileId)
    ? (activeRaw as FsRtpProfileId)
    : d.activeRtpProfile;
  const activeProfile = rtpProfiles.find((p) => p.id === activeRtpProfile) ?? rtpProfiles[0];

  return {
    schemaVersion: 1,
    reelsCount,
    rowsCount,
    paylineCount,
    paylines: normalizePaylines(o.paylines, reelsCount, rowsCount, paylineCount, d.paylines),
    minMatchLength: clamp(Math.round(num(o.minMatchLength, d.minMatchLength)), 2, 5),
    minBet: clamp(num(o.minBet, d.minBet), 0.01, 1_000_000),
    maxBet: clamp(num(o.maxBet, d.maxBet), 0.01, 1_000_000),
    maxWinMult: clamp(num(o.maxWinMult, d.maxWinMult), 0, 1_000_000),
    activeRtpProfile,
    rtpProfiles,
    instantMixTable,
    grandJackpotMult: clamp(num(o.grandJackpotMult, d.grandJackpotMult), 0, 1_000_000),
    targetRtp: clamp(num(o.targetRtp, activeProfile.targetRtp), 80, 99.5),
    symbols,
  };
}

export function betPerLine(totalBet: number, cfg: CoinVolcanoConfig): number {
  const lines = Math.max(1, cfg.paylineCount);
  return +(totalBet / lines).toFixed(6);
}

export function weightPercents(
  weights: Record<string, number[]>,
  reelIndex = 0,
): Record<string, number> {
  const keys = Object.keys(weights);
  const total = keys.reduce((a, k) => a + Math.max(0, weights[k]?.[reelIndex] ?? 0), 0);
  const out: Record<string, number> = {};
  for (const k of keys) {
    const w = Math.max(0, weights[k]?.[reelIndex] ?? 0);
    out[k] = total > 0 ? +((w / total) * 100).toFixed(2) : 0;
  }
  return out;
}
