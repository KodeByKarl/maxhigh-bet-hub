/**
 * The Dawg's Den bonus — pooled payout + sticky Toaster.
 *
 * Trigger: 3+ Scatters anywhere in view.
 * Wins are NOT paid per spin — they accumulate in a pot and settle as one lump sum.
 */

import {
  addToPool,
  createPooledPayout,
  settlePool,
} from "@/lib/slot-primitives/pooledPayout";
import type { PugLifeConfig } from "@/lib/pug-life-config";
import { evaluatePaylines } from "./paylineEngine";
import { generateGrid } from "./reelGenerator";
import type { PlRng } from "./rng";
import type {
  DawgsDenSession,
  DawgsDenSpinStep,
  PlCell,
  PlGrid,
  StickyToaster,
  ToasterReveal,
} from "./types";
import { cellKey } from "./types";

export function shouldTriggerDawgsDen(
  grid: PlGrid,
  cfg: PugLifeConfig,
): { triggered: boolean; positions: Array<[number, number]> } {
  const positions: Array<[number, number]> = [];
  for (let reel = 0; reel < grid.length; reel++) {
    for (let row = 0; row < (grid[reel]?.length ?? 0); row++) {
      if (grid[reel][row].kind === "scatter") positions.push([reel, row]);
    }
  }
  return {
    triggered: positions.length >= cfg.dawgsDen.triggerScatterCount,
    positions,
  };
}

export function awardFreeSpinsFromScatters(
  rng: PlRng,
  scatterCount: number,
  cfg: PugLifeConfig,
): { awards: number[]; total: number } {
  const awards: number[] = [];
  let total = 0;
  for (let i = 0; i < scatterCount; i++) {
    const v = rng.pickWeighted(cfg.dawgsDen.scatterSpinValues).value;
    awards.push(v);
    total += v;
  }
  total = Math.max(cfg.dawgsDen.minFreeSpins, Math.min(cfg.dawgsDen.maxFreeSpins, total));
  return { awards, total };
}

function revealToasterValue(
  rng: PlRng,
  totalBet: number,
  cfg: PugLifeConfig,
): ToasterReveal {
  const isMult = rng.chance(cfg.dawgsDen.toasterMultChancePercent);
  if (isMult) {
    const value = rng.pickWeighted(cfg.dawgsDen.toasterMultiplierValues).value;
    return { type: "multiplier", value, cashAmount: 0 };
  }
  const value = rng.pickWeighted(cfg.dawgsDen.toasterCashValues).value;
  return {
    type: "cash",
    value,
    cashAmount: +(value * totalBet).toFixed(2),
  };
}

/**
 * Resolve a full Dawg's Den session in one pass.
 * Pool accumulates all wins; settlePool at end produces the only balance credit.
 */
export function resolveDawgsDenSession(opts: {
  rng: PlRng;
  totalBet: number;
  scatterPositions: Array<[number, number]>;
  /** Pre-awarded FS count (from scatter reveals). If omitted, roll from scatter count. */
  freeSpins?: number;
  scatterAwards?: number[];
  cfg: PugLifeConfig;
}): DawgsDenSession {
  const { rng, totalBet, scatterPositions, cfg } = opts;

  let awards = opts.scatterAwards;
  let freeSpins = opts.freeSpins;
  if (freeSpins == null || awards == null) {
    const rolled = awardFreeSpinsFromScatters(rng, scatterPositions.length, cfg);
    awards = rolled.awards;
    freeSpins = rolled.total;
  }

  const sticky = new Map<string, PlCell>();
  const stickyToasters: StickyToaster[] = [];
  let pool = createPooledPayout();
  const steps: DawgsDenSpinStep[] = [];
  let spinsRemaining = freeSpins;

  const maxSteps = 200;
  let spinIndex = 0;

  while (spinsRemaining > 0 && steps.length < maxSteps) {
    spinsRemaining -= 1;
    const grid = generateGrid(rng, cfg, { context: "dawgs_den", sticky });

    // Lock newly landed Toasters (reels 4/5 only — generator already restricts)
    const newToasters: Array<[number, number]> = [];
    for (let reel = 0; reel < grid.length; reel++) {
      for (let row = 0; row < (grid[reel]?.length ?? 0); row++) {
        const cell = grid[reel][row];
        if (cell.kind !== "toaster") continue;
        const key = cellKey(reel, row);
        if (!sticky.has(key)) {
          sticky.set(key, { ...cell, sticky: true });
          stickyToasters.push({ reel, row, reveals: {} });
          newToasters.push([reel, row]);
        }
      }
    }

    const { wins, total: paylineWin } = evaluatePaylines(grid, totalBet, cfg);

    // Apply sticky Toaster multiplier reveals to payline wins + cash to pot
    // Working assumption: Toaster mult applies as an additional session-level pot add
    // for each reveal; cash adds directly. Payline wins already include Treat mults.
    // TODO/config-pending — exact Toaster×payline interaction with design.
    let paylineWinAdded = 0;
    if (paylineWin > 0) {
      pool = addToPool(pool, {
        source: "payline",
        amount: paylineWin,
        spinIndex,
      });
      paylineWinAdded = paylineWin;
    }

    const toasterReveals: DawgsDenSpinStep["toasterReveals"] = [];

    // Per-spin re-reveal for sticky Toasters that were locked on a PRIOR spin
    for (const toaster of stickyToasters) {
      const key = cellKey(toaster.reel, toaster.row);
      // Skip reveal on the spin it first lands
      const justLanded = newToasters.some(
        ([r, row]) => r === toaster.reel && row === toaster.row,
      );
      if (justLanded) continue;

      let reveal: ToasterReveal;
      if (
        cfg.dawgsDen.toasterRevealMode === "reveal_once" &&
        Object.keys(toaster.reveals).length > 0
      ) {
        // Hold first reveal
        const firstKey = Object.keys(toaster.reveals).sort()[0];
        reveal = toaster.reveals[Number(firstKey)];
      } else {
        reveal = revealToasterValue(rng, totalBet, cfg);
        toaster.reveals[spinIndex] = reveal;
      }

      let potContribution = 0;
      if (reveal.type === "cash") {
        potContribution = reveal.cashAmount;
        pool = addToPool(pool, {
          source: "toaster_cash",
          amount: potContribution,
          spinIndex,
          meta: { reel: toaster.reel, row: toaster.row, value: reveal.value },
        });
      } else {
        // Multiplier: apply to this spin's payline win contribution (if any)
        // If no payline win, multiplier alone doesn't add cash — common Hacksaw pattern.
        // Also add a pot entry documenting the reveal for audit.
        if (paylineWinAdded > 0) {
          potContribution = +(paylineWinAdded * (reveal.value - 1)).toFixed(2);
          // We already added base paylineWin; add the extra (mult-1)*base
          if (potContribution > 0) {
            pool = addToPool(pool, {
              source: "toaster_mult",
              amount: potContribution,
              spinIndex,
              meta: {
                reel: toaster.reel,
                row: toaster.row,
                mult: reveal.value,
                base: paylineWinAdded,
              },
            });
          }
        } else {
          pool = addToPool(pool, {
            source: "toaster_mult_noop",
            amount: 0,
            spinIndex,
            meta: { reel: toaster.reel, row: toaster.row, mult: reveal.value },
          });
        }
      }

      toasterReveals.push({
        reel: toaster.reel,
        row: toaster.row,
        reveal,
        potContribution,
      });
      void key;
    }

    steps.push({
      spinIndex,
      grid,
      paylineWins: wins,
      paylineWinAddedToPot: paylineWinAdded,
      toasterReveals,
      newToasters,
      potAfter: pool.pot,
      spinsRemainingAfter: spinsRemaining,
    });
    spinIndex += 1;
  }

  pool = settlePool(pool);

  return {
    type: "dawgs_den",
    scatterPositions: [...scatterPositions],
    scatterSpinAwards: awards!,
    freeSpinsAwarded: freeSpins!,
    steps,
    pool,
    totalWin: pool.settledAmount,
  };
}
