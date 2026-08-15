import { useState } from "react";
import { type BaccaratConfig } from "@/lib/baccarat-config";
import { cn } from "@/lib/utils";
import { BC_CHIP_VALUES, type BcBetSpot } from "./animationConfig";
import { BaccaratChipButton } from "./BaccaratChip";

export type ChipPlaceEvent = {
  spot: BcBetSpot;
  value: number;
};

type Props = {
  cfg: BaccaratConfig;
  playerBet: number;
  bankerBet: number;
  tieBet: number;
  playerPairBet: number;
  bankerPairBet: number;
  disabled?: boolean;
  onPlayerBet: (n: number) => void;
  onBankerBet: (n: number) => void;
  onTieBet: (n: number) => void;
  onPlayerPairBet: (n: number) => void;
  onBankerPairBet: (n: number) => void;
  activeSpot: BcBetSpot;
  onActiveSpot: (s: BcBetSpot) => void;
  onChipPlaced?: (ev: ChipPlaceEvent) => void;
  onClearSpot?: (spot: BcBetSpot) => void;
  onDeal?: () => void;
  dealBusy?: boolean;
  /** Side-rail (desktop) vs bottom dock (mobile). */
  layout?: "dock" | "rail";
};

function clampBet(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(0, +n.toFixed(2)));
}

const SPOT_STYLE: Record<
  BcBetSpot,
  { label: string; short: string; ring: string; fill: string; active: string }
> = {
  player: {
    label: "PLAYER",
    short: "P",
    ring: "border-sky-400/45",
    fill: "from-sky-950 to-sky-900/55",
    active: "border-sky-300 ring-2 ring-sky-400/45 shadow-[0_0_14px_rgba(56,189,248,0.28)]",
  },
  banker: {
    label: "BANKER",
    short: "B",
    ring: "border-rose-400/45",
    fill: "from-rose-950 to-rose-900/55",
    active: "border-rose-300 ring-2 ring-rose-400/45 shadow-[0_0_14px_rgba(244,63,94,0.28)]",
  },
  tie: {
    label: "TIE",
    short: "T",
    ring: "border-emerald-400/45",
    fill: "from-emerald-950 to-emerald-900/55",
    active: "border-emerald-300 ring-2 ring-emerald-400/45 shadow-[0_0_14px_rgba(52,211,153,0.25)]",
  },
  playerPair: {
    label: "P PAIR",
    short: "PP",
    ring: "border-sky-600/40",
    fill: "from-[#0b1c33] to-[#07101f]",
    active: "border-sky-300 ring-2 ring-sky-400/35",
  },
  bankerPair: {
    label: "B PAIR",
    short: "BP",
    ring: "border-rose-600/40",
    fill: "from-[#2a0f18] to-[#14080c]",
    active: "border-rose-300 ring-2 ring-rose-400/35",
  },
};

/** Mobile dock / desktop side-rail — oversized for older-player readability. */
export function BettingPanel({
  cfg,
  playerBet,
  bankerBet,
  tieBet,
  playerPairBet,
  bankerPairBet,
  disabled,
  onPlayerBet,
  onBankerBet,
  onTieBet,
  onPlayerPairBet,
  onBankerPairBet,
  activeSpot,
  onActiveSpot,
  onChipPlaced,
  onClearSpot,
  onDeal,
  dealBusy,
  layout = "dock",
}: Props) {
  const [selectedChip, setSelectedChip] = useState<number>(BC_CHIP_VALUES[0]!);
  const rail = layout === "rail";
  const limits: Record<
    BcBetSpot,
    { min: number; max: number; value: number; set: (n: number) => void }
  > = {
    player: { min: cfg.minPlayerBet, max: cfg.maxPlayerBet, value: playerBet, set: onPlayerBet },
    banker: { min: cfg.minBankerBet, max: cfg.maxBankerBet, value: bankerBet, set: onBankerBet },
    tie: { min: 0, max: cfg.maxTieBet, value: tieBet, set: onTieBet },
    playerPair: {
      min: 0,
      max: cfg.maxPlayerPairBet,
      value: playerPairBet,
      set: onPlayerPairBet,
    },
    bankerPair: {
      min: 0,
      max: cfg.maxBankerPairBet,
      value: bankerPairBet,
      set: onBankerPairBet,
    },
  };

  function hintFor(spot: BcBetSpot): string {
    if (spot === "player") return `${cfg.playerPayout}:1`;
    if (spot === "banker") return `${cfg.bankerPayout}:1`;
    if (spot === "tie") return `${cfg.tiePayout}:1`;
    if (spot === "playerPair") return `${cfg.playerPairPayout}:1`;
    return `${cfg.bankerPairPayout}:1`;
  }

  function addChip(v: number) {
    if (disabled) return;
    setSelectedChip(v);
    const lim = limits[activeSpot];
    const floor = activeSpot === "player" || activeSpot === "banker" ? lim.min : 0;
    lim.set(clampBet(lim.value + v, floor, lim.max));
    onChipPlaced?.({ spot: activeSpot, value: v });
  }

  function clearSpot() {
    if (disabled) return;
    limits[activeSpot].set(0);
    onClearSpot?.(activeSpot);
  }

  const mainSpots: BcBetSpot[] = ["player", "tie", "banker"];
  const sideSpots: BcBetSpot[] = ["playerPair", "bankerPair"];

  function Spot({ id, compact }: { id: BcBetSpot; compact?: boolean }) {
    const st = SPOT_STYLE[id];
    const lim = limits[id];
    const active = activeSpot === id;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onActiveSpot(id)}
        aria-pressed={active}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 bg-gradient-to-b px-1.5 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c96a] focus-visible:ring-offset-1 focus-visible:ring-offset-[#060d18] active:scale-[0.98]",
          "min-h-[3.65rem] short-h:min-h-[3.15rem] sm:min-h-[3.5rem]",
          st.fill,
          active ? st.active : st.ring,
          disabled && "opacity-45",
          compact && "min-h-[3.25rem] rounded-xl py-1.5 short-h:min-h-11",
          rail && "min-h-14 rounded-xl",
        )}
      >
        <span className="text-[11px] font-extrabold tracking-[0.14em] text-white/90 short-h:text-[10px] sm:text-[10px]">
          {/* Always show full label on mobile when space allows; short only on very narrow */}
          <span className={cn(rail ? "hidden" : "max-[340px]:inline min-[341px]:hidden")}>
            {st.short}
          </span>
          <span className={cn(rail ? "inline" : "max-[340px]:hidden min-[341px]:inline")}>
            {st.label}
          </span>
        </span>
        <span className="mt-0.5 text-xl font-black tabular-nums leading-none text-white short-h:text-lg sm:text-lg">
          ₱{lim.value.toFixed(0)}
        </span>
        <span className="mt-0.5 text-[10px] font-medium text-white/55 short-h:text-[9px] sm:text-[9px]">
          {hintFor(id)}
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "touch-manipulation",
        rail ? "flex h-full flex-col gap-2.5" : "space-y-2.5 short-h:space-y-2",
      )}
    >
      <div className={cn("grid gap-2", rail ? "grid-cols-1" : "grid-cols-3")}>
        {mainSpots.map((id) => (
          <Spot key={id} id={id} />
        ))}
      </div>
      <div className={cn("grid gap-2", rail ? "grid-cols-2" : "grid-cols-2")}>
        {sideSpots.map((id) => (
          <Spot key={id} id={id} compact={!rail} />
        ))}
      </div>

      <div className={cn("flex gap-2", rail ? "flex-col" : "items-stretch")}>
        <div
          className={cn(
            "relative flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain rounded-2xl border border-white/12 bg-gradient-to-b from-[#12243c] to-[#070e18] px-1.5 py-1.5 sm:gap-1.5 sm:px-2 sm:py-1.5",
            rail
              ? "flex-wrap justify-center overflow-visible"
              : "flex-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {BC_CHIP_VALUES.map((v) => (
            <BaccaratChipButton
              key={v}
              value={v}
              disabled={disabled}
              selected={selectedChip === v}
              onClick={() => addChip(v)}
              className="size-14 short-h:size-12 sm:size-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c96a]"
            />
          ))}
          {!rail ? (
            <span
              className="pointer-events-none absolute right-1.5 top-1/2 hidden -translate-y-1/2 text-sm font-bold text-[#e8c96a]/55 min-[320px]:block sm:hidden"
              aria-hidden
            >
              ›
            </span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={clearSpot}
          className="min-h-14 min-w-[4.25rem] shrink-0 rounded-2xl border border-white/20 bg-black/50 px-3.5 text-sm font-bold tracking-wide text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c96a] active:scale-95 disabled:opacity-40 short-h:min-h-12 short-h:text-[13px] sm:min-h-11 sm:rounded-xl sm:text-[11px]"
        >
          CLEAR
        </button>
      </div>

      <button
        type="button"
        disabled={disabled || dealBusy}
        onClick={() => onDeal?.()}
        className={cn(
          "flex items-center justify-center rounded-2xl border border-[#e8c96a]/55 bg-gradient-to-b from-[#f0d78c] via-[#c9a227] to-[#8a6b12] text-base font-black tracking-[0.22em] text-[#1a1205] shadow-[0_6px_20px_rgba(232,201,106,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c96a] active:scale-[0.99] disabled:opacity-50",
          rail ? "mt-auto h-14 w-full" : "h-14 w-full short-h:h-12 short-h:text-sm sm:h-12 sm:rounded-xl sm:text-sm",
        )}
      >
        DEAL
      </button>
    </div>
  );
}
