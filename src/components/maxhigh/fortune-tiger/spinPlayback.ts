/**
 * Fortune Tiger — dedicated spin playback planner.
 * Turns a resolved SpinScript into a linear list of timed UI steps.
 */

import { ANIM } from "./animationConfig";
import { cellKey, type SpinScript } from "./types";

export type FtPlaybackStep =
  | { type: "spinning"; ms: number }
  | {
      type: "stopping";
      ms: number;
      grid: SpinScript["grid"];
      multiplierReel: SpinScript["multiplierReel"];
    }
  | {
      type: "highlight_lines";
      ms: number;
      keys: string[];
      amount: number;
      label: string;
    }
  | {
      type: "highlight_mult";
      ms: number;
      multiplier: number;
      amount: number;
      label: string;
    }
  | {
      type: "tally";
      ms: number;
      amount: number;
      label: string;
    }
  | { type: "done"; totalWin: number };

function posKeys(positions: Array<[number, number] | number[]> | undefined): string[] {
  if (!Array.isArray(positions)) return [];
  const out: string[] = [];
  for (const pos of positions) {
    if (!pos) continue;
    const reel = Number(pos[0]);
    const row = Number(pos[1]);
    if (Number.isFinite(reel) && Number.isFinite(row)) out.push(cellKey(reel, row));
  }
  return out;
}

function money(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Build the exact celebrate sequence for one spin. Always ends with `done`. */
export function planFortuneTigerPlayback(
  script: SpinScript,
  turbo: boolean,
): FtPlaybackStep[] {
  const scale = (ms: number) => (turbo ? Math.min(ms, 60) : ms);
  const steps: FtPlaybackStep[] = [];
  const reelsCount = 3;

  steps.push({ type: "spinning", ms: scale(ANIM.reelSpin) });
  steps.push({
    type: "stopping",
    ms: scale(
      Math.max(ANIM.reelStagger * Math.max(0, reelsCount - 1) + ANIM.reelSettle, ANIM.multSpin),
    ),
    grid: script.grid,
    multiplierReel: script.multiplierReel,
  });

  const paylineWins = Array.isArray(script.paylineWins) ? script.paylineWins : [];
  if (paylineWins.length > 0) {
    const keys = new Set<string>();
    for (const w of paylineWins) {
      for (const k of posKeys(w.positions)) keys.add(k);
    }
    const amount = Number(script.paylineWin) || 0;
    steps.push({
      type: "highlight_lines",
      ms: scale(ANIM.lineHighlight),
      keys: [...keys],
      amount,
      label: `Paylines +${money(amount)}`,
    });

    const mult = Number(script.multiplierReel?.center) || 1;
    steps.push({
      type: "highlight_mult",
      ms: scale(ANIM.multReveal),
      multiplier: mult,
      amount: Number(script.multipliedWin) || 0,
      label: `${mult}× Multiplier`,
    });
  }

  const totalWin = Number(script.totalWin) || 0;
  if (totalWin > 0) {
    steps.push({
      type: "tally",
      ms: scale(ANIM.winTally),
      amount: totalWin,
      label: script.hitCap ? "MAX WIN CAP" : "TOTAL WIN",
    });
  }

  steps.push({ type: "done", totalWin });
  return steps;
}
