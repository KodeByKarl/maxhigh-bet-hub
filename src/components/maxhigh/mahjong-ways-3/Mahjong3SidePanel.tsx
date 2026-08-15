import { formatMoney } from "@/lib/currency";

type Props = {
  buyCost: number;
  totalBet: number;
  ante: boolean;
  busy: boolean;
  onBuy: () => void;
  onAnteChange: (on: boolean) => void;
};

/** Left rail — Buy Free Spins + Ante (Mahjong Ways 2 chrome). */
export function Mahjong3SidePanel({
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
        className="rounded-2xl border-[3px] border-[#F5D76E]/90 px-2 py-2.5 text-center shadow-[0_8px_20px_rgba(185,28,28,0.45)] transition hover:brightness-110 disabled:opacity-50"
        style={{
          background: "linear-gradient(180deg,#f87171 0%,#dc2626 48%,#991b1b 100%)",
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
        className="rounded-2xl border-[3px] border-[#F5D76E]/85 px-2 py-2.5 text-center shadow-[0_8px_20px_rgba(22,163,74,0.35)]"
        style={{
          background: "linear-gradient(180deg,#86efac 0%,#22c55e 50%,#15803d 100%)",
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
          style={{ textShadow: "0 2px 0 rgba(20,83,45,0.55)" }}
        >
          {formatMoney(totalBet)}
        </div>
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5">
          <input
            type="checkbox"
            checked={ante}
            disabled={busy}
            onChange={(e) => onAnteChange(e.target.checked)}
            className="size-3.5 accent-amber-400 disabled:opacity-50"
          />
          <span className="text-[10px] font-black uppercase tracking-wide text-white/95">
            Ante +25%
          </span>
        </label>
      </div>
    </div>
  );
}
