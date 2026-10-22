import { useState } from "react";
import { type ColorGameProConfig, type ColorSpotId } from "@/lib/color-game-pro-config";
import { cn } from "@/lib/utils";

export type ChipPlaceEvent = {
  spot: ColorSpotId;
  value: number;
};

type Props = {
  cfg: ColorGameProConfig;
  bets: Record<ColorSpotId, number>;
  disabled?: boolean;
  activeSpot: ColorSpotId;
  /** Color that just won — its pad pulses. */
  winning?: ColorSpotId | null;
  canRebet?: boolean;
  onActiveSpot: (s: ColorSpotId) => void;
  onBet: (spot: ColorSpotId, n: number) => void;
  onChipPlaced?: (ev: ChipPlaceEvent) => void;
  onClearAll?: () => void;
  onRebet?: () => void;
  onDouble?: () => void;
  onDeal?: () => void;
  dealBusy?: boolean;
};

const CHIP_HUES = [190, 265, 320, 38, 150, 10, 215, 290, 60];
const CHIP_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

function chipHue(v: number) {
  const i = CHIP_STEPS.indexOf(v);
  return CHIP_HUES[(i >= 0 ? i : Math.round(v)) % CHIP_HUES.length]!;
}

function clampBet(n: number, max: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(0, +n.toFixed(2)));
}

export function BettingPanel({
  cfg,
  bets,
  disabled,
  activeSpot,
  winning,
  canRebet,
  onActiveSpot,
  onBet,
  onChipPlaced,
  onClearAll,
  onRebet,
  onDouble,
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
    onBet(activeSpot, clampBet((bets[activeSpot] ?? 0) + v, cfg.maxSpotBet));
    setLastAdd({ spot: activeSpot, value: v });
    onChipPlaced?.({ spot: activeSpot, value: v });
  }

  function undoLast() {
    if (disabled || !lastAdd) return;
    const { spot, value } = lastAdd;
    onBet(spot, clampBet((bets[spot] ?? 0) - value, cfg.maxSpotBet));
    setLastAdd(null);
  }

  const totalWager = +cfg.spots.reduce((s, sp) => s + (bets[sp.id] ?? 0), 0).toFixed(2);
  const canDeal = totalWager >= cfg.minBet && !dealBusy && !disabled;

  return (
    <div className="space-y-2.5 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
      <style>{PANEL_CSS}</style>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
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
                "pro-pad relative flex min-h-[3.7rem] flex-col items-center justify-center overflow-hidden rounded-2xl px-1 py-1.5",
                active && "pro-pad-active",
                winning === sp.id && "pro-pad-win",
                disabled && "pointer-events-none opacity-55",
              )}
              style={{ ["--pad" as string]: sp.hex }}
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{
                  background: `radial-gradient(ellipse 90% 80% at 50% 0%, ${sp.hex}, transparent 75%), linear-gradient(180deg, ${sp.hex}55, ${sp.hex}18)`,
                }}
              />
              <span
                className="relative text-[10px] font-black tracking-[0.14em] uppercase"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,.7)" }}
              >
                {sp.label}
              </span>
              <span
                className="relative text-sm font-bold tabular-nums"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,.7)" }}
              >
                {amt > 0 ? `₱${amt}` : `${sp.payoutMult}×`}
              </span>
              {amt > 0 && <span className="pro-pad-bet" />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {chipValues.map((v) => (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => addChip(v)}
            aria-label={`Chip ${v}`}
            className={cn(
              "pro-chip relative grid size-12 place-items-center rounded-full",
              selectedChip === v && "pro-chip-on",
            )}
            style={{ ["--h" as string]: chipHue(v) }}
          >
            <span className="pro-chip-face grid place-items-center text-[11px] font-black tabular-nums">
              {v}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled || totalWager <= 0}
          onClick={undoLast}
          className="pro-mini"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={disabled || totalWager <= 0}
          onClick={onClearAll}
          className="pro-mini"
        >
          Clear
        </button>
        {canRebet ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRebet}
            className="pro-mini pro-mini-hot"
          >
            Rebet
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || totalWager <= 0}
            onClick={onDouble}
            className="pro-mini pro-mini-hot"
          >
            ×2
          </button>
        )}
        <div className="ml-auto pr-1 text-xs font-semibold tabular-nums text-cyan-100/80">
          Bet ₱{totalWager.toFixed(0)}
        </div>
        <button
          type="button"
          disabled={!canDeal}
          onClick={onDeal}
          className={cn(
            "pro-spin min-w-[7.5rem] rounded-2xl px-5 py-2.5 text-sm font-black tracking-[0.22em] uppercase",
            canDeal && "pro-spin-on",
          )}
        >
          {dealBusy ? "…" : "SPIN"}
        </button>
      </div>
    </div>
  );
}

const PANEL_CSS = `
.pro-pad {
  color: #fff; border: 1.5px solid color-mix(in srgb, var(--pad) 75%, transparent);
  background: rgba(6,8,30,.7); transition: transform .15s, box-shadow .15s;
  box-shadow: 0 0 10px color-mix(in srgb, var(--pad) 28%, transparent), inset 0 0 12px rgba(0,0,0,.4);
}
.pro-pad-active { transform: translateY(-3px) scale(1.04); border-color: #fff; box-shadow: 0 0 24px var(--pad), inset 0 0 14px rgba(255,255,255,.18); }
.pro-pad-win { animation: pro-padw .5s ease-in-out infinite alternate; border-color: #fff; }
@keyframes pro-padw { from { box-shadow: 0 0 8px var(--pad); } to { box-shadow: 0 0 30px 6px var(--pad); transform: scale(1.07); } }
.pro-pad-bet { position: absolute; right: 5px; top: 5px; width: 7px; height: 7px; border-radius: 9999px; background: #fde047; box-shadow: 0 0 8px #fde047; }
.pro-chip {
  background: repeating-conic-gradient(hsl(var(--h) 90% 62%) 0 22deg, #fff 22deg 45deg);
  box-shadow: 0 0 12px hsl(var(--h) 90% 60% / .55), 0 3px 6px rgba(0,0,0,.6);
  transition: transform .15s; border: 2px solid rgba(255,255,255,.9);
}
.pro-chip:active { transform: scale(.88); }
.pro-chip-on { transform: translateY(-4px) scale(1.12); box-shadow: 0 0 0 2px #fff, 0 0 22px hsl(var(--h) 95% 62%); }
.pro-chip-face {
  width: 72%; height: 72%; border-radius: 9999px; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.7);
  background: radial-gradient(circle at 35% 28%, hsl(var(--h) 90% 66%), hsl(var(--h) 80% 32%) 85%);
  border: 1.5px dashed rgba(255,255,255,.8);
}
.pro-mini {
  border-radius: 10px; padding: 7px 11px; font-size: 11px; font-weight: 800; color: #cffafe;
  background: rgba(8,12,40,.65); border: 1px solid rgba(125,211,252,.35); transition: opacity .15s, transform .1s;
}
.pro-mini:disabled { opacity: .35; }
.pro-mini:active:not(:disabled) { transform: scale(.94); }
.pro-mini-hot { color: #1e1b4b; background: linear-gradient(180deg, #a5f3fc, #67e8f9); border-color: #a5f3fc; }
.pro-spin { color: rgba(255,255,255,.4); background: rgba(30,27,75,.8); border: 1.5px solid rgba(255,255,255,.12); }
.pro-spin-on {
  color: #0b0630; border-color: #fff;
  background: linear-gradient(180deg, #f0abfc 0%, #c084fc 40%, #22d3ee 100%);
  box-shadow: 0 0 26px rgba(192,132,252,.75), 0 0 52px rgba(34,211,238,.35);
  animation: pro-sp 1.5s ease-in-out infinite;
}
.pro-spin-on:active { transform: scale(.95); }
@keyframes pro-sp { 50% { box-shadow: 0 0 38px rgba(240,171,252,.95), 0 0 70px rgba(34,211,238,.6); } }
@media (prefers-reduced-motion: reduce) { .pro-pad-win, .pro-spin-on { animation: none; } }
`;
