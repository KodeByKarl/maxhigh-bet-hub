import { memo } from "react";
import { cn } from "@/lib/utils";
import type { FgSymKind } from "@/lib/palengke-pays-config";

export const TILE_IMAGE_MAP: Record<FgSymKind, string> = {
  sym_j: "/images/symbols/palengke-pays/j.png",
  sym_q: "/images/symbols/palengke-pays/q.png",
  sym_k: "/images/symbols/palengke-pays/k.png",
  sym_a: "/images/symbols/palengke-pays/a.png",
  sheriff: "/images/symbols/palengke-pays/sheriff.png",
  bartender: "/images/symbols/palengke-pays/bartender.png",
  banker: "/images/symbols/palengke-pays/banker.png",
  bandit: "/images/symbols/palengke-pays/bandit.png",
  safe: "/images/symbols/palengke-pays/safe.png",
  wild: "/images/symbols/palengke-pays/wild.png",
  scatter: "/images/symbols/palengke-pays/scatter.png",
  bonus: "/images/symbols/palengke-pays/bonus.png",
};

type Props = { kind: FgSymKind; className?: string; coinLabel?: string };

/**
 * Palengke Pays symbol — square PNG art clipped to a circle (matches Pug Den cells).
 */
export const PalengkePaysIcon = memo(function PalengkePaysIcon({ kind, className, coinLabel }: Props) {
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
