import { memo } from "react";
import { cn } from "@/lib/utils";
import type { CnySymKind } from "@/lib/lantern-luck-config";
import { ICON_SRC } from "./paytable";

type LanternLuckIconProps = {
  kind: CnySymKind;
  className?: string;
  /** Highlight Extra Scatter when it substitutes for a chosen symbol. */
  extraLabel?: string | null;
};

/**
 * 3D symbol glyph — transparent PNGs under /images/symbols/lantern-luck/.
 * Sized large for readability (older players).
 */
export const LanternLuckIcon = memo(function LanternLuckIcon({
  kind,
  className,
  extraLabel,
}: LanternLuckIconProps) {
  const isFeature = kind === "dragon" || kind === "monkey" || kind === "extra_scatter";
  const src = ICON_SRC[kind];

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-hidden bg-transparent select-none",
        className,
      )}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        className={cn(
          // Fill cell; lighten blend hides any leftover pure-black fringe on dark felt
          "pointer-events-none size-[98%] object-contain object-center mix-blend-lighten transition-all duration-300",
          kind === "dragon" &&
            "drop-shadow-[0_0_14px_rgba(220,38,38,0.75)] drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]",
          kind === "monkey" && "drop-shadow-[0_0_12px_rgba(234,88,12,0.85)]",
          kind === "extra_scatter" && "size-full drop-shadow-[0_0_16px_rgba(250,204,21,0.9)]",
          !isFeature && "drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]",
        )}
      />
      {kind === "monkey" && (
        <span className="absolute bottom-1 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-200 bg-gradient-to-r from-red-600 via-amber-400 to-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow sm:text-[10px]">
          MONKEY
        </span>
      )}
      {kind === "dragon" && (
        <span className="absolute bottom-1 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-200 bg-gradient-to-r from-red-800 via-yellow-500 to-red-800 px-2 py-0.5 text-[9px] font-black uppercase text-yellow-50 shadow sm:text-[10px]">
          DRAGON
        </span>
      )}
      {kind === "extra_scatter" && (
        <span className="absolute bottom-1 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-100 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 px-2 py-0.5 text-[9px] font-black uppercase text-amber-950 shadow animate-pulse sm:text-[10px]">
          {extraLabel ? `EXTRA · ${extraLabel}` : "EXTRA"}
        </span>
      )}
    </div>
  );
});
