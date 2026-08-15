import { betPerLine, type KnockoutKingConfig, type BkSymKind } from "@/lib/knockout-king-config";
import type { BkGrid, PaylineWin } from "./types";

function isWild(kind: BkSymKind, cfg: KnockoutKingConfig) {
  return !!cfg.symbols.find((s) => s.kind === kind)?.wild;
}

function isScatter(kind: BkSymKind, cfg: KnockoutKingConfig) {
  return !!cfg.symbols.find((s) => s.kind === kind)?.scatter;
}

function isPaying(kind: BkSymKind, cfg: KnockoutKingConfig) {
  const s = cfg.symbols.find((x) => x.kind === kind);
  return !!s && (s.tier === "low" || s.tier === "high" || s.tier === "wild");
}

/**
 * Left→right payline eval with Wild substitution.
 * Scatter never substitutes or forms line wins.
 * All-Wild line pays the Wild paytable.
 */
export function evaluatePaylines(
  grid: BkGrid,
  totalBet: number,
  cfg: KnockoutKingConfig,
): { wins: PaylineWin[]; total: number } {
  const bpl = betPerLine(totalBet, cfg);
  const wins: PaylineWin[] = [];
  let total = 0;

  for (let lineIndex = 0; lineIndex < cfg.paylineCount; lineIndex++) {
    const path = cfg.paylines[lineIndex];
    if (!path || path.length < cfg.reelsCount) continue;

    const cells: BkSymKind[] = [];
    for (let reel = 0; reel < cfg.reelsCount; reel++) {
      const row = path[reel];
      const sym = grid[reel]?.[row];
      if (!sym) break;
      cells.push(sym);
    }
    if (cells.length < cfg.minMatchLength) continue;

    let target: BkSymKind | null = null;
    for (const c of cells) {
      if (isScatter(c, cfg)) {
        target = null;
        break;
      }
      if (!isWild(c, cfg)) {
        target = c;
        break;
      }
    }
    if (!target) {
      if (cells.every((c) => isWild(c, cfg))) target = "wild";
      else continue;
    }
    if (!isPaying(target, cfg) && target !== "wild") continue;

    let count = 0;
    const positions: Array<[number, number]> = [];
    for (let reel = 0; reel < cells.length; reel++) {
      const c = cells[reel];
      if (isScatter(c, cfg)) break;
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
