import { type PokerShowdownConfig } from "@/lib/poker-showdown-config";
import { cn } from "@/lib/utils";
import { TCP_CHIP_VALUES, type TcpBetSpot } from "./animationConfig";
import { Chip } from "./ChipStack";

export type ChipPlaceEvent = {
  spot: TcpBetSpot;
  value: number;
};

type Props = {
  cfg: PokerShowdownConfig;
  ante: number;
  pairPlus: number;
  disabled?: boolean;
  selectedChip: number;
  onSelectChip: (v: number) => void;
  /** Places the selected chip on the currently armed spot. */
  onPlaceChip: (v: number) => void;
  activeSpot: TcpBetSpot;
  canUndo?: boolean;
  onUndo?: () => void;
  onClearAll?: () => void;
  onDeal?: () => void;
  dealBusy?: boolean;
};

/**
 * Chip rail — oversized for older-player readability.
 */
export function BettingPanel({
  cfg,
  ante,
  pairPlus,
  disabled,
  selectedChip,
  onSelectChip,
  onPlaceChip,
  activeSpot,
  canUndo,
  onUndo,
  onClearAll,
  onDeal,
  dealBusy,
}: Props) {
  const chipValues = cfg.betSteps.length > 0 ? cfg.betSteps : [...TCP_CHIP_VALUES];
  const totalWager = +(ante + pairPlus).toFixed(2);

  return (
    <div className="touch-manipulation space-y-2.5 short-h:space-y-2">
      <div className="flex items-center justify-between px-0.5 text-[11px] tracking-[0.12em] uppercase short-h:text-[9px]">
        <span className="text-[#e8c96a]/80">
          Betting on{" "}
          <span className="font-black text-[#f7e7bd]">
            {activeSpot === "ante" ? "Ante" : "Pair Plus"}
          </span>
        </span>
        <span className="text-white/45">Tap felt spot to place</span>
      </div>

      {/* chip tray — large circular chips, scroll when many */}
      <div
        className="relative flex items-center gap-1.5 overflow-x-auto overscroll-x-contain rounded-2xl px-2 py-2 short-h:gap-1 short-h:py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.5)), linear-gradient(160deg,#4a2b18,#2a1509 60%,#170b04)",
          boxShadow:
            "inset 0 2px 6px rgba(0,0,0,0.65), inset 0 -1px 0 rgba(255,214,140,0.15), 0 1px 0 rgba(0,0,0,0.6)",
        }}
      >
        {chipValues.map((v) => {
          const selected = selectedChip === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (selected) onPlaceChip(v);
                else onSelectChip(v);
              }}
              aria-label={selected ? `Place ₱${v}` : `Select ₱${v} chip`}
              aria-pressed={selected}
              className={cn(
                "relative grid size-[3.65rem] shrink-0 place-items-center rounded-full transition active:scale-90 disabled:opacity-40 short-h:size-[3.15rem]",
                selected ? "-translate-y-1" : "translate-y-0 opacity-90 hover:opacity-100",
              )}
            >
              <Chip value={v} size={54} selected={selected} className="short-h:scale-[0.92]" />
            </button>
          );
        })}
        {chipValues.length > 6 ? (
          <span
            className="pointer-events-none sticky right-0 ml-auto pl-2 text-sm font-bold text-[#e8c96a]/55 sm:hidden"
            aria-hidden
          >
            ›
          </span>
        ) : null}
      </div>

      <div className="flex items-stretch gap-2 short-h:gap-1.5">
        <button
          type="button"
          disabled={disabled || !canUndo}
          onClick={() => onUndo?.()}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#e8c96a]/30 bg-black/50 text-2xl text-[#f7e7bd]/85 transition active:scale-95 disabled:opacity-30 short-h:h-12 short-h:w-12 short-h:rounded-xl short-h:text-xl"
          aria-label="Undo last chip"
        >
          ↶
        </button>

        <button
          type="button"
          disabled={disabled || dealBusy || ante <= 0}
          onClick={() => onDeal?.()}
          className="relative flex h-14 flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-[#f5e6c8]/70 px-3 text-[#20160a] transition active:scale-[0.99] disabled:opacity-40 short-h:h-12 short-h:rounded-xl short-h:gap-2"
          style={{
            background: "linear-gradient(180deg,#f8e7b0 0%,#e8c96a 45%,#b7912f 100%)",
            boxShadow: "0 6px 22px rgba(201,162,39,0.4), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          <span
            className="text-base font-black tracking-[0.2em] short-h:text-sm"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            DEAL
          </span>
          {totalWager > 0 ? (
            <span className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-bold tabular-nums text-[#3a2a08] short-h:px-2 short-h:py-0.5 short-h:text-[11px]">
              ₱{totalWager.toFixed(0)}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          disabled={disabled || totalWager <= 0}
          onClick={() => onClearAll?.()}
          className="grid h-14 min-w-14 shrink-0 place-items-center rounded-2xl border border-[#e8c96a]/30 bg-black/50 px-1.5 text-[11px] font-extrabold tracking-wide text-[#f7e7bd]/85 transition active:scale-95 disabled:opacity-30 short-h:h-12 short-h:min-w-12 short-h:rounded-xl short-h:text-[10px]"
          aria-label="Clear all bets"
        >
          CLEAR
        </button>
      </div>
    </div>
  );
}
