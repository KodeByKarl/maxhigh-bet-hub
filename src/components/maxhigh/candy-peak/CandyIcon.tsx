import { memo } from "react";
import { cn } from "@/lib/utils";
import type { SymKind } from "./types";
import { ICON_SRC } from "./paytable";

type CandyIconProps = {
  kind: SymKind;
  mult?: number;
  className?: string;
};

/**
 * Symbol glyph — memoized; `decoding="async"` avoids main-thread decode stalls
 * when many cells mount during a cascade.
 */
export const CandyIcon = memo(function CandyIcon({
  kind,
  mult,
  className,
}: CandyIconProps) {
  return (
    <div className={cn("relative grid place-items-center bg-transparent", className)}>
      <img
        src={ICON_SRC[kind]}
        alt=""
        draggable={false}
        decoding="async"
        className="size-full bg-transparent object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)] select-none pointer-events-none"
      />
      {kind === "bomb" && (
        <span className="absolute inset-0 grid place-items-center font-black text-[clamp(11px,2.6vw,17px)] text-[#7c2d12] drop-shadow-[0_1px_0_#fff] pointer-events-none">
          ×{mult ?? 2}
        </span>
      )}
    </div>
  );
});
