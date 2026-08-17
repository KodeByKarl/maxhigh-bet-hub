import { getFsMultStart, getFsMultStep } from "./paytable";
import { getGodlyGatesConfig } from "./runtimeConfig";

function fsMultCeiling(): number {
  const cap = getGodlyGatesConfig().maxFsMult;
  if (cap == null || !Number.isFinite(cap) || cap <= 0) return Number.POSITIVE_INFINITY;
  return cap;
}

/** Progressive cascade multiplier (free spins only). */
export function createMultiplier(start?: number) {
  const startVal = start ?? getFsMultStart();
  const ceiling = fsMultCeiling();
  let value = Number.isFinite(ceiling) ? Math.min(ceiling, startVal) : startVal;
  return {
    get: () => value,
    /** Call once per successful cascade step */
    bump: () => {
      value += getFsMultStep();
      if (Number.isFinite(ceiling)) value = Math.min(ceiling, value);
      return value;
    },
    apply: (amount: number) => +(amount * value).toFixed(2),
    reset: (to?: number) => {
      const next = to ?? getFsMultStart();
      value = Number.isFinite(ceiling) ? Math.min(ceiling, next) : next;
    },
  };
}

export function finalizeFreeSpinTotal(sessionRaw: number, _endMult: number): number {
  // Cascade wins already apply the progressive multiplier each step —
  // pay the accumulated session total as-is (do not multiply again).
  if (sessionRaw <= 0) return 0;
  return +sessionRaw.toFixed(2);
}
