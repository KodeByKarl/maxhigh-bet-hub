/**
 * Full spin cascade resolver — logic only; animation consumes SpinScript.
 */
import { getSugarSurgeConfig } from "./runtimeConfig";
import { buildBoard, cloneBoard } from "./gridState";
import {
  applyClusterPositionMults,
  cloneMults,
  createEmptyMults,
  finalizeFreeSpinTotal,
  resetBoardMultipliers,
  sumMultipliers,
  updateMultipliers,
} from "./multiplierEngine";
import { resolveScatters } from "./scatterEngine";
import { applyGravity, evaluateBoard } from "./tumbleEngine";
import type { BoardCell, SpinScript, TumbleStep } from "./types";

export type ResolveOpts = {
  bet: number;
  ante: boolean;
  isFreeSpins: boolean;
  /** Persisted FS board multipliers (base game starts empty) */
  initialPositionMults?: number[];
  forceBoard?: BoardCell[];
  /** @deprecated bombs removed */
  collectBombsInFreeSpins?: boolean;
};

const MAX_CASCADES = 40;

/** Alias for the educational API name. */
export function playCascade(opts: ResolveOpts): SpinScript {
  return resolveSpin(opts);
}

/**
 * One paid or free spin cascade:
 * Detect → calculate → upgrade position mults → remove → gravity → spawn → repeat.
 * Stop when no adjacent clusters remain (or safety cap).
 * End: each tumble pays cluster value × (sum of multipliers on that cluster's cells, or 1).
 */
export function resolveSpin(opts: ResolveOpts): SpinScript {
  let board = cloneBoard(
    opts.forceBoard ?? buildBoard(opts.ante && !opts.isFreeSpins, opts.isFreeSpins, !opts.isFreeSpins),
  );
  const initialBoard = cloneBoard(board);

  let positionMults = opts.isFreeSpins
    ? cloneMults(opts.initialPositionMults ?? createEmptyMults())
    : resetBoardMultipliers();
  const initialPositionMults = cloneMults(positionMults);

  const steps: TumbleStep[] = [];
  let rawWin = 0;
  let totalWin = 0;
  let maxScatters = 0;

  for (let guard = 0; guard < MAX_CASCADES; guard++) {
    const ev = evaluateBoard(board, opts.bet);
    maxScatters = Math.max(maxScatters, ev.scatters);

    if (ev.winningKeys.size === 0) break;

    // Pay this tumble with CURRENT cell multipliers on winning positions only,
    // then upgrade those cells. Do not multiply the whole cascade by the board sum.
    const priced = applyClusterPositionMults(ev.clusters, positionMults);
    rawWin += ev.win;
    totalWin += priced.win;
    positionMults = updateMultipliers(positionMults, ev.winningIndices);

    const remove = new Set(ev.winningKeys);
    const gravity = applyGravity(
      board,
      remove,
      opts.ante && !opts.isFreeSpins,
      opts.isFreeSpins,
    );

    const multSum = sumMultipliers(positionMults);
    const clusters = ev.clusters.map((c, i) => ({
      ...c,
      pay: priced.clusterPays[i] ?? c.pay,
    }));
    const step: TumbleStep = {
      board: cloneBoard(board),
      winningKeys: [...remove],
      winningIndices: [...ev.winningIndices],
      clusters,
      tumbleWin: priced.win,
      bombSum: multSum,
      positionMults: cloneMults(positionMults),
      afterPop: gravity.afterPop,
      afterFall: gravity.next,
      spawnedKeys: gravity.spawnedKeys,
      fallenKeys: gravity.fallenKeys,
      fallDistance: gravity.fallDistance,
    };
    steps.push(step);
    board = gravity.next;
  }

  const scatter = resolveScatters(maxScatters, opts.bet, opts.isFreeSpins);
  if (!opts.isFreeSpins) {
    totalWin += scatter.cashPay;
    rawWin += scatter.cashPay;
  }

  const displayMult = sumMultipliers(positionMults);

  const cascadeMults = cloneMults(positionMults);
  // Persist mults in FS, and when a paid spin triggers FS (carry into bonus).
  const persistMults =
    opts.isFreeSpins || scatter.freeSpinsAwarded > 0
      ? cascadeMults
      : resetBoardMultipliers();

  let settledWin = +totalWin.toFixed(2);
  const capMult = getSugarSurgeConfig().maxWinMult;
  if (capMult > 0) {
    const cap = +(opts.bet * capMult).toFixed(2);
    if (settledWin > cap) settledWin = cap;
  }

  return endSpin({
    initialBoard,
    initialPositionMults,
    finalPositionMults: persistMults,
    steps,
    totalWin: settledWin,
    rawWin: +rawWin.toFixed(2),
    displayMult: displayMult > 1 ? displayMult : 1,
    scatters: maxScatters,
    scatterPay: scatter.cashPay,
    freeSpinsAwarded: scatter.freeSpinsAwarded,
    retriggerSpins: scatter.retriggerSpins,
    isFreeSpins: opts.isFreeSpins,
    bombAccumulator: displayMult > 1 ? displayMult : 0,
  });
}

export function endSpin(script: SpinScript): SpinScript {
  return script;
}

export function resetBoardMultipliersExport() {
  return resetBoardMultipliers();
}

export { finalizeFreeSpinTotal };
export {
  resetBoardMultipliers,
  createEmptyMults,
  updateMultipliers,
  sumMultipliers,
} from "./multiplierEngine";
