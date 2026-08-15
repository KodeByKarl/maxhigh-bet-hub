/**
 * Lucky 9 deal resolver — pure math, no wallet I/O.
 * Deal order: Player, Dealer, Player, Dealer, then optional thirds (symmetric rule).
 *
 * Natural 9 (exactly `naturalTotal` on first two cards) skips the third for THAT hand.
 * Natural 9 beats any 3-card total of 9. Equal non-natural totals = Tie.
 * Dealer pays even money — no commission.
 */
import {
  getHandTotal,
  isNatural,
  pushCredit,
  shouldDraw,
  winCredit,
  type Lucky9Config,
} from "@/lib/lucky9-config";
import {
  drawCard,
  ensureShoe,
  serializeShoe,
  type PlayingCard,
  type ShoeState,
} from "./deckEngine";
import { createRng, newDealSeed } from "./rng";
import { getLucky9Config } from "./runtimeConfig";

export type Lucky9Outcome = "player" | "dealer" | "tie";

export type DealResolveResult = {
  seed: string;
  shoe: ShoeState;
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  playerTotal: number;
  dealerTotal: number;
  playerNatural: boolean;
  dealerNatural: boolean;
  /** True if either side had a natural on the first two cards. */
  natural: boolean;
  playerDrew: boolean;
  dealerDrew: boolean;
  outcome: Lucky9Outcome;
  /** Credit after stakes debited (stake return + profit where applicable). */
  playerWin: number;
  dealerWin: number;
  tieWin: number;
  /** Sum of all win credits. */
  immediateCredit: number;
  totalWager: number;
};

/**
 * Compare finals: higher total (closer to 9) wins.
 * On equal totals, a 2-card natural beats a 3-card hand.
 */
export function compareHands(
  playerTotal: number,
  dealerTotal: number,
  playerNatural: boolean,
  dealerNatural: boolean,
): Lucky9Outcome {
  if (playerTotal > dealerTotal) return "player";
  if (dealerTotal > playerTotal) return "dealer";
  // Equal totals — natural 9 beats 3-card 9
  if (playerNatural && !dealerNatural) return "player";
  if (dealerNatural && !playerNatural) return "dealer";
  return "tie";
}

export function resolveLucky9Deal(opts: {
  playerBet?: number;
  dealerBet?: number;
  tieBet?: number;
  cfg?: Lucky9Config;
  seed?: string;
  shoe?: ShoeState | null;
}): DealResolveResult {
  const cfg = opts.cfg ?? getLucky9Config();
  const playerBet = +(opts.playerBet ?? 0).toFixed(2);
  const dealerBet = +(opts.dealerBet ?? 0).toFixed(2);
  const tieBet = +(opts.tieBet ?? 0).toFixed(2);
  const totalWager = +(playerBet + dealerBet + tieBet).toFixed(2);

  const seed = opts.seed ?? newDealSeed("l9-deal");
  const rng = createRng(seed);
  let shoe = ensureShoe(opts.shoe ?? null, cfg, rng);

  // Standard deal: P1, D1, P2, D2
  const p1 = drawCard(shoe);
  const d1 = drawCard(shoe);
  const p2 = drawCard(shoe);
  const d2 = drawCard(shoe);

  const playerCards: PlayingCard[] = [p1, p2];
  const dealerCards: PlayingCard[] = [d1, d2];

  let playerTotal = getHandTotal(playerCards);
  let dealerTotal = getHandTotal(dealerCards);

  const playerNatural = isNatural(playerTotal, cfg.naturalTotal);
  const dealerNatural = isNatural(dealerTotal, cfg.naturalTotal);
  const natural = playerNatural || dealerNatural;

  let playerDrew = false;
  let dealerDrew = false;

  // Per-hand natural: that hand stands; the other may still draw if not natural.
  // (Unlike Baccarat, a natural does not freeze BOTH sides.)
  if (!playerNatural && shouldDraw(playerTotal, cfg.drawThreshold)) {
    const p3 = drawCard(shoe);
    playerCards.push(p3);
    playerDrew = true;
    playerTotal = getHandTotal(playerCards);
  }

  // Dealer third-card: always sequential after Player.
  // independent / after-player both use the same symmetric threshold —
  // NOT Baccarat's asymmetric tableau. after-player is reserved for future
  // dependent variants; both modes currently draw on ≤ drawThreshold.
  if (!dealerNatural && shouldDraw(dealerTotal, cfg.drawThreshold)) {
    if (cfg.dealerDrawMode === "independent" || cfg.dealerDrawMode === "after-player") {
      const d3 = drawCard(shoe);
      dealerCards.push(d3);
      dealerDrew = true;
      dealerTotal = getHandTotal(dealerCards);
    }
  }

  const outcome = compareHands(playerTotal, dealerTotal, playerNatural, dealerNatural);

  let playerWin = 0;
  let dealerWin = 0;
  let tieWin = 0;

  if (outcome === "player") {
    playerWin = winCredit(playerBet, cfg.playerPayout);
  } else if (outcome === "dealer") {
    dealerWin = winCredit(dealerBet, cfg.dealerPayout);
  } else {
    // Tie: Player & Dealer main bets push; Tie side bet pays
    playerWin = pushCredit(playerBet);
    dealerWin = pushCredit(dealerBet);
    tieWin = winCredit(tieBet, cfg.tiePayout);
  }

  const immediateCredit = +(playerWin + dealerWin + tieWin).toFixed(2);

  return {
    seed,
    shoe,
    playerCards,
    dealerCards,
    playerTotal,
    dealerTotal,
    playerNatural,
    dealerNatural,
    natural,
    playerDrew,
    dealerDrew,
    outcome,
    playerWin,
    dealerWin,
    tieWin,
    immediateCredit,
    totalWager,
  };
}

export function shoeSnapshot(shoe: ShoeState) {
  return serializeShoe(shoe);
}
