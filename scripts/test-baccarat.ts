/**
 * Baccarat (Punto Banco) RTP / EV simulation.
 * Run: npx tsx scripts/test-baccarat.ts
 */
import {
  DEFAULT_BACCARAT_CONFIG,
  normalizeBaccaratConfig,
} from "../src/lib/baccarat-config";
import { resolveBaccaratDeal } from "../src/components/maxhigh/games/baccarat/resolver";
import { createRng } from "../src/components/maxhigh/games/baccarat/rng";
import { setBaccaratConfig } from "../src/components/maxhigh/games/baccarat/runtimeConfig";

const ROUNDS = Number(process.env.BC_SIM_ROUNDS ?? 200_000);
const PLAYER = 10;
const BANKER = 10;
const TIE = 1;
const PP = 1;
const BP = 1;

function main() {
  const cfg = normalizeBaccaratConfig(DEFAULT_BACCARAT_CONFIG);
  setBaccaratConfig(cfg);

  // Accounting: Player win ⇒ credit = stake * (1 + playerPayout)
  let foundPlayer = false;
  for (let i = 0; i < 2000; i++) {
    const d = resolveBaccaratDeal({
      playerBet: 100,
      bankerBet: 0,
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

  // Banker win with commission
  let foundBanker = false;
  for (let i = 0; i < 2000; i++) {
    const d = resolveBaccaratDeal({
      playerBet: 0,
      bankerBet: 100,
      tieBet: 0,
      cfg,
      seed: `acct-b-${i}`,
    });
    if (d.outcome === "banker") {
      foundBanker = true;
      const expected = +(100 * (1 + cfg.bankerPayout)).toFixed(2);
      if (d.bankerWin !== expected) {
        throw new Error(`Banker win fail: expected ${expected}, got ${d.bankerWin}`);
      }
      break;
    }
  }
  if (!foundBanker) console.warn("WARN: no banker win sample");

  // Tie push
  let foundTie = false;
  for (let i = 0; i < 5000; i++) {
    const d = resolveBaccaratDeal({
      playerBet: 50,
      bankerBet: 50,
      tieBet: 10,
      cfg,
      seed: `acct-t-${i}`,
    });
    if (d.outcome === "tie") {
      foundTie = true;
      if (d.playerWin !== 50 || d.bankerWin !== 50) {
        throw new Error(`Tie push fail: P=${d.playerWin} B=${d.bankerWin}`);
      }
      const tieExpected = +(10 * (1 + cfg.tiePayout)).toFixed(2);
      if (d.tieWin !== tieExpected) {
        throw new Error(`Tie payout fail: expected ${tieExpected}, got ${d.tieWin}`);
      }
      break;
    }
  }
  if (!foundTie) console.warn("WARN: no tie sample");

  // Hand totals always 0–9; max 3 cards
  for (let i = 0; i < 500; i++) {
    const d = resolveBaccaratDeal({
      playerBet: 10,
      bankerBet: 10,
      cfg,
      seed: `shape-${i}`,
    });
    if (d.playerTotal < 0 || d.playerTotal > 9 || d.bankerTotal < 0 || d.bankerTotal > 9) {
      throw new Error("Invalid hand total");
    }
    if (d.playerCards.length < 2 || d.playerCards.length > 3) {
      throw new Error("Bad player card count");
    }
    if (d.bankerCards.length < 2 || d.bankerCards.length > 3) {
      throw new Error("Bad banker card count");
    }
    if (d.natural && (d.playerDrew || d.bankerDrew)) {
      throw new Error("Natural must not draw thirds");
    }
  }

  let wagerSum = 0;
  let creditSum = 0;
  const outcomes = { player: 0, banker: 0, tie: 0 };
  for (let i = 0; i < ROUNDS; i++) {
    const deal = resolveBaccaratDeal({
      playerBet: PLAYER,
      bankerBet: BANKER,
      tieBet: TIE,
      playerPairBet: PP,
      bankerPairBet: BP,
      cfg,
      seed: `sim-${i}-${createRng(`s${i}`).next()}`,
    });
    wagerSum += deal.totalWager;
    creditSum += deal.immediateCredit;
    outcomes[deal.outcome] += 1;
  }

  const rtp = (creditSum / wagerSum) * 100;
  console.log(`Baccarat sim · ${ROUNDS.toLocaleString()} rounds`);
  console.log(
    `  Outcomes P/B/T: ${outcomes.player} / ${outcomes.banker} / ${outcomes.tie}`,
  );
  console.log(`  Wager ₱${wagerSum.toFixed(2)} · Credit ₱${creditSum.toFixed(2)}`);
  console.log(`  Blended RTP (all bets) ≈ ${rtp.toFixed(3)}%`);
  console.log(`  Config target (Banker label) ${cfg.rtpTarget}%`);
}

main();
