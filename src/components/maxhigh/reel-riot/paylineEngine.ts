import { isWildKind, type RrSymKind, type ReelRiotConfig } from "@/lib/reel-riot-config";
import { countDoubleWilds } from "./reelGenerator";
import type { PaylineResult, RrReels } from "./types";

/**
 * Single horizontal payline evaluation.
 *
 * Confirmed build basis (exact paytable numbers still config-pending):
 * - Exactly 2 Double Wilds → twoWildPayMult (1000×) cash win
 * - Exactly 3 Double Wilds → no cash win (Bonus Ladder handled separately)
 * - These Wild outcomes are mutually exclusive
 * - 3 matching fruits → fruit payMult × stake
 * - Partial 2-of-3 non-Wild: no pay unless partialMatchPays=true
 * - Wild does not substitute into fruit 3-oak unless wildSubstitutesFruit=true
 */
export function evaluatePayline(
  reels: RrReels,
  totalBet: number,
  cfg: ReelRiotConfig,
): PaylineResult {
  const wildCount = countDoubleWilds(reels);

  // Mutually exclusive Wild outcomes
  if (wildCount === 2) {
    const payout = +(cfg.twoWildPayMult * totalBet).toFixed(2);
    return {
      kind: "two_wild",
      symbol: "double_wild",
      wildCount,
      payMult: cfg.twoWildPayMult,
      payout,
    };
  }

  if (wildCount === 3) {
    return {
      kind: "three_wild",
      symbol: "double_wild",
      wildCount,
      payMult: 0,
      payout: 0,
    };
  }

  // Fruit 3-oak
  const nonWild = reels.filter((s) => !isWildKind(s));
  if (cfg.wildSubstitutesFruit && wildCount > 0 && nonWild.length > 0) {
    const target = nonWild[0]!;
    const allMatch = reels.every((s) => s === target || isWildKind(s));
    if (allMatch) {
      return fruitWin(target, totalBet, cfg, wildCount);
    }
  }

  if (reels[0] && reels[0] === reels[1] && reels[1] === reels[2] && !isWildKind(reels[0])) {
    return fruitWin(reels[0], totalBet, cfg, wildCount);
  }

  // Optional partial 2-of-3 (disabled by default)
  if (cfg.partialMatchPays) {
    // TODO/config-pending — no provisional partial pays defined
  }

  return {
    kind: "none",
    symbol: null,
    wildCount,
    payMult: 0,
    payout: 0,
  };
}

function fruitWin(
  symbol: RrSymKind,
  totalBet: number,
  cfg: ReelRiotConfig,
  wildCount: number,
): PaylineResult {
  const symCfg = cfg.symbols.find((s) => s.kind === symbol);
  const payMult = symCfg?.payMult ?? 0;
  const payout = +(payMult * totalBet).toFixed(2);
  return {
    kind: "fruit",
    symbol,
    wildCount,
    payMult,
    payout,
  };
}

/** True when this spin should enter the Bonus Ladder (3 DW, no cash win). */
export function shouldTriggerBonus(payline: PaylineResult): boolean {
  return payline.kind === "three_wild" && payline.payout === 0;
}

/**
 * Progressive jackpot eligibility: exactly 2 Double Wilds at max bet.
 * Confirmed: same 2-DW case that pays 1000× also unlocks JP when bet === maxBet.
 */
export function shouldTriggerJackpot(
  payline: PaylineResult,
  totalBet: number,
  cfg: ReelRiotConfig,
): { ok: boolean; reasonBlocked?: string } {
  if (payline.kind !== "two_wild") {
    return { ok: false, reasonBlocked: `payline.kind=${payline.kind} (need two_wild)` };
  }
  if (payline.wildCount !== cfg.jackpot.triggerWildCount) {
    return { ok: false, reasonBlocked: `wildCount=${payline.wildCount}≠${cfg.jackpot.triggerWildCount}` };
  }
  if (cfg.jackpot.requireMaxBet && totalBet < cfg.maxBet) {
    return { ok: false, reasonBlocked: `bet ${totalBet} < maxBet ${cfg.maxBet}` };
  }
  return { ok: true };
}
