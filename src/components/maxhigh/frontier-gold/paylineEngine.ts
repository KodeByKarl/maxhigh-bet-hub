import { betPerLine, type FgSymKind, type FrontierGoldConfig } from "@/lib/frontier-gold-config";
import type { FgGrid, PaylineWin } from "./types";

function isWild(kind: FgSymKind, cfg: FrontierGoldConfig) {
  return !!cfg.symbols.find((s) => s.kind === kind)?.wild;
}

function isPaying(kind: FgSymKind, cfg: FrontierGoldConfig) {
  const s = cfg.symbols.find((x) => x.kind === kind);
  return !!s && (s.tier === "low" || s.tier === "high" || s.tier === "wild");
}

/**
 * Left→right payline eval with wild substitution (not for scatter/bonus).
 */
export function evaluatePaylines(
  grid: FgGrid,
  totalBet: number,
  cfg: FrontierGoldConfig,
): { wins: PaylineWin[]; total: number } {
  const bpl = betPerLine(totalBet, cfg);
  const wins: PaylineWin[] = [];
  let total = 0;

  for (let lineIndex = 0; lineIndex < cfg.paylineCount; lineIndex++) {
    const path = cfg.paylines[lineIndex];
    if (!path || path.length < cfg.reelsCount) continue;

    const cells: FgSymKind[] = [];
    for (let reel = 0; reel < cfg.reelsCount; reel++) {
      const row = path[reel];
      const sym = grid[reel]?.[row];
      if (!sym) break;
      cells.push(sym);
    }
    if (cells.length < cfg.minMatchLength) continue;

    // Determine target paying symbol (first non-wild, or wild-only line)
    let target: FgSymKind | null = null;
    for (const c of cells) {
      if (c === "scatter" || c === "bonus") {
        target = null;
        break;
      }
      if (!isWild(c, cfg)) {
        target = c;
        break;
      }
    }
    if (!target) {
      // all wilds — use wild pay
      if (cells.every((c) => isWild(c, cfg))) target = "wild";
      else continue;
    }
    if (!isPaying(target, cfg) && target !== "wild") continue;

    let count = 0;
    const positions: Array<[number, number]> = [];
    for (let reel = 0; reel < cells.length; reel++) {
      const c = cells[reel];
      if (c === "scatter" || c === "bonus") break;
      if (c === target || isWild(c, cfg)) {
        count++;
        positions.push([reel, path[reel]]);
      } else break;
    }

    if (count < cfg.minMatchLength) continue;
    const symCfg = cfg.symbols.find((s) => s.kind === target);
    if (!symCfg) continue;
    const payIdx = Math.min(count, 5) - 3;
    if (payIdx < 0 || payIdx > 2) continue;
    const mult = symCfg.pay[payIdx as 0 | 1 | 2];
    if (mult <= 0) continue;
    const payout = +(mult * bpl).toFixed(2);
    wins.push({ lineIndex, symbol: target, count, positions, payout });
    total += payout;
  }

  return { wins, total: +total.toFixed(2) };
}

export function evaluateScatterPay(
  scatterCount: number,
  totalBet: number,
  cfg: FrontierGoldConfig,
): number {
  if (scatterCount < 3) return 0;
  const scat = cfg.symbols.find((s) => s.scatter);
  if (!scat) return 0;
  const idx = Math.min(scatterCount, 5) - 3;
  if (idx < 0) return 0;
  return +(scat.pay[idx as 0 | 1 | 2] * totalBet).toFixed(2);
}
