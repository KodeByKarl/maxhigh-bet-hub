import { memo } from "react";
import { cn } from "@/lib/utils";
import type { NeonMakatiSymKind } from "@/lib/neon-makati-config";

export const TILE_IMAGE_MAP: Record<NeonMakatiSymKind, string> = {
  sym_10: "/images/symbols/neon-makati/10.png",
  sym_j: "/images/symbols/neon-makati/j.png",
  sym_q: "/images/symbols/neon-makati/q.png",
  sym_k: "/images/symbols/neon-makati/k.png",
  sym_a: "/images/symbols/neon-makati/a.png",
  moon: "/images/symbols/neon-makati/moon.webp",
  star: "/images/symbols/neon-makati/star.png",
  castle: "/images/symbols/neon-makati/castle.webp",
  princess: "/images/symbols/neon-makati/princess.png",
  comet: "/images/symbols/neon-makati/comet.png",
  wild: "/images/symbols/neon-makati/wild.webp",
  scatter: "/images/symbols/neon-makati/scatter.webp",
};

type NeonMakatiIconProps = {
  kind: NeonMakatiSymKind;
  isGold?: boolean;
  className?: string;
};

/**
 * Symbol card glyph — generated tile art for Neon Makati.
 */
export const NeonMakatiIcon = memo(function NeonMakatiIcon({
  kind,
  isGold,
  className,
}: NeonMakatiIconProps) {
  const isScatter = kind === "scatter";
  const isWild = kind === "wild";
  const src = TILE_IMAGE_MAP[kind];

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-visible bg-transparent select-none",
        className,
      )}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        className={cn(
          "pointer-events-none size-[96%] object-contain transition-all duration-300",
          isScatter
            ? "scale-105 drop-shadow-[0_0_22px_rgba(244,114,182,0.95)]"
            : isWild
              ? "drop-shadow-[0_0_16px_rgba(234,179,8,0.85)]"
              : isGold
                ? "drop-shadow-[0_0_14px_rgba(245,158,11,0.75)]"
                : "drop-shadow-[0_3px_6px_rgba(0,0,0,0.4)]",
        )}
      />
      {isScatter && (
        <span className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-yellow-200 bg-gradient-to-r from-pink-500 via-fuchsia-400 to-amber-400 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-[0_0_12px_rgba(244,114,182,0.9)] animate-pulse">
          SCATTER
        </span>
      )}
      {isWild && (
        <span className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-200 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600 px-2 py-0.5 text-[9px] font-black uppercase text-amber-950 shadow-[0_0_10px_rgba(234,179,8,0.85)]">
          WILD
        </span>
      )}
      {isGold && !isWild && !isScatter && (
        <span className="absolute top-0.5 right-0.5 z-[20] rounded border border-yellow-200 bg-gradient-to-b from-amber-500 to-amber-800 px-1 py-px text-[7px] font-black uppercase text-yellow-100 shadow">
          GOLD
        </span>
      )}
    </div>
  );
});
