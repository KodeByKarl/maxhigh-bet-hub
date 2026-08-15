import { getFsMultStart, getFsMultStep } from "./paytable";

/** Progressive cascade multiplier (free spins only). */
export function createMultiplier(start?: number) {
  const startVal = start ?? getFsMultStart();
  let value = startVal;
  return {
    get: () => value,
    /** Call once per successful cascade step */
    bump: () => {
      value += getFsMultStep();
      return value;
    },
    apply: (amount: number) => +(amount * value).toFixed(2),
    reset: (to?: number) => {
      value = to ?? getFsMultStart();
    },
  };
}

export function finalizeFreeSpinTotal(sessionRaw: number, _endMult: number): number {
  // Cascade wins already apply the progressive multiplier each step —
  // pay the accumulated session total as-is (do not multiply again).
  if (sessionRaw <= 0) return 0;
  return +sessionRaw.toFixed(2);
}
