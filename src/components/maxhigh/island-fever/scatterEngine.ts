import { scatterCashPay, getFreeSpinsBase, getFreeSpinsRetrigger } from "./paytable";
import { getIslandFeverConfig } from "./runtimeConfig";

export type ScatterResult = {
  count: number;
  cashPay: number;
  freeSpinsAwarded: number;
  retriggerSpins: number;
};

/**
 * Scatters counted across the whole spin (all tumbles).
 * Thresholds / awards come from Superadmin config.
 */
export function resolveScatters(
  maxScattersSeen: number,
  bet: number,
  isFreeSpins: boolean,
): ScatterResult {
  const cfg = getIslandFeverConfig();
  const cashPay = scatterCashPay(maxScattersSeen, bet);

  if (isFreeSpins) {
    return {
      count: maxScattersSeen,
      cashPay: 0,
      freeSpinsAwarded: 0,
      retriggerSpins:
        maxScattersSeen >= cfg.freeSpinsRetriggerCount ? getFreeSpinsRetrigger() : 0,
    };
  }

  return {
    count: maxScattersSeen,
    cashPay,
    freeSpinsAwarded:
      maxScattersSeen >= cfg.freeSpinsTriggerCount ? getFreeSpinsBase() : 0,
    retriggerSpins: 0,
  };
}
