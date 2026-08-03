import { memo } from "react";
import { cn } from "@/lib/utils";
import type { MahjongSymKind } from "@/lib/mahjong-ways-config";

export const TILE_IMAGE_MAP: Record<MahjongSymKind, string> = {
  sym_10: "/images/symbols/mahjong/10.png",
  sym_j: "/images/symbols/mahjong/j.png",
  sym_q: "/images/symbols/mahjong/q.png",
  sym_k: "/images/symbols/mahjong/k.png",
  sym_a: "/images/symbols/mahjong/a.png",
  bamboo: "/images/symbols/mahjong/bamboo.png",
  character: "/images/symbols/mahjong/character.png",
  dot: "/images/symbols/mahjong/dot.png",
  red_dragon: "/images/symbols/mahjong/red_dragon.png",
  green_dragon: "/images/symbols/mahjong/green_dragon.png",
  wild: "/images/symbols/mahjong/wild.png",
  scatter: "/images/symbols/mahjong/scatter.png",
};

type MahjongIconProps = {
  kind: MahjongSymKind;
  isGold?: boolean;
  className?: string;
};

/**
 * 3D tile glyph — memoized; `decoding="async"` avoids main-thread decode stalls
 * when many cells mount during a cascade.
 */
export const MahjongIcon = memo(function MahjongIcon({
  kind,
  isGold,
  className,
}: MahjongIconProps) {
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
          "pointer-events-none size-full object-contain transition-all duration-300",
          isScatter
            ? "scale-110 drop-shadow-[0_0_22px_rgba(250,204,21,0.95)] drop-shadow-[0_0_28px_rgba(220,38,38,0.7)]"
            : isWild
              ? "drop-shadow-[0_0_16px_rgba(234,179,8,0.85)]"
              : isGold
                ? "drop-shadow-[0_0_14px_rgba(245,158,11,0.75)]"
                : "drop-shadow-[0_3px_6px_rgba(0,0,0,0.4)]",
        )}
      />
      {isScatter && (
        <span className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-yellow-200 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 px-2 py-0.5 text-[9px] font-black uppercase text-amber-950 shadow-[0_0_12px_rgba(250,204,21,0.9)] animate-pulse">
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
