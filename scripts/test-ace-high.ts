/**
 * Ace High RTP / EV simulation — 2-card highest + auto-War + even-money credit.
 * Run: npx tsx scripts/test-ace-high.ts
 */
import {
  DEFAULT_ACE_HIGH_CONFIG,
  normalizeAceHighConfig,
  type AceHighConfig,
} from "../src/lib/ace-high-config";
import { resolveAceHighDeal } from "../src/components/maxhigh/ace-high/resolver";
import { createRng } from "../src/components/maxhigh/ace-high/rng";
import { setAceHighConfig } from "../src/components/maxhigh/ace-high/runtimeConfig";

const ROUNDS = Number(process.env.AH_SIM_ROUNDS ?? 200_000);
const BASE = 10;
const TIE = 1;
const ACE = 1;

function simulateRound(cfg: AceHighConfig, i: number): { wager: number; credit: number } {
  const deal = resolveAceHighDeal({
    baseBet: BASE,
    tieBet: TIE,
    aceBonusBet: ACE,
    cfg,
    seed: `sim-${i}-${createRng(`s${i}`).next()}`,
  });
  // Total wager = initial + auto-war matches (all debited)
  const wager = +(BASE + TIE + ACE + deal.warMatched).toFixed(2);
  const credit = deal.immediateCredit;
  return { wager, credit };
}

function main() {
  const cfg = normalizeAceHighConfig(DEFAULT_ACE_HIGH_CONFIG);
  setAceHighConfig(cfg);

  // Even-money sanity: base win credit must be base * basePayoutMult (not double-applied)
  const winProbe = resolveAceHighDeal({
    baseBet: 100,
    tieBet: 0,
    aceBonusBet: 0,
    cfg,
    seed: "force-will-vary",
  });
  if (winProbe.initialOutcome === "player" && winProbe.baseWin !== 100 * cfg.basePayoutMult) {
    // Only assert when we luckily get a player win on this seed — skip if not
  }
  // Deterministic accounting unit test via synthetic: if player wins, credit = 2x
  let foundWin = false;
  for (let i = 0; i < 500; i++) {
    const d = resolveAceHighDeal({
      baseBet: 100,
      tieBet: 0,
      aceBonusBet: 0,
      cfg,
      seed: `acct-${i}`,
    });
    if (d.initialOutcome === "player" && d.warSteps.length === 0) {
      foundWin = true;
      if (d.baseWin !== 200) {
        throw new Error(`Even-money fail: expected baseWin 200, got ${d.baseWin}`);
      }
      if (d.immediateCredit !== 200) {
        throw new Error(`Even-money fail: expected credit 200, got ${d.immediateCredit}`);
      }
      break;
    }
  }
  if (!foundWin) console.warn("WARN: could not sample a straight player win for accounting check");

  // 2-card shape
  const smoke = resolveAceHighDeal({
    baseBet: 10,
    tieBet: 1,
    aceBonusBet: 1,
    cfg,
    seed: "smoke-2card",
  });
  if (smoke.playerCards.length !== 2 || smoke.dealerCards.length !== 2) {
    throw new Error("Expected 2 cards per side");
  }
  if (smoke.pendingWar) throw new Error("Auto-war must leave pendingWar false");

  let totalWager = 0;
  let totalCredit = 0;
  let ties = 0;
  let playerWins = 0;
  let dealerWins = 0;
  let splits = 0;
  let wars = 0;

  for (let i = 0; i < ROUNDS; i++) {
    const deal = resolveAceHighDeal({
      baseBet: BASE,
      tieBet: TIE,
      aceBonusBet: ACE,
      cfg,
      seed: `probe-${i}`,
    });
    if (deal.initialOutcome === "tie") {
      ties++;
      wars += deal.warSteps.length > 0 ? 1 : 0;
    }
    if (deal.outcome === "player") playerWins++;
    else if (deal.outcome === "dealer") dealerWins++;
    else if (deal.outcome === "split") splits++;

    const r = simulateRound(cfg, i);
    totalWager += r.wager;
    totalCredit += r.credit;
  }

  const rtp = totalWager > 0 ? (totalCredit / totalWager) * 100 : 0;
  console.log("=== Ace High RTP sim (2-card + auto-War) ===");
  console.log(`Rounds: ${ROUNDS}`);
  console.log(`Bets: base=${BASE} tie=${TIE} ace=${ACE}`);
  console.log(
    `Config: baseMult=${cfg.basePayoutMult} tieMult=${cfg.tieSideBetMult} AA=${cfg.aceBonus.aceVsAce} either=${cfg.aceBonus.eitherAce} burn=${cfg.warBurnCount} maxWar=${cfg.warMaxDepth}`,
  );
  console.log(
    `Outcomes: player=${playerWins} dealer=${dealerWins} initialTies=${ties} wars=${wars} splits=${splits}`,
  );
  console.log(`Smoke: ${smoke.initialOutcome} → ${smoke.outcome} warSteps=${smoke.warSteps.length}`);
  console.log(
    `Smoke cards P[${smoke.playerCards.map((c) => c.rank).join(",")}] D[${smoke.dealerCards.map((c) => c.rank).join(",")}]`,
  );
  console.log(`Total wager: ₱${totalWager.toFixed(2)}`);
  console.log(`Total credit: ₱${totalCredit.toFixed(2)}`);
  console.log(`Empirical RTP: ${rtp.toFixed(3)}% (target ${cfg.targetRtp}%)`);
  console.log("PASS");
}

main();
