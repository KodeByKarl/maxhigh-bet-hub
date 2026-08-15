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
export function IslandFeverSidePanel({
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
    <div className="flex w-full flex-col items-stretch gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onBuy}
        className="rounded-2xl border-[3px] border-white/85 px-2 py-2.5 text-center shadow-[0_8px_20px_rgba(219,39,119,0.45)] transition hover:brightness-110 disabled:opacity-50"
        style={{
          background: "linear-gradient(180deg,#f9a8d4 0%,#ec4899 48%,#db2777 100%)",
        }}
      >
        <div
          className="text-[10px] font-black uppercase leading-tight tracking-wide text-white"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
        >
          Buy Free Spins
        </div>
        <div
          className="mt-0.5 text-[1.35rem] font-black leading-none tabular-nums text-white lg:text-[1.5rem]"
          style={{ textShadow: "0 2px 0 rgba(136,19,55,0.45)" }}
        >
          ₱{buyCost.toFixed(2)}
        </div>
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={onBuySuper}
        className="rounded-2xl border-[3px] border-white/85 px-2 py-2.5 text-center shadow-[0_8px_20px_rgba(234,88,12,0.4)] transition hover:brightness-110 disabled:opacity-50"
        style={{
          background: "linear-gradient(180deg,#fdba74 0%,#f97316 45%,#ea580c 100%)",
        }}
      >
        <div
          className="text-[10px] font-black uppercase leading-tight tracking-wide text-white"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
        >
          Buy{" "}
          <span
            className="text-[13px] italic"
            style={{
              background: "linear-gradient(180deg,#fff7cc,#fde047,#f59e0b)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 1px 0 #9a3412)",
            }}
          >
            SUPER
          </span>{" "}
          Free Spins
        </div>
        <div
          className="mt-0.5 text-[1.35rem] font-black leading-none tabular-nums text-white lg:text-[1.5rem]"
          style={{ textShadow: "0 2px 0 rgba(154,52,18,0.45)" }}
        >
          ₱{superBuyCost.toFixed(2)}
        </div>
      </button>

      <div
        className="rounded-2xl border-[3px] border-white/85 px-2 py-2.5 text-center shadow-[0_8px_20px_rgba(22,163,74,0.4)]"
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
          className="text-[1.55rem] font-black leading-none tabular-nums lg:text-[1.7rem]"
          style={{
            background: "linear-gradient(180deg,#fff 10%,#fde047 45%,#f97316 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 1px 0 #14532d)",
          }}
        >
          ₱{totalBet.toFixed(2)}
        </div>
        <div
          className="mx-auto mt-1 max-w-[9.5rem] text-[8px] font-black uppercase leading-tight text-white"
          style={{ textShadow: "0 1px 1px rgba(0,0,0,0.4)" }}
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
              "flex h-8 items-center gap-1.5 rounded-full border-2 border-white/80 px-1.5 shadow transition disabled:opacity-50",
              ante ? "bg-yellow-300" : "bg-black/30",
            )}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full text-[10px] font-black shadow",
                ante ? "bg-white text-green-700" : "bg-green-600 text-white",
              )}
            >
              {ante ? "✓" : "›"}
            </span>
            <span
              className={cn(
                "pr-1.5 text-[11px] font-black uppercase",
                ante ? "text-green-900" : "text-white",
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
