import type { ChineseNewYearConfig } from "@/lib/chinese-new-year-config";
import { createRng, type CnyRng } from "./rng";
import type { GambleChoice, GambleResult } from "./types";

/**
 * Red/Black double-or-nothing gamble (TODO/config-pending format confirmation).
 */
export function resolveGamble(opts: {
  seed: string;
  choice: GambleChoice;
  stake: number;
  roundsUsed: number;
  totalBet: number;
  cfg: ChineseNewYearConfig;
  /** Cumulative win already banked toward max-win cap (excluding this stake). */
  priorWinTowardCap?: number;
}): GambleResult {
  const { cfg, choice, stake, roundsUsed, totalBet } = opts;
  const rng: CnyRng = createRng(opts.seed);
  const drawn: GambleChoice = rng.chance(50) ? "red" : "black";
  const won = drawn === choice;

  const maxPayout =
    cfg.maxWinMult > 0 ? +(totalBet * cfg.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;
  const prior = opts.priorWinTowardCap ?? 0;

  let amount = 0;
  let hitCap = false;
  if (won) {
    amount = +(stake * cfg.gambleWinMult).toFixed(2);
    if (prior + amount > maxPayout) {
      amount = +Math.max(0, maxPayout - prior).toFixed(2);
      hitCap = true;
    }
  }

  const nextRounds = roundsUsed + 1;
  const canGambleAgain =
    won &&
    !hitCap &&
    amount > 0 &&
    nextRounds < cfg.gambleMaxRounds;

  return {
    choice,
    drawn,
    won,
    stake,
    amount,
    roundsUsed: nextRounds,
    maxRounds: cfg.gambleMaxRounds,
    hitCap,
    canGambleAgain,
  };
}
