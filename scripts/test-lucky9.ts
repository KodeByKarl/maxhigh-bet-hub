/**
 * Lucky 9 RTP / EV simulation + accounting checks.
 * Run: npx tsx scripts/test-lucky9.ts
 */
import {
  DEFAULT_LUCKY9_CONFIG,
  normalizeLucky9Config,
  shouldDraw,
  isNatural,
} from "../src/lib/lucky9-config";
import {
  resolveLucky9Deal,
  compareHands,
} from "../src/components/maxhigh/games/lucky9/resolver";
import { createRng } from "../src/components/maxhigh/games/lucky9/rng";
import { setLucky9Config } from "../src/components/maxhigh/games/lucky9/runtimeConfig";

const ROUNDS = Number(process.env.L9_SIM_ROUNDS ?? 200_000);
const PLAYER = 10;
const DEALER = 10;
const TIE = 1;

function main() {
  const cfg = normalizeLucky9Config(DEFAULT_LUCKY9_CONFIG);
  setLucky9Config(cfg);

  // shouldDraw: ≤5 draws, 6+ stands
  if (!shouldDraw(5, 5) || shouldDraw(6, 5)) {
    throw new Error("shouldDraw threshold fail");
  }
  if (!isNatural(9, 9) || isNatural(8, 9)) {
    throw new Error("isNatural fail — Lucky 9 natural is exactly 9, not 8");
  }

  // Natural 9 beats 3-card 9
  if (compareHands(9, 9, true, false) !== "player") {
    throw new Error("Natural 9 should beat 3-card 9 (player)");
  }
  if (compareHands(9, 9, false, true) !== "dealer") {
    throw new Error("Natural 9 should beat 3-card 9 (dealer)");
  }
  if (compareHands(9, 9, true, true) !== "tie") {
    throw new Error("Both natural 9 should tie");
  }
  if (compareHands(9, 9, false, false) !== "tie") {
    throw new Error("Equal non-natural totals should tie");
  }

  // Accounting: Player win
  let foundPlayer = false;
  for (let i = 0; i < 2000; i++) {
    const d = resolveLucky9Deal({
      playerBet: 100,
      dealerBet: 0,
      tieBet: 0,
      cfg,
      seed: `acct-p-${i}`,
    });
    if (d.outcome === "player") {
      foundPlayer = true;
      const expected = +(100 * (1 + cfg.playerPayout)).toFixed(2);
      if (d.playerWin !== expected || d.immediateCredit !== expected) {
        throw new Error(`Player win fail: expected ${expected}, got ${d.immediateCredit}`);
      }
      break;
    }
  }
  if (!foundPlayer) console.warn("WARN: no player win sample");

  // Dealer win — even money, no commission
  let foundDealer = false;
  for (let i = 0; i < 2000; i++) {
    const d = resolveLucky9Deal({
      playerBet: 0,
      dealerBet: 100,
      tieBet: 0,
      cfg,
      seed: `acct-d-${i}`,
    });
    if (d.outcome === "dealer") {
      foundDealer = true;
      const expected = +(100 * (1 + cfg.dealerPayout)).toFixed(2);
      if (d.dealerWin !== expected) {
        throw new Error(`Dealer win fail: expected ${expected}, got ${d.dealerWin}`);
      }
      if (cfg.dealerPayout !== 1.0) {
        console.warn("WARN: dealerPayout is not 1.0 — commission-like?");
      }
      break;
    }
  }
  if (!foundDealer) console.warn("WARN: no dealer win sample");

  // Tie push
  let foundTie = false;
  for (let i = 0; i < 5000; i++) {
    const d = resolveLucky9Deal({
      playerBet: 50,
      dealerBet: 50,
      tieBet: 10,
      cfg,
      seed: `acct-t-${i}`,
    });
    if (d.outcome === "tie") {
      foundTie = true;
      if (d.playerWin !== 50 || d.dealerWin !== 50) {
        throw new Error(`Tie push fail: P=${d.playerWin} D=${d.dealerWin}`);
      }
      const tieExpected = +(10 * (1 + cfg.tiePayout)).toFixed(2);
      if (d.tieWin !== tieExpected) {
        throw new Error(`Tie payout fail: expected ${tieExpected}, got ${d.tieWin}`);
      }
      break;
    }
  }
  if (!foundTie) console.warn("WARN: no tie sample");

  // Shape checks: totals 0–9; max 3 cards; natural hand never draws
  for (let i = 0; i < 500; i++) {
    const d = resolveLucky9Deal({
      playerBet: 10,
      dealerBet: 10,
      cfg,
      seed: `shape-${i}`,
    });
    if (d.playerTotal < 0 || d.playerTotal > 9 || d.dealerTotal < 0 || d.dealerTotal > 9) {
      throw new Error("Invalid hand total");
    }
    if (d.playerCards.length < 2 || d.playerCards.length > 3) {
      throw new Error("Bad player card count");
    }
    if (d.dealerCards.length < 2 || d.dealerCards.length > 3) {
      throw new Error("Bad dealer card count");
    }
    if (d.playerNatural && d.playerDrew) {
      throw new Error("Player natural must not draw third");
    }
    if (d.dealerNatural && d.dealerDrew) {
      throw new Error("Dealer natural must not draw third");
    }
    // Unlike Baccarat: one natural does NOT freeze the other side
    if (d.playerNatural && !d.dealerNatural && d.dealerDrew) {
      // valid — other side may still draw
    }
  }

  let wagerSum = 0;
  let creditSum = 0;
  const outcomes = { player: 0, dealer: 0, tie: 0 };
  let naturalCount = 0;
  for (let i = 0; i < ROUNDS; i++) {
    const deal = resolveLucky9Deal({
      playerBet: PLAYER,
      dealerBet: DEALER,
      tieBet: TIE,
      cfg,
      seed: `sim-${i}-${createRng(`s${i}`).next()}`,
    });
    wagerSum += deal.totalWager;
    creditSum += deal.immediateCredit;
    outcomes[deal.outcome] += 1;
    if (deal.natural) naturalCount += 1;
  }

  const rtp = (creditSum / wagerSum) * 100;
  console.log(`Lucky 9 sim · ${ROUNDS.toLocaleString()} rounds`);
  console.log(
    `  Outcomes P/D/T: ${outcomes.player} / ${outcomes.dealer} / ${outcomes.tie}`,
  );
  console.log(`  Naturals (either side): ${naturalCount}`);
  console.log(`  Wager ₱${wagerSum.toFixed(2)} · Credit ₱${creditSum.toFixed(2)}`);
  console.log(`  Blended RTP (all bets) ≈ ${rtp.toFixed(3)}%`);
  console.log(`  Config target (label) ${cfg.rtpTarget}%`);
  console.log(
    `  Draw threshold ${cfg.drawThreshold} · dealer payout ${cfg.dealerPayout}:1 (no commission)`,
  );
}

main();
