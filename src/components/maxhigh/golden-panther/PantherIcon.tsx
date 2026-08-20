import { memo } from "react";
import { clampBombMult } from "@/lib/golden-panther-config";
import { cn } from "@/lib/utils";
import type { SymKind } from "./types";
import { ICON_SRC } from "./paytable";

type PantherIconProps = {
  kind: SymKind;
  mult?: number;
  className?: string;
  showBombBadge?: boolean;
  /** Extra gold light when this symbol is part of a win */
  winLit?: boolean;
};

/**
 * Symbol glyph — memoized; `decoding="async"` avoids main-thread decode stalls
 * when many cells mount during a cascade.
 */
export const PantherIcon = memo(function PantherIcon({
  kind,
  mult,
  className,
  showBombBadge = true,
  winLit = false,
}: PantherIconProps) {
  const isScatter = kind === "lollipop";
  const isBomb = kind === "bomb";
  const src = ICON_SRC[kind] || "/images/symbols/gp/10.png?v=1";

  return (
    <div className={cn("relative grid place-items-center bg-transparent overflow-visible size-full select-none", className)}>
      <img
        src={src}
        alt={kind}
        decoding="async"
        loading="eager"
        className={cn(
          "size-full object-contain mix-blend-lighten filter transition-all duration-300 pointer-events-none",
          isScatter && !winLit && "drop-shadow-[0_0_16px_rgba(250,204,21,0.95)] scale-[1.06] animate-pulse",
          isBomb && !winLit && "drop-shadow-[0_0_14px_rgba(168,85,247,0.9)] scale-[1.06]",
          !winLit &&
            (kind === "heart" || kind === "purple" || kind === "green") &&
            "drop-shadow-[0_0_10px_rgba(245,158,11,0.55)] scale-[1.04]",
          winLit && "scale-[1.08] brightness-125 contrast-125 saturate-150",
        )}
        style={
          winLit
            ? {
                filter:
                  "brightness(1.45) contrast(1.2) saturate(1.35) drop-shadow(0 0 4px #fffef5) drop-shadow(0 0 12px #fde047) drop-shadow(0 0 24px #fbbf24) drop-shadow(0 0 40px rgba(245,158,11,0.9))",
              }
            : undefined
        }
      />
      {isScatter && (
        <span className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 rounded-full border border-yellow-200 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 px-2 py-0.5 text-[9px] font-black uppercase text-amber-950 shadow-[0_0_12px_rgba(250,204,21,0.9)] whitespace-nowrap">
          SCATTER
        </span>
      )}
      {isBomb && showBombBadge && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none z-[30]">
          <span className="rounded-full border-2 border-amber-300 bg-gradient-to-br from-purple-700 via-purple-900 to-black px-2 py-0.5 font-black text-[clamp(12px,2.4vw,18px)] text-yellow-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] shadow-[0_0_15px_rgba(234,179,8,0.8)]">
            ×{clampBombMult(mult ?? 2)}
          </span>
        </div>
      )}
    </div>
  );
});
