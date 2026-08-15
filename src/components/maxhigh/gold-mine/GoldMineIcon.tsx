import { memo } from "react";
import { cn } from "@/lib/utils";
import type { FgSymKind } from "@/lib/gold-mine-config";

export const TILE_IMAGE_MAP: Record<FgSymKind, string> = {
  sym_j: "/images/symbols/gold-mine/j.png",
  sym_q: "/images/symbols/gold-mine/q.png",
  sym_k: "/images/symbols/gold-mine/k.png",
  sym_a: "/images/symbols/gold-mine/a.png",
  sheriff: "/images/symbols/gold-mine/sheriff.png",
  bartender: "/images/symbols/gold-mine/bartender.png",
  banker: "/images/symbols/gold-mine/banker.png",
  bandit: "/images/symbols/gold-mine/bandit.png",
  safe: "/images/symbols/gold-mine/safe.png",
  wild: "/images/symbols/gold-mine/wild.png",
  scatter: "/images/symbols/gold-mine/scatter.png",
  bonus: "/images/symbols/gold-mine/bonus.png",
};

type Props = { kind: FgSymKind; className?: string; coinLabel?: string };

/**
 * Gold Mine Dig symbol — square PNG art clipped to a circle (matches Pug Den cells).
 */
export const GoldMineIcon = memo(function GoldMineIcon({ kind, className, coinLabel }: Props) {
  const isBonus = kind === "bonus";
  const isWild = kind === "wild";
  const isScatter = kind === "scatter";
  const src = TILE_IMAGE_MAP[kind] ?? TILE_IMAGE_MAP.sym_j;

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-hidden rounded-full select-none",
        className,
      )}
    >
      {/* Circular crop — scales past the baked square frame so corners are clipped */}
      <div className="absolute inset-[6%] z-[1] overflow-hidden rounded-full bg-[#1a1208]">
        <img
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          className={cn(
            "pointer-events-none size-full scale-[1.28] object-cover object-center transition-all duration-300",
            isScatter
              ? "drop-shadow-[0_0_18px_rgba(251,191,36,0.95)]"
              : isWild
                ? "drop-shadow-[0_0_16px_rgba(234,179,8,0.9)]"
                : isBonus
                  ? "drop-shadow-[0_0_14px_rgba(250,204,21,0.85)]"
                  : "drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]",
          )}
        />
      </div>

      {isBonus && coinLabel && (
        <span className="absolute inset-0 z-10 grid place-items-center rounded-full bg-black/35 text-[clamp(0.65rem,2.8vw,1.1rem)] font-black text-amber-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {coinLabel}
        </span>
      )}
      {isWild && (
        <span className="absolute bottom-[8%] left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-200 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600 px-1.5 py-0.5 text-[clamp(8px,2.4vw,11px)] font-black uppercase text-amber-950 shadow">
          WILD
        </span>
      )}
      {isScatter && (
        <span className="absolute bottom-[8%] left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-200 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 px-1.5 py-0.5 text-[clamp(8px,2.4vw,11px)] font-black uppercase text-amber-950 shadow">
          SCATTER
        </span>
      )}
      {isBonus && !coinLabel && (
        <span className="absolute bottom-[8%] left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 px-1.5 py-0.5 text-[clamp(8px,2.4vw,11px)] font-black uppercase text-white shadow">
          COIN
        </span>
      )}
    </div>
  );
});
