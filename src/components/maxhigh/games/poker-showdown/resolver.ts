/**
 * Poker Showdown resolver — pure math, no wallet I/O.
 *
 * Phase 1 (deal): deal 3+3, settle Pair Plus on player's hand only.
 * Phase 2 (play/fold): settle Ante/Play vs dealer qualification + comparison;
 *   Ante Bonus (if enabled) pays on player hand strength regardless of dealer.
 */
import {
  anteBonusOdds,
  pairPlusOdds,
  pushCredit,
  winCredit,
  type HandCategory,
  type PokerShowdownConfig,
} from "@/lib/poker-showdown-config";
import {
  compareHands,
  dealerQualifiesWithConfig,
  evaluateHand,
  type HandRank,
} from "./handEvaluator";
import {
  drawCard,
  ensureShoe,
  serializeShoe,
  type PlayingCard,
  type ShoeState,
} from "./deckEngine";
import { createRng, newDealSeed } from "./rng";
import { getPokerShowdownConfig } from "./runtimeConfig";

export type MainOutcome =
  | "player"
  | "dealer"
  | "tie"
  | "dealer-not-qualify"
  | "fold";

export type DealPhaseResult = {
  seed: string;
  shoe: ShoeState;
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  playerHand: HandRank;
  dealerHand: HandRank;
  pairPlusCategory: HandCategory | null;
  pairPlusWin: number;
  /** Ante Bonus credit if settled at play time (0 here — computed on play/fold). */
  anteBonusEligible: boolean;
  immediateCredit: number;
  totalWager: number;
  ante: number;
  pairPlus: number;
};

export type SettlePhaseResult = {
  decision: "play" | "fold";
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  playerHand: HandRank;
  dealerHand: HandRank;
  dealerQualified: boolean;
  outcome: MainOutcome;
  anteWin: number;
  playWin: number;
  pairPlusWin: number;
  anteBonusWin: number;
  immediateCredit: number;
  playWager: number;
  ante: number;
  pairPlus: number;
};

export function resolveDeal(opts: {
  ante: number;
  pairPlus?: number;
  cfg?: PokerShowdownConfig;
  seed?: string;
  shoe?: ShoeState | null;
}): DealPhaseResult {
  const cfg = opts.cfg ?? getPokerShowdownConfig();
  const ante = +Number(opts.ante ?? 0).toFixed(2);
  const pairPlus = +Number(opts.pairPlus ?? 0).toFixed(2);
  const totalWager = +(ante + pairPlus).toFixed(2);

  if (ante <= 0) throw new Error("Ante bet required");

  const seed = opts.seed ?? newDealSeed("tcp-deal");
  const rng = createRng(seed);
  const shoe = ensureShoe(opts.shoe ?? null, cfg, rng);

  // Deal order: P1, D1, P2, D2, P3, D3
  const p1 = drawCard(shoe);
  const d1 = drawCard(shoe);
  const p2 = drawCard(shoe);
  const d2 = drawCard(shoe);
  const p3 = drawCard(shoe);
  const d3 = drawCard(shoe);
  const player: PlayingCard[] = [p1, p2, p3];
  const dealer: PlayingCard[] = [d1, d2, d3];

  const playerHand = evaluateHand(player);
  const dealerHand = evaluateHand(dealer);

  const odds = pairPlusOdds(playerHand.category, cfg);
  const pairPlusWin = pairPlus > 0 && odds > 0 ? winCredit(pairPlus, odds) : 0;
  const anteBonusEligible = anteBonusOdds(playerHand.category, cfg) > 0;

  return {
    seed,
    shoe,
    playerCards: player,
    dealerCards: dealer,
    playerHand,
    dealerHand,
    pairPlusCategory: pairPlus > 0 && odds > 0 ? playerHand.category : null,
    pairPlusWin,
    anteBonusEligible,
    immediateCredit: +pairPlusWin.toFixed(2),
    totalWager,
    ante,
    pairPlus,
  };
}

/**
 * Settle Ante/Play after player chooses Play (with stored cards from deal).
 * Pair Plus is NOT re-credited here — it was paid on deal.
 */
export function resolvePlay(opts: {
  ante: number;
  pairPlus?: number;
  /** Pair Plus credit already paid on deal (echoed in settle script). */
  pairPlusWinAlreadyPaid?: number;
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  cfg?: PokerShowdownConfig;
}): SettlePhaseResult {
  const cfg = opts.cfg ?? getPokerShowdownConfig();
  const ante = +Number(opts.ante).toFixed(2);
  const pairPlus = +Number(opts.pairPlus ?? 0).toFixed(2);
  const playWager = ante;
  const playerHand = evaluateHand(opts.playerCards);
  const dealerHand = evaluateHand(opts.dealerCards);
  const dealerQualified = dealerQualifiesWithConfig(dealerHand, cfg);

  let anteWin = 0;
  let playWin = 0;
  let outcome: MainOutcome;

  if (!dealerQualified) {
    // Ante pays 1:1, Play pushes
    anteWin = winCredit(ante, cfg.antePayout);
    playWin = pushCredit(playWager);
    outcome = "dealer-not-qualify";
  } else {
    const cmp = compareHands(playerHand, dealerHand);
    if (cmp > 0) {
      anteWin = winCredit(ante, cfg.antePayout);
      playWin = winCredit(playWager, cfg.playPayout);
      outcome = "player";
    } else if (cmp < 0) {
      anteWin = 0;
      playWin = 0;
      outcome = "dealer";
    } else {
      anteWin = pushCredit(ante);
      playWin = pushCredit(playWager);
      outcome = "tie";
    }
  }

  const bonusOdds = anteBonusOdds(playerHand.category, cfg);
  // Profit-only on top of Ante (stake already handled by anteWin / push / loss).
  const anteBonusProfit =
    bonusOdds > 0 ? +Number(ante * bonusOdds).toFixed(2) : 0;

  const pairPlusWin = +Number(opts.pairPlusWinAlreadyPaid ?? 0).toFixed(2);
  const immediateCredit = +(anteWin + playWin + anteBonusProfit).toFixed(2);

  return {
    decision: "play",
    playerCards: opts.playerCards,
    dealerCards: opts.dealerCards,
    playerHand,
    dealerHand,
    dealerQualified,
    outcome,
    anteWin,
    playWin,
    pairPlusWin,
    anteBonusWin: anteBonusProfit,
    immediateCredit,
    playWager,
    ante,
    pairPlus,
  };
}

/**
 * Fold: Ante forfeited (already debited). Pair Plus already settled on deal.
 * Ante Bonus does NOT pay on fold (player abandoned the Ante contest).
 * Reveal dealer cards for UI honesty.
 */
export function resolveFold(opts: {
  ante: number;
  pairPlus?: number;
  pairPlusWinAlreadyPaid?: number;
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  cfg?: PokerShowdownConfig;
}): SettlePhaseResult {
  const cfg = opts.cfg ?? getPokerShowdownConfig();
  const ante = +Number(opts.ante).toFixed(2);
  const pairPlus = +Number(opts.pairPlus ?? 0).toFixed(2);
  const playerHand = evaluateHand(opts.playerCards);
  const dealerHand = evaluateHand(opts.dealerCards);
  const dealerQualified = dealerQualifiesWithConfig(dealerHand, cfg);
  const pairPlusWin = +Number(opts.pairPlusWinAlreadyPaid ?? 0).toFixed(2);

  return {
    decision: "fold",
    playerCards: opts.playerCards,
    dealerCards: opts.dealerCards,
    playerHand,
    dealerHand,
    dealerQualified,
    outcome: "fold",
    anteWin: 0,
    playWin: 0,
    pairPlusWin,
    anteBonusWin: 0,
    immediateCredit: 0,
    playWager: 0,
    ante,
    pairPlus,
  };
}

export function shoeSnapshot(shoe: ShoeState) {
  return serializeShoe(shoe);
}

/** @deprecated alias — prefer resolveDeal */
export const resolveThreeCardPokerDeal = resolveDeal;
