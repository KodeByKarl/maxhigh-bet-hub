/**
 * Three Card Poker — hand math, settlement, and RTP / EV simulation.
 * Run: npx tsx scripts/test-threecardpoker.ts
 */
import {
  DEFAULT_THREE_CARD_POKER_CONFIG,
  normalizeThreeCardPokerConfig,
  pairPlusOdds,
  anteBonusOdds,
  winCredit,
  pushCredit,
} from "../src/lib/threecardpoker-config";
import {
  evaluateHand,
  compareHands,
  dealerQualifies,
  straightHigh,
} from "../src/components/maxhigh/games/threecardpoker/handEvaluator";
import {
  resolveDeal,
  resolvePlay,
  resolveFold,
} from "../src/components/maxhigh/games/threecardpoker/resolver";
import { setThreeCardPokerConfig } from "../src/components/maxhigh/games/threecardpoker/runtimeConfig";
import {
  buildShoe,
  type PlayingCard,
} from "../src/components/maxhigh/games/threecardpoker/deckEngine";
import { type TcpRank, type TcpSuit } from "../src/lib/threecardpoker-config";

const ROUNDS = Number(process.env.TCP_SIM_ROUNDS ?? 100_000);
const ANTE = 10;
const PAIR_PLUS = 5;

function card(rank: TcpRank, suit: TcpSuit, id?: string): PlayingCard {
  return { rank, suit, id: id ?? `${rank}${suit}` };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  const cfg = normalizeThreeCardPokerConfig({
    ...DEFAULT_THREE_CARD_POKER_CONFIG,
    anteBonusEnabled: true,
  });
  setThreeCardPokerConfig(cfg);

  // --- Exhaustive category coverage over C(52,3) = 22,100 ---
  const shoe = buildShoe(1);
  const counts: Record<string, number> = {
    "straight-flush": 0,
    "three-of-a-kind": 0,
    straight: 0,
    flush: 0,
    pair: 0,
    "high-card": 0,
  };
  let totalCombos = 0;
  for (let i = 0; i < shoe.length; i++) {
    for (let j = i + 1; j < shoe.length; j++) {
      for (let k = j + 1; k < shoe.length; k++) {
        const hand = evaluateHand([shoe[i]!, shoe[j]!, shoe[k]!]);
        counts[hand.category]!++;
        totalCombos++;
      }
    }
  }
  assert(totalCombos === 22_100, `Expected 22100 combos, got ${totalCombos}`);
  // Known 3-card poker frequencies (52-card deck)
  assert(counts["straight-flush"] === 48, `SF count ${counts["straight-flush"]}`);
  assert(counts["three-of-a-kind"] === 52, `Trips count ${counts["three-of-a-kind"]}`);
  assert(counts.straight === 720, `Straight count ${counts.straight}`);
  assert(counts.flush === 1096, `Flush count ${counts.flush}`);
  assert(counts.pair === 3744, `Pair count ${counts.pair}`);
  assert(counts["high-card"] === 16_440, `High card count ${counts["high-card"]}`);
  console.log("OK exhaustive category counts", counts);

  // --- Wheel A-2-3 ---
  const wheel = evaluateHand([card("A", "S"), card("2", "H"), card("3", "D")]);
  assert(wheel.category === "straight", "A-2-3 must be straight");
  assert(wheel.tiebreak[0] === 3, "Wheel straight high must be 3");
  assert(straightHigh([2, 3, 14]) === 3, "straightHigh wheel");

  const wheelFlush = evaluateHand([card("A", "S"), card("2", "S"), card("3", "S")]);
  assert(wheelFlush.category === "straight-flush", "A-2-3 suited is SF");

  // Ace-high straight beats wheel
  const akq = evaluateHand([card("A", "H"), card("K", "D"), card("Q", "C")]);
  assert(akq.category === "straight", "A-K-Q straight");
  assert(compareHands(akq, wheel) > 0, "A-K-Q beats wheel");

  // Straight beats Flush (unique to this game)
  const straight = evaluateHand([card("5", "H"), card("6", "D"), card("7", "C")]);
  const flush = evaluateHand([card("A", "S"), card("9", "S"), card("2", "S")]);
  assert(straight.category === "straight" && flush.category === "flush", "setup SF vs flush");
  assert(compareHands(straight, flush) > 0, "Straight must beat Flush");

  // Trips beat straight
  const trips = evaluateHand([card("9", "S"), card("9", "H"), card("9", "D")]);
  assert(compareHands(trips, straight) > 0, "Trips beat straight");

  // Dealer qualify Queen-high
  const qHigh = evaluateHand([card("Q", "S"), card("7", "H"), card("2", "D")]);
  const jHigh = evaluateHand([card("J", "S"), card("7", "H"), card("2", "D")]);
  const pairLow = evaluateHand([card("2", "S"), card("2", "H"), card("3", "D")]);
  assert(dealerQualifies(qHigh, "Q"), "Queen high qualifies");
  assert(!dealerQualifies(jHigh, "Q"), "Jack high does not qualify vs Q");
  assert(dealerQualifies(pairLow, "Q"), "Any pair qualifies");

  // --- Settlement branches ---
  // Pair Plus pays on deal regardless
  let foundPp = false;
  for (let i = 0; i < 5000; i++) {
    const d = resolveDeal({ ante: ANTE, pairPlus: PAIR_PLUS, cfg, seed: `pp-${i}` });
    if (d.pairPlusWin > 0) {
      foundPp = true;
      const odds = pairPlusOdds(d.playerHand.category, cfg);
      assert(d.pairPlusWin === winCredit(PAIR_PLUS, odds), "Pair Plus credit mismatch");
      break;
    }
  }
  assert(foundPp, "No Pair Plus win sample in 5000 deals");

  // Fold: Ante lost, Pair Plus already paid, no Ante Bonus
  const foldDeal = resolveDeal({
    ante: 100,
    pairPlus: 50,
    cfg,
    seed: "fold-fixed-1",
  });
  const folded = resolveFold({
    ante: 100,
    pairPlus: 50,
    pairPlusWinAlreadyPaid: foldDeal.pairPlusWin,
    playerCards: foldDeal.playerCards,
    dealerCards: foldDeal.dealerCards,
    cfg,
  });
  assert(folded.outcome === "fold", "Fold outcome");
  assert(folded.anteWin === 0 && folded.playWin === 0 && folded.anteBonusWin === 0, "Fold credits");
  assert(folded.pairPlusWin === foldDeal.pairPlusWin, "Pair Plus survives fold");
  assert(folded.immediateCredit === 0, "Fold phase credit is 0 (PP already paid)");

  // Play: dealer not qualify → Ante 1:1, Play push
  let foundNq = false;
  for (let i = 0; i < 20_000; i++) {
    const d = resolveDeal({ ante: 100, pairPlus: 0, cfg, seed: `nq-${i}` });
    if (!dealerQualifies(d.dealerHand, cfg.dealerQualifyRank)) {
      const s = resolvePlay({
        ante: 100,
        playerCards: d.playerCards,
        dealerCards: d.dealerCards,
        cfg,
      });
      assert(s.outcome === "dealer-not-qualify", "NQ outcome");
      assert(s.anteWin === winCredit(100, cfg.antePayout), "NQ ante pay");
      assert(s.playWin === pushCredit(100), "NQ play push");
      foundNq = true;
      break;
    }
  }
  assert(foundNq, "No dealer-no-qualify sample");

  // Play: player wins vs qualified dealer
  let foundPw = false;
  for (let i = 0; i < 30_000; i++) {
    const d = resolveDeal({ ante: 100, pairPlus: 0, cfg, seed: `pw-${i}` });
    if (
      dealerQualifies(d.dealerHand, cfg.dealerQualifyRank) &&
      compareHands(d.playerHand, d.dealerHand) > 0
    ) {
      const s = resolvePlay({
        ante: 100,
        playerCards: d.playerCards,
        dealerCards: d.dealerCards,
        cfg,
      });
      assert(s.outcome === "player", "Player win outcome");
      assert(s.anteWin === winCredit(100, cfg.antePayout), "Player ante");
      assert(s.playWin === winCredit(100, cfg.playPayout), "Player play");
      const bonus = anteBonusOdds(d.playerHand.category, cfg);
      assert(s.anteBonusWin === +(100 * bonus).toFixed(2), "Ante bonus profit");
      foundPw = true;
      break;
    }
  }
  assert(foundPw, "No player-win sample");

  // Play: dealer wins — lose ante+play, ante bonus may still pay
  let foundDw = false;
  for (let i = 0; i < 30_000; i++) {
    const d = resolveDeal({ ante: 100, pairPlus: 0, cfg, seed: `dw-${i}` });
    if (
      dealerQualifies(d.dealerHand, cfg.dealerQualifyRank) &&
      compareHands(d.playerHand, d.dealerHand) < 0
    ) {
      const s = resolvePlay({
        ante: 100,
        playerCards: d.playerCards,
        dealerCards: d.dealerCards,
        cfg,
      });
      assert(s.outcome === "dealer", "Dealer win outcome");
      assert(s.anteWin === 0 && s.playWin === 0, "Dealer win loses ante/play");
      foundDw = true;
      break;
    }
  }
  assert(foundDw, "No dealer-win sample");

  // Tie push
  let foundTie = false;
  for (let i = 0; i < 50_000; i++) {
    const d = resolveDeal({ ante: 100, pairPlus: 0, cfg, seed: `tie-${i}` });
    if (
      dealerQualifies(d.dealerHand, cfg.dealerQualifyRank) &&
      compareHands(d.playerHand, d.dealerHand) === 0
    ) {
      const s = resolvePlay({
        ante: 100,
        playerCards: d.playerCards,
        dealerCards: d.dealerCards,
        cfg,
      });
      assert(s.outcome === "tie", "Tie outcome");
      assert(s.anteWin === 100 && s.playWin === 100, "Tie push both");
      foundTie = true;
      break;
    }
  }
  if (!foundTie) console.warn("WARN: no exact-tie sample (rare)");

  // Ante Bonus off
  const cfgOff = normalizeThreeCardPokerConfig({ ...cfg, anteBonusEnabled: false });
  const dBonus = resolveDeal({ ante: 100, pairPlus: 0, cfg: cfgOff, seed: "bonus-off" });
  const sBonus = resolvePlay({
    ante: 100,
    playerCards: dBonus.playerCards,
    dealerCards: dBonus.dealerCards,
    cfg: cfgOff,
  });
  assert(sBonus.anteBonusWin === 0, "Ante bonus disabled");

  // --- RTP simulation (always Play; flat Ante + Pair Plus) ---
  let anteWager = 0;
  let playWager = 0;
  let ppWager = 0;
  let anteReturn = 0;
  let playReturn = 0;
  let ppReturn = 0;
  let bonusReturn = 0;

  for (let i = 0; i < ROUNDS; i++) {
    const d = resolveDeal({
      ante: ANTE,
      pairPlus: PAIR_PLUS,
      cfg,
      seed: `sim-${i}`,
    });
    anteWager += ANTE;
    ppWager += PAIR_PLUS;
    ppReturn += d.pairPlusWin;

    const s = resolvePlay({
      ante: ANTE,
      pairPlus: PAIR_PLUS,
      pairPlusWinAlreadyPaid: d.pairPlusWin,
      playerCards: d.playerCards,
      dealerCards: d.dealerCards,
      cfg,
    });
    playWager += ANTE;
    anteReturn += s.anteWin;
    playReturn += s.playWin;
    bonusReturn += s.anteBonusWin;
  }

  const anteRtp = (anteReturn / anteWager) * 100;
  const playRtp = (playReturn / playWager) * 100;
  const ppRtp = (ppReturn / ppWager) * 100;
  const totalWager = anteWager + playWager + ppWager;
  const totalReturn = anteReturn + playReturn + ppReturn + bonusReturn;
  const overall = (totalReturn / totalWager) * 100;

  console.log(`Sim rounds: ${ROUNDS}`);
  console.log(`  Ante RTP:     ${anteRtp.toFixed(2)}%`);
  console.log(`  Play RTP:     ${playRtp.toFixed(2)}%`);
  console.log(`  Pair Plus RTP:${ppRtp.toFixed(2)}%`);
  console.log(`  Ante Bonus $: ${bonusReturn.toFixed(2)} (profit)`);
  console.log(`  Overall RTP:  ${overall.toFixed(2)}% (always-play policy)`);
  console.log("All Three Card Poker checks passed.");
}

main();
