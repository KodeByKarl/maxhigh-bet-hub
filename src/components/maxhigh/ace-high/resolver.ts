import {
  applyWinCap,
  type AceHighConfig,
} from "@/lib/ace-high-config";
import {
  drawCard,
  ensureShoe,
  serializeShoe,
  type PlayingCard,
  type ShoeState,
} from "./deckEngine";
import { createRng, newDealSeed } from "./rng";
import { getAceHighConfig } from "./runtimeConfig";
import {
  compareHighest,
  resolveAutoWarLoop,
  type AutoWarLoopResult,
  type CompareOutcome,
  type WarStepResult,
} from "./warEngine";

export type AceBonusHit = "ace_vs_ace" | "either_ace" | null;

export type DealResolveResult = {
  seed: string;
  shoe: ShoeState;
  playerCards: [PlayingCard, PlayingCard];
  dealerCards: [PlayingCard, PlayingCard];
  /** Initial highest-card outcome (before auto-war). */
  initialOutcome: CompareOutcome;
  /** Final outcome after auto-war (same as initial if no war). */
  outcome: CompareOutcome | "split";
  tieWin: number;
  aceBonusWin: number;
  aceBonusHit: AceBonusHit;
  /**
   * Base/war credit after stake(s) were debited.
   * Even money: baseBet * basePayoutMult, or (base+matched) * basePayoutMult on war win,
   * or base+matched on split. Never includes side bets.
   */
  baseWin: number;
  /** Side wins + baseWin (capped). Used when no war match debits mid-round. */
  immediateCredit: number;
  /** Always false for auto-war — round fully resolved in one settle. */
  pendingWar: boolean;
  totalWager: number;
  warSteps: WarStepResult[];
  warMatched: number;
  splitPot: boolean;
};

function hasAce(cards: PlayingCard[]): boolean {
  return cards.some((c) => c.rank === "A");
}

function evalAceBonus(
  playerCards: PlayingCard[],
  dealerCards: PlayingCard[],
  aceBonusBet: number,
  cfg: AceHighConfig,
): { win: number; hit: AceBonusHit } {
  if (aceBonusBet <= 0) return { win: 0, hit: null };
  const pAce = hasAce(playerCards);
  const dAce = hasAce(dealerCards);
  if (pAce && dAce) {
    return { win: +(aceBonusBet * cfg.aceBonus.aceVsAce).toFixed(2), hit: "ace_vs_ace" };
  }
  if (pAce || dAce) {
    return { win: +(aceBonusBet * cfg.aceBonus.eitherAce).toFixed(2), hit: "either_ace" };
  }
  return { win: 0, hit: null };
}

/**
 * Deal 2+2, compare highest cards. On initial tie, run auto-war loop (math only —
 * server must debit war matches separately before applying baseWin).
 */
export function resolveAceHighDeal(opts: {
  baseBet: number;
  tieBet?: number;
  aceBonusBet?: number;
  cfg?: AceHighConfig;
  seed?: string;
  shoe?: ShoeState | null;
}): DealResolveResult {
  const cfg = opts.cfg ?? getAceHighConfig();
  const baseBet = +opts.baseBet.toFixed(2);
  const tieBet = +(opts.tieBet ?? 0).toFixed(2);
  const aceBonusBet = +(opts.aceBonusBet ?? 0).toFixed(2);
  const totalWager = +(baseBet + tieBet + aceBonusBet).toFixed(2);

  const seed = opts.seed ?? newDealSeed("ah-deal");
  const rng = createRng(seed);
  let shoe = ensureShoe(opts.shoe ?? null, cfg, rng);

  // Deal order: P1, D1, P2, D2
  const p1 = drawCard(shoe);
  const d1 = drawCard(shoe);
  const p2 = drawCard(shoe);
  const d2 = drawCard(shoe);
  const playerHand: [PlayingCard, PlayingCard] = [p1, p2];
  const dealerHand: [PlayingCard, PlayingCard] = [d1, d2];

  const initialOutcome = compareHighest(playerHand, dealerHand);
  const ace = evalAceBonus(playerHand, dealerHand, aceBonusBet, cfg);

  let tieWin = 0;
  let warSteps: WarStepResult[] = [];
  let warMatched = 0;
  let splitPot = false;
  let outcome: CompareOutcome | "split" = initialOutcome;
  let baseWin = 0;

  if (initialOutcome === "tie" && tieBet > 0) {
    tieWin = +(tieBet * cfg.tieSideBetMult).toFixed(2);
  }

  if (initialOutcome === "player") {
    // Even money after debit: one credit of baseBet * basePayoutMult
    baseWin = +(baseBet * cfg.basePayoutMult).toFixed(2);
  } else if (initialOutcome === "tie") {
    const war: AutoWarLoopResult = resolveAutoWarLoop({
      shoe,
      cfg,
      seedBase: seed,
      baseBet,
      createRng,
    });
    shoe = war.shoe;
    warSteps = war.steps;
    warMatched = war.warMatched;
    outcome = war.finalOutcome;
    if (war.finalOutcome === "player") {
      baseWin = warWinCredit(baseBet, warMatched, cfg);
    } else if (war.finalOutcome === "split") {
      baseWin = splitPotCredit(baseBet, warMatched);
      splitPot = true;
    } else {
      baseWin = 0; // dealer wins war — stakes already lost
    }
  }

  // Side wins + base when no extra war debits needed for "immediate" display;
  // server credits sides + baseWin after all debits.
  let immediateCredit = +(baseWin + tieWin + ace.win).toFixed(2);
  immediateCredit = applyWinCap(immediateCredit, baseBet, cfg);
  // Cap only the total credit returned; baseWin itself already uses applyWinCap in warWinCredit
  if (baseWin > 0) {
    baseWin = applyWinCap(baseWin, baseBet, cfg);
  }

  return {
    seed,
    shoe,
    playerCards: playerHand,
    dealerCards: dealerHand,
    initialOutcome,
    outcome,
    tieWin,
    aceBonusWin: ace.win,
    aceBonusHit: ace.hit,
    baseWin,
    immediateCredit: applyWinCap(+(baseWin + tieWin + ace.win).toFixed(2), baseBet, cfg),
    pendingWar: false,
    totalWager,
    warSteps,
    warMatched,
    splitPot,
  };
}

/** Credit for winning all money at risk after war (base + matched), after those stakes were debited. */
export function warWinCredit(baseBet: number, warMatched: number, cfg: AceHighConfig): number {
  const atRisk = +(baseBet + warMatched).toFixed(2);
  return applyWinCap(+(atRisk * cfg.basePayoutMult).toFixed(2), baseBet, cfg);
}

/** Push / split — return stakes only (base + matched already debited). */
export function splitPotCredit(baseBet: number, warMatched: number): number {
  return +(baseBet + warMatched).toFixed(2);
}

export function shoeSnapshot(shoe: ShoeState) {
  return serializeShoe(shoe);
}
