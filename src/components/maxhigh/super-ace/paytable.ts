import type { SuperAceSymbolConfig } from "@/lib/super-ace-config";

/**
 * Returns the payout multiplier for a given symbol configuration and matching reel count (3, 4, 5).
 */
export function getSymbolPayoutMultiplier(
  sym: SuperAceSymbolConfig,
  consecutiveReels: number,
): number {
  if (sym.scatter) {
    if (consecutiveReels >= 5) return sym.pay[2];
    if (consecutiveReels === 4) return sym.pay[1];
    if (consecutiveReels === 3) return sym.pay[0];
    return 0;
  }
  if (sym.wild) return 0;
  if (consecutiveReels < 3) return 0;
  if (consecutiveReels === 3) return sym.pay[0];
  if (consecutiveReels === 4) return sym.pay[1];
  if (consecutiveReels >= 5) return sym.pay[2];
  return 0;
}
