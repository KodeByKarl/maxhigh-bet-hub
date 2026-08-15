/**
 * Ace High — 2-card highest-card showdown, auto-War on ties, Tie + Ace Bonus side bets.
 * All payouts / war rules live here and are superadmin-editable via engineConfig.
 *
 * Accounting (stake already debited):
 *   basePayoutMult = 2  → credit baseBet * 2 = even money (stake return + 1:1 profit)
 *   tieSideBetMult = 11 → credit tieBet * 11 ≈ 10:1 after debit
 */

export const ACE_HIGH_GAME_ID = "ace-high";
export const ACE_HIGH_TITLE = "Ace High";

export const ACE_HIGH_RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
] as const;

export type AceHighRank = (typeof ACE_HIGH_RANKS)[number];
export const ACE_HIGH_SUITS = ["S", "H", "D", "C"] as const;
export type AceHighSuit = (typeof ACE_HIGH_SUITS)[number];

export type AceBonusTable = {
  /** Mult on ace-bonus stake when player AND dealer each show ≥1 Ace (incl. stake return). */
  aceVsAce: number;
  /** Mult when exactly one side shows ≥1 Ace. */
  eitherAce: number;
};

export type AceHighConfig = {
  schemaVersion: 2;
  /** Number of 52-card decks in the shoe. */
  decksInShoe: number;
  /** Reshuffle when remaining cards fall at or below this fraction of shoe. */
  reshuffleBelowFraction: number;
  minBet: number;
  maxBet: number;
  minTieBet: number;
  maxTieBet: number;
  minAceBonusBet: number;
  maxAceBonusBet: number;
  /**
   * Total credit multiplier after stake was debited.
   * 2 = even money / 1:1 (return stake + 1× profit). Never apply twice.
   * Alias in saved JSON: `basePayout`.
   */
  basePayoutMult: number;
  /**
   * Tie/War side bet credit × tieBet on *initial* highest-card tie (incl. stake).
   * Alias in saved JSON: `tiePayout`.
   */
  tieSideBetMult: number;
  aceBonus: AceBonusTable;
  /** Cards burned before each war redeal. */
  warBurnCount: number;
  /** Max war rounds after the initial tie (then split pot). */
  warMaxDepth: number;
  /** Cap total credited win as × baseBet for the round. */
  maxWinMult: number;
  /** Display / lobby target RTP % (fair shoe deal — label for compliance). */
  targetRtp: number;
  /** Quick-bet chip amounts shown in the betting dock (superadmin-editable). */
  betSteps: number[];
};

export const DEFAULT_ACE_HIGH_CONFIG: AceHighConfig = {
  schemaVersion: 2,
  decksInShoe: 6,
  reshuffleBelowFraction: 0.25,
  minBet: 1,
  maxBet: 500,
  minTieBet: 1,
  maxTieBet: 500,
  minAceBonusBet: 1,
  maxAceBonusBet: 500,
  basePayoutMult: 2,
  tieSideBetMult: 5,
  aceBonus: {
    aceVsAce: 12,
    eitherAce: 3,
  },
  warBurnCount: 1,
  warMaxDepth: 3,
  maxWinMult: 500,
  targetRtp: 96.5,
  betSteps: [1, 2, 5, 10, 20, 50, 100, 200, 500],
};

/** @deprecated Prefer `cfg.betSteps` from engine config. */
export const BET_STEPS = DEFAULT_ACE_HIGH_CONFIG.betSteps;

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBetSteps(raw: unknown, fallback: number[]): number[] {
  const src = Array.isArray(raw) ? raw : fallback;
  const out: number[] = [];
  for (const v of src) {
    const n = Math.round(num(v, 0) * 100) / 100;
    if (n > 0 && n <= 100_000 && !out.includes(n)) out.push(n);
  }
  out.sort((a, b) => a - b);
  return out.length > 0 ? out : [...fallback];
}

export function rankValue(rank: string): number {
  const i = ACE_HIGH_RANKS.indexOf(rank as AceHighRank);
  return i >= 0 ? i : -1;
}

export function compareRanks(a: string, b: string): -1 | 0 | 1 {
  const va = rankValue(a);
  const vb = rankValue(b);
  if (va > vb) return 1;
  if (va < vb) return -1;
  return 0;
}

export function normalizeAceHighConfig(raw: unknown): AceHighConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_ACE_HIGH_CONFIG);
  const o = raw as Partial<AceHighConfig> & {
    mainWinPayoutMult?: number;
    basePayout?: number;
    tiePayout?: number;
    pairPays?: unknown;
  };
  const d = DEFAULT_ACE_HIGH_CONFIG;
  const bonus = (o.aceBonus ?? d.aceBonus) as Partial<AceBonusTable>;
  const basePayout =
    o.basePayoutMult ?? o.basePayout ?? o.mainWinPayoutMult ?? d.basePayoutMult;
  const tiePayout = o.tieSideBetMult ?? o.tiePayout ?? d.tieSideBetMult;
  const minBet = clamp(num(o.minBet, d.minBet), 0.01, 10_000);
  const maxBet = clamp(num(o.maxBet, d.maxBet), minBet, 100_000);

  return {
    schemaVersion: 2,
    decksInShoe: clamp(Math.round(num(o.decksInShoe, d.decksInShoe)), 1, 8),
    reshuffleBelowFraction: clamp(
      num(o.reshuffleBelowFraction, d.reshuffleBelowFraction),
      0.05,
      0.75,
    ),
    minBet,
    maxBet,
    minTieBet: clamp(num(o.minTieBet, d.minTieBet), 0.01, 10_000),
    maxTieBet: clamp(num(o.maxTieBet, d.maxTieBet), 0.01, 100_000),
    minAceBonusBet: clamp(num(o.minAceBonusBet, d.minAceBonusBet), 0.01, 10_000),
    maxAceBonusBet: clamp(num(o.maxAceBonusBet, d.maxAceBonusBet), 0.01, 100_000),
    basePayoutMult: clamp(num(basePayout, d.basePayoutMult), 1, 10),
    tieSideBetMult: clamp(num(tiePayout, d.tieSideBetMult), 1, 100),
    aceBonus: {
      aceVsAce: clamp(num(bonus.aceVsAce, d.aceBonus.aceVsAce), 1, 500),
      eitherAce: clamp(num(bonus.eitherAce, d.aceBonus.eitherAce), 1, 100),
    },
    warBurnCount: clamp(Math.round(num(o.warBurnCount, d.warBurnCount)), 0, 10),
    warMaxDepth: clamp(Math.round(num(o.warMaxDepth, d.warMaxDepth)), 1, 10),
    maxWinMult: clamp(num(o.maxWinMult, d.maxWinMult), 1, 10_000),
    targetRtp: clamp(num(o.targetRtp, d.targetRtp), 80, 99),
    betSteps: normalizeBetSteps(o.betSteps, d.betSteps).filter((s) => s <= maxBet),
  };
}

export function applyWinCap(amount: number, baseBet: number, cfg: AceHighConfig): number {
  const cap = +(baseBet * cfg.maxWinMult).toFixed(2);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return +Math.min(amount, cap).toFixed(2);
}
