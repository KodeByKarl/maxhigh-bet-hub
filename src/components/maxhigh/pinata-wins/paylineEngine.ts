import { betPerLine, type PwSymKind, type PwWinsConfig } from "@/lib/pinata-wins-config";
import type { PaylineWin, PwGrid } from "./types";

function isWild(kind: PwSymKind, cfg: PwWinsConfig) {
  return !!cfg.symbols.find((s) => s.kind === kind)?.wild;
}

function isPaying(kind: PwSymKind, cfg: PwWinsConfig) {
  const s = cfg.symbols.find((x) => x.kind === kind);
  return !!s && (s.tier === "low" || s.tier === "high" || s.tier === "wild");
}

/**
 * Left→right fixed-payline evaluation with Wild substitution (not Scatter).
 * Pure function: grid + config + bet → wins. Does not evaluate ways-to-win.
 */
export function evaluatePaylines(
  grid: PwGrid,
  totalBet: number,
  cfg: PwWinsConfig,
): { wins: PaylineWin[]; total: number } {
  const bpl = betPerLine(totalBet, cfg);
  const wins: PaylineWin[] = [];
  let total = 0;

  for (let lineIndex = 0; lineIndex < cfg.paylineCount; lineIndex++) {
    const path = cfg.paylines[lineIndex];
    if (!path || path.length < cfg.reelsCount) continue;

    const cells: PwSymKind[] = [];
    for (let reel = 0; reel < cfg.reelsCount; reel++) {
      const row = path[reel]!;
      const cell = grid[reel]?.[row];
      if (!cell) break;
      cells.push(cell.kind);
    }
    if (cells.length < cfg.minMatchLength) continue;

    let target: PwSymKind | null = null;
    for (const c of cells) {
      if (c === "scatter") {
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
      const c = cells[reel]!;
      if (c === "scatter") break;
      if (c === target || isWild(c, cfg)) {
        count++;
        positions.push([reel, path[reel]!]);
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
