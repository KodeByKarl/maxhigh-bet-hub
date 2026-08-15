import { useRef, useState, type ReactNode } from "react";
import { BET_STEPS, type AceHighConfig } from "@/lib/ace-high-config";
import { cn } from "@/lib/utils";
import { AH_CHIP_VALUES, aceHighChipSrc, type AhBetSpot } from "./animationConfig";

export type ChipPlaceEvent = {
  spot: AhBetSpot;
  value: number;
};

type Props = {
  cfg: AceHighConfig;
  baseBet: number;
  tieBet: number;
  aceBonusBet: number;
  disabled?: boolean;
  onBaseBet: (n: number) => void;
  onTieBet: (n: number) => void;
  onAceBonusBet: (n: number) => void;
  activeSpot: AhBetSpot;
  onActiveSpot: (s: AhBetSpot) => void;
  onChipPlaced?: (ev: ChipPlaceEvent) => void;
  onClearSpot?: (spot: AhBetSpot) => void;
  dealSlot?: ReactNode;
};

function clampBet(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(0, +n.toFixed(2)));
}

function ChipButton({
  value,
  disabled,
  onClick,
}: {
  value: number;
  disabled?: boolean;
  onClick: (el: HTMLButtonElement) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={() => {
        if (ref.current) onClick(ref.current);
      }}
      aria-label={`Add ₱${value} chip`}
      className="relative grid size-14 shrink-0 place-items-center transition active:scale-95 disabled:opacity-40 short-h:size-12 sm:size-11"
    >
      {!imgFailed ? (
        <img
          src={aceHighChipSrc(value)}
          alt={`₱${value}`}
          className="size-[3.15rem] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] short-h:size-11 sm:size-10"
          draggable={false}
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="grid size-[3.15rem] place-items-center rounded-full border-2 border-amber-300/80 bg-gradient-to-b from-amber-200 to-amber-700 text-xs font-black text-amber-950 shadow-md short-h:size-11 sm:size-10 sm:text-[9px]">
          {value}
        </span>
      )}
    </button>
  );
}

const SPOT_META = {
  base: { corner: "B", label: "BASE" },
  tie: { corner: "T", label: "TIE" },
  ace: { corner: "A", label: "ACE" },
} as const;

export function BettingPanel({
  cfg,
  baseBet,
  tieBet,
  aceBonusBet,
  disabled,
  onBaseBet,
  onTieBet,
  onAceBonusBet,
  activeSpot,
  onActiveSpot,
  onChipPlaced,
  onClearSpot,
  dealSlot,
}: Props) {
  function addChip(v: number) {
    if (disabled) return;
    if (activeSpot === "base") {
      onBaseBet(clampBet(baseBet + v, cfg.minBet, cfg.maxBet));
    } else if (activeSpot === "tie") {
      onTieBet(clampBet(tieBet + v, 0, cfg.maxTieBet));
    } else {
      onAceBonusBet(clampBet(aceBonusBet + v, 0, cfg.maxAceBonusBet));
    }
    onChipPlaced?.({ spot: activeSpot, value: v });
  }

  function clearSpot() {
    if (disabled) return;
    if (activeSpot === "base") onBaseBet(cfg.minBet);
    else if (activeSpot === "tie") onTieBet(0);
    else onAceBonusBet(0);
    onClearSpot?.(activeSpot);
  }

  const steps = (cfg.betSteps?.length ? cfg.betSteps : BET_STEPS).filter(
    (s) => s <= cfg.maxBet,
  );

  const spots = [
    { id: "base" as const, value: baseBet, hint: "1:1" },
    {
      id: "tie" as const,
      value: tieBet,
      hint: `${cfg.tieSideBetMult - 1}:1`,
    },
    {
      id: "ace" as const,
      value: aceBonusBet,
      hint: `A${cfg.aceBonus.eitherAce - 1}/AA${cfg.aceBonus.aceVsAce - 1}`,
    },
  ] as const;

  return (
    <div className="space-y-2 touch-manipulation sm:space-y-1">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-1">
        {spots.map((spot) => {
          const meta = SPOT_META[spot.id];
          const active = activeSpot === spot.id;
          const chipVal = AH_CHIP_VALUES.reduce(
            (best, v) => (v <= spot.value ? v : best),
            1 as (typeof AH_CHIP_VALUES)[number],
          );
          return (
            <button
              key={spot.id}
              type="button"
              disabled={disabled}
              onClick={() => onActiveSpot(spot.id)}
              aria-pressed={active}
              className={cn(
                "relative flex min-h-[3.75rem] items-center gap-1.5 overflow-hidden rounded-xl border-2 bg-gradient-to-b from-[#1a2030] to-[#0a0e14] px-2 py-2 text-left active:scale-[0.98] short-h:min-h-[3.15rem] short-h:py-1.5 sm:min-h-0 sm:gap-1.5 sm:rounded-lg sm:border sm:px-2 sm:py-1.5",
                active
                  ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                  : "border-amber-700/45",
                disabled && "opacity-50",
              )}
            >
              <div className="hidden font-serif text-xs font-black leading-none text-amber-300 sm:block">
                {meta.corner}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-extrabold tracking-[0.14em] text-amber-200 sm:text-[8px] sm:font-bold sm:tracking-[0.12em] sm:text-amber-200/85">
                  {meta.label}
                </div>
                <div className="font-serif text-xl font-black tabular-nums leading-none text-white short-h:text-lg sm:text-sm">
                  ₱{spot.value.toFixed(0)}
                </div>
                <div className="truncate text-[10px] font-medium text-white/55 sm:text-[7px] sm:font-normal sm:text-white/35">
                  {spot.hint}
                </div>
              </div>
              {spot.value > 0 ? (
                <img
                  src={aceHighChipSrc(chipVal)}
                  alt=""
                  className="size-8 shrink-0 object-contain opacity-95 sm:size-7 sm:opacity-90"
                  draggable={false}
                  decoding="async"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 rounded-2xl border border-amber-800/30 bg-gradient-to-b from-[#2a1a0c]/95 to-[#120c08] px-1.5 py-1.5 sm:gap-1.5 sm:rounded-xl sm:px-1.5 sm:py-1">
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-0">
          {AH_CHIP_VALUES.map((v) => (
            <ChipButton key={v} value={v} disabled={disabled} onClick={() => addChip(v)} />
          ))}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={clearSpot}
          className="h-12 min-w-[3.75rem] shrink-0 rounded-full border border-amber-500/40 bg-black/50 px-3 text-sm font-bold text-amber-50 active:scale-95 disabled:opacity-40 short-h:h-11 short-h:text-[13px] sm:h-8 sm:min-w-0 sm:px-2 sm:text-[10px] sm:font-semibold sm:text-amber-100/75"
        >
          Clear
        </button>
        {dealSlot ? <div className="shrink-0 sm:hidden">{dealSlot}</div> : null}
      </div>

      <div className="hidden flex-wrap justify-center gap-1 sm:flex">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (activeSpot === "base") onBaseBet(s);
              else if (activeSpot === "tie") onTieBet(Math.min(s, cfg.maxTieBet));
              else onAceBonusBet(Math.min(s, cfg.maxAceBonusBet));
              onChipPlaced?.({ spot: activeSpot, value: s });
            }}
            className="rounded-full border border-amber-700/25 bg-black/30 px-1.5 py-0.5 text-[9px] text-amber-100/65 hover:bg-black/45 disabled:opacity-40"
          >
            ₱{s}
          </button>
        ))}
      </div>
    </div>
  );
}
