import { ANIM } from "./animationConfig";
import { cellKey, type SpinScript } from "./types";

export type PwPlaybackStep =
  | { type: "spinning"; ms: number }
  | { type: "landing"; ms: number; grid: SpinScript["grid"]; stepIndex: number }
  | {
      type: "highlight";
      ms: number;
      keys: string[];
      amount: number;
      label: string;
    }
  | {
      type: "gold_collect";
      ms: number;
      keys: string[];
      delta: number;
      total: number;
      label: string;
    }
  | {
      type: "gold_transform";
      ms: number;
      keys: string[];
      label: string;
    }
  | {
      type: "removing";
      ms: number;
      keys: string[];
    }
  | { type: "cascade"; ms: number; grid: SpinScript["grid"]; stepIndex: number }
  | {
      type: "tally";
      ms: number;
      amount: number;
      appliedMult: number;
      label: string;
    }
  | { type: "done"; totalWin: number };

function scale(ms: number, turbo: boolean) {
  return turbo ? Math.min(ms, 70) : ms;
}

function winKeys(positions: Array<[number, number]>): string[] {
  return positions.map(([r, row]) => cellKey(r, row));
}

/**
 * Plan step-by-step playback from a resolved SpinScript.
 * Distinct beats: highlight → Gold Frame collect → transform → cascade.
 */
export function planPinataPlayback(script: SpinScript, turbo: boolean): PwPlaybackStep[] {
  const steps: PwPlaybackStep[] = [];
  const cascadeSteps = script.steps ?? [];
  if (cascadeSteps.length === 0) {
    steps.push({ type: "done", totalWin: script.totalWin });
    return steps;
  }

  steps.push({ type: "spinning", ms: scale(ANIM.reelSpin, turbo) });

  let runningGold = 0;
  for (let i = 0; i < cascadeSteps.length; i++) {
    const st = cascadeSteps[i]!;
    if (i === 0) {
      steps.push({
        type: "landing",
        ms: scale(ANIM.reelSettle, turbo),
        grid: st.grid,
        stepIndex: i,
      });
    } else {
      steps.push({
        type: "cascade",
        ms: scale(ANIM.cascadeDrop, turbo),
        grid: st.grid,
        stepIndex: i,
      });
    }

    if (st.paylineWins.length === 0) continue;

    const keys = new Set<string>();
    for (const w of st.paylineWins) for (const k of winKeys(w.positions)) keys.add(k);
    steps.push({
      type: "highlight",
      ms: scale(ANIM.lineHighlight, turbo),
      keys: [...keys],
      amount: st.paylineWin,
      label: `Lines +₱${st.paylineWin.toFixed(2)}`,
    });

    if (st.goldCollected.length > 0) {
      const delta = st.goldCollected.reduce((a, g) => a + g.mult, 0);
      runningGold += delta;
      steps.push({
        type: "gold_collect",
        ms: scale(ANIM.goldCollect, turbo),
        keys: st.goldCollected.map((g) => cellKey(g.reel, g.row)),
        delta,
        total: runningGold,
        label: `Gold Frame +${delta}x → ${runningGold}x`,
      });
    }

    if (st.transformToWild.length > 0) {
      steps.push({
        type: "gold_transform",
        ms: scale(ANIM.goldTransform, turbo),
        keys: st.transformToWild.map(([r, row]) => cellKey(r, row)),
        label: "Exploding Wilds!",
      });
    }

    // Vanish cleared symbols before cascade refill (transform cells persist as wild)
    if (st.removed.length > 0) {
      steps.push({
        type: "removing",
        ms: scale(320, turbo),
        keys: st.removed.map(([r, row]) => cellKey(r, row)),
      });
    }
  }

  if (script.totalWin > 0) {
    steps.push({
      type: "tally",
      ms: scale(ANIM.winTally, turbo),
      amount: script.totalWin,
      appliedMult: script.goldFrameAppliedMult,
      label:
        script.goldFrameAppliedMult > 1
          ? `${script.goldFrameAppliedMult}x · ₱${script.totalWin.toFixed(2)}`
          : `Win ₱${script.totalWin.toFixed(2)}`,
    });
  }

  steps.push({ type: "done", totalWin: script.totalWin });
  return steps;
}
