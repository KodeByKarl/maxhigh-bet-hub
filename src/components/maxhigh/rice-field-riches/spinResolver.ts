import { calcFreeSpinsAward } from "@/lib/rice-field-riches-config";
import { createRng, newSpinSeed } from "./rng";
import { getRiceFieldRichesConfig } from "./runtimeConfig";
import { resolveTreasureChest } from "./treasureChest";
import { applyGravity, generateInitialBoard } from "./tumbleEngine";
import type { CascadeStep, SpinScript } from "./types";
import { evaluateWays } from "./waysEngine";

/**
 * Server-authoritative Rice Field Riches spin:
 * ways cascades → Golden Campfire FS → Treasure Chest Hold & Collect → max-win cap.
 */
export function resolveRiceFieldRichesSpin(opts: {
  bet: number;
  ante?: boolean;
  isFreeSpins?: boolean;
  /** Free-spins session multiplier (increasing each FS). */
  sessionMultiplier?: number;
  seed?: string;
}): SpinScript {
  const config = getRiceFieldRichesConfig();
  const bet = opts.bet;
  const ante = !!opts.ante;
  const isFreeSpins = !!opts.isFreeSpins;
  const sessionMultiplier = Math.max(1, opts.sessionMultiplier ?? 1);
  const rng = createRng(opts.seed ?? newSpinSeed(isFreeSpins ? "carabao-fs" : "carabao"));

  const initialReelHeights: number[] = Array.from({ length: config.reelsCount }, () => {
    const minH = config.minReelHeight;
    const maxH = config.maxReelHeight;
    return Math.floor(rng() * (maxH - minH + 1)) + minH;
  });

  const totalWays = initialReelHeights.reduce((acc, h) => acc * h, 1);
  let currentBoard = generateInitialBoard(initialReelHeights, ante, isFreeSpins);

  const steps: CascadeStep[] = [];
  const MAX_CASCADE_LIMIT = 50;
  let cascadeIndex = 0;
  let baseWin = 0;
  let totalWin = 0;
  let peakScatterCount = 0;
  let peakBonusCount = 0;
  let scatterPaid = false;
  let hitCap = false;

  const multipliersTable = isFreeSpins
    ? config.freeSpinsCascadeMultipliers
    : config.baseCascadeMultipliers;

  const maxPayout =
    config.maxWinMult > 0 ? +(bet * config.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;

  while (cascadeIndex < MAX_CASCADE_LIMIT) {
    const scatterCountPreview = currentBoard.filter((c) => c.sym.scatter).length;
    const bonusCountPreview = currentBoard.filter((c) => c.sym.bonus).length;
    if (bonusCountPreview > peakBonusCount) peakBonusCount = bonusCountPreview;

    const shouldPayScatter = !scatterPaid && scatterCountPreview >= 3;

    const evalResult = evaluateWays(currentBoard, bet, initialReelHeights, {
      payScatter: shouldPayScatter,
    });

    if (evalResult.scatterCount > peakScatterCount) {
      peakScatterCount = evalResult.scatterCount;
    }
    if (shouldPayScatter && evalResult.scatterCount >= 3) {
      scatterPaid = true;
    }

    const multiplierIdx = Math.min(cascadeIndex, multipliersTable.length - 1);
    let cascadeMult = multipliersTable[multiplierIdx] ?? 1;
    if (isFreeSpins) cascadeMult *= sessionMultiplier;

    let stepWin = +(evalResult.winAmount * cascadeMult).toFixed(2);

    if (totalWin + stepWin > maxPayout) {
      stepWin = +Math.max(0, maxPayout - totalWin).toFixed(2);
      hitCap = true;
    }

    baseWin += evalResult.winAmount;
    totalWin += stepWin;

    steps.push({
      stepIndex: cascadeIndex,
      board: currentBoard.map((c) => ({ ...c, sym: c.sym })),
      evalResult,
      multiplier: cascadeMult,
      stepWin,
      spawnedKeys: [],
      fallenKeys: [],
    });

    if (evalResult.winningKeys.length === 0 || hitCap) break;

    const tumble = applyGravity(
      currentBoard,
      new Set(evalResult.winningKeys),
      initialReelHeights,
      ante,
      isFreeSpins,
    );
    steps[cascadeIndex]!.spawnedKeys = tumble.spawnedKeys;
    steps[cascadeIndex]!.fallenKeys = tumble.fallenKeys;
    currentBoard = tumble.nextBoard;
    cascadeIndex++;
  }

  const freeSpinsAwarded = calcFreeSpinsAward(peakScatterCount, config);

  // Treasure Chest — base game only, after cascades settle
  let treasureChest: SpinScript["treasureChest"] = null;
  const finalBoard = steps[steps.length - 1]?.board ?? currentBoard;
  const bonusCells = finalBoard.filter((c) => c.sym.bonus);
  const bonusChestCount = Math.max(peakBonusCount, bonusCells.length);

  if (!isFreeSpins && bonusCells.length >= config.chestTriggerCount && !hitCap) {
    const positions = bonusCells.map((c) => [c.reelIndex, c.rowIndex] as [number, number]);
    treasureChest = resolveTreasureChest(rng, bet, config, positions);
    let chestWin = treasureChest.totalWin;
    if (totalWin + chestWin > maxPayout) {
      chestWin = +Math.max(0, maxPayout - totalWin).toFixed(2);
      hitCap = true;
      treasureChest = { ...treasureChest, totalWin: chestWin };
    }
    totalWin += chestWin;
  }

  return {
    initialReelHeights,
    initialBoard: steps[0]?.board || currentBoard,
    steps,
    totalWays,
    baseWin: +baseWin.toFixed(2),
    totalWin: +totalWin.toFixed(2),
    scattersCount: peakScatterCount,
    freeSpinsAwarded,
    bonusChestCount,
    treasureChest,
    sessionMultiplier,
    hitCap: hitCap || undefined,
  };
}
