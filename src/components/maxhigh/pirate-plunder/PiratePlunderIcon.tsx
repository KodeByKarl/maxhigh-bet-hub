import { memo } from "react";
import { cn } from "@/lib/utils";
import type { SymKind } from "./types";
import { ICON_SRC } from "./paytable";

type PiratePlunderIconProps = {
  kind: SymKind;
  mult?: number;
  className?: string;
};

/**
 * Symbol glyph — memoized; `decoding="async"` avoids main-thread decode stalls
 * when many cells mount during a cascade.
 */
export const PiratePlunderIcon = memo(function PiratePlunderIcon({
  kind,
  mult,
  className,
}: PiratePlunderIconProps) {
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
          isScatter && "drop-shadow-[0_0_16px_rgba(250,204,21,0.95)] scale-[1.06] animate-pulse",
          isBomb && "drop-shadow-[0_0_14px_rgba(168,85,247,0.9)] scale-[1.06]",
          (kind === "heart" || kind === "purple" || kind === "green") &&
            "drop-shadow-[0_0_10px_rgba(245,158,11,0.55)] scale-[1.04]",
        )}
      />
      {isScatter && (
        <span className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 rounded-full border border-yellow-200 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 px-2 py-0.5 text-[9px] font-black uppercase text-amber-950 shadow-[0_0_12px_rgba(250,204,21,0.9)] whitespace-nowrap">
          SCATTER
        </span>
      )}
      {isBomb && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none z-[30]">
          <span className="rounded-full border-2 border-amber-300 bg-gradient-to-br from-purple-700 via-purple-900 to-black px-2 py-0.5 font-black text-[clamp(12px,2.4vw,18px)] text-yellow-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] shadow-[0_0_15px_rgba(234,179,8,0.8)]">
            ×{mult ?? 2}
          </span>
        </div>
      )}
    </div>
  );
});
