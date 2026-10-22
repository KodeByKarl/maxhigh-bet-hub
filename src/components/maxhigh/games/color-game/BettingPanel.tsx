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
  /** Color that just won — its pad glows. */
  winning?: ColorSpotId | null;
  onActiveSpot: (s: ColorSpotId) => void;
  onBet: (spot: ColorSpotId, n: number) => void;
  onChipPlaced?: (ev: ChipPlaceEvent) => void;
  onClearAll?: () => void;
  onDeal?: () => void;
  dealBusy?: boolean;
};

const CHIP_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#be185d",
  "#ca8a04",
  "#334155",
];
function chipColor(v: number) {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  const i = steps.indexOf(v);
  return CHIP_COLORS[
    (i >= 0 ? i : Math.abs(Math.round(v)) % CHIP_COLORS.length) % CHIP_COLORS.length
  ]!;
}

function clampBet(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(0, +n.toFixed(2)));
}

export function BettingPanel({
  cfg,
  bets,
  disabled,
  activeSpot,
  winning,
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
      <style>{PANEL_CSS}</style>
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
                "relative flex min-h-[3.6rem] flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-1 py-1.5 transition-all duration-150",
                active ? "-translate-y-0.5 scale-[1.04] shadow-xl" : "opacity-90",
                winning === sp.id && "cg-pad-win",
                disabled && "pointer-events-none opacity-50",
              )}
              style={{
                background: `linear-gradient(165deg, ${sp.hex} 0%, ${sp.hex}aa 55%, ${sp.hex}66 100%)`,
                borderColor: active ? "#fff" : `${sp.hex}`,
                color: sp.id === "white" || sp.id === "yellow" ? "#0f172a" : "#fff",
                boxShadow: active
                  ? `0 0 0 2px ${sp.hex}66, 0 8px 18px ${sp.hex}66, inset 0 1px 0 rgba(255,255,255,.55)`
                  : "inset 0 1px 0 rgba(255,255,255,.35), 0 2px 6px rgba(0,0,0,.4)",
                ["--pad" as string]: sp.hex,
              }}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
              <span className="relative text-[10px] font-black tracking-wide uppercase">
                {sp.label}
              </span>
              <span className="relative text-sm font-bold tabular-nums">
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
            aria-label={`Chip ${v}`}
            className={cn(
              "cg-chip relative grid h-12 w-12 place-items-center rounded-full text-xs font-black tabular-nums transition-transform duration-150 active:scale-90",
              selectedChip === v ? "-translate-y-1 scale-110" : "hover:-translate-y-0.5",
            )}
            style={{
              ["--chip" as string]: chipColor(v),
              boxShadow:
                selectedChip === v
                  ? `0 0 0 2px #fff, 0 8px 14px ${chipColor(v)}88`
                  : "0 3px 6px rgba(0,0,0,.55)",
            }}
          >
            <span className="cg-chip-face grid place-items-center">{v}</span>
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
            "min-w-[7.5rem] rounded-xl border-2 px-5 py-2.5 text-sm font-black tracking-widest uppercase transition",
            canDeal
              ? "cg-spin-btn border-amber-100/80 bg-gradient-to-b from-amber-200 via-amber-400 to-orange-600 text-slate-900 shadow-[0_0_22px_rgba(251,191,36,.55)] active:scale-95"
              : "border-white/10 bg-slate-700 text-white/40",
          )}
        >
          {dealBusy ? "…" : "SPIN"}
        </button>
      </div>
    </div>
  );
}

const PANEL_CSS = `
.cg-chip {
  background: repeating-conic-gradient(#fff 0 12deg, var(--chip) 12deg 30deg);
  border: 2px solid rgba(255,255,255,.85);
}
.cg-chip-face {
  width: 74%; height: 74%; border-radius: 9999px; color: #fff;
  background: radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--chip) 70%, #fff), var(--chip) 70%);
  border: 1.5px dashed rgba(255,255,255,.75);
  text-shadow: 0 1px 2px rgba(0,0,0,.6);
}
.cg-pad-win { animation: cg-pad .5s ease-in-out infinite alternate; border-color: #fff !important; }
@keyframes cg-pad { from { box-shadow: 0 0 6px 1px var(--pad); } to { box-shadow: 0 0 26px 6px var(--pad); transform: scale(1.06); } }
.cg-spin-btn { animation: cg-spin-pulse 1.6s ease-in-out infinite; }
@keyframes cg-spin-pulse { 50% { box-shadow: 0 0 34px rgba(251,191,36,.85); } }
@media (prefers-reduced-motion: reduce) { .cg-pad-win, .cg-spin-btn { animation: none; } }
`;
