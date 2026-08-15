/**
 * Coin Volcano — dedicated spin playback planner (not shared with other games).
 * Turns a resolved SpinScript into a linear list of timed UI steps.
 */

import { ANIM } from "./animationConfig";
import { cellKey, type SpinScript } from "./types";

export type McPlaybackStep =
  | { type: "spinning"; ms: number }
  | { type: "stopping"; ms: number; grid: SpinScript["grid"] }
  | {
      type: "highlight_lines";
      ms: number;
      keys: string[];
      amount: number;
      label: string;
    }
  | {
      type: "highlight_mix";
      ms: number;
      keys: string[];
      amount: number;
      label: string;
    }
  | {
      type: "highlight_jackpot";
      ms: number;
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
export function planCoinVolcanoPlayback(
  script: SpinScript,
  reelsCount: number,
  turbo: boolean,
): McPlaybackStep[] {
  const scale = (ms: number) => (turbo ? Math.min(ms, 60) : ms);
  const steps: McPlaybackStep[] = [];

  steps.push({ type: "spinning", ms: scale(ANIM.reelSpin) });
  steps.push({
    type: "stopping",
    ms: scale(ANIM.reelStagger * Math.max(0, reelsCount - 1) + ANIM.reelSettle),
    grid: script.grid,
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
  }

  if (script.instantMix) {
    const keys = posKeys(script.wildScatter?.positions);
    steps.push({
      type: "highlight_mix",
      ms: scale(ANIM.mixHighlight + ANIM.mixReveal),
      keys,
      amount: Number(script.instantMix.payout) || 0,
      label: `${script.instantMix.count} Wild+Scatter · ${script.instantMix.mult}×`,
    });
  }

  if (script.grandJackpot) {
    steps.push({
      type: "highlight_jackpot",
      ms: scale(ANIM.jackpotCelebrate),
      amount: Number(script.grandJackpotWin) || 0,
      label: "GRAND JACKPOT",
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
