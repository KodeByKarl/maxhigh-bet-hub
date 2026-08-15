/**
 * Lucky Neko — 3×3 / 5-payline + multiplier-reel slot math config.
 * Shared by server resolver, client playback, and Superadmin editor.
 *
 * PENDING DESIGN / COMPLIANCE CONFIRMATION (config-pending — do not treat as final):
 * 1. Full symbol roster + payline paytable ladder (gemstone/temple theme only confirmed)
 * 2. Exact shapes/paths of the 5 paylines (classic 3×3 5-line map used as starting point)
 * 3. Whether multiplier reel is meaningfully displayed on no-win spins (payout logic: ×0 = 0 either way)
 * 4. Exact EX-mode odds shift ("1x removed entirely" is working default from a single source)
 * 5. RTP target — conflicting sources cite 97%, 96.65%, and 95.22% floor; profiles seeded as placeholders
 * 6. Max win 375× — single-sourced / unconfirmed; treat with caution until compliance sign-off
 *
 * Locked product rules for this title (NOT Lucky Neko 2/3):
 * - No scatters, free spins, cascade/tumble, ways-to-win, or bonus round
 * - Single-pass: grid → paylines → multiplier reel → settle
 * - Multiplier reel is independent of the 3×3 payline grid
 * - Math identical to Fortune Gems; Ox is a thematic skin
 */

export const LUCKY_NEKO_GAME_ID = "lucky-neko";

export type FoSymKind =
  | "ruby"
  | "emerald"
  | "sapphire"
  | "amethyst"
  | "topaz"
  | "temple"
  | "wild";

export type FgSymbolTier = "low" | "high" | "wild";

/**
 * RTP profile ids — placeholder labels for the three conflicting published figures.
 * Confirm which (or whether multi-tier like Super Ace) applies before launch.
 */
export type FgRtpProfileId = "rtp_97" | "rtp_96_65" | "rtp_95_22";

/** Allowed multiplier-reel face values (center position is active). */
export const FO_MULTIPLIER_VALUES = [1, 2, 3, 5, 10, 15] as const;
export type FgMultiplierValue = (typeof FO_MULTIPLIER_VALUES)[number];

export type FgSymbolConfig = {
  id: string;
  kind: FoSymKind;
  name: string;
  tier: FgSymbolTier;
  /**
   * Pay × bet-per-line for a full 3-symbol payline match.
   * TODO/config-pending — provisional gemstone ladder; confirm with design.
   */
  pay: number;
  /** Base relative weight per main-grid reel (overridden by active RTP profile). */
  reelWeights: number[];
  wild?: boolean;
};

/** Per-symbol main-grid reel weight overrides for one RTP profile. */
export type FgRtpProfile = {
  id: FgRtpProfileId;
  /** Target RTP % for docs / simulation (placeholder until confirmed). */
  targetRtp: number;
  /** kind → weights[reelIndex] for the 3 main reels */
  reelWeights: Record<FoSymKind, number[]>;
};

/** Independently tunable multiplier-reel strip weighting (base or EX). */
export type FgMultiplierStrip = {
  /** Relative weights keyed by multiplier face value as string ("1","2",…). */
  weights: Record<string, number>;
};

export type LuckyNekoConfig = {
  schemaVersion: 1;
  reelsCount: number;
  rowsCount: number;
  paylineCount: number;
  /**
   * Payline map: paylines[lineIndex][reelIndex] = row index (0 = top).
   * TODO/config-pending — confirm exact paths with design.
   */
  paylines: number[][];
  minMatchLength: number;
  minBet: number;
  maxBet: number;
  /**
   * Cap total resolved win as × stake (0 = off).
   * TODO/config-pending — provisional 375 (single-sourced, unconfirmed).
   */
  maxWinMult: number;
  /** Extra Bets (EX) stake multiplier applied before debit (default 1.5 = +50%). */
  exBetMult: number;
  /** Active RTP profile id — selects main-grid reelWeights. */
  activeRtpProfile: FgRtpProfileId;
  rtpProfiles: FgRtpProfile[];
  /** Multiplier reel faces + base-mode weights. */
  multiplierValues: number[];
  multiplierStripBase: FgMultiplierStrip;
  /**
   * EX-mode multiplier reel profile — fully separate from base (not a runtime modifier).
   * Working default: 1x weight = 0; 10x/15x elevated. Confirm with design.
   */
  multiplierStripEx: FgMultiplierStrip;
  /** Mirror of active profile target for Superadmin display. */
  targetRtp: number;
  symbols: FgSymbolConfig[];
};

export const SYMBOL_NAMES: Record<FoSymKind, string> = {
  ruby: "Golden Ox",
  emerald: "Jade Lantern",
  sapphire: "Lucky Drum",
  amethyst: "Red Envelope",
  topaz: "Fortune Peach",
  temple: "Ox Shrine",
  wild: "Lucky Neko Wild",
};

/**
 * Classic 3×3 / 5 fixed paylines (row: 0 top, 1 mid, 2 bottom).
 * TODO/config-pending — confirm exact paths with design (not assumed final).
 */
export const DEFAULT_PAYLINES_3X3_5: number[][] = [
  [1, 1, 1], // middle
  [0, 0, 0], // top
  [2, 2, 2], // bottom
  [0, 1, 2], // diagonal TL→BR
  [2, 1, 0], // diagonal BL→TR
];

const SYM_KINDS: FoSymKind[] = [
  "ruby",
  "emerald",
  "sapphire",
  "amethyst",
  "topaz",
  "temple",
  "wild",
];

function rw(reels: [number, number, number]): number[] {
  return [...reels];
}

function profileWeights(
  entries: Record<FoSymKind, [number, number, number]>,
): Record<FoSymKind, number[]> {
  const out = {} as Record<FoSymKind, number[]>;
  for (const k of SYM_KINDS) {
    out[k] = rw(entries[k]);
  }
  return out;
}

/**
 * Provisional RTP reel-strip profiles (placeholder targets from conflicting sources).
 * Tune via simulation before live — do not treat as compliance-approved.
 */
export const DEFAULT_RTP_PROFILES: FgRtpProfile[] = [
  {
    id: "rtp_97",
    targetRtp: 97,
    reelWeights: profileWeights({
      ruby: [8, 8, 8],
      emerald: [10, 10, 10],
      sapphire: [14, 14, 14],
      amethyst: [18, 18, 18],
      topaz: [22, 22, 22],
      temple: [24, 24, 24],
      wild: [4, 4, 4],
    }),
  },
  {
    id: "rtp_96_65",
    targetRtp: 96.65,
    reelWeights: profileWeights({
      ruby: [7, 7, 7],
      emerald: [9, 9, 9],
      sapphire: [13, 13, 13],
      amethyst: [18, 18, 18],
      topaz: [23, 23, 23],
      temple: [26, 26, 26],
      wild: [4, 4, 4],
    }),
  },
  {
    id: "rtp_95_22",
    targetRtp: 95.22,
    reelWeights: profileWeights({
      ruby: [6, 6, 6],
      emerald: [8, 8, 8],
      sapphire: [12, 12, 12],
      amethyst: [18, 18, 18],
      topaz: [24, 24, 24],
      temple: [28, 28, 28],
      wild: [3, 3, 3],
    }),
  },
];

/** Base-mode multiplier reel weights. TODO/config-pending — tune for RTP. */
export const DEFAULT_MULTIPLIER_STRIP_BASE: FgMultiplierStrip = {
  weights: {
    "1": 40,
    "2": 28,
    "3": 16,
    "5": 10,
    "10": 4,
    "15": 2,
  },
};

/**
 * EX-mode multiplier reel — separate profile.
 * Working default: 1x removed (weight 0); higher faces present but rare so
 * avg multiplier ≈ base (~2.6) → EX RTP stays near base target (stake uplift
 * cancels via bet-per-line pays). TODO/config-pending — confirm with design.
 */
export const DEFAULT_MULTIPLIER_STRIP_EX: FgMultiplierStrip = {
  weights: {
    "1": 0,
    "2": 70,
    "3": 20,
    "5": 7,
    "10": 2,
    "15": 1,
  },
};

export const DEFAULT_LUCKY_NEKO_CONFIG: LuckyNekoConfig = {
  schemaVersion: 1,
  reelsCount: 3,
  rowsCount: 3,
  paylineCount: 5,
  paylines: DEFAULT_PAYLINES_3X3_5.map((p) => [...p]),
  minMatchLength: 3,
  minBet: 0.1,
  maxBet: 100,
  // TODO/config-pending — single-sourced 375×; confirm before launch.
  maxWinMult: 375,
  exBetMult: 1.5,
  activeRtpProfile: "rtp_97",
  rtpProfiles: DEFAULT_RTP_PROFILES.map((p) => ({
    id: p.id,
    targetRtp: p.targetRtp,
    reelWeights: Object.fromEntries(
      SYM_KINDS.map((k) => [k, [...p.reelWeights[k]]]),
    ) as Record<FoSymKind, number[]>,
  })),
  multiplierValues: [...FO_MULTIPLIER_VALUES],
  multiplierStripBase: {
    weights: { ...DEFAULT_MULTIPLIER_STRIP_BASE.weights },
  },
  multiplierStripEx: {
    weights: { ...DEFAULT_MULTIPLIER_STRIP_EX.weights },
  },
  targetRtp: 97,
  symbols: [
    {
      id: "ruby",
      kind: "ruby",
      name: "Golden Ox",
      tier: "high",
      // TODO/config-pending — provisional × bet-per-line; sim-tuned toward ~97% base
      pay: 25,
      reelWeights: rw([8, 8, 8]),
    },
    {
      id: "emerald",
      kind: "emerald",
      name: "Jade Lantern",
      tier: "high",
      pay: 17,
      reelWeights: rw([10, 10, 10]),
    },
    {
      id: "sapphire",
      kind: "sapphire",
      name: "Lucky Drum",
      tier: "high",
      pay: 11,
      reelWeights: rw([14, 14, 14]),
    },
    {
      id: "amethyst",
      kind: "amethyst",
      name: "Red Envelope",
      tier: "low",
      pay: 7,
      reelWeights: rw([18, 18, 18]),
    },
    {
      id: "topaz",
      kind: "topaz",
      name: "Fortune Peach",
      tier: "low",
      pay: 4,
      reelWeights: rw([22, 22, 22]),
    },
    {
      id: "temple",
      kind: "temple",
      name: "Ox Shrine",
      tier: "low",
      pay: 3,
      reelWeights: rw([24, 24, 24]),
    },
    {
      id: "wild",
      kind: "wild",
      name: "Lucky Neko Wild",
      tier: "wild",
      pay: 42,
      reelWeights: rw([4, 4, 4]),
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

const RTP_IDS: FgRtpProfileId[] = ["rtp_97", "rtp_96_65", "rtp_95_22"];

function normalizeRtpProfiles(raw: unknown, d: LuckyNekoConfig): FgRtpProfile[] {
  const src = Array.isArray(raw) ? raw : d.rtpProfiles;
  return RTP_IDS.map((id) => {
    const fb = d.rtpProfiles.find((p) => p.id === id) ?? d.rtpProfiles[0];
    const found = src.find((p) => (p as { id?: string })?.id === id) as
      | Partial<FgRtpProfile>
      | undefined;
    const weightsIn = found?.reelWeights ?? fb.reelWeights;
    const reelWeights = {} as Record<FoSymKind, number[]>;
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

function normalizeMultiplierStrip(
  raw: unknown,
  fallback: FgMultiplierStrip,
  values: number[],
): FgMultiplierStrip {
  const src =
    raw && typeof raw === "object" && "weights" in (raw as object)
      ? ((raw as FgMultiplierStrip).weights ?? {})
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : null;
  const weights: Record<string, number> = {};
  for (const v of values) {
    const key = String(v);
    weights[key] = clamp(
      num(src?.[key], fallback.weights[key] ?? 0),
      0,
      10_000,
    );
  }
  return { weights };
}

/** Resolve effective per-symbol main-grid reel weights for the active RTP profile. */
export function effectiveReelWeights(cfg: LuckyNekoConfig): Record<FoSymKind, number[]> {
  const profile =
    cfg.rtpProfiles.find((p) => p.id === cfg.activeRtpProfile) ?? cfg.rtpProfiles[0];
  const out = {} as Record<FoSymKind, number[]>;
  for (const s of cfg.symbols) {
    out[s.kind] = profile?.reelWeights[s.kind]
      ? [...profile.reelWeights[s.kind]]
      : [...s.reelWeights];
  }
  return out;
}

/** Active multiplier-reel strip for the given EX mode flag. */
export function activeMultiplierStrip(
  cfg: LuckyNekoConfig,
  exMode: boolean,
): FgMultiplierStrip {
  return exMode ? cfg.multiplierStripEx : cfg.multiplierStripBase;
}

/**
 * Total stake deducted for a spin.
 * EX mode applies +50% (cfg.exBetMult) to the player's selected base bet.
 */
export function spinStake(baseBet: number, exMode: boolean, cfg: LuckyNekoConfig): number {
  const mult = exMode ? cfg.exBetMult : 1;
  return +(baseBet * mult).toFixed(2);
}

export function normalizeLuckyNekoConfig(raw: unknown): LuckyNekoConfig {
  const d = DEFAULT_LUCKY_NEKO_CONFIG;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Partial<LuckyNekoConfig>;

  const reelsCount = clamp(Math.round(num(o.reelsCount, d.reelsCount)), 3, 3);
  const rowsCount = clamp(Math.round(num(o.rowsCount, d.rowsCount)), 3, 3);
  const paylineCount = clamp(Math.round(num(o.paylineCount, d.paylineCount)), 1, 20);

  const multValuesSrc = Array.isArray(o.multiplierValues) ? o.multiplierValues : d.multiplierValues;
  const multiplierValues = (multValuesSrc.length > 0 ? multValuesSrc : d.multiplierValues)
    .map((v) => clamp(Math.round(num(v, 1)), 1, 1000))
    .filter((v, i, arr) => arr.indexOf(v) === i);
  if (multiplierValues.length === 0) multiplierValues.push(...FO_MULTIPLIER_VALUES);

  const symbolsIn = Array.isArray(o.symbols) ? o.symbols : null;
  const symbols: FgSymbolConfig[] = d.symbols.map((def) => {
    const found = symbolsIn?.find(
      (s) => (s as FgSymbolConfig)?.kind === def.kind || (s as FgSymbolConfig)?.id === def.id,
    ) as Partial<FgSymbolConfig> | undefined;
    if (!found) {
      return {
        ...def,
        reelWeights: [...def.reelWeights],
      };
    }
    const padWeights = (src: unknown, fb: number[]) => {
      const arr = Array.isArray(src) ? src : fb;
      return Array.from({ length: reelsCount }, (_, i) =>
        clamp(num(arr[i], fb[i] ?? 0), 0, 10_000),
      );
    };
    return {
      ...def,
      name: typeof found.name === "string" && found.name.trim() ? found.name : def.name,
      pay: clamp(num(found.pay, def.pay), 0, 1_000_000),
      reelWeights: padWeights(found.reelWeights, def.reelWeights),
      wild: def.wild,
    };
  });

  const rtpProfiles = normalizeRtpProfiles(o.rtpProfiles, d);
  const activeRaw = o.activeRtpProfile;
  const activeRtpProfile: FgRtpProfileId = RTP_IDS.includes(activeRaw as FgRtpProfileId)
    ? (activeRaw as FgRtpProfileId)
    : d.activeRtpProfile;
  const activeProfile = rtpProfiles.find((p) => p.id === activeRtpProfile) ?? rtpProfiles[0];

  return {
    schemaVersion: 1,
    reelsCount,
    rowsCount,
    paylineCount,
    paylines: normalizePaylines(o.paylines, reelsCount, rowsCount, paylineCount, d.paylines),
    minMatchLength: clamp(Math.round(num(o.minMatchLength, d.minMatchLength)), 3, 3),
    minBet: clamp(num(o.minBet, d.minBet), 0.01, 1_000_000),
    maxBet: clamp(num(o.maxBet, d.maxBet), 0.01, 1_000_000),
    maxWinMult: clamp(num(o.maxWinMult, d.maxWinMult), 0, 1_000_000),
    exBetMult: clamp(num(o.exBetMult, d.exBetMult), 1, 5),
    activeRtpProfile,
    rtpProfiles,
    multiplierValues,
    multiplierStripBase: normalizeMultiplierStrip(
      o.multiplierStripBase,
      d.multiplierStripBase,
      multiplierValues,
    ),
    multiplierStripEx: normalizeMultiplierStrip(
      o.multiplierStripEx,
      d.multiplierStripEx,
      multiplierValues,
    ),
    targetRtp: clamp(num(o.targetRtp, activeProfile.targetRtp), 80, 99.5),
    symbols,
  };
}

export function betPerLine(totalBet: number, cfg: LuckyNekoConfig): number {
  const lines = Math.max(1, cfg.paylineCount);
  return +(totalBet / lines).toFixed(6);
}

export function weightPercents(
  weights: Record<string, number[] | number>,
  reelIndex = 0,
): Record<string, number> {
  const keys = Object.keys(weights);
  const total = keys.reduce((a, k) => {
    const w = weights[k];
    const n = Array.isArray(w) ? (w[reelIndex] ?? 0) : (w ?? 0);
    return a + Math.max(0, n);
  }, 0);
  const out: Record<string, number> = {};
  for (const k of keys) {
    const w = weights[k];
    const n = Array.isArray(w) ? (w[reelIndex] ?? 0) : (w ?? 0);
    out[k] = total > 0 ? +((Math.max(0, n) / total) * 100).toFixed(2) : 0;
  }
  return out;
}
