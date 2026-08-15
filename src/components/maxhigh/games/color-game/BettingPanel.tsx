import { useState } from "react";
import { type ColorGameConfig, type ColorSpotId } from "@/lib/color-game-config";
import { cn } from "@/lib/utils";

export type ChipPlaceEvent = {
  spot: ColorSpotId;
  value: number;
};

type Props = {
  cfg: ColorGameConfig;
  bets: Record<ColorSpotId, number>;
  disabled?: boolean;
  activeSpot: ColorSpotId;
  onActiveSpot: (s: ColorSpotId) => void;
  onBet: (spot: ColorSpotId, n: number) => void;
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
  const [lastAdd, setLastAdd] = useState<{ spot: ColorSpotId; value: number } | null>(null);

  function addChip(v: number) {
    if (disabled) return;
    setSelectedChip(v);
    const next = clampBet((bets[activeSpot] ?? 0) + v, 0, cfg.maxSpotBet);
    onBet(activeSpot, next);
    setLastAdd({ spot: activeSpot, value: v });
    onChipPlaced?.({ spot: activeSpot, value: v });
  }

  function undoLast() {
    if (disabled || !lastAdd) return;
    const { spot, value } = lastAdd;
    onBet(spot, clampBet((bets[spot] ?? 0) - value, 0, cfg.maxSpotBet));
    setLastAdd(null);
  }

  const totalWager = +cfg.spots.reduce((s, sp) => s + (bets[sp.id] ?? 0), 0).toFixed(2);
  const canDeal = totalWager >= cfg.minBet && !dealBusy && !disabled;

  return (
    <div className="space-y-2.5 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {cfg.spots.map((sp) => {
          const amt = bets[sp.id] ?? 0;
          const active = activeSpot === sp.id;
          return (
            <button
              key={sp.id}
              type="button"
              disabled={disabled}
              onClick={() => onActiveSpot(sp.id)}
              className={cn(
                "relative flex min-h-[3.4rem] flex-col items-center justify-center rounded-xl border-2 px-1 py-1.5 transition",
                active ? "scale-[1.03] shadow-lg" : "opacity-90",
                disabled && "pointer-events-none opacity-50",
              )}
              style={{
                background: `linear-gradient(160deg, ${sp.hex}cc, ${sp.hex}66)`,
                borderColor: active ? "#fff" : `${sp.hex}`,
                color: sp.id === "white" || sp.id === "yellow" ? "#0f172a" : "#fff",
              }}
            >
              <span className="text-[10px] font-black tracking-wide uppercase">{sp.label}</span>
              <span className="text-sm font-bold tabular-nums">
                {amt > 0 ? `₱${amt}` : `${sp.payoutMult}×`}
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
              "h-11 w-11 rounded-full border-2 text-xs font-black tabular-nums shadow-md transition",
              selectedChip === v
                ? "border-white bg-amber-400 text-slate-900"
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
          onClick={undoLast}
          className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-xs font-semibold text-white/80 disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={disabled || totalWager <= 0}
          onClick={onClearAll}
          className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-xs font-semibold text-white/80 disabled:opacity-40"
        >
          Clear
        </button>
        <div className="ml-auto text-xs font-semibold tabular-nums text-white/70">
          Bet ₱{totalWager.toFixed(0)}
        </div>
        <button
          type="button"
          disabled={!canDeal}
          onClick={onDeal}
          className={cn(
            "min-w-[7.5rem] rounded-xl px-4 py-2.5 text-sm font-black tracking-wide uppercase shadow-lg transition",
            canDeal
              ? "bg-gradient-to-b from-amber-300 to-amber-500 text-slate-900"
              : "bg-slate-700 text-white/40",
          )}
        >
          {dealBusy ? "…" : "SPIN"}
        </button>
      </div>
    </div>
  );
}
