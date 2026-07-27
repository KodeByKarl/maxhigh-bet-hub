import { buildBoard, cloneBoard } from "./gridState";
import { scatterCashPay } from "./paytable";
import { getChineseNewYearConfig } from "./runtimeConfig";
import { applyGravity, evaluateBoard } from "./tumbleEngine";
import type { BoardCell, SpinScript, TumbleStep } from "./types";

export function resolveSpinScript(
  bet: number,
  ante: boolean,
  isFreeSpins: boolean,
  prevBombAccumulator = 0,
): SpinScript {
  const cfg = getChineseNewYearConfig();
  let board = buildBoard(ante, isFreeSpins, true);
  const initialBoard = cloneBoard(board);
  const steps: TumbleStep[] = [];

  let totalWin = 0;
  let rawWin = 0;
  let maxTumbleMult = 1;
  let scattersOnBoard = 0;
  let bombAccumulator = prevBombAccumulator;

  const MAX_TUMBLES = 20;

  for (let t = 0; t < MAX_TUMBLES; t++) {
    const evalRes = evaluateBoard(board, bet);
    if (t === 0) scattersOnBoard = evalRes.scatters;

    if (evalRes.clusters.length === 0) break;

    const baseWin = evalRes.win;
    rawWin += baseWin;

    const stepBombSum = evalRes.bombs.reduce((acc, b) => acc + (b.mult ?? 0), 0);
    if (stepBombSum > maxTumbleMult) maxTumbleMult = stepBombSum;

    if (isFreeSpins && stepBombSum > 0) {
      bombAccumulator += stepBombSum;
    }

    const stepMult = isFreeSpins ? Math.max(1, bombAccumulator) : Math.max(1, stepBombSum);
    const tumbleWin = +(baseWin * stepMult).toFixed(2);
    totalWin += tumbleWin;

    const remove = new Set<string>();
    for (const k of evalRes.winningKeys) remove.add(k);

    const grav = applyGravity(board, remove, ante, isFreeSpins);
    steps.push({
      board: cloneBoard(board),
      winningKeys: Array.from(evalRes.winningKeys),
      clusters: evalRes.clusters,
      tumbleWin,
      bombSum: stepBombSum,
      afterPop: grav.afterPop,
      afterFall: cloneBoard(grav.next),
      spawnedKeys: grav.spawnedKeys,
      fallenKeys: grav.fallenKeys,
      fallDistance: grav.fallDistance,
    });

    board = grav.next;
  }

  const scatterPay = scatterCashPay(scattersOnBoard, bet);
  totalWin += scatterPay;
  rawWin += scatterPay;

  let freeSpinsAwarded = 0;
  let retriggerSpins = 0;

  if (!isFreeSpins && scattersOnBoard >= cfg.freeSpinsTriggerCount) {
    freeSpinsAwarded = cfg.freeSpinsBase;
  } else if (isFreeSpins && scattersOnBoard >= cfg.freeSpinsRetriggerCount) {
    retriggerSpins = cfg.freeSpinsRetrigger;
  }

  const displayMult = isFreeSpins ? Math.max(1, bombAccumulator) : maxTumbleMult;

  return {
    initialBoard,
    steps,
    totalWin: +totalWin.toFixed(2),
    rawWin: +rawWin.toFixed(2),
    displayMult,
    scatters: scattersOnBoard,
    scatterPay,
    freeSpinsAwarded,
    retriggerSpins,
    isFreeSpins,
    bombAccumulator,
  };
}
