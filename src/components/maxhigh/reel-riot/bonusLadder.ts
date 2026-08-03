/**
 * Bonus Ladder Game — 3-line numbers board with stop icon.
 *
 * Trigger: exactly 3 Double Wilds with no cash win on the same spin.
 * TODO/config-pending: board layout, odds, advance rule, stack mode.
 */

import type { ReelRiotConfig } from "@/lib/reel-riot-config";
import type { RrRng } from "./rng";
import type { BonusLadderSession, BonusLadderStep } from "./types";

type Pos =
  | { type: "number"; value: number; weight: number }
  | { type: "stop"; weight: number };

export function resolveBonusLadder(opts: {
  rng: RrRng;
  totalBet: number;
  cfg: ReelRiotConfig;
}): BonusLadderSession {
  const { rng, totalBet, cfg } = opts;
  const bl = cfg.bonusLadder;
  const steps: BonusLadderStep[] = [];
  const numberValues: number[] = [];
  let stoppedOnLine: number | null = null;
  let clearedAll = false;

  for (let lineIndex = 0; lineIndex < bl.lineCount; lineIndex++) {
    const line = bl.lines[lineIndex];
    if (!line || line.positions.length === 0) break;

    const picked = rng.pickWeighted(line.positions as Pos[]);
    const positionIndex = line.positions.indexOf(picked as (typeof line.positions)[number]);

    if (picked.type === "stop") {
      steps.push({
        lineIndex,
        positionIndex: Math.max(0, positionIndex),
        outcome: "stop",
        value: 0,
        advanced: false,
      });
      stoppedOnLine = lineIndex;
      break;
    }

    numberValues.push(picked.value);
    const isLast = lineIndex >= bl.lineCount - 1;
    let advanced = false;
    if (!isLast) {
      if (bl.advanceMode === "automatic") {
        advanced = true;
      } else {
        advanced = rng.chance(bl.advanceChancePercent);
      }
    }

    steps.push({
      lineIndex,
      positionIndex: Math.max(0, positionIndex),
      outcome: "number",
      value: picked.value,
      advanced: isLast ? false : advanced,
    });

    if (isLast) {
      clearedAll = true;
      break;
    }
    if (!advanced) {
      stoppedOnLine = lineIndex;
      break;
    }
  }

  let combinedMult = 0;
  if (bl.stackMode === "multiplicative") {
    combinedMult = numberValues.length === 0 ? 0 : numberValues.reduce((a, b) => a * b, 1);
  } else {
    combinedMult = numberValues.reduce((a, b) => a + b, 0);
  }

  const payout = +(combinedMult * totalBet).toFixed(2);

  return {
    triggered: true,
    steps,
    combinedMult,
    payout,
    stoppedOnLine,
    clearedAll,
  };
}
