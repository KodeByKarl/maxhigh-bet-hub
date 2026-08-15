/**
 * Jeepney Jackpot — connecting ways on a 3-4-5-4-3 diamond board.
 * Wins = 3+ matching symbols on consecutive reels from the left;
 * Wild substitutes (not for Scatter / Bonus).
 * Payout = pay × totalBet × waysCount.
 */
import type { FgSymKind, JeepneyJackpotConfig } from "@/lib/jeepney-jackpot-config";
import type { FgGrid, PaylineWin } from "./types";

function isWild(kind: FgSymKind, cfg: JeepneyJackpotConfig) {
  return !!cfg.symbols.find((s) => s.kind === kind)?.wild;
}

function isPayingTarget(kind: FgSymKind, cfg: JeepneyJackpotConfig): boolean {
  const s = cfg.symbols.find((x) => x.kind === kind);
  return !!s && (s.tier === "low" || s.tier === "high");
}

function payForCount(symPay: [number, number, number], count: number): number {
  if (count < 3) return 0;
  if (count === 3) return symPay[0];
  if (count === 4) return symPay[1];
  // 5+ consecutive reels use the 5-oak tier (board max is 7)
  return symPay[2];
}

/**
 * Left→right connecting ways evaluation for variable reelHeights.
 */
export function evaluateWays(
  grid: FgGrid,
  totalBet: number,
  cfg: JeepneyJackpotConfig,
): { wins: PaylineWin[]; total: number } {
  const reelsCount = cfg.reelsCount;
  const minLen = cfg.minMatchLength;
  const wins: PaylineWin[] = [];
  let total = 0;
  let winIndex = 0;

  const pushWin = (w: Omit<PaylineWin, "lineIndex">) => {
    wins.push({ ...w, lineIndex: winIndex++ });
    total += w.payout;
  };

  for (const symCfg of cfg.symbols) {
    if (!isPayingTarget(symCfg.kind, cfg)) continue;
    const target = symCfg.kind;

    const matchingPerReel: Array<Array<{ row: number }>> = [];
    let consecutive = 0;

    for (let reel = 0; reel < reelsCount; reel++) {
      const col = grid[reel] ?? [];
      const matches: Array<{ row: number }> = [];
      for (let row = 0; row < col.length; row++) {
        const c = col[row];
        if (!c || c === "scatter" || c === "bonus") continue;
        if (c === target || isWild(c, cfg)) {
          matches.push({ row });
        }
      }
      if (matches.length === 0) break;
      matchingPerReel.push(matches);
      consecutive++;
    }

    if (consecutive < minLen) continue;

    const waysCount = matchingPerReel.reduce((acc, list) => acc * list.length, 1);
    const baseMult = payForCount(symCfg.pay, consecutive);
    if (baseMult <= 0 || waysCount <= 0) continue;

    const positions: Array<[number, number]> = [];
    for (let reel = 0; reel < matchingPerReel.length; reel++) {
      for (const m of matchingPerReel[reel]!) {
        positions.push([reel, m.row]);
      }
    }

    const payout = +(baseMult * totalBet * waysCount).toFixed(2);
    pushWin({
      symbol: target,
      count: consecutive,
      positions,
      waysCount,
      payout,
    });
  }

  return { wins, total: +total.toFixed(2) };
}

/** @deprecated Alias —  now uses connecting ways. */
export const evaluatePaylines = evaluateWays;

export function evaluateScatterPay(
  scatterCount: number,
  totalBet: number,
  cfg: JeepneyJackpotConfig,
): number {
  if (scatterCount < 3) return 0;
  const scat = cfg.symbols.find((s) => s.scatter);
  if (!scat) return 0;
  const idx = Math.min(scatterCount, 5) - 3;
  if (idx < 0) return 0;
  return +(scat.pay[idx as 0 | 1 | 2] * totalBet).toFixed(2);
}
