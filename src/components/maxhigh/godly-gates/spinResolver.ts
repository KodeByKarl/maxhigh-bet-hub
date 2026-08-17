import { getGodlyGatesConfig } from "./runtimeConfig";
import { applyGravity, evaluateBoard } from "./cascadeEngine";
import { buildBoard, cloneBoard } from "./gridState";
import { createMultiplier } from "./multiplierEngine";
import { resolveScatters } from "./scatterEngine";
import type { BoardCell, CascadeStep, SpinScript } from "./types";

export type ResolveOpts = {
  bet: number;
  isFreeSpins: boolean;
  startMultiplier?: number;
  forceBoard?: BoardCell[];
};

/**
 * Resolve entire spin instantly → animation script.
 * Math never waits on visuals. Wilds are normal symbols (no sticky lock).
 */
export function resolveSpin(opts: ResolveOpts): SpinScript {
  const mult = createMultiplier(opts.isFreeSpins ? (opts.startMultiplier ?? 1) : 1);

  let board = cloneBoard(
    opts.forceBoard ??
      buildBoard({
        freeSpins: opts.isFreeSpins,
        boostScatter: false,
        seedWin: !opts.isFreeSpins,
      }),
  );

  const initialBoard = cloneBoard(board);
  const steps: CascadeStep[] = [];
  let totalWin = 0;
  let rawWin = 0;
  let maxScatters = 0;

  for (let guard = 0; guard < 40; guard++) {
    const ev = evaluateBoard(board, opts.bet);
    maxScatters = Math.max(maxScatters, ev.scatters);
    if (ev.winningKeys.size === 0) break;

    rawWin += ev.win;
    const cascadeWin = opts.isFreeSpins ? mult.apply(ev.win) : ev.win;
    const currentMult = opts.isFreeSpins ? mult.get() : 1;

    const remove = new Set(ev.winningKeys);

    const ways =
      opts.isFreeSpins && currentMult > 1
        ? ev.ways.map((w) => ({ ...w, pay: +(w.pay * currentMult).toFixed(2) }))
        : ev.ways;

    const gravity = applyGravity(board, remove, opts.isFreeSpins);

    steps.push({
      board: cloneBoard(board),
      winningKeys: [...ev.winningKeys],
      ways,
      cascadeWin,
      multiplier: currentMult,
      afterPop: gravity.afterPop,
      afterFall: gravity.next,
      spawnedKeys: gravity.spawnedKeys,
      fallenKeys: gravity.fallenKeys,
      fallDistance: gravity.fallDistance,
    });

    totalWin += cascadeWin;
    board = gravity.next;

    if (opts.isFreeSpins) mult.bump();
  }

  maxScatters = Math.max(maxScatters, evaluateBoard(board, opts.bet).scatters);
  const scatter = resolveScatters(maxScatters, opts.bet, opts.isFreeSpins);

  if (!opts.isFreeSpins) {
    totalWin += scatter.cashPay;
    rawWin += scatter.cashPay;
  }

  let settledWin = +totalWin.toFixed(2);
  const cfg = getGodlyGatesConfig();
  const capMult =
    opts.isFreeSpins && cfg.maxFsSpinMult > 0
      ? Math.min(cfg.maxWinMult || cfg.maxFsSpinMult, cfg.maxFsSpinMult)
      : cfg.maxWinMult;
  if (capMult > 0) {
    const cap = +(opts.bet * capMult).toFixed(2);
    if (settledWin > cap) settledWin = cap;
  }

  return {
    initialBoard,
    steps,
    totalWin: settledWin,
    rawWin: +rawWin.toFixed(2),
    displayMult: opts.isFreeSpins ? mult.get() : 1,
    scatters: maxScatters,
    scatterPay: scatter.cashPay,
    freeSpinsAwarded: scatter.freeSpinsAwarded,
    retriggerSpins: scatter.retriggerSpins,
    isFreeSpins: opts.isFreeSpins,
    endMultiplier: mult.get(),
  };
}

export { finalizeFreeSpinTotal } from "./multiplierEngine";
