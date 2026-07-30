import { getMahjongWaysConfig } from "./runtimeConfig";
import { applyGravity, generateInitialBoard } from "./tumbleEngine";
import type { CascadeStep, SpinScript } from "./types";
import { evaluateWays } from "./waysEngine";

export function resolveMahjongSpin(opts: {
  bet: number;
  ante: boolean;
  isFreeSpins: boolean;
}): SpinScript {
  const config = getMahjongWaysConfig();
  const bet = opts.bet;
  const ante = opts.ante;
  const isFreeSpins = opts.isFreeSpins;

  // Generate dynamic reel heights for 5 reels (e.g. 2 to 4 symbols per reel)
  const initialReelHeights: number[] = Array.from({ length: config.reelsCount }, () => {
    const minH = config.minReelHeight;
    const maxH = config.maxReelHeight;
    return Math.floor(Math.random() * (maxH - minH + 1)) + minH;
  });

  const totalWays = initialReelHeights.reduce((acc, h) => acc * h, 1);
  let currentBoard = generateInitialBoard(initialReelHeights, ante, isFreeSpins);

  const steps: CascadeStep[] = [];
  const MAX_CASCADE_LIMIT = 50; // Safety cap guaranteeing termination
  let cascadeIndex = 0;
  let baseWin = 0;
  let totalWin = 0;
  const multipliersTable = isFreeSpins
    ? config.freeSpinsCascadeMultipliers
    : config.baseCascadeMultipliers;

  while (cascadeIndex < MAX_CASCADE_LIMIT) {
    const evalResult = evaluateWays(currentBoard, bet, initialReelHeights);
    const multiplierIdx = Math.min(cascadeIndex, multipliersTable.length - 1);
    const multiplier = multipliersTable[multiplierIdx];
    const stepWin = +(evalResult.winAmount * multiplier).toFixed(2);

    baseWin += evalResult.winAmount;
    totalWin += stepWin;

    steps.push({
      stepIndex: cascadeIndex,
      board: currentBoard.map((c) => ({ ...c })),
      evalResult,
      multiplier,
      stepWin,
      spawnedKeys: [],
      fallenKeys: [],
    });

    if (evalResult.winningKeys.size === 0) {
      break; // Chain terminates — no more winning combinations
    }

    // Advance to next cascade step with gravity & replenishment
    const tumble = applyGravity(
      currentBoard,
      evalResult.winningKeys,
      initialReelHeights,
      ante,
      isFreeSpins,
    );

    steps[cascadeIndex].spawnedKeys = tumble.spawnedKeys;
    steps[cascadeIndex].fallenKeys = tumble.fallenKeys;
    currentBoard = tumble.nextBoard;

    cascadeIndex++;
  }

  // Count total scatters present on initial grid step
  const initialEval = steps[0]?.evalResult;
  const scattersCount = initialEval ? initialEval.scatterCount : 0;

  let freeSpinsAwarded = 0;
  if (scattersCount >= config.freeSpinsTriggerCount) {
    const extraScatters = scattersCount - config.freeSpinsTriggerCount;
    freeSpinsAwarded =
      config.freeSpinsBaseCount + extraScatters * config.freeSpinsExtraPerScatter;
  }

  return {
    initialReelHeights,
    initialBoard: steps[0]?.board || currentBoard,
    steps,
    totalWays,
    baseWin: +baseWin.toFixed(2),
    totalWin: +totalWin.toFixed(2),
    scattersCount,
    freeSpinsAwarded,
  };
}
