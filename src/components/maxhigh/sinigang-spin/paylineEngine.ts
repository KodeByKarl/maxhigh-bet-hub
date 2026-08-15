import {
  betPerLine,
  type SinigangSpinConfig,
  type CnySymKind,
} from "@/lib/sinigang-spin-config";
import type { CnyGrid, PaylineWin } from "./types";

function isPayingSymbol(kind: CnySymKind, cfg: SinigangSpinConfig): boolean {
  const s = cfg.symbols.find((x) => x.kind === kind);
  return !!s && (s.tier === "low" || s.tier === "high");
}

/**
 * Resolve a cell for payline matching.
 * Extra Scatter substitutes as `extraScatterSymbol` during Free Spins.
 * Dragon / Monkey never form payline wins.
 */
function resolvePayKind(
  raw: CnySymKind,
  extraScatterSymbol: CnySymKind | null,
): CnySymKind | null {
  if (raw === "dragon" || raw === "monkey") return null;
  if (raw === "extra_scatter") {
    return extraScatterSymbol;
  }
  return raw;
}

/**
 * Pure payline evaluation: matching symbols left→right along each active line.
 * No Wild substitution (Wild unconfirmed for this title).
 */
export function evaluatePaylines(
  grid: CnyGrid,
  totalBet: number,
  cfg: SinigangSpinConfig,
  opts?: { extraScatterSymbol?: CnySymKind | null },
): { wins: PaylineWin[]; total: number } {
  const extra = opts?.extraScatterSymbol ?? null;
  const bpl = betPerLine(totalBet, cfg);
  const wins: PaylineWin[] = [];
  let total = 0;

  for (let lineIndex = 0; lineIndex < cfg.paylineCount; lineIndex++) {
    const path = cfg.paylines[lineIndex];
    if (!path || path.length < cfg.reelsCount) continue;

    const firstRaw = grid[0]?.[path[0]];
    if (!firstRaw) continue;
    const firstPay = resolvePayKind(firstRaw, extra);
    if (!firstPay || !isPayingSymbol(firstPay, cfg)) continue;

    let count = 1;
    const positions: Array<[number, number]> = [[0, path[0]]];

    for (let reel = 1; reel < cfg.reelsCount; reel++) {
      const row = path[reel];
      const raw = grid[reel]?.[row];
      if (raw == null) break;
      const pay = resolvePayKind(raw, extra);
      if (pay !== firstPay) break;
      count += 1;
      positions.push([reel, row]);
    }

    if (count < cfg.minMatchLength) continue;

    const symCfg = cfg.symbols.find((s) => s.kind === firstPay);
    if (!symCfg) continue;
    const payIdx = Math.min(count, 5) - 3; // 3→0, 4→1, 5→2
    if (payIdx < 0 || payIdx > 2) continue;
    const mult = symCfg.pay[payIdx as 0 | 1 | 2];
    if (mult <= 0) continue;

    const payout = +(mult * bpl).toFixed(2);
    wins.push({
      lineIndex,
      symbol: firstRaw === "extra_scatter" ? "extra_scatter" : firstPay,
      paySymbol: firstPay,
      count,
      positions,
      payout,
    });
    total += payout;
  }

  return { wins, total: +total.toFixed(2) };
}
