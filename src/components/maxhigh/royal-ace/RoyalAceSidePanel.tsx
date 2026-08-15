import { formatMoney } from "@/lib/currency";

type Props = {
  buyCost: number;
  totalBet: number;
  ante: boolean;
  busy: boolean;
  onBuy: () => void;
  onAnteChange: (on: boolean) => void;
};

/** Left rail � Buy Free Spins + Ante (Lucky Poker crimson/gold chrome). */
export function RoyalAceSidePanel({
  buyCost,
  totalBet,
  ante,
  busy,
  onBuy,
  onAnteChange,
}: Props) {
  return (
    <div className="flex w-full flex-col items-stretch gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onBuy}
        className="rounded-2xl border-[3px] border-[#F5D76E]/95 px-2 py-2.5 text-center shadow-[0_8px_22px_rgba(185,28,28,0.45)] transition hover:brightness-110 disabled:opacity-50"
        style={{
          background: "linear-gradient(180deg,#f87171 0%,#dc2626 48%,#7f1d1d 100%)",
        }}
      >
        <div
          className="text-[10px] font-black uppercase leading-tight tracking-wide text-white"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
        >
          Buy Free Spins
        </div>
        <div
          className="mt-0.5 text-[1.35rem] font-black leading-none tabular-nums text-[#F5D76E] lg:text-[1.5rem]"
          style={{ textShadow: "0 2px 0 rgba(69,10,10,0.55)" }}
        >
          {formatMoney(buyCost)}
        </div>
      </button>

      <div
        className="rounded-2xl border-[3px] border-[#F5D76E]/90 px-2 py-2.5 text-center shadow-[0_8px_22px_rgba(127,29,29,0.35)]"
        style={{
          background: ante
            ? "linear-gradient(180deg,#fde68a 0%,#f59e0b 45%,#b45309 100%)"
            : "linear-gradient(180deg,#fca5a5 0%,#ef4444 50%,#991b1b 100%)",
        }}
      >
        <div
          className="text-[11px] font-black uppercase tracking-wide text-white"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
        >
          Bet
        </div>
        <div
          className="text-[1.55rem] font-black leading-none tabular-nums text-white lg:text-[1.7rem]"
          style={{ textShadow: "0 2px 0 rgba(69,10,10,0.55)" }}
        >
          {formatMoney(totalBet)}
        </div>
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5">
          <input
            type="checkbox"
            checked={ante}
            disabled={busy}
            onChange={(e) => onAnteChange(e.target.checked)}
            className="size-3.5 accent-amber-300 disabled:opacity-50"
          />
          <span className="text-[10px] font-black uppercase tracking-wide text-white/95">
            Ante +25%
          </span>
        </label>
      </div>
    </div>
  );
}
