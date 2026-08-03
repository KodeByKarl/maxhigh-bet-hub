import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import type { SuperAceSymKind } from "@/lib/super-ace-config";

export const TILE_IMAGE_MAP: Record<SuperAceSymKind, string> = {
  sym_j: "/images/symbols/super-ace/j.png",
  sym_q: "/images/symbols/super-ace/q.png",
  sym_k: "/images/symbols/super-ace/k.png",
  sym_a: "/images/symbols/super-ace/a.png",
  spade: "/images/symbols/super-ace/spade.png",
  heart: "/images/symbols/super-ace/heart.png",
  club: "/images/symbols/super-ace/club.png",
  diamond: "/images/symbols/super-ace/diamond.png",
  ace_gold: "/images/symbols/super-ace/ace_gold.png",
  little_joker: "/images/symbols/super-ace/little_joker.png",
  big_joker: "/images/symbols/super-ace/big_joker.png",
  scatter: "/images/symbols/super-ace/scatter.png",
};

type SuperAceIconProps = {
  kind: SuperAceSymKind;
  isGold?: boolean;
  className?: string;
};

/**
 * 3D Lucky Poker tile art � PNG symbols under /images/symbols/super-ace/.
 */
export const SuperAceIcon = memo(function SuperAceIcon({
  kind,
  isGold,
  className,
}: SuperAceIconProps) {
  const [failed, setFailed] = useState(false);
  const isScatter = kind === "scatter";
  const isLittleJoker = kind === "little_joker";
  const isBigJoker = kind === "big_joker";
  const isWild = isLittleJoker || isBigJoker;
  const src = TILE_IMAGE_MAP[kind];

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-visible bg-transparent select-none",
        className,
      )}
    >
      {!failed ? (
        <img
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          onError={() => setFailed(true)}
          loading="lazy"
          className={cn(
            "pointer-events-none size-[96%] object-contain transition-all duration-300",
            isScatter
              ? "scale-105 drop-shadow-[0_0_22px_rgba(239,68,68,0.95)]"
              : isBigJoker
                ? "drop-shadow-[0_0_18px_rgba(220,38,38,0.9)]"
                : isLittleJoker
                  ? "drop-shadow-[0_0_14px_rgba(59,130,246,0.85)]"
                  : isGold
                    ? "drop-shadow-[0_0_14px_rgba(245,158,11,0.85)]"
                    : "drop-shadow-[0_3px_6px_rgba(0,0,0,0.4)]",
          )}
        />
      ) : (
        <div
          className={cn(
            "grid size-[78%] place-items-center rounded-xl border-2 border-amber-200/80 text-2xl font-black text-white",
            isBigJoker
              ? "bg-gradient-to-br from-red-500 to-red-900"
              : isLittleJoker
                ? "bg-gradient-to-br from-sky-400 to-blue-800"
                : isScatter
                  ? "bg-gradient-to-br from-amber-300 to-red-600"
                  : "bg-gradient-to-br from-amber-400 to-orange-700",
          )}
        >
          {kind === "sym_j"
            ? "J"
            : kind === "sym_q"
              ? "Q"
              : kind === "sym_k"
                ? "K"
                : kind === "sym_a" || kind === "ace_gold"
                  ? "A"
                  : kind === "spade"
                    ? "?"
                    : kind === "heart"
                      ? "?"
                      : kind === "club"
                        ? "?"
                        : kind === "diamond"
                          ? "?"
                          : kind === "scatter"
                            ? "?"
                            : "J"}
        </div>
      )}
      {isScatter && (
        <span className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-yellow-200 bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse">
          SCATTER
        </span>
      )}
      {isLittleJoker && (
        <span className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-sky-200 bg-gradient-to-r from-sky-600 via-blue-500 to-indigo-600 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-[0_0_10px_rgba(59,130,246,0.85)]">
          LITTLE JOKER
        </span>
      )}
      {isBigJoker && (
        <span className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-red-200 bg-gradient-to-r from-red-700 via-rose-500 to-amber-500 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-[0_0_12px_rgba(220,38,38,0.9)]">
          BIG JOKER
        </span>
      )}
      {isGold && !isWild && !isScatter && (
        <span className="absolute top-0.5 right-0.5 z-[20] rounded border border-yellow-200 bg-gradient-to-b from-amber-400 to-amber-800 px-1 py-px text-[7px] font-black uppercase text-yellow-100 shadow">
          GOLDEN
        </span>
      )}
    </div>
  );
});
