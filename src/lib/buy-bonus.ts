/**
 * Buy Bonus contract shared by the server (authoritative) and the UI (display only).
 * A purchase ALWAYS awards exactly BUY_BONUS_FREE_SPINS initial free spins. The price stays the game's own calibrated price for that
 * many spins at the chosen bet; nothing here changes a coefficient, an RTP or a payout.
 */
export const BUY_BONUS_FREE_SPINS = 10;

/**
 * Server-side guard. The quantity is not a player choice any more: an absent value means "the standard 10"; any other value is
 * refused (an old cached client that still shows a different quantity must never be charged for something it did not display).
 */
export function resolveBuyBonusSpins(requested?: unknown): number {
  if (requested !== undefined && requested !== null) {
    const n = Math.round(Number(requested));
    if (!Number.isFinite(n) || n !== BUY_BONUS_FREE_SPINS) {
      throw new Error(`Buy Bonus awards exactly ${BUY_BONUS_FREE_SPINS} free spins`);
    }
  }
  return BUY_BONUS_FREE_SPINS;
}
