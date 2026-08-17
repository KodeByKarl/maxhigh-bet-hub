/**
 * Shared last-line pool/cap enforcement for game settlement.
 *
 * Wallet `writeLedgerDelta` is a dumb ledger write — it does not know about
 * round caps. Every Original must call this before crediting a win.
 *
 * remainingPoolForRound = bet × maxWinMult − alreadyCreditedThisRound
 * finalPayout           = min(computedWin, remainingPool)
 *
 * A clamp firing means upstream math (paytable / bombs / FS multiply) produced
 * a win above the configured cap — that is a bug and must not be silent.
 */

export type PoolCapInput = {
  gameId: string;
  gameName?: string;
  bet: number;
  /** 0 / missing / non-finite → no cap (remaining pool is infinite). */
  maxWinMult?: number;
  computedWin: number;
  /** Peso already credited toward this round's cap (base win before FS, etc.). */
  alreadyCredited?: number;
  /** Override remaining pool when the caller already computed it. */
  remainingPool?: number;
  context?: string;
};

export type PoolCapResult = {
  payout: number;
  computedWin: number;
  remainingPool: number;
  clamped: boolean;
  excess: number;
};

function money2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return +Math.max(0, n).toFixed(2);
}

/** Peso room left in this round: max(0, bet × maxWinMult − alreadyCredited). */
export function remainingPoolForRound(opts: {
  bet: number;
  maxWinMult?: number;
  alreadyCredited?: number;
}): number {
  const mult = opts.maxWinMult;
  if (mult == null || !Number.isFinite(mult) || mult <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  const cap = money2(opts.bet * mult);
  const already = money2(opts.alreadyCredited ?? 0);
  return money2(cap - already);
}

export function enforcePoolCap(input: PoolCapInput): PoolCapResult {
  const computedWin = money2(input.computedWin);
  const remainingPool =
    input.remainingPool != null && Number.isFinite(input.remainingPool)
      ? money2(input.remainingPool)
      : remainingPoolForRound({
          bet: input.bet,
          maxWinMult: input.maxWinMult,
          alreadyCredited: input.alreadyCredited,
        });

  const payout = Number.isFinite(remainingPool) ? money2(Math.min(computedWin, remainingPool)) : computedWin;
  const clamped = computedWin - payout > 0.001;
  const excess = clamped ? money2(computedWin - payout) : 0;

  if (clamped) {
    console.error("[POOL_CAP_CLAMP] computed win exceeded round pool — upstream math/RTP bug", {
      gameId: input.gameId,
      gameName: input.gameName ?? null,
      context: input.context ?? "settle",
      bet: input.bet,
      maxWinMult: input.maxWinMult ?? null,
      computedWin,
      remainingPool,
      payout,
      excess,
    });
  }

  return { payout, computedWin, remainingPool, clamped, excess };
}

/** Clamp `script.totalWin` in place so the client script matches the ledger credit. */
export function applyCapToScriptTotalWin<T extends { totalWin: number }>(
  script: T,
  opts: Omit<PoolCapInput, "computedWin">,
): PoolCapResult {
  const result = enforcePoolCap({ ...opts, computedWin: script.totalWin });
  script.totalWin = result.payout;
  return result;
}
