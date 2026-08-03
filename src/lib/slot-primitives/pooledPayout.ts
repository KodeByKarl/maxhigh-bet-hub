/**
 * Reusable primitive: delayed / pooled payout accumulator.
 *
 * Wins are not settled per spin — they accumulate in a pot and settle
 * as one lump sum when the session ends (e.g. Pug Life Dawg's Den).
 */

export type PooledPayoutEntry = {
  /** Machine-readable source (payline, toaster_mult, toaster_cash, …) */
  source: string;
  amount: number;
  /** Optional spin index within the bonus session */
  spinIndex?: number;
  /** Serializable audit extras only */
  meta?: Record<string, string | number | boolean | null>;
};

export type PooledPayoutState = {
  entries: PooledPayoutEntry[];
  /** Running total (sum of entry amounts) */
  pot: number;
  settled: boolean;
  settledAmount: number;
};

export function createPooledPayout(): PooledPayoutState {
  return { entries: [], pot: 0, settled: false, settledAmount: 0 };
}

export function addToPool(
  state: PooledPayoutState,
  entry: PooledPayoutEntry,
): PooledPayoutState {
  if (state.settled) {
    throw new Error("Cannot add to a settled payout pool");
  }
  const amount = +Math.max(0, entry.amount).toFixed(2);
  const next: PooledPayoutState = {
    ...state,
    entries: [...state.entries, { ...entry, amount }],
    pot: +(state.pot + amount).toFixed(2),
  };
  return next;
}

/**
 * Finalize the pool into a single settlement amount.
 * Idempotent — re-settling returns the same amount.
 */
export function settlePool(state: PooledPayoutState): PooledPayoutState {
  if (state.settled) return state;
  return {
    ...state,
    settled: true,
    settledAmount: state.pot,
  };
}
