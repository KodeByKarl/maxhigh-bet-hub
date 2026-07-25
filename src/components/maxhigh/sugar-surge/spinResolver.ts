/**
 * Full spin cascade resolver — logic only; animation consumes SpinScript.
 */
import { buildBoard, cloneBoard } from "./gridState";
import {
  applyPositionMultToWin,
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
 * End: totalWin = rawClusterPays × sum(positionMults) (if any mults).
 */
export function resolveSpin(opts: ResolveOpts): SpinScript {
  let board = cloneBoard(
    opts.forceBoard ?? buildBoard(opts.ante && !opts.isFreeSpins, opts.isFreeSpins),
  );
  const initialBoard = cloneBoard(board);

  let positionMults = opts.isFreeSpins
    ? cloneMults(opts.initialPositionMults ?? createEmptyMults())
    : resetBoardMultipliers();
  const initialPositionMults = cloneMults(positionMults);

  const steps: TumbleStep[] = [];
  let rawWin = 0;
  let maxScatters = 0;

  for (let guard = 0; guard < MAX_CASCADES; guard++) {
    const ev = evaluateBoard(board, opts.bet);
    maxScatters = Math.max(maxScatters, ev.scatters);

    if (ev.winningKeys.size === 0) break;

    rawWin += ev.win;
    positionMults = updateMultipliers(positionMults, ev.winningIndices);

    const remove = new Set(ev.winningKeys);
    const gravity = applyGravity(
      board,
      remove,
      opts.ante && !opts.isFreeSpins,
      opts.isFreeSpins,
    );

    const multSum = sumMultipliers(positionMults);
    const step: TumbleStep = {
      board: cloneBoard(board),
      winningKeys: [...remove],
      winningIndices: [...ev.winningIndices],
      clusters: ev.clusters,
      tumbleWin: ev.win,
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

  const applied = applyPositionMultToWin(rawWin, positionMults);
  let totalWin = applied.win;
  const displayMult = applied.multSum > 0 ? applied.multSum : 1;

  const scatter = resolveScatters(maxScatters, opts.bet, opts.isFreeSpins);
  if (!opts.isFreeSpins) {
    totalWin += scatter.cashPay;
    rawWin += scatter.cashPay;
  }

  const cascadeMults = cloneMults(positionMults);
  // Persist mults in FS, and when a paid spin triggers FS (carry into bonus).
  const persistMults =
    opts.isFreeSpins || scatter.freeSpinsAwarded > 0
      ? cascadeMults
      : resetBoardMultipliers();

  return endSpin({
    initialBoard,
    initialPositionMults,
    finalPositionMults: persistMults,
    steps,
    totalWin: +totalWin.toFixed(2),
    rawWin: +rawWin.toFixed(2),
    displayMult,
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
