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
  /** Light win tint — keep cheap (no multi-layer drop-shadow stacks). */
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
      {/* CSS-only win ring — GPU-friendly, no animated bloom / box-shadow layers */}
      {winLit && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[8%] z-0 rounded-full bg-amber-300/35 ring-2 ring-amber-200/80"
        />
      )}
      <img
        src={src}
        alt={kind}
        decoding="async"
        loading="eager"
        className={cn(
          "relative z-[1] size-full object-contain mix-blend-lighten pointer-events-none",
          isScatter && !winLit && "scale-[1.06] drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]",
          isBomb && !winLit && "scale-[1.06] drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]",
          !winLit &&
            (kind === "heart" || kind === "purple" || kind === "green") &&
            "scale-[1.04] drop-shadow-[0_0_8px_rgba(245,158,11,0.45)]",
          winLit && "scale-[1.05] brightness-125 saturate-125 drop-shadow-[0_0_8px_rgba(253,224,71,0.85)]",
        )}
      />
      {isScatter && (
        <span className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 rounded-full border border-yellow-200 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 px-2 py-0.5 text-[9px] font-black uppercase text-amber-950 shadow-sm whitespace-nowrap">
          SCATTER
        </span>
      )}
      {isBomb && showBombBadge && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none z-[30]">
          <span className="rounded-full border-2 border-amber-300 bg-gradient-to-br from-purple-700 via-purple-900 to-black px-2 py-0.5 font-black text-[clamp(12px,2.4vw,18px)] text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
            ×{clampBombMult(mult ?? 2)}
          </span>
        </div>
      )}
    </div>
  );
});
