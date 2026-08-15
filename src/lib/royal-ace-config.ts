/**
 * Super Ace math & configuration — shared by server resolver and UI.
 * Forked from Starlight Ace / Mahjong Ways cascade pattern: 5×4 ways (1,024),
 * Golden Card → Little/Big Joker, progressive combo multipliers, multi-tier RTP.
 *
 * TODO / config-pending (confirm with design before launch):
 * 1. Grid 5×4 vs 4×4 — defaulting to 5×4 (1,024 ways); keep reelsCount/heights config-driven
 * 2. Full high-tier roster & paytable ladder (provisional suits + ace_gold below)
 * 3. Little vs Big Joker selection (weighted random) and whether Big pays extra (no — substitute only)
 * 4. Base cascade ladder [1,2,3,5] inferred from FS [2,4,6,10] being "double"
 * 5. FS multiplier resets per spin (not session-accumulating)
 * 6. Exact FS elevated Golden/Joker weighting factors
 * 7. Volatility label — resolve empirically via simulation
 * Smoke sim (15k spins/profile, provisional):
 *   rtp_97_0 ≈ 95.9% · hit ≈ 64% · avg cascade ≈ 2.3
 *   rtp_96_5 ≈ 95.0% · rtp_94_38 weight overrides still coarse (config-pending)
 * Volatility: empirically medium via cascade depth (marketing sources conflict)
 */

export const ROYAL_ACE_GAME_ID = "royal-ace";

export type RoyalAceSymKind =
  | "sym_j"
  | "sym_q"
  | "sym_k"
  | "sym_a"
  | "spade"
  | "heart"
  | "club"
  | "diamond"
  | "ace_gold"
  | "little_joker"
  | "big_joker"
  | "scatter";

export type RoyalAceSymbolConfig = {
  id: string;
  kind: RoyalAceSymKind;
  name: string;
  tier: "low" | "high" | "wild" | "scatter";
  weight: number;
  weightFreeSpins: number;
  /** Payout × bet for [3 reels, 4 reels, 5 reels] consecutive matching left-to-right */
  pay: [number, number, number];
  wild?: boolean;
  scatter?: boolean;
};

export type SaRtpProfileId = "rtp_97_0" | "rtp_96_5" | "rtp_94_38";

export type SaSymbolWeightOverride = {
  weight: number;
  weightFreeSpins: number;
};

export type SaRtpProfile = {
  id: SaRtpProfileId;
  targetRtp: number;
  /** Per-symbol weight overrides applied on top of base symbols table */
  symbolWeights: Partial<Record<RoyalAceSymKind, SaSymbolWeightOverride>>;
};

export type RoyalAceConfig = {
  schemaVersion: 1;
  reelsCount: number;
  /** Fixed 4 rows → 5×4 = 1,024 ways (config-pending confirmation vs 4×4) */
  minReelHeight: number;
  maxReelHeight: number;
  minConsecutiveReels: number;
  /** Base cascade ladder — config-pending inference from FS ladder */
  baseCascadeMultipliers: number[];
  /** Free spins cascade ladder (confirmed): x2 → x4 → x6 → x10 */
  freeSpinsCascadeMultipliers: number[];
  freeSpinsTriggerCount: number;
  /** Initial FS award on 3+ scatters (confirmed: 10) */
  freeSpinsBaseCount: number;
  /** Retrigger award during FS (confirmed: +5 flat, uncapped) */
  freeSpinsRetriggerCount: number;
  buyFeatureMult: number;
  anteBetMult: number;
  anteScatterWeightMult: number;
  /** Chance gold on reels 2–4 (indices 1–3) */
  goldChanceInitial: number;
  goldChanceCascade: number;
  /**
   * Free Spins: this reel index always gets gold on eligible symbols.
   * Elevates Golden Card frequency in FS (config-pending exact elevation).
   */
  guaranteedGoldenReelIndex: number;
  /** Weighted Little vs Big Joker on Golden Card win transform — config-pending */
  jokerTransformWeights: {
    little_joker: number;
    big_joker: number;
  };
  maxWinMult: number;
  targetRtp: number;
  volatility: "low" | "low-medium" | "medium" | "medium-high" | "high";
  activeRtpProfile: SaRtpProfileId;
  rtpProfiles: SaRtpProfile[];
  symbols: RoyalAceSymbolConfig[];
};

export const SYMBOL_NAMES: Record<RoyalAceSymKind, string> = {
  sym_j: "Jack",
  sym_q: "Queen",
  sym_k: "King",
  sym_a: "Ace",
  spade: "Spade",
  heart: "Heart",
  club: "Club",
  diamond: "Diamond",
  ace_gold: "Golden Ace",
  little_joker: "Little Joker",
  big_joker: "Big Joker",
  scatter: "Lucky Scatter",
};

export const ALL_SYM_KINDS: RoyalAceSymKind[] = [
  "sym_j",
  "sym_q",
  "sym_k",
  "sym_a",
  "spade",
  "heart",
  "club",
  "diamond",
  "ace_gold",
  "little_joker",
  "big_joker",
  "scatter",
];

/**
 * Provisional pays scaled for 5×4 (1,024 ways) + dual-joker cascade boost.
 * Smoke-tuned toward ~97%; still config-pending for compliance.
 */
const BASE_SYMBOLS: RoyalAceSymbolConfig[] = [
  {
    id: "sym_j",
    kind: "sym_j",
    name: "Jack",
    tier: "low",
    weight: 145,
    weightFreeSpins: 125,
    pay: [0.011, 0.03, 0.08],
  },
  {
    id: "sym_q",
    kind: "sym_q",
    name: "Queen",
    tier: "low",
    weight: 125,
    weightFreeSpins: 110,
    pay: [0.015, 0.042, 0.1],
  },
  {
    id: "sym_k",
    kind: "sym_k",
    name: "King",
    tier: "low",
    weight: 110,
    weightFreeSpins: 98,
    pay: [0.019, 0.053, 0.13],
  },
  {
    id: "sym_a",
    kind: "sym_a",
    name: "Ace",
    tier: "low",
    weight: 95,
    weightFreeSpins: 85,
    pay: [0.026, 0.066, 0.17],
  },
  {
    id: "spade",
    kind: "spade",
    name: "Spade",
    tier: "high",
    weight: 60,
    weightFreeSpins: 55,
    pay: [0.042, 0.1, 0.26],
  },
  {
    id: "heart",
    kind: "heart",
    name: "Heart",
    tier: "high",
    weight: 45,
    weightFreeSpins: 42,
    pay: [0.066, 0.15, 0.38],
  },
  {
    id: "club",
    kind: "club",
    name: "Club",
    tier: "high",
    weight: 34,
    weightFreeSpins: 34,
    pay: [0.085, 0.21, 0.53],
  },
  {
    id: "diamond",
    kind: "diamond",
    name: "Diamond",
    tier: "high",
    weight: 24,
    weightFreeSpins: 26,
    pay: [0.13, 0.34, 0.85],
  },
  {
    id: "ace_gold",
    kind: "ace_gold",
    name: "Golden Ace",
    tier: "high",
    weight: 14,
    weightFreeSpins: 16,
    pay: [0.21, 0.57, 1.5],
  },
  {
    id: "little_joker",
    kind: "little_joker",
    name: "Little Joker",
    tier: "wild",
    weight: 5,
    weightFreeSpins: 9,
    pay: [0, 0, 0],
    wild: true,
  },
  {
    id: "big_joker",
    kind: "big_joker",
    name: "Big Joker",
    tier: "wild",
    weight: 2,
    weightFreeSpins: 5,
    pay: [0, 0, 0],
    wild: true,
  },
  {
    id: "scatter",
    kind: "scatter",
    name: "Lucky Scatter",
    tier: "scatter",
    weight: 5,
    weightFreeSpins: 4,
    pay: [0.4, 1.2, 3.5],
    scatter: true,
  },
];

/** Lower RTP profiles nudge wild/joker/gold frequency and low-symbol density. */
export const DEFAULT_RTP_PROFILES: SaRtpProfile[] = [
  {
    id: "rtp_97_0",
    targetRtp: 97.0,
    symbolWeights: {},
  },
  {
    id: "rtp_96_5",
    targetRtp: 96.5,
    symbolWeights: {
      little_joker: { weight: 6, weightFreeSpins: 10 },
      big_joker: { weight: 2, weightFreeSpins: 5 },
      scatter: { weight: 4, weightFreeSpins: 3 },
      sym_j: { weight: 135, weightFreeSpins: 115 },
    },
  },
  {
    id: "rtp_94_38",
    targetRtp: 94.38,
    symbolWeights: {
      little_joker: { weight: 4, weightFreeSpins: 8 },
      big_joker: { weight: 1, weightFreeSpins: 4 },
      scatter: { weight: 3, weightFreeSpins: 2 },
      ace_gold: { weight: 10, weightFreeSpins: 11 },
      diamond: { weight: 18, weightFreeSpins: 20 },
      sym_j: { weight: 145, weightFreeSpins: 120 },
      sym_q: { weight: 120, weightFreeSpins: 100 },
    },
  },
];

export const DEFAULT_ROYAL_ACE_CONFIG: RoyalAceConfig = {
  schemaVersion: 1,
  reelsCount: 5,
  minReelHeight: 4,
  maxReelHeight: 4,
  minConsecutiveReels: 3,
  baseCascadeMultipliers: [1, 2, 3, 5],
  freeSpinsCascadeMultipliers: [2, 4, 6, 10],
  freeSpinsTriggerCount: 3,
  freeSpinsBaseCount: 10,
  freeSpinsRetriggerCount: 5,
  buyFeatureMult: 100,
  anteBetMult: 1.25,
  anteScatterWeightMult: 1.8,
  goldChanceInitial: 0.05,
  goldChanceCascade: 0.09,
  guaranteedGoldenReelIndex: 2,
  jokerTransformWeights: {
    little_joker: 70,
    big_joker: 30,
  },
  maxWinMult: 1500,
  targetRtp: 97.0,
  volatility: "medium",
  activeRtpProfile: "rtp_97_0",
  rtpProfiles: structuredClone(DEFAULT_RTP_PROFILES),
  symbols: structuredClone(BASE_SYMBOLS),
};

/**
 * Free spins award:
 * - Base game trigger: freeSpinsBaseCount (10) when scatters ≥ trigger
 * - Free spins retrigger: freeSpinsRetriggerCount (+5) flat, uncapped
 */
export function calcFreeSpinsAward(
  scatterCount: number,
  cfg: RoyalAceConfig = DEFAULT_ROYAL_ACE_CONFIG,
  opts: { isRetrigger?: boolean } = {},
): number {
  if (scatterCount < cfg.freeSpinsTriggerCount) return 0;
  return opts.isRetrigger ? cfg.freeSpinsRetriggerCount : cfg.freeSpinsBaseCount;
}

/** Apply active RTP profile weight overrides onto the symbols table. */
export function applyRtpProfile(cfg: RoyalAceConfig): RoyalAceConfig {
  const profile =
    cfg.rtpProfiles.find((p) => p.id === cfg.activeRtpProfile) ?? cfg.rtpProfiles[0];
  if (!profile) return cfg;
  const symbols = cfg.symbols.map((s) => {
    const ov = profile.symbolWeights[s.kind];
    if (!ov) return s;
    return {
      ...s,
      weight: ov.weight,
      weightFreeSpins: ov.weightFreeSpins,
    };
  });
  return {
    ...cfg,
    symbols,
    targetRtp: profile.targetRtp,
  };
}

export function weightPercents(
  symbols: { id: string; weight: number }[],
): Record<string, number> {
  const total = symbols.reduce((a, s) => a + Math.max(0, s.weight), 0);
  const out: Record<string, number> = {};
  for (const s of symbols) {
    out[s.id] = total > 0 ? +((Math.max(0, s.weight) / total) * 100).toFixed(2) : 0;
  }
  return out;
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const RTP_IDS: SaRtpProfileId[] = ["rtp_97_0", "rtp_96_5", "rtp_94_38"];

const VOLATILITY_VALUES: RoyalAceConfig["volatility"][] = [
  "low",
  "low-medium",
  "medium",
  "medium-high",
  "high",
];

function normalizeRtpProfiles(raw: unknown, d: RoyalAceConfig): SaRtpProfile[] {
  const src = Array.isArray(raw) ? raw : d.rtpProfiles;
  return RTP_IDS.map((id) => {
    const fb = d.rtpProfiles.find((p) => p.id === id) ?? DEFAULT_RTP_PROFILES.find((p) => p.id === id)!;
    const found = src.find((p) => (p as { id?: string })?.id === id) as
      | Partial<SaRtpProfile>
      | undefined;
    const weightsIn = (found?.symbolWeights ?? fb.symbolWeights) as Partial<
      Record<RoyalAceSymKind, SaSymbolWeightOverride>
    >;
    const symbolWeights: Partial<Record<RoyalAceSymKind, SaSymbolWeightOverride>> = {};
    for (const kind of ALL_SYM_KINDS) {
      const w = weightsIn[kind];
      if (w && typeof w === "object") {
        symbolWeights[kind] = {
          weight: clamp(num(w.weight, fb.symbolWeights[kind]?.weight ?? 0), 0, 10_000),
          weightFreeSpins: clamp(
            num(w.weightFreeSpins, fb.symbolWeights[kind]?.weightFreeSpins ?? 0),
            0,
            10_000,
          ),
        };
      } else if (fb.symbolWeights[kind]) {
        symbolWeights[kind] = { ...fb.symbolWeights[kind]! };
      }
    }
    return {
      id,
      targetRtp: clamp(num(found?.targetRtp, fb.targetRtp), 80, 99.5),
      symbolWeights,
    };
  });
}

export function normalizeRoyalAceConfig(raw: unknown): RoyalAceConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_ROYAL_ACE_CONFIG);
  const obj = raw as Partial<RoyalAceConfig>;
  const d = DEFAULT_ROYAL_ACE_CONFIG;

  const symbols =
    Array.isArray(obj.symbols) && obj.symbols.length > 0
      ? obj.symbols.map((s, i) => {
          const base =
            d.symbols.find((x) => x.id === s?.id) ?? d.symbols[Math.min(i, d.symbols.length - 1)];
          const pay = Array.isArray(s?.pay) ? s.pay : base.pay;
          return {
            ...base,
            ...s,
            id: typeof s?.id === "string" ? s.id : base.id,
            kind: (s?.kind as RoyalAceSymKind) || base.kind,
            name: typeof s?.name === "string" ? s.name : base.name,
            tier: s?.tier || base.tier,
            weight: clamp(num(s?.weight, base.weight), 0, 10_000),
            weightFreeSpins: clamp(num(s?.weightFreeSpins, base.weightFreeSpins), 0, 10_000),
            pay: [
              clamp(num(pay[0], base.pay[0]), 0, 1000),
              clamp(num(pay[1], base.pay[1]), 0, 1000),
              clamp(num(pay[2], base.pay[2]), 0, 1000),
            ] as [number, number, number],
            wild: Boolean(s?.wild ?? base.wild),
            scatter: Boolean(s?.scatter ?? base.scatter),
          };
        })
      : structuredClone(d.symbols);

  const baseMults = Array.isArray(obj.baseCascadeMultipliers)
    ? obj.baseCascadeMultipliers.map((m) => clamp(num(m, 1), 1, 1000))
    : d.baseCascadeMultipliers;
  const fsMults = Array.isArray(obj.freeSpinsCascadeMultipliers)
    ? obj.freeSpinsCascadeMultipliers.map((m) => clamp(num(m, 1), 1, 1000))
    : d.freeSpinsCascadeMultipliers;

  const jwIn = (obj.jokerTransformWeights ?? {}) as Partial<RoyalAceConfig["jokerTransformWeights"]>;
  const jokerTransformWeights = {
    little_joker: clamp(num(jwIn.little_joker, d.jokerTransformWeights.little_joker), 0, 10_000),
    big_joker: clamp(num(jwIn.big_joker, d.jokerTransformWeights.big_joker), 0, 10_000),
  };

  const rtpProfiles = normalizeRtpProfiles(obj.rtpProfiles, d);
  const activeRaw = obj.activeRtpProfile;
  const activeRtpProfile: SaRtpProfileId = RTP_IDS.includes(activeRaw as SaRtpProfileId)
    ? (activeRaw as SaRtpProfileId)
    : d.activeRtpProfile;
  const activeProfile = rtpProfiles.find((p) => p.id === activeRtpProfile) ?? rtpProfiles[0];

  const volRaw = obj.volatility;
  const volatility: RoyalAceConfig["volatility"] = VOLATILITY_VALUES.includes(
    volRaw as RoyalAceConfig["volatility"],
  )
    ? (volRaw as RoyalAceConfig["volatility"])
    : d.volatility;

  return {
    schemaVersion: 1,
    reelsCount: clamp(Math.round(num(obj.reelsCount, d.reelsCount)), 3, 6),
    minReelHeight: clamp(Math.round(num(obj.minReelHeight, d.minReelHeight)), 2, 6),
    maxReelHeight: clamp(Math.round(num(obj.maxReelHeight, d.maxReelHeight)), 2, 6),
    minConsecutiveReels: clamp(
      Math.round(num(obj.minConsecutiveReels, d.minConsecutiveReels)),
      2,
      5,
    ),
    baseCascadeMultipliers: baseMults.length ? baseMults : [...d.baseCascadeMultipliers],
    freeSpinsCascadeMultipliers: fsMults.length ? fsMults : [...d.freeSpinsCascadeMultipliers],
    freeSpinsTriggerCount: clamp(
      Math.round(num(obj.freeSpinsTriggerCount, d.freeSpinsTriggerCount)),
      2,
      10,
    ),
    freeSpinsBaseCount: clamp(Math.round(num(obj.freeSpinsBaseCount, d.freeSpinsBaseCount)), 1, 100),
    freeSpinsRetriggerCount: clamp(
      Math.round(num(obj.freeSpinsRetriggerCount, d.freeSpinsRetriggerCount)),
      1,
      50,
    ),
    buyFeatureMult: clamp(num(obj.buyFeatureMult, d.buyFeatureMult), 1, 500),
    anteBetMult: clamp(num(obj.anteBetMult, d.anteBetMult), 1, 5),
    anteScatterWeightMult: clamp(num(obj.anteScatterWeightMult, d.anteScatterWeightMult), 1, 10),
    goldChanceInitial: clamp(num(obj.goldChanceInitial, d.goldChanceInitial), 0, 1),
    goldChanceCascade: clamp(num(obj.goldChanceCascade, d.goldChanceCascade), 0, 1),
    guaranteedGoldenReelIndex: clamp(
      Math.round(num(obj.guaranteedGoldenReelIndex, d.guaranteedGoldenReelIndex)),
      0,
      5,
    ),
    jokerTransformWeights,
    maxWinMult: clamp(num(obj.maxWinMult, d.maxWinMult), 0, 100_000),
    targetRtp: clamp(num(obj.targetRtp, activeProfile?.targetRtp ?? d.targetRtp), 80, 99.5),
    volatility,
    activeRtpProfile,
    rtpProfiles,
    symbols,
  };
}
