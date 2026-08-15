import { getSymbolPayoutMultiplier } from "./paytable";
import { getPharaohFireConfig } from "./runtimeConfig";
import type { BoardCell, EvalResult, WaysWin } from "./types";

export type EvaluateWaysOpts = {
  /**
   * When true, 3+ scatters contribute cash payout (once per spin � resolver controls this).
   * Scatters never enter winningKeys (they do not tumble off).
   */
  payScatter?: boolean;
};

/**
 * Pure ways-to-win evaluation (1,024 ways on a full 5�4 grid).
 * Wins = 3+ matching symbols on consecutive reels from reel 1; wild substitutes (not for scatter).
 */
export function evaluateWays(
  board: BoardCell[],
  bet: number,
  reelHeights: number[],
  opts: EvaluateWaysOpts = {},
): EvalResult {
  const config = getPharaohFireConfig();
  const reelsCount = config.reelsCount;
  const minConsecutive = config.minConsecutiveReels;
  const payScatter = opts.payScatter === true;

  const totalWays = reelHeights.reduce((acc, h) => acc * h, 1);

  const reelCells: BoardCell[][] = Array.from({ length: reelsCount }, () => []);
  let scatterCount = 0;
  const scatterKeys: string[] = [];

  for (const cell of board) {
    if (!cell) continue;
    if (cell.sym.scatter) {
      scatterCount++;
      scatterKeys.push(cell.key);
    }
    if (cell.reelIndex >= 0 && cell.reelIndex < reelsCount) {
      reelCells[cell.reelIndex].push(cell);
    }
  }

  const waysWins: WaysWin[] = [];
  const winningKeys = new Set<string>();
  let winAmount = 0;

  for (const symConfig of config.symbols) {
    if (symConfig.scatter || symConfig.wild || symConfig.bonus) continue;

    const symbolId = symConfig.id;
    let consecutiveReels = 0;
    const matchingCellsPerReel: BoardCell[][] = [];

    for (let r = 0; r < reelsCount; r++) {
      const matchesOnReel = reelCells[r].filter((c) => c.sym.id === symbolId || c.sym.wild);

      if (matchesOnReel.length > 0) {
        consecutiveReels++;
        matchingCellsPerReel.push(matchesOnReel);
      } else {
        break;
      }
    }

    if (consecutiveReels >= minConsecutive) {
      const waysCount = matchingCellsPerReel.reduce((acc, list) => acc * list.length, 1);
      const basePayMultiplier = getSymbolPayoutMultiplier(symConfig, consecutiveReels);
      const totalWinAmount = +(bet * basePayMultiplier * waysCount).toFixed(2);

      if (totalWinAmount > 0) {
        const symbolWinningKeys: string[] = [];
        for (const list of matchingCellsPerReel) {
          for (const cell of list) {
            // Scatters never tumble; skip if a wild somehow flagged scatter
            if (cell.sym.scatter) continue;
            symbolWinningKeys.push(cell.key);
            winningKeys.add(cell.key);
          }
        }

        waysWins.push({
          symbolId,
          kind: symConfig.kind,
          name: symConfig.name,
          consecutiveReels,
          waysCount,
          basePayMultiplier,
          totalWinAmount,
          winningKeys: symbolWinningKeys,
        });

        winAmount += totalWinAmount;
      }
    }
  }

  if (payScatter && scatterCount >= 3) {
    const scatterConfig = config.symbols.find((s) => s.scatter);
    if (scatterConfig) {
      const scatterPayMult = getSymbolPayoutMultiplier(scatterConfig, scatterCount);
      const scatterWin = +(bet * scatterPayMult).toFixed(2);
      if (scatterWin > 0) {
        waysWins.push({
          symbolId: scatterConfig.id,
          kind: scatterConfig.kind,
          name: scatterConfig.name,
          consecutiveReels: scatterCount,
          waysCount: 1,
          basePayMultiplier: scatterPayMult,
          totalWinAmount: scatterWin,
          winningKeys: [], // never tumble scatters
        });
        winAmount += scatterWin;
      }
    }
  }

  return {
    waysWins,
    winningKeys: [...winningKeys],
    winAmount: +winAmount.toFixed(2),
    scatterCount,
    scatterKeys,
    totalWays,
  };
}
