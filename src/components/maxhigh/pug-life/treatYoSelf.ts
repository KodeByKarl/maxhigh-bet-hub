/**
 * Treat Yo'Self bonus — sticky Treat Wilds + lives + free spins.
 *
 * Trigger: 3+ Treat Wilds in a single base-game spin.
 * Wins: paid per-spin by default (config.treatYoSelf.payoutMode — config-pending).
 */

import type { PugLifeConfig } from "@/lib/pug-life-config";
import { evaluatePaylines } from "./paylineEngine";
import { countTreats, generateGrid } from "./reelGenerator";
import type { PlRng } from "./rng";
import type { PlCell, PlGrid, TreatYoSelfSession, TreatYoSelfSpinStep } from "./types";
import { cellKey } from "./types";

export function shouldTriggerTreatYoSelf(
  grid: PlGrid,
  cfg: PugLifeConfig,
): { triggered: boolean; positions: Array<[number, number]> } {
  const { count, positions } = countTreats(grid);
  return {
    triggered: count >= cfg.treatYoSelf.triggerTreatCount,
    positions,
  };
}

function stickyMapFromPositions(grid: PlGrid, positions: Array<[number, number]>) {
  const map = new Map<string, PlCell>();
  for (const [reel, row] of positions) {
    const cell = grid[reel]?.[row];
    if (!cell) continue;
    map.set(cellKey(reel, row), { ...cell, sticky: true });
  }
  return map;
}

/**
 * Resolve a full Treat Yo'Self session in one pass (server-authoritative).
 * Starting sticky Treats come from the triggering base grid.
 */
export function resolveTreatYoSelfSession(opts: {
  rng: PlRng;
  totalBet: number;
  triggerGrid: PlGrid;
  triggerPositions: Array<[number, number]>;
  cfg: PugLifeConfig;
}): TreatYoSelfSession {
  const { rng, totalBet, triggerGrid, triggerPositions, cfg } = opts;
  const { initialSpins, initialLives, payoutMode, lifeLossRule } = cfg.treatYoSelf;

  const sticky = stickyMapFromPositions(triggerGrid, triggerPositions);
  let spinsRemaining = initialSpins;
  let livesRemaining = initialLives;
  const steps: TreatYoSelfSpinStep[] = [];
  let totalWin = 0;
  let spinIndex = 0;

  // Safety cap to prevent infinite loops if config mis-set
  const maxSteps = 200;

  while (spinsRemaining > 0 && livesRemaining > 0 && steps.length < maxSteps) {
    spinsRemaining -= 1;
    const grid = generateGrid(rng, cfg, { context: "treat_yoself", sticky });
    const { wins, total: spinWinRaw } = evaluatePaylines(grid, totalBet, cfg);

    // Detect newly landed Treats (not already sticky)
    const { positions: treatPos } = countTreats(grid);
    const newStickyTreats: Array<[number, number]> = [];
    for (const [reel, row] of treatPos) {
      const key = cellKey(reel, row);
      if (!sticky.has(key)) {
        const cell = grid[reel][row];
        sticky.set(key, { ...cell, sticky: true });
        newStickyTreats.push([reel, row]);
        // Each new sticky Treat awards +1 spin
        spinsRemaining += 1;
      }
    }

    let lifeLost = false;
    if (lifeLossRule === "no_new_treat" && newStickyTreats.length === 0) {
      livesRemaining -= 1;
      lifeLost = true;
    }

    const spinWin = payoutMode === "pooled" ? spinWinRaw : spinWinRaw;
    totalWin += spinWin;

    steps.push({
      spinIndex,
      grid,
      paylineWins: wins,
      spinWin,
      newStickyTreats,
      spinsRemainingAfter: spinsRemaining,
      livesRemainingAfter: livesRemaining,
      lifeLost,
    });
    spinIndex += 1;
  }

  return {
    type: "treat_yoself",
    triggerPositions: [...triggerPositions],
    initialSpins,
    initialLives,
    steps,
    totalWin: +totalWin.toFixed(2),
    payoutMode,
  };
}
