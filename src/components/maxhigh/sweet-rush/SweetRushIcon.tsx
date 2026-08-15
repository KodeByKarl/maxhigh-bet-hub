import { memo } from "react";
import { cn } from "@/lib/utils";
import type { SymKind } from "./types";
import { ICON_SRC } from "./paytable";

type SweetRushIconProps = {
  kind: SymKind;
  mult?: number;
  className?: string;
};

/**
 * Symbol glyph — memoized; `decoding="async"` avoids main-thread decode stalls
 * when many cells mount during a cascade.
 */
export const SweetRushIcon = memo(function SweetRushIcon({
  kind,
  mult,
  className,
}: SweetRushIconProps) {
  const isScat = kind === "lollipop";

  return (
    <div className={cn("relative grid place-items-center bg-transparent overflow-visible", className)}>
      <img
        src={ICON_SRC[kind]}
        alt=""
        draggable={false}
        decoding="async"
        className={cn(
          "bg-transparent object-contain select-none pointer-events-none transition-all duration-300",
          isScat
            ? "size-[145%] max-w-none -translate-y-2 drop-shadow-[0_0_25px_rgba(250,204,21,1)] drop-shadow-[0_0_40px_rgba(236,72,153,0.9)] scale-110"
            : "size-full drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)]"
        )}
      />
      {isScat && (
        <span className="absolute -bottom-3 left-1/2 z-[35] -translate-x-1/2 rounded-full border-2 border-yellow-200 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-amber-950 shadow-[0_0_15px_rgba(250,204,21,1)] whitespace-nowrap animate-pulse">
          🚀 SCATTER
        </span>
      )}
      {kind === "bomb" && (
        <span className="absolute inset-0 grid place-items-center font-black text-[clamp(11px,2.6vw,17px)] text-[#7c2d12] drop-shadow-[0_1px_0_#fff] pointer-events-none">
          ×{mult ?? 2}
        </span>
      )}
    </div>
  );
});
