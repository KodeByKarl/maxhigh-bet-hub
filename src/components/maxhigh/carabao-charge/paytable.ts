import type { BuffaloSymbolConfig } from "@/lib/carabao-charge-config";

/** Payout × bet for matching reel count (3 / 4 / 5) or scatter count. */
export function getSymbolPayoutMultiplier(sym: BuffaloSymbolConfig, consecutiveReels: number): number {
  if (sym.scatter) {
    if (consecutiveReels >= 5) return sym.pay[2];
    if (consecutiveReels === 4) return sym.pay[1];
    if (consecutiveReels === 3) return sym.pay[0];
    return 0;
  }
  if (sym.wild || sym.bonus) return 0;
  if (consecutiveReels < 3) return 0;
  if (consecutiveReels === 3) return sym.pay[0];
  if (consecutiveReels === 4) return sym.pay[1];
  if (consecutiveReels >= 5) return sym.pay[2];
  return 0;
}
