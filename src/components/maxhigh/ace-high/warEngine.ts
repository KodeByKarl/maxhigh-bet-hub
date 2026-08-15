import { compareRanks, rankValue, type AceHighConfig } from "@/lib/ace-high-config";
import { burnCards, drawCard, ensureShoe, type PlayingCard, type ShoeState } from "./deckEngine";
import type { AhRng } from "./rng";

export type CompareOutcome = "player" | "dealer" | "tie";

export function highestCard(cards: PlayingCard[]): PlayingCard {
  if (cards.length === 0) throw new Error("highestCard: empty hand");
  let best = cards[0]!;
  for (let i = 1; i < cards.length; i++) {
    const c = cards[i]!;
    if (rankValue(c.rank) > rankValue(best.rank)) best = c;
  }
  return best;
}

export function compareCards(player: PlayingCard, dealer: PlayingCard): CompareOutcome {
  const c = compareRanks(player.rank, dealer.rank);
  if (c > 0) return "player";
  if (c < 0) return "dealer";
  return "tie";
}

/** Compare each side's highest single card (not a hand total). */
export function compareHighest(
  playerCards: PlayingCard[],
  dealerCards: PlayingCard[],
): CompareOutcome {
  return compareCards(highestCard(playerCards), highestCard(dealerCards));
}

export type WarStepResult = {
  burned: PlayingCard[];
  playerCard: PlayingCard;
  dealerCard: PlayingCard;
  outcome: CompareOutcome;
  shoe: ShoeState;
  /** Depth after this war round (1 = first war). */
  warDepth: number;
  /** True when still tied and warMaxDepth reached — caller should split. */
  splitPot: boolean;
  /** Match stake for this step (= baseBet). */
  matchAmount: number;
};

/**
 * Burn N, deal one card each, compare new cards only.
 */
export function resolveWarRound(opts: {
  shoe: ShoeState;
  cfg: AceHighConfig;
  rng: AhRng;
  /** War depth after this round completes (1..warMaxDepth). */
  warDepth: number;
  matchAmount: number;
}): WarStepResult {
  const shoe = ensureShoe(opts.shoe, opts.cfg, opts.rng);
  const burned = burnCards(shoe, opts.cfg.warBurnCount);
  const ensured = ensureShoe(shoe, opts.cfg, opts.rng);
  const playerCard = drawCard(ensured);
  const dealerCard = drawCard(ensured);
  const outcome = compareCards(playerCard, dealerCard);
  const atCap = opts.warDepth >= opts.cfg.warMaxDepth;
  return {
    burned,
    playerCard,
    dealerCard,
    outcome,
    shoe: ensured,
    warDepth: opts.warDepth,
    splitPot: outcome === "tie" && atCap,
    matchAmount: opts.matchAmount,
  };
}

export type AutoWarLoopResult = {
  steps: WarStepResult[];
  /** Cumulative matched stakes debited across all steps. */
  warMatched: number;
  finalOutcome: CompareOutcome | "split";
  shoe: ShoeState;
};

/**
 * Auto-War: match baseBet each depth, burn, redeal 1+1, until decisive or max depth → split.
 */
export function resolveAutoWarLoop(opts: {
  shoe: ShoeState;
  cfg: AceHighConfig;
  seedBase: string;
  baseBet: number;
  createRng: (seed: string) => AhRng;
}): AutoWarLoopResult {
  const steps: WarStepResult[] = [];
  let shoe = opts.shoe;
  let warMatched = 0;
  let finalOutcome: CompareOutcome | "split" = "tie";

  for (let depth = 1; depth <= opts.cfg.warMaxDepth; depth++) {
    const matchAmount = opts.baseBet;
    warMatched = +(warMatched + matchAmount).toFixed(2);
    const rng = opts.createRng(`${opts.seedBase}-war-${depth}`);
    const step = resolveWarRound({
      shoe,
      cfg: opts.cfg,
      rng,
      warDepth: depth,
      matchAmount,
    });
    shoe = step.shoe;
    steps.push(step);

    if (step.outcome === "player" || step.outcome === "dealer") {
      finalOutcome = step.outcome;
      break;
    }
    if (step.splitPot) {
      finalOutcome = "split";
      break;
    }
  }

  // Safety: if loop ended still tied without split flag
  if (finalOutcome === "tie" && steps.length > 0) {
    finalOutcome = "split";
    const last = steps[steps.length - 1]!;
    last.splitPot = true;
  }

  return { steps, warMatched, finalOutcome, shoe };
}
