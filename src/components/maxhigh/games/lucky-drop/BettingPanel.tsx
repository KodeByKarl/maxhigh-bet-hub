import { useState } from "react";
import {
  LUCKY_DROP_SPOTS,
  type LuckyDropConfig,
  type LuckyDropSpot,
} from "@/lib/lucky-drop-config";
import { cn } from "@/lib/utils";

export type ChipPlaceEvent = {
  spot: LuckyDropSpot;
  value: number;
};

type Props = {
  cfg: LuckyDropConfig;
  bets: Record<LuckyDropSpot, number>;
  disabled?: boolean;
  activeSpot: LuckyDropSpot;
  onActiveSpot: (s: LuckyDropSpot) => void;
  onBet: (spot: LuckyDropSpot, n: number) => void;
  onChipPlaced?: (ev: ChipPlaceEvent) => void;
  onClearAll?: () => void;
  onDeal?: () => void;
  dealBusy?: boolean;
};

function clampBet(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(0, +n.toFixed(2)));
}

export function BettingPanel({
  cfg,
  bets,
  disabled,
  activeSpot,
  onActiveSpot,
  onBet,
  onChipPlaced,
  onClearAll,
  onDeal,
  dealBusy,
}: Props) {
  const chipValues = cfg.betSteps.length > 0 ? cfg.betSteps : [1, 5, 10, 25, 100];
  const [selectedChip, setSelectedChip] = useState(
    () => chipValues.find((v) => v >= 5) ?? chipValues[0] ?? 5,
  );

  const pickCount = LUCKY_DROP_SPOTS.filter((n) => (bets[n] ?? 0) > 0).length;

  function addChip(v: number) {
    if (disabled) return;
    setSelectedChip(v);
    const cur = bets[activeSpot] ?? 0;
    if (cur <= 0 && pickCount >= cfg.maxPicks) return;
    const next = clampBet(cur + v, 0, cfg.maxSpotBet);
    onBet(activeSpot, next);
    onChipPlaced?.({ spot: activeSpot, value: v });
  }

  const totalWager = +LUCKY_DROP_SPOTS.reduce((s, n) => s + (bets[n] ?? 0), 0).toFixed(2);
  const canDeal = totalWager >= cfg.minBet && !dealBusy && !disabled;

  return (
    <div className="space-y-2.5 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1">
      <div className="grid grid-cols-5 gap-1.5">
        {LUCKY_DROP_SPOTS.map((n) => {
          const amt = bets[n] ?? 0;
          const active = activeSpot === n;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onActiveSpot(n)}
              className={cn(
                "flex min-h-[3.2rem] flex-col items-center justify-center rounded-xl border-2 px-1 py-1 transition",
                active
                  ? "border-cyan-300 bg-cyan-500/30 scale-[1.03]"
                  : "border-white/15 bg-slate-800/70",
                amt > 0 && "ring-1 ring-amber-300/60",
              )}
            >
              <span className="text-lg font-black tabular-nums text-white">{n}</span>
              <span className="text-[10px] font-semibold tabular-nums text-amber-200/90">
                {amt > 0 ? `₱${amt}` : `${cfg.payoutMult}×`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {chipValues.map((v) => (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => addChip(v)}
            className={cn(
              "h-11 w-11 rounded-full border-2 text-xs font-black tabular-nums shadow-md",
              selectedChip === v
                ? "border-white bg-cyan-400 text-slate-900"
                : "border-white/40 bg-slate-800/80 text-white",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || totalWager <= 0}
          onClick={onClearAll}
          className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-xs font-semibold text-white/80 disabled:opacity-40"
        >
          Clear
        </button>
        <div className="ml-auto text-xs font-semibold text-white/60">
          {pickCount}/{cfg.maxPicks} · ₱{totalWager.toFixed(0)}
        </div>
        <button
          type="button"
          disabled={!canDeal}
          onClick={onDeal}
          className={cn(
            "min-w-[7.5rem] rounded-xl px-4 py-2.5 text-sm font-black tracking-wide uppercase shadow-lg",
            canDeal
              ? "bg-gradient-to-b from-cyan-300 to-sky-500 text-slate-900"
              : "bg-slate-700 text-white/40",
          )}
        >
          {dealBusy ? "…" : "DROP"}
        </button>
      </div>
    </div>
  );
}
