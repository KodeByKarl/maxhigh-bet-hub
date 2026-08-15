import { memo } from "react";
import { cn } from "@/lib/utils";
import type { StarlightSymKind } from "@/lib/starlight-ace-config";

export const TILE_IMAGE_MAP: Record<StarlightSymKind, string> = {
  sym_10: "/images/symbols/starlight-ace/10.png",
  sym_j: "/images/symbols/starlight-ace/j.png",
  sym_q: "/images/symbols/starlight-ace/q.png",
  sym_k: "/images/symbols/starlight-ace/k.png",
  sym_a: "/images/symbols/starlight-ace/a.png",
  moon: "/images/symbols/starlight-ace/moon.webp",
  star: "/images/symbols/starlight-ace/star.png",
  castle: "/images/symbols/starlight-ace/castle.webp",
  princess: "/images/symbols/starlight-ace/princess.png",
  comet: "/images/symbols/starlight-ace/comet.png",
  wild: "/images/symbols/starlight-ace/wild.webp",
  scatter: "/images/symbols/starlight-ace/scatter.webp",
};

type StarlightIconProps = {
  kind: StarlightSymKind;
  isGold?: boolean;
  className?: string;
};

/**
 * Symbol card glyph — generated tile art for Starlight Ace.
 */
export const StarlightIcon = memo(function StarlightIcon({
  kind,
  isGold,
  className,
}: StarlightIconProps) {
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
