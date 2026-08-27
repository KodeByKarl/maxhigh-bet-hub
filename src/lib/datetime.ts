/** Fixed platform display timezone — Philippine Time (UTC+8). */
export const DISPLAY_TIMEZONE = "Asia/Manila";

/** Format ISO / Date for player and admin reports (always PH time, includes year). */
export function formatDateTimePH(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-PH", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
