const OFFSET_MS = 8 * 60 * 60 * 1000;
/** Philippine business calendar boundaries returned as UTC instants. */
export function manilaDayBounds(at = new Date(), dayOffset = 0) {
  const local = new Date(at.getTime() + OFFSET_MS);
  const start = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dayOffset) -
      OFFSET_MS,
  );
  return { start, end: new Date(start.getTime() + 86400000) };
}
export function manilaWeekStart(at = new Date()) {
  const local = new Date(at.getTime() + OFFSET_MS);
  return manilaDayBounds(at, -((local.getUTCDay() + 6) % 7)).start;
}
export function manilaMonthStart(at = new Date()) {
  const local = new Date(at.getTime() + OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - OFFSET_MS);
}
