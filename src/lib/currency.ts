/** Fixed MaxHigh display currency — Philippine Peso. */
export const CURRENCY_CODE = "PHP" as const;
export const CURRENCY_SYMBOL = "₱";
export const CURRENCY_LABEL = "Philippine Peso (₱)";

/** Format a number as ₱1,234.56 */
export function formatMoney(amount: number | string, opts?: { signed?: boolean }) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const value = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(value).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const core = `${CURRENCY_SYMBOL}${abs}`;
  if (!opts?.signed) return core;
  if (value > 0) return `+${core}`;
  if (value < 0) return `-${CURRENCY_SYMBOL}${abs}`;
  return core;
}

/** Compact money for buttons (₱10) — no forced decimals when whole. */
export function formatMoneyCompact(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  if (Number.isInteger(n)) return `${CURRENCY_SYMBOL}${n.toLocaleString("en-PH")}`;
  return formatMoney(n);
}
