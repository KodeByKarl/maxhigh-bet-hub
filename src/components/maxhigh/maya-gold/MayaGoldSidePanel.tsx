import { cn } from "@/lib/utils";

type Props = {
  buyCost: number;
  superBuyCost: number;
  totalBet: number;
  ante: boolean;
  busy: boolean;
  onBuy: () => void;
  onBuySuper: () => void;
  onAnteChange: (on: boolean) => void;
};

/** Classic Sweet Bonanza left rail — 3 separate glossy cards. */
export function MayaGoldSidePanel({
  buyCost,
  superBuyCost,
  totalBet,
  ante,
  busy,
  onBuy,
  onBuySuper,
  onAnteChange,
}: Props) {
  return (
    <div className="flex w-full flex-col items-stretch gap-2.5">
      <button
        type="button"
        disabled={busy}
        onClick={onBuy}
        className="rounded-2xl border-2 border-amber-300/80 px-2 py-2.5 text-center shadow-[0_8px_20px_rgba(245,158,11,0.4)] transition hover:brightness-115 active:scale-95 disabled:opacity-50"
        style={{
          background: "linear-gradient(180deg, #fbbf24 0%, #d97706 50%, #78350f 100%)",
        }}
      >
        <div
          className="text-[10px] font-black uppercase leading-tight tracking-wider text-amber-100"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
        >
          Buy Free Spins
        </div>
        <div
          className="mt-0.5 text-[1.35rem] font-black leading-none tabular-nums text-yellow-300 lg:text-[1.5rem]"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.9)" }}
        >
          ₱{buyCost.toFixed(2)}
        </div>
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={onBuySuper}
        className="rounded-2xl border-2 border-yellow-200 px-2 py-2.5 text-center shadow-[0_8px_25px_rgba(234,179,8,0.5)] transition hover:brightness-115 active:scale-95 disabled:opacity-50 relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #fef08a 0%, #eab308 45%, #ca8a04 100%)",
        }}
      >
        <div
          className="text-[10px] font-black uppercase leading-tight tracking-wider text-amber-950"
          style={{ textShadow: "0 1px 2px rgba(255,255,255,0.4)" }}
        >
          Buy{" "}
          <span className="text-[13px] font-black text-amber-950 underline decoration-amber-600">
            SUPER
          </span>{" "}
          Free Spins
        </div>
        <div
          className="mt-0.5 text-[1.35rem] font-black leading-none tabular-nums text-amber-950 lg:text-[1.5rem]"
          style={{ textShadow: "0 1px 2px rgba(255,255,255,0.5)" }}
        >
          ₱{superBuyCost.toFixed(2)}
        </div>
      </button>

      <div
        className="rounded-2xl border-2 border-emerald-400/70 px-2 py-2.5 text-center shadow-[0_8px_20px_rgba(16,185,129,0.35)]"
        style={{
          background: "linear-gradient(180deg, #065f46 0%, #047857 50%, #064e3b 100%)",
        }}
      >
        <div
          className="text-[11px] font-black uppercase tracking-wider text-emerald-200"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
        >
          Bet
        </div>
        <div
          className="text-[1.55rem] font-black leading-none tabular-nums text-yellow-300 lg:text-[1.7rem]"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.9)" }}
        >
          ₱{totalBet.toFixed(2)}
        </div>
        <div
          className="mx-auto mt-1 max-w-[9.5rem] text-[8px] font-black uppercase leading-tight text-emerald-100/90"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
        >
          Double Chance to Win Feature
        </div>
        <div className="mt-2 flex items-center justify-center">
          <button
            type="button"
            disabled={busy}
            aria-pressed={ante}
            onClick={() => onAnteChange(!ante)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full border-2 border-amber-300/80 px-1.5 shadow-lg transition disabled:opacity-50",
              ante ? "bg-amber-400" : "bg-black/50",
            )}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full text-[10px] font-black shadow",
                ante ? "bg-amber-950 text-yellow-300" : "bg-emerald-700 text-white",
              )}
            >
              {ante ? "✓" : "›"}
            </span>
            <span
              className={cn(
                "pr-1.5 text-[11px] font-black uppercase",
                ante ? "text-amber-950" : "text-emerald-200",
              )}
            >
              {ante ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
