import { freeSpinsAwardForCount } from "@/lib/thor-thunder-config";
import { scatterCashPay } from "./paytable";
import { getThorThunderConfig } from "./runtimeConfig";

export type ScatterResult = {
  count: number;
  cashPay: number;
  freeSpinsAwarded: number;
  retriggerSpins: number;
};

/** 3+ celestial gates trigger free spins; 3+ during FS retrigger (counts from config). */
export function resolveScatters(
  maxScattersSeen: number,
  bet: number,
  isFreeSpins: boolean,
): ScatterResult {
  const cfg = getThorThunderConfig();
  const cashPay = scatterCashPay(maxScattersSeen, bet);

  if (isFreeSpins) {
    return {
      count: maxScattersSeen,
      cashPay: 0,
      freeSpinsAwarded: 0,
      retriggerSpins:
        maxScattersSeen >= cfg.freeSpinsRetriggerCount ? cfg.freeSpinsRetrigger : 0,
    };
  }

  return {
    count: maxScattersSeen,
    cashPay,
    freeSpinsAwarded:
      maxScattersSeen >= cfg.freeSpinsTriggerCount
        ? freeSpinsAwardForCount(cfg, maxScattersSeen)
        : 0,
    retriggerSpins: 0,
  };
}
