import { getSweetRushConfig } from "./runtimeConfig";

export type ScatterResult = {
  count: number;
  cashPay: number;
  freeSpinsAwarded: number;
  retriggerSpins: number;
};

/** Default Sweet Rush–style free-spin awards by scatter count. */
export function freeSpinsForScatterCount(count: number): number {
  const cfg = getSweetRushConfig();
  const table = cfg.freeSpinsByScatterCount;
  if (table && table.length > 0) {
    const sorted = [...table].sort((a, b) => b.count - a.count);
    for (const row of sorted) {
      if (count >= row.count) return row.spins;
    }
    return 0;
  }
  // Fallback table from the educational spec
  if (count >= 7) return 30;
  if (count >= 6) return 20;
  if (count >= 5) return 15;
  if (count >= 4) return 12;
  if (count >= 3) return 10;
  return 0;
}

export function checkScatters(count: number): number {
  return freeSpinsForScatterCount(count);
}

export function triggerFreeSpins(count: number, isFreeSpins: boolean): ScatterResult {
  return resolveScatters(count, 0, isFreeSpins);
}

/**
 * Scatters do not need to connect. Count is max seen during the spin.
 * Cash pay optional via config (default 0 — FS only, Sweet Rush–style).
 */
export function resolveScatters(
  maxScattersSeen: number,
  bet: number,
  isFreeSpins: boolean,
): ScatterResult {
  const cfg = getSweetRushConfig();
  const spins = freeSpinsForScatterCount(maxScattersSeen);

  let cashPay = 0;
  const tiers = [...cfg.scatterCashTiers].sort((a, b) => b.count - a.count);
  for (const t of tiers) {
    if (maxScattersSeen >= t.count && t.mult > 0) {
      cashPay = +(bet * t.mult).toFixed(2);
      break;
    }
  }

  if (isFreeSpins) {
    return {
      count: maxScattersSeen,
      cashPay: 0,
      freeSpinsAwarded: 0,
      retriggerSpins: spins,
    };
  }

  return {
    count: maxScattersSeen,
    cashPay,
    freeSpinsAwarded: spins,
    retriggerSpins: 0,
  };
}
