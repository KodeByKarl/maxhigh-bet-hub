/**
 * Reel Riot — server-authoritative full spin resolution.
 *
 * Order (Section 7):
 * 1. Apply holds → generate non-held reels
 * 2. Evaluate single payline (fruit 3-oak / 2-DW 1000× / 3-DW no-cash)
 * 3. Max-bet + 2-DW → progressive jackpot (amount supplied by server)
 * 4. 3-DW + no cash → resolve bonus ladder fully
 * 5. Sum payouts and return auditable script
 */

import type { ReelRiotConfig } from "@/lib/reel-riot-config";
import { normalizeHoldMask } from "@/lib/slot-primitives/holdReels";
import { resolveBonusLadder } from "./bonusLadder";
import {
  evaluatePayline,
  shouldTriggerBonus,
  shouldTriggerJackpot,
} from "./paylineEngine";
import { buildVisibleGrid, resolveReelsWithHold } from "./reelGenerator";
import { createRng, newSpinSeed } from "./rng";
import { getReelRiotConfig } from "./runtimeConfig";
import type { JackpotResult, RrReels, SpinScript } from "./types";

export type ResolveReelRiotSpinOpts = {
  totalBet: number;
  seed?: string;
  /** Prior spin's active reels (required when any hold is set). */
  previousReels?: RrReels | null;
  /** Player hold selection for this spin. */
  held?: boolean[];
  /** Fixed reels for unit tests (skips RNG generation / hold). */
  reels?: RrReels;
  /**
   * Current progressive pool amount (from DB).
   * Pure engine awards this snapshot; server resets the pool after.
   */
  jackpotPoolAmount?: number;
  /** Override config (tests). */
  cfg?: ReelRiotConfig;
  /** Force jackpot enabled flag from platform. */
  jackpotEnabled?: boolean;
};

export function resolveReelRiotSpin(opts: ResolveReelRiotSpinOpts): SpinScript {
  const cfg = opts.cfg ?? getReelRiotConfig();
  const totalBet = opts.totalBet;
  const seed = opts.seed ?? newSpinSeed("rr");
  const rng = createRng(seed);

  const heldIn = normalizeHoldMask(opts.held ?? [false, false, false], cfg.reelsCount);

  let reels: RrReels;
  let held = heldIn;
  if (opts.reels) {
    reels = [...opts.reels];
  } else {
    const resolved = resolveReelsWithHold({
      rng,
      cfg,
      previous: opts.previousReels ?? null,
      held: heldIn,
    });
    reels = resolved.reels;
    held = resolved.held; // sanitized (e.g. Wild holds stripped)
  }

  const visibleGrid = buildVisibleGrid(rng, cfg, reels);
  const payline = evaluatePayline(reels, totalBet, cfg);

  const contribution = +(totalBet * cfg.jackpot.contributionRate).toFixed(4);

  let jackpot: JackpotResult = {
    triggered: false,
    amount: 0,
    poolAfterReset: cfg.jackpot.floorAmount,
  };

  const jpCheck = shouldTriggerJackpot(payline, totalBet, cfg);
  if (jpCheck.ok) {
    if (opts.jackpotEnabled === false) {
      jackpot = {
        triggered: false,
        amount: 0,
        poolAfterReset: cfg.jackpot.floorAmount,
        reasonBlocked: "jackpot_disabled",
      };
    } else {
      const amount = Math.max(0, +(opts.jackpotPoolAmount ?? 0).toFixed(2));
      jackpot = {
        triggered: amount > 0,
        amount,
        poolAfterReset: cfg.jackpot.floorAmount,
        reasonBlocked: amount <= 0 ? "empty_pool" : undefined,
      };
    }
  } else {
    jackpot = {
      triggered: false,
      amount: 0,
      poolAfterReset: cfg.jackpot.floorAmount,
      reasonBlocked: jpCheck.reasonBlocked,
    };
  }

  let bonus: SpinScript["bonus"] = null;
  if (shouldTriggerBonus(payline)) {
    bonus = resolveBonusLadder({ rng, totalBet, cfg });
  }

  const rawTotalWin = +(
    payline.payout +
    (jackpot.triggered ? jackpot.amount : 0) +
    (bonus?.payout ?? 0)
  ).toFixed(2);

  return {
    seed,
    totalBet,
    held,
    previousReels: opts.previousReels ?? null,
    reels,
    visibleGrid,
    payline,
    jackpot,
    bonus,
    jackpotContribution: contribution,
    rawTotalWin,
    totalWin: rawTotalWin,
    audit: {
      seed,
      held,
      reels: [...reels],
      wildCount: payline.wildCount,
      paylineKind: payline.kind,
      paylinePayout: payline.payout,
      jackpotTriggered: jackpot.triggered,
      jackpotAmount: jackpot.amount,
      bonusPayout: bonus?.payout ?? 0,
      bonusSteps: bonus?.steps ?? [],
    },
  };
}
