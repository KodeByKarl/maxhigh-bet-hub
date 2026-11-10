/**
 * Free-spin progress for the HUD counter ("FREE SPINS 3/10"), derived ONLY from the server-authorised bonus session.
 * `played` = spins already settled by the server for this session (the in-flight spin counts once the server has settled it),
 * `left`   = spins still owed. `total` therefore follows retriggers automatically (it grows when the server adds spins).
 * Presentation only: nothing here changes a payout, a price or a session.
 */
export type FreeSpinsProgress = { current: number; total: number };

export function freeSpinsProgress(
  played: number,
  left: number,
  spinning: boolean,
): FreeSpinsProgress | null {
  const p = Number.isFinite(played) ? Math.max(0, Math.floor(played)) : 0;
  const l = Number.isFinite(left) ? Math.max(0, Math.floor(left)) : 0;
  const total = p + l;
  if (total <= 0) return null;
  // While a spin is being played the server has already counted it, so "current" is `played`.
  // Between spins the next spin is "played + 1". When nothing is left the counter rests on total/total.
  const current = spinning ? Math.min(total, Math.max(1, p)) : Math.min(total, p + 1);
  return { current, total };
}

export const formatFreeSpinsProgress = (p: FreeSpinsProgress | null): string | null =>
  p ? `${p.current}/${p.total}` : null;
