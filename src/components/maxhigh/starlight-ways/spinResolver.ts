import { calcFreeSpinsAward } from "@/lib/starlight-ways-config";
import { getStarlightWaysConfig } from "./runtimeConfig";
import { applyGravity, generateInitialBoard } from "./tumbleEngine";
import type { CascadeStep, SpinScript } from "./types";
import { evaluateWays } from "./waysEngine";

/**
 * Server-authoritative spin resolution (Section 8).
 * Full cascade sequence, multipliers, gold→wild, scatter FS, and max-win cap in one pass.
 */
export function resolveStarlightWaysSpin(opts: {
  bet: number;
  ante: boolean;
  isFreeSpins: boolean;
}): SpinScript {
  const config = getStarlightWaysConfig();
  const bet = opts.bet;
  const ante = opts.ante;
  const isFreeSpins = opts.isFreeSpins;

  const initialReelHeights: number[] = Array.from({ length: config.reelsCount }, () => {
    const minH = config.minReelHeight;
    const maxH = config.maxReelHeight;
    return Math.floor(Math.random() * (maxH - minH + 1)) + minH;
  });

  const totalWays = initialReelHeights.reduce((acc, h) => acc * h, 1);
  let currentBoard = generateInitialBoard(initialReelHeights, ante, isFreeSpins);

  const steps: CascadeStep[] = [];
  const MAX_CASCADE_LIMIT = 50;
  let cascadeIndex = 0;
  let baseWin = 0;
  let totalWin = 0;
  let peakScatterCount = 0;
  let scatterPaid = false;
  let hitCap = false;

  const multipliersTable = isFreeSpins
    ? config.freeSpinsCascadeMultipliers
    : config.baseCascadeMultipliers;

  const maxPayout =
    config.maxWinMult > 0 ? +(bet * config.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;

  while (cascadeIndex < MAX_CASCADE_LIMIT) {
    // Scatter cash pays once — the first time we see 3+ during the sequence
    const scatterCountPreview = currentBoard.filter((c) => c.sym.scatter).length;
    const shouldPayScatter =
      !scatterPaid && scatterCountPreview >= config.freeSpinsTriggerCount;

    const evalResult = evaluateWays(currentBoard, bet, initialReelHeights, {
      payScatter: shouldPayScatter,
    });

    if (evalResult.scatterCount > peakScatterCount) {
      peakScatterCount = evalResult.scatterCount;
    }
    if (shouldPayScatter && evalResult.scatterCount >= config.freeSpinsTriggerCount) {
      scatterPaid = true;
    }

    const multiplierIdx = Math.min(cascadeIndex, multipliersTable.length - 1);
    const multiplier = multipliersTable[multiplierIdx];
    let stepWin = +(evalResult.winAmount * multiplier).toFixed(4);

    // Max-win cap: trim this step if needed, then stop further cascade value
    if (totalWin + stepWin > maxPayout) {
      stepWin = +Math.max(0, maxPayout - totalWin).toFixed(4);
      hitCap = true;
    }

    baseWin += evalResult.winAmount;
    totalWin += stepWin;

    steps.push({
      stepIndex: cascadeIndex,
      board: currentBoard.map((c) => ({ ...c, sym: c.sym })),
      evalResult,
      multiplier,
      stepWin,
      spawnedKeys: [],
      fallenKeys: [],
    });

    // Only tumble on ways wins (scatter-only steps end the chain)
    if (evalResult.winningKeys.length === 0 || hitCap) {
      break;
    }

    const tumble = applyGravity(
      currentBoard,
      new Set(evalResult.winningKeys),
      initialReelHeights,
      ante,
      isFreeSpins,
    );

    steps[cascadeIndex].spawnedKeys = tumble.spawnedKeys;
    steps[cascadeIndex].fallenKeys = tumble.fallenKeys;
    currentBoard = tumble.nextBoard;

    cascadeIndex++;
  }

  const freeSpinsAwarded = calcFreeSpinsAward(peakScatterCount, config);

  return {
    initialReelHeights,
    initialBoard: steps[0]?.board || currentBoard,
    steps,
    totalWays,
    baseWin: +baseWin.toFixed(4),
    totalWin: +totalWin.toFixed(2),
    scattersCount: peakScatterCount,
    freeSpinsAwarded,
    hitCap: hitCap || undefined,
  };
}
