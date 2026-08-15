import { buildBoard, cloneBoard } from "./gridState";
import { applyBombToTumble, finalizeFreeSpinTotal } from "./multiplierEngine";
import { resolveScatters } from "./scatterEngine";
import { applyGravity, evaluateBoard } from "./tumbleEngine";
import type { BoardCell, SpinScript, TumbleStep } from "./types";

export type ResolveOpts = {
  bet: number;
  ante: boolean;
  isFreeSpins: boolean;
  /** FS: collect bombs then apply once at end (spec §4) */
  collectBombsInFreeSpins?: boolean;
  forceBoard?: BoardCell[];
};

/**
 * Resolve entire spin instantly → animation script.
 * Math never waits on visuals.
 */
export function resolveSpin(opts: ResolveOpts): SpinScript {
  const collectMode = opts.isFreeSpins && (opts.collectBombsInFreeSpins ?? true);
  let board = cloneBoard(opts.forceBoard ?? buildBoard(opts.ante && !opts.isFreeSpins, opts.isFreeSpins));
  const initialBoard = cloneBoard(board);
  const steps: TumbleStep[] = [];
  let totalWin = 0;
  let rawWin = 0;
  let peakBomb = 0;
  let maxScatters = 0;
  let accumulator = 0;

  // Safety cap on tumble chains
  for (let guard = 0; guard < 40; guard++) {
    const ev = evaluateBoard(board, opts.bet);
    maxScatters = Math.max(maxScatters, ev.scatters);

    if (ev.winningKeys.size === 0) break;

    rawWin += ev.win;

    const bombResult = applyBombToTumble(ev.win, ev.bombs, {
      freeSpins: opts.isFreeSpins,
      collectMode,
      accumulator,
    });
    accumulator = bombResult.accumulator;
    if (bombResult.bombSum > peakBomb) peakBomb = bombResult.bombSum;

    const remove = new Set(ev.winningKeys);
    if (bombResult.clearBombs) {
      for (const b of ev.bombs) remove.add(b.key);
    }

    // Scale per-symbol display if bombs applied to tumble
    let clusters = ev.clusters;
    if (bombResult.bombSum > 0 && !collectMode) {
      clusters = ev.clusters.map((c) => ({
        ...c,
        pay: +(c.pay * bombResult.bombSum).toFixed(2),
        perSymbol: +(c.perSymbol * bombResult.bombSum).toFixed(2),
      }));
    }

    const gravity = applyGravity(board, remove, opts.ante && !opts.isFreeSpins, opts.isFreeSpins);

    steps.push({
      board: cloneBoard(board),
      winningKeys: [...remove],
      clusters,
      tumbleWin: bombResult.win,
      bombSum: bombResult.bombSum,
      afterPop: gravity.afterPop,
      afterFall: gravity.next,
      spawnedKeys: gravity.spawnedKeys,
      fallenKeys: gravity.fallenKeys,
      fallDistance: gravity.fallDistance,
    });

    totalWin += bombResult.win;
    board = gravity.next;
  }

  // Bombs only count when a winning cluster is on the board (handled in applyBombToTumble).
  // Do NOT bank leftover bombs on a dead / no-win board — those multipliers are invalid.

  const scatter = resolveScatters(maxScatters, opts.bet, opts.isFreeSpins);
  if (!opts.isFreeSpins) {
    totalWin += scatter.cashPay;
    rawWin += scatter.cashPay;
  }

  const finalTotal = +totalWin.toFixed(2);
  const finalRaw = +rawWin.toFixed(2);
  // Base: peak bomb only if this spin actually won. FS: banked mult from winning tumbles only.
  const displayMult =
    finalRaw > 0
      ? collectMode
        ? accumulator > 0
          ? accumulator
          : 1
        : peakBomb > 0
          ? peakBomb
          : 1
      : 1;

  return {
    initialBoard,
    steps,
    totalWin: finalTotal,
    rawWin: finalRaw,
    displayMult,
    scatters: maxScatters,
    scatterPay: scatter.cashPay,
    freeSpinsAwarded: scatter.freeSpinsAwarded,
    retriggerSpins: scatter.retriggerSpins,
    isFreeSpins: opts.isFreeSpins,
    bombAccumulator: accumulator,
  };
}

export { finalizeFreeSpinTotal };
