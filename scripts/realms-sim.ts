/**
 * Realms round simulator — mirrors the settlement rules in
 * src/server/games/realms.server.ts so RTP can be measured offline.
 *
 * Round = paid spin (+ ante) → optional free-spin feature (retriggers,
 * session cap, strongest bomb applied once at the end) → max-win cap.
 * Buy Bonus value = expected feature payout per purchased spin.
 */
import { remainingFreeSpinsAfterSpin, type RealmsConfig } from "../src/lib/realms/schema";
import { finalizeFreeSpinTotal } from "../src/components/maxhigh/realms/engine/multiplierEngine";
import { resolveSpin } from "../src/components/maxhigh/realms/engine/spinResolver";
import { createEngineCtx, type BoardShape } from "../src/components/maxhigh/realms/engine/types";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SimResult = {
  rounds: number;
  /** Return to player for paid rounds, as a fraction of total wager. */
  rtp: number;
  baseRtp: number;
  featureRtp: number;
  /** Paid rounds per free-spin trigger. */
  triggerEvery: number;
  hitRate: number;
  /** Buy Bonus: expected payout per unit price, at the configured quantity. */
  buyRtp: number;
  maxWinHits: number;
};

/** Play one free-spin feature the way the server does; returns the paid amount. */
function playFeature(
  cfg: RealmsConfig,
  board: BoardShape,
  rng: () => number,
  bet: number,
  spins: number,
): number {
  const ctx = createEngineCtx(cfg, board, rng);
  let left = spins;
  let played = 0;
  let sessionWin = 0;
  let bomb = 0;
  while (left > 0) {
    const script = resolveSpin(ctx, {
      bet,
      ante: false,
      isFreeSpins: true,
      initialBombAccumulator: bomb,
    });
    sessionWin = +(sessionWin + script.totalWin).toFixed(2);
    bomb = script.bombAccumulator;
    played += 1;
    left = remainingFreeSpinsAfterSpin({
      leftBefore: left,
      retrigger: script.retriggerSpins,
      playedAfter: played,
      maxSessionSpins: cfg.maxFsSessionSpins,
    });
  }
  const paid = finalizeFreeSpinTotal(cfg, sessionWin, bomb);
  return cfg.maxWinMult > 0 ? Math.min(paid, bet * cfg.maxWinMult) : paid;
}

export function simulate(
  cfg: RealmsConfig,
  board: BoardShape,
  opts: { rounds: number; seed: number; buyRounds?: number; buyQuantity?: number },
): SimResult {
  const rng = mulberry32(opts.seed);
  const bet = 1;
  let wager = 0;
  let base = 0;
  let feature = 0;
  let triggers = 0;
  let hits = 0;
  let maxWinHits = 0;
  const cap = cfg.maxWinMult > 0 ? bet * cfg.maxWinMult : Number.POSITIVE_INFINITY;

  const ctx = createEngineCtx(cfg, board, rng);
  for (let i = 0; i < opts.rounds; i++) {
    wager += bet;
    const script = resolveSpin(ctx, { bet, ante: false, isFreeSpins: false });
    let round = script.totalWin;
    base += script.totalWin;
    if (script.freeSpinsAwarded > 0) {
      triggers += 1;
      const fs = playFeature(cfg, board, rng, bet, script.freeSpinsAwarded);
      feature += fs;
      round += fs;
    }
    if (round > 0) hits += 1;
    if (round >= cap) maxWinHits += 1;
  }

  const buyRounds = opts.buyRounds ?? 0;
  const quantity = opts.buyQuantity ?? cfg.freeSpinsBase;
  let buyPaid = 0;
  for (let i = 0; i < buyRounds; i++) {
    buyPaid += playFeature(cfg, board, rng, bet, quantity);
  }
  const buyCost = buyRounds * quantity * bet * cfg.buyFeatureMult;

  return {
    rounds: opts.rounds,
    rtp: (base + feature) / wager,
    baseRtp: base / wager,
    featureRtp: feature / wager,
    triggerEvery: triggers > 0 ? opts.rounds / triggers : Number.POSITIVE_INFINITY,
    hitRate: hits / opts.rounds,
    buyRtp: buyCost > 0 ? buyPaid / buyCost : 0,
    maxWinHits,
  };
}
