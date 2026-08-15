import { formatMoney, formatMoneyCompact } from "@/lib/currency";

type Props = {
  buyCost: number;
  bet: number;
  busy: boolean;
  onBuy: () => void;
};

/** Left rail — Buy Feature + Bet cards (Candy Peak layout, Egypt theme). */
export function GateOfRaSidePanel({ buyCost, bet, busy, onBuy }: Props) {
  return (
    <div className="flex w-full flex-col items-stretch gap-2.5">
      <button
        type="button"
        disabled={busy}
        onClick={onBuy}
        className="rounded-2xl border-[3px] border-amber-100/90 px-2 py-2.5 text-center transition hover:brightness-110 disabled:opacity-50"
        style={{
          background: "linear-gradient(180deg,#fef3c7 0%,#fbbf24 35%,#d97706 70%,#92400e 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 22px rgba(180,83,9,0.45)",
        }}
      >
        <div
          className="text-[10px] font-black uppercase leading-tight tracking-wide text-amber-950"
          style={{ textShadow: "0 1px 0 rgba(255,255,255,0.35)" }}
        >
          Buy Feature
        </div>
        <div
          className="mt-0.5 text-[1.35rem] font-black leading-none tabular-nums text-amber-950 lg:text-[1.5rem]"
          style={{ textShadow: "0 1px 0 rgba(255,255,255,0.35)" }}
        >
          {formatMoneyCompact(buyCost)}
        </div>
        <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-900/80">
          Enter the tomb
        </div>
      </button>

      <div
        className="rounded-2xl border-[3px] border-amber-200/80 px-2 py-2.5 text-center"
        style={{
          background: "linear-gradient(180deg,#92400e 0%,#78350f 45%,#451a03 100%)",
          boxShadow: "inset 0 1px 0 rgba(253,230,138,0.35), 0 8px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="text-[11px] font-black uppercase tracking-wide text-amber-200">Bet</div>
        <div
          className="text-[1.45rem] font-black leading-none tabular-nums text-amber-100 lg:text-[1.6rem]"
          style={{ textShadow: "0 2px 0 #1c0a00" }}
        >
          {formatMoney(bet)}
        </div>
        <div className="mx-auto mt-1 max-w-[9.5rem] text-[8px] font-black uppercase leading-tight text-amber-200/75">
          15,625 ways · cascades
        </div>
      </div>
    </div>
  );
}
