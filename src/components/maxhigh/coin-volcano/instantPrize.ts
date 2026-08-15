import type { CoinVolcanoConfig, McSymKind } from "@/lib/coin-volcano-config";
import type { McGrid, InstantMixResult, WildScatterCount } from "./types";

function isWildKind(kind: McSymKind, cfg: CoinVolcanoConfig) {
  return !!cfg.symbols.find((s) => s.kind === kind)?.wild;
}

function isScatterKind(kind: McSymKind, cfg: CoinVolcanoConfig) {
  return !!cfg.symbols.find((s) => s.kind === kind)?.scatter;
}

/** Count Wild + Scatter anywhere in view (not payline-restricted). */
export function countWildScatter(grid: McGrid, cfg: CoinVolcanoConfig): WildScatterCount {
  let wild = 0;
  let scatter = 0;
  const positions: Array<[number, number]> = [];

  for (let reel = 0; reel < grid.length; reel++) {
    const col = grid[reel] ?? [];
    for (let row = 0; row < col.length; row++) {
      const kind = col[row];
      if (!kind) continue;
      if (isWildKind(kind, cfg)) {
        wild++;
        positions.push([reel, row]);
      } else if (isScatterKind(kind, cfg)) {
        scatter++;
        positions.push([reel, row]);
      }
    }
  }

  return { wild, scatter, mix: wild + scatter, positions };
}

/**
 * True when every cell on the grid is Scatter specifically (Wilds do NOT count).
 * Triggers Grand Jackpot; Section 3 mix must be skipped (Option C).
 */
export function isGrandJackpot(grid: McGrid, cfg: CoinVolcanoConfig): boolean {
  let cells = 0;
  for (const col of grid) {
    for (const kind of col) {
      cells++;
      if (!isScatterKind(kind, cfg)) return false;
    }
  }
  return cells === cfg.reelsCount * cfg.rowsCount && cells > 0;
}

/**
 * Instant Wild+Scatter mix prize lookup (count → × stake).
 * Returns null when count < 6 or no table entry.
 */
export function evaluateInstantMix(
  mixCount: number,
  totalBet: number,
  cfg: CoinVolcanoConfig,
): InstantMixResult | null {
  if (mixCount < 6) return null;
  const mult = cfg.instantMixTable[String(mixCount)];
  if (mult == null || mult <= 0) return null;
  return {
    count: mixCount,
    mult,
    payout: +(mult * totalBet).toFixed(2),
  };
}

export function evaluateGrandJackpot(
  grid: McGrid,
  totalBet: number,
  cfg: CoinVolcanoConfig,
): { triggered: boolean; payout: number } {
  if (!isGrandJackpot(grid, cfg)) return { triggered: false, payout: 0 };
  const mult = cfg.grandJackpotMult;
  if (mult <= 0) return { triggered: true, payout: 0 };
  return { triggered: true, payout: +(mult * totalBet).toFixed(2) };
}
