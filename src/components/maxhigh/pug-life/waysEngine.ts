/**
 * Pug Den — connecting ways on a 1-2-3-4-3-2-1 diamond board.
 * Wins = 3+ matching symbols on consecutive reels from the left;
 * Treat / Toaster wilds substitute (not for Scatter).
 * Multiple Treats on a win → multipliers are summed (combined).
 */
import {
  applyCombinedWildMultiplier,
  type WildMultiplierContribution,
} from "@/lib/slot-primitives/combinedWildMultipliers";
import {
  isScatterKind,
  isTreatKind,
  isWildKind,
  type PlSymKind,
  type PugLifeConfig,
} from "@/lib/pug-life-config";
import type { PaylineWin, PlGrid } from "./types";

function isPayingTarget(kind: PlSymKind, cfg: PugLifeConfig): boolean {
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
 * Payout = (pay × totalBet × waysCount) × combined Treat multiplier.
 */
export function evaluateWays(
  grid: PlGrid,
  totalBet: number,
  cfg: PugLifeConfig,
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

  // --- Regular symbols (Treat/Toaster substitute) ---
  for (const symCfg of cfg.symbols) {
    if (!isPayingTarget(symCfg.kind, cfg)) continue;
    const target = symCfg.kind;

    const matchingPerReel: Array<Array<{ row: number; treatMult?: number; kind: PlSymKind }>> =
      [];
    let consecutive = 0;

    for (let reel = 0; reel < reelsCount; reel++) {
      const col = grid[reel] ?? [];
      const matches: Array<{ row: number; treatMult?: number; kind: PlSymKind }> = [];
      for (let row = 0; row < col.length; row++) {
        const c = col[row];
        if (!c || isScatterKind(c.kind, cfg)) continue;
        if (c.kind === target || isWildKind(c.kind, cfg)) {
          matches.push({ row, treatMult: c.treatMult, kind: c.kind });
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
    const treatContributions: WildMultiplierContribution[] = [];
    for (let reel = 0; reel < matchingPerReel.length; reel++) {
      for (const m of matchingPerReel[reel]!) {
        positions.push([reel, m.row]);
        if (isTreatKind(m.kind) && m.treatMult != null && m.treatMult >= 1) {
          treatContributions.push({
            position: [reel, m.row],
            multiplier: m.treatMult,
          });
        }
      }
    }

    const basePayout = +(baseMult * totalBet * waysCount).toFixed(4);
    const { combinedMult, payout } = applyCombinedWildMultiplier(
      basePayout,
      treatContributions,
    );

    pushWin({
      symbol: target,
      count: consecutive,
      positions,
      waysCount,
      basePayout,
      treatContributions: treatContributions.map((t) => ({
        position: t.position,
        multiplier: t.multiplier,
      })),
      combinedTreatMult: treatContributions.length > 0 ? combinedMult : 1,
      payout: +payout.toFixed(2),
    });
  }

  // --- All-Treat connecting ways (5+ consecutive reels with ≥1 Treat each) ---
  {
    const matchingPerReel: Array<Array<{ row: number; treatMult?: number; kind: PlSymKind }>> =
      [];
    let consecutive = 0;
    for (let reel = 0; reel < reelsCount; reel++) {
      const col = grid[reel] ?? [];
      const matches: Array<{ row: number; treatMult?: number; kind: PlSymKind }> = [];
      for (let row = 0; row < col.length; row++) {
        const c = col[row];
        if (c && isTreatKind(c.kind)) {
          matches.push({ row, treatMult: c.treatMult, kind: c.kind });
        }
      }
      if (matches.length === 0) break;
      matchingPerReel.push(matches);
      consecutive++;
    }

    if (consecutive >= 5) {
      const waysCount = matchingPerReel.reduce((acc, list) => acc * list.length, 1);
      const positions: Array<[number, number]> = [];
      const treatContributions: WildMultiplierContribution[] = [];
      for (let reel = 0; reel < matchingPerReel.length; reel++) {
        for (const m of matchingPerReel[reel]!) {
          positions.push([reel, m.row]);
          if (m.treatMult != null && m.treatMult >= 1) {
            treatContributions.push({
              position: [reel, m.row],
              multiplier: m.treatMult,
            });
          }
        }
      }

      const basePayout = +(cfg.fiveTreatPayStakeMult * totalBet * waysCount).toFixed(4);
      const { combinedMult, payout } = applyCombinedWildMultiplier(
        basePayout,
        treatContributions,
      );

      pushWin({
        symbol: "treat_biscuit",
        count: consecutive,
        positions,
        waysCount,
        basePayout,
        treatContributions: treatContributions.map((t) => ({
          position: t.position,
          multiplier: t.multiplier,
        })),
        combinedTreatMult: treatContributions.length > 0 ? combinedMult : 1,
        payout: +payout.toFixed(2),
        fiveTreatWin: true,
      });
    }
  }

  return { wins, total: +total.toFixed(2) };
}

/** @deprecated Alias — Pug Den now uses connecting ways. */
export const evaluatePaylines = evaluateWays;
