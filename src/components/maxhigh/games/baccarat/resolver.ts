/**
 * Baccarat (Punto Banco) deal resolver — pure math, no wallet I/O.
 * Deal order: Player, Banker, Player, Banker, then optional thirds.
 */
import {
  getCardValue,
  getHandTotal,
  isPair,
  pushCredit,
  shouldBankerDraw,
  shouldPlayerDraw,
  winCredit,
  type BaccaratConfig,
} from "@/lib/baccarat-config";
import {
  drawCard,
  ensureShoe,
  serializeShoe,
  type PlayingCard,
  type ShoeState,
} from "./deckEngine";
import { createRng, newDealSeed } from "./rng";
import { getBaccaratConfig } from "./runtimeConfig";

export type BaccaratOutcome = "player" | "banker" | "tie";

export type DealResolveResult = {
  seed: string;
  shoe: ShoeState;
  playerCards: PlayingCard[];
  bankerCards: PlayingCard[];
  playerTotal: number;
  bankerTotal: number;
  natural: boolean;
  playerDrew: boolean;
  bankerDrew: boolean;
  outcome: BaccaratOutcome;
  playerPair: boolean;
  bankerPair: boolean;
  /** Credit after stakes debited (stake return + profit where applicable). */
  playerWin: number;
  bankerWin: number;
  tieWin: number;
  playerPairWin: number;
  bankerPairWin: number;
  /** Sum of all win credits. */
  immediateCredit: number;
  totalWager: number;
};

export function resolveBaccaratDeal(opts: {
  playerBet?: number;
  bankerBet?: number;
  tieBet?: number;
  playerPairBet?: number;
  bankerPairBet?: number;
  cfg?: BaccaratConfig;
  seed?: string;
  shoe?: ShoeState | null;
}): DealResolveResult {
  const cfg = opts.cfg ?? getBaccaratConfig();
  const playerBet = +(opts.playerBet ?? 0).toFixed(2);
  const bankerBet = +(opts.bankerBet ?? 0).toFixed(2);
  const tieBet = +(opts.tieBet ?? 0).toFixed(2);
  const playerPairBet = +(opts.playerPairBet ?? 0).toFixed(2);
  const bankerPairBet = +(opts.bankerPairBet ?? 0).toFixed(2);
  const totalWager = +(
    playerBet +
    bankerBet +
    tieBet +
    playerPairBet +
    bankerPairBet
  ).toFixed(2);

  const seed = opts.seed ?? newDealSeed("bc-deal");
  const rng = createRng(seed);
  let shoe = ensureShoe(opts.shoe ?? null, cfg, rng);

  // Standard deal: P1, B1, P2, B2
  const p1 = drawCard(shoe);
  const b1 = drawCard(shoe);
  const p2 = drawCard(shoe);
  const b2 = drawCard(shoe);

  const playerCards: PlayingCard[] = [p1, p2];
  const bankerCards: PlayingCard[] = [b1, b2];

  const playerPair = isPair(p1, p2);
  const bankerPair = isPair(b1, b2);

  let playerTotal = getHandTotal(playerCards);
  let bankerTotal = getHandTotal(bankerCards);
  const natural = playerTotal >= 8 || bankerTotal >= 8;

  let playerDrew = false;
  let bankerDrew = false;

  if (!natural) {
    if (shouldPlayerDraw(playerTotal)) {
      const p3 = drawCard(shoe);
      playerCards.push(p3);
      playerDrew = true;
      playerTotal = getHandTotal(playerCards);
    }

    const playerThirdValue = playerDrew ? getCardValue(playerCards[2]!) : null;
    if (shouldBankerDraw(bankerTotal, playerDrew, playerThirdValue)) {
      const b3 = drawCard(shoe);
      bankerCards.push(b3);
      bankerDrew = true;
      bankerTotal = getHandTotal(bankerCards);
    }
  }

  let outcome: BaccaratOutcome;
  if (playerTotal > bankerTotal) outcome = "player";
  else if (bankerTotal > playerTotal) outcome = "banker";
  else outcome = "tie";

  let playerWin = 0;
  let bankerWin = 0;
  let tieWin = 0;

  if (outcome === "player") {
    playerWin = winCredit(playerBet, cfg.playerPayout);
  } else if (outcome === "banker") {
    bankerWin = winCredit(bankerBet, cfg.bankerPayout);
  } else {
    // Tie: Player & Banker main bets push; Tie side bet pays
    playerWin = pushCredit(playerBet);
    bankerWin = pushCredit(bankerBet);
    tieWin = winCredit(tieBet, cfg.tiePayout);
  }

  const playerPairWin = playerPair ? winCredit(playerPairBet, cfg.playerPairPayout) : 0;
  const bankerPairWin = bankerPair ? winCredit(bankerPairBet, cfg.bankerPairPayout) : 0;

  const immediateCredit = +(
    playerWin +
    bankerWin +
    tieWin +
    playerPairWin +
    bankerPairWin
  ).toFixed(2);

  return {
    seed,
    shoe,
    playerCards,
    bankerCards,
    playerTotal,
    bankerTotal,
    natural,
    playerDrew,
    bankerDrew,
    outcome,
    playerPair,
    bankerPair,
    playerWin,
    bankerWin,
    tieWin,
    playerPairWin,
    bankerPairWin,
    immediateCredit,
    totalWager,
  };
}

export function shoeSnapshot(shoe: ShoeState) {
  return serializeShoe(shoe);
}
