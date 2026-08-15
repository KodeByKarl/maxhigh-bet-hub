import { useState } from "react";
import { type Lucky9Config } from "@/lib/lucky9-config";
import { cn } from "@/lib/utils";
import { L9_CHIP_VALUES, type L9BetSpot } from "./animationConfig";
import { Lucky9ChipButton } from "./Lucky9Chip";

export type ChipPlaceEvent = {
  spot: L9BetSpot;
  value: number;
};

type Props = {
  cfg: Lucky9Config;
  playerBet: number;
  dealerBet: number;
  tieBet: number;
  disabled?: boolean;
  onPlayerBet: (n: number) => void;
  onDealerBet: (n: number) => void;
  onTieBet: (n: number) => void;
  activeSpot: L9BetSpot;
  onActiveSpot: (s: L9BetSpot) => void;
  onChipPlaced?: (ev: ChipPlaceEvent) => void;
  onClearAll?: () => void;
  onDeal?: () => void;
  dealBusy?: boolean;
};

function clampBet(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(0, +n.toFixed(2)));
}

/**
 * Lucky 9 control deck — oversized for older-player readability.
 * Segmented spots + circular chip tray + full-width GO FOR 9.
 */
export function BettingPanel({
  cfg,
  playerBet,
  dealerBet,
  tieBet,
  disabled,
  onPlayerBet,
  onDealerBet,
  onTieBet,
  activeSpot,
  onActiveSpot,
  onChipPlaced,
  onClearAll,
  onDeal,
  dealBusy,
}: Props) {
  const chipValues =
    cfg.betSteps.length > 0 ? cfg.betSteps : [...L9_CHIP_VALUES];
  const [selectedChip, setSelectedChip] = useState<number>(
    () => chipValues.find((v) => v >= 5) ?? chipValues[0] ?? 5,
  );
  const [lastAdd, setLastAdd] = useState<{ spot: L9BetSpot; value: number } | null>(null);

  const setters: Record<L9BetSpot, (n: number) => void> = {
    player: onPlayerBet,
    dealer: onDealerBet,
    tie: onTieBet,
  };
  const values: Record<L9BetSpot, number> = {
    player: playerBet,
    dealer: dealerBet,
    tie: tieBet,
  };
  const mins: Record<L9BetSpot, number> = {
    player: cfg.minPlayerBet,
    dealer: cfg.minDealerBet,
    tie: 0,
  };
  const maxes: Record<L9BetSpot, number> = {
    player: cfg.maxPlayerBet,
    dealer: cfg.maxDealerBet,
    tie: cfg.maxTieBet,
  };

  function addChip(v: number) {
    if (disabled) return;
    setSelectedChip(v);
    const floor = activeSpot === "tie" ? 0 : mins[activeSpot];
    const next = clampBet(values[activeSpot] + v, floor, maxes[activeSpot]);
    setters[activeSpot](next);
    setLastAdd({ spot: activeSpot, value: v });
    onChipPlaced?.({ spot: activeSpot, value: v });
  }

  function undoLast() {
    if (disabled || !lastAdd) return;
    const { spot, value } = lastAdd;
    const floor = spot === "tie" ? 0 : mins[spot];
    setters[spot](clampBet(values[spot] - value, floor, maxes[spot]));
    setLastAdd(null);
  }

  const totalWager = +(playerBet + dealerBet + tieBet).toFixed(2);

  const tabs: { id: L9BetSpot; short: string; amount: number; tone: string; active: string }[] = [
    {
      id: "player",
      short: "YOU",
      amount: playerBet,
      tone: "text-sky-300",
      active: "bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.35)]",
    },
    {
      id: "tie",
      short: "TIE",
      amount: tieBet,
      tone: "text-amber-300",
      active: "bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.35)]",
    },
    {
      id: "dealer",
      short: "HOUSE",
      amount: dealerBet,
      tone: "text-lime-300",
      active: "bg-lime-400 text-slate-950 shadow-[0_0_12px_rgba(163,230,53,0.35)]",
    },
  ];

  return (
    <div className="touch-manipulation space-y-2.5 short-h:space-y-2">
      {/* Segmented spot switcher */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border-2 border-[#c9a227]/35 bg-[#0a1f18]/95 p-1.5 short-h:gap-1 short-h:rounded-xl short-h:border short-h:p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onActiveSpot(t.id)}
            aria-pressed={activeSpot === t.id}
            className={cn(
              "flex min-h-[3.65rem] flex-col items-center justify-center rounded-xl px-1.5 py-2 transition active:scale-[0.98] disabled:opacity-40 short-h:min-h-[3.1rem] short-h:rounded-lg short-h:py-1.5",
              activeSpot === t.id ? t.active : "bg-transparent hover:bg-white/5",
            )}
          >
            <span
              className={cn(
                "text-[12px] font-extrabold tracking-[0.16em] short-h:text-[10px]",
                activeSpot === t.id ? "text-inherit opacity-85" : t.tone,
              )}
            >
              {t.short}
            </span>
            <span
              className={cn(
                "mt-0.5 text-xl font-black tabular-nums leading-none short-h:text-lg",
                activeSpot === t.id ? "text-inherit" : "text-white",
              )}
            >
              ₱{t.amount.toFixed(0)}
            </span>
          </button>
        ))}
      </div>

      {/* Circular chip tray — scrollable when many denominations */}
      <div className="relative rounded-2xl border border-[#c9a227]/25 bg-gradient-to-b from-[#0e2a1e] to-[#061410] px-1.5 py-1.5 short-h:py-1">
        <div className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden short-h:gap-1">
          {chipValues.map((v) => (
            <Lucky9ChipButton
              key={v}
              value={v}
              disabled={disabled}
              selected={selectedChip === v}
              onClick={() => addChip(v)}
            />
          ))}
        </div>
        {chipValues.length > 6 ? (
          <span
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold text-[#e8c96a]/55 sm:hidden"
            aria-hidden
          >
            ›
          </span>
        ) : null}
      </div>

      {/* Actions: undo · GO FOR 9 · clear */}
      <div className="flex items-stretch gap-2 short-h:gap-1.5">
        <button
          type="button"
          disabled={disabled || !lastAdd}
          onClick={undoLast}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/8 text-2xl text-white/80 transition active:scale-95 disabled:opacity-30 short-h:h-12 short-h:w-12 short-h:rounded-xl short-h:text-xl"
          aria-label="Undo last chip"
        >
          ↶
        </button>

        <button
          type="button"
          disabled={disabled || dealBusy || totalWager <= 0}
          onClick={() => onDeal?.()}
          className={cn(
            "relative flex h-14 flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-2xl border-2 border-[#f5e6c8]/80 bg-gradient-to-r from-[#2d6a4f] via-[#c9a227] to-[#2d6a4f] px-3 text-[#0c1008] shadow-[0_6px_22px_rgba(201,162,39,0.4)] transition active:scale-[0.99] disabled:opacity-40 short-h:h-12 short-h:rounded-xl short-h:gap-2",
          )}
        >
          <span className="grid size-9 place-items-center rounded-full bg-black/25 text-base font-black text-[#f5e6c8] short-h:size-7 short-h:text-sm">
            9
          </span>
          <span className="text-base font-black tracking-[0.18em] short-h:text-sm">
            GO FOR 9
          </span>
          {totalWager > 0 ? (
            <span className="rounded-full bg-black/35 px-2.5 py-1 text-xs font-bold tabular-nums text-[#f5e6c8] short-h:px-2 short-h:py-0.5 short-h:text-[11px]">
              ₱{totalWager.toFixed(0)}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          disabled={disabled || totalWager <= 0}
          onClick={() => {
            onClearAll?.();
            setLastAdd(null);
          }}
          className="grid h-14 min-w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/8 px-1.5 text-[11px] font-extrabold tracking-wide text-white/80 transition active:scale-95 disabled:opacity-30 short-h:h-12 short-h:min-w-12 short-h:rounded-xl short-h:text-[10px]"
          aria-label="Clear all bets"
        >
          CLEAR
        </button>
      </div>
    </div>
  );
}
