import { buildBoard, cloneBoard } from "./gridState";
import { applyBombToTumble } from "./multiplierEngine";
import { scatterCashPay } from "./paytable";
import { applyGravity, evaluateBoard } from "./tumbleEngine";
import type { BoardCell, RealmsEngineCtx, SpinScript, TumbleStep } from "./types";

export type ResolveOpts = {
  bet: number;
  ante: boolean;
  isFreeSpins: boolean;
  /** Running FS bomb total from earlier spins in this feature. */
  initialBombAccumulator?: number;
  forceBoard?: BoardCell[];
};

/** Tumble chains end well before this; it only guards against a bad config. */
const MAX_TUMBLES = 40;

/** Resolve a whole spin instantly into an animation script. */
export function resolveSpin(ctx: RealmsEngineCtx, opts: ResolveOpts): SpinScript {
  const { cfg } = ctx;
  const ante = opts.ante && !opts.isFreeSpins;
  const collectMode = opts.isFreeSpins;
  let board = cloneBoard(
    opts.forceBoard ?? buildBoard(ctx, ante, opts.isFreeSpins, !opts.isFreeSpins),
  );
  const initialBoard = cloneBoard(board);
  const steps: TumbleStep[] = [];
  let totalWin = 0;
  let rawWin = 0;
  let peakBomb = 0;
  let maxScatters = 0;
  let accumulator = Math.max(0, opts.initialBombAccumulator ?? 0);

  for (let guard = 0; guard < MAX_TUMBLES; guard++) {
    const ev = evaluateBoard(ctx, board, opts.bet);
    maxScatters = Math.max(maxScatters, ev.scatters);
    if (ev.winningKeys.size === 0) break;

    rawWin += ev.win;
    const bomb = applyBombToTumble(cfg, ev.win, ev.bombs, {
      freeSpins: opts.isFreeSpins,
      collectMode,
      accumulator,
    });
    accumulator = bomb.accumulator;
    if (bomb.bombSum > peakBomb) peakBomb = bomb.bombSum;

    const remove = new Set(ev.winningKeys);
    if (bomb.clearBombs) {
      for (const b of ev.bombs) remove.add(b.key);
    }

    const clusters =
      bomb.bombSum > 0 && !collectMode
        ? ev.clusters.map((c) => ({
            ...c,
            pay: +(c.pay * bomb.bombSum).toFixed(2),
            perSymbol: +(c.perSymbol * bomb.bombSum).toFixed(2),
          }))
        : ev.clusters;

    const gravity = applyGravity(ctx, board, remove, ante, opts.isFreeSpins);
    steps.push({
      board: cloneBoard(board),
      winningKeys: [...remove],
      clusters,
      tumbleWin: bomb.win,
      bombSum: bomb.bombSum,
      afterPop: gravity.afterPop,
      afterFall: gravity.next,
      spawnedKeys: gravity.spawnedKeys,
      fallenKeys: gravity.fallenKeys,
      fallDistance: gravity.fallDistance,
    });

    totalWin += bomb.win;
    board = gravity.next;
  }

  // Scatters: cash in the base game; FS awards / retriggers by threshold.
  const scatterPay = opts.isFreeSpins ? 0 : scatterCashPay(cfg, maxScatters, opts.bet);
  totalWin += scatterPay;
  rawWin += scatterPay;
  const freeSpinsAwarded =
    !opts.isFreeSpins && maxScatters >= cfg.freeSpinsTriggerCount ? cfg.freeSpinsBase : 0;
  const retriggerSpins =
    opts.isFreeSpins && maxScatters >= cfg.freeSpinsRetriggerCount ? cfg.freeSpinsRetrigger : 0;

  let finalTotal = +totalWin.toFixed(2);
  const finalRaw = +rawWin.toFixed(2);
  if (cfg.maxWinMult > 0) {
    finalTotal = Math.min(finalTotal, +(opts.bet * cfg.maxWinMult).toFixed(2));
  }
  const displayMult =
    finalRaw > 0 ? (collectMode ? Math.max(1, accumulator) : Math.max(1, peakBomb)) : 1;

  return {
    initialBoard,
    steps,
    totalWin: finalTotal,
    rawWin: finalRaw,
    displayMult,
    scatters: maxScatters,
    scatterPay,
    freeSpinsAwarded,
    retriggerSpins,
    isFreeSpins: opts.isFreeSpins,
    bombAccumulator: accumulator,
  };
}
