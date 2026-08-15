import { betPerLine, type SariSariSpinConfig, type FoSymKind } from "@/lib/sari-sari-spin-config";
import type { FoGrid, PaylineWin } from "./types";

function isWild(kind: FoSymKind, cfg: SariSariSpinConfig) {
  return !!cfg.symbols.find((s) => s.kind === kind)?.wild;
}

function isPaying(kind: FoSymKind, cfg: SariSariSpinConfig) {
  const s = cfg.symbols.find((x) => x.kind === kind);
  return !!s && (s.tier === "low" || s.tier === "high" || s.tier === "wild");
}

/**
 * Fixed-payline evaluation for 3×3 / 5 lines.
 * Win = 3 matching symbols along a defined payline path (Wild substitutes).
 * All-Wild line pays the Wild paytable.
 * Pure function: grid + payline map → list of wins (no ways / cascade / L→R stop early beyond path).
 */
export function evaluatePaylines(
  grid: FoGrid,
  totalBet: number,
  cfg: SariSariSpinConfig,
): { wins: PaylineWin[]; total: number } {
  const bpl = betPerLine(totalBet, cfg);
  const wins: PaylineWin[] = [];
  let total = 0;

  for (let lineIndex = 0; lineIndex < cfg.paylineCount; lineIndex++) {
    const path = cfg.paylines[lineIndex];
    if (!path || path.length < cfg.reelsCount) continue;

    const cells: FoSymKind[] = [];
    const positions: Array<[number, number]> = [];
    for (let reel = 0; reel < cfg.reelsCount; reel++) {
      const row = path[reel];
      const sym = grid[reel]?.[row];
      if (!sym) break;
      cells.push(sym);
      positions.push([reel, row]);
    }
    if (cells.length < cfg.minMatchLength) continue;

    let target: FoSymKind | null = null;
    for (const c of cells) {
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

    const match = cells.every((c) => c === target || isWild(c, cfg));
    if (!match) continue;

    const count = cells.length;
    if (count < cfg.minMatchLength) continue;

    const symCfg = cfg.symbols.find((s) => s.kind === target);
    if (!symCfg || symCfg.pay <= 0) continue;

    const payout = +(symCfg.pay * bpl).toFixed(2);
    wins.push({ lineIndex, symbol: target, count, positions, payout });
    total += payout;
  }

  return { wins, total: +total.toFixed(2) };
}
